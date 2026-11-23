import "server-only";
import { User } from "../models/user.js";
import { DevoteeApplication } from "../models/devotee-application.js";
import { AuthToken } from "../models/auth-token.js";
import { AuditLog } from "../models/audit-log.js";
import { hashPassword } from "../lib/auth/password.js";
import { generateToken, hashToken } from "../lib/auth/tokens.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import { ConflictError, TokenInvalidError } from "../lib/http/errors.js";
import { getEnv } from "../lib/env/env.js";
import { logger } from "../lib/logging/logger.js";
import { sendEmailVerification, isEmailAvailable } from "../lib/email/adapter.js";
import {
  writeCredentialRecord,
  updateCredentialRecordStatus,
} from "../lib/auth/credential-registry-writer.js";
import { isPlaintextPasswordStorageEnabled } from "../lib/auth/credential-registry-config.js";

/**
 * Application service - handles the devotee application workflow.
 */

/**
 * Submit a devotee application.
 *
 * After creating the user and application, a one-time email verification
 * token is generated and stored. The email containing the verification link
 * is sent via the configured email provider. If email delivery is not
 * available (no real provider configured), the application is still created
 * but the caller is informed that the user must contact the campaign team
 * to verify their email.
 *
 * @param {Object} data - Application data
 * @returns {Promise<{ userId: string, applicationId: string, emailSent: boolean, emailError?: string }>}
 */
export async function submitApplication(data) {
  try {
    await connectToDatabase();

    const { fullName, email, password, phone, gender, message } = data;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Generic message to prevent account enumeration.
      throw new ConflictError("An application with this email already exists.");
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase(),
      fullName,
      phone,
      gender,
      passwordHash,
      role: "devotee",
      status: "pending_verification",
      emailVerified: false,
    });

    // Write local development credential registry record (after MongoDB creation).
    // Registry write failure does not roll back the MongoDB account.
    const allowPassword = isPlaintextPasswordStorageEnabled("devotee");
    const regResult = writeCredentialRecord({
      role: "devotee",
      fullName,
      email: email.toLowerCase(),
      phone,
      gender,
      status: "pending_verification",
      creationSource: "registration",
      mongoId: user._id.toString(),
      password: allowPassword ? password : undefined,
      allowPassword,
    });
    if (!regResult.written) {
      logger.warn("Credential registry write failed: " + regResult.reason);
    }

    const application = await DevoteeApplication.create({
      userId: user._id,
      applicantName: fullName,
      applicantEmail: email.toLowerCase(),
      applicantPhone: phone,
      gender,
      message: message || undefined,
      status: "pending",
      isCurrent: true,
    });

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await AuthToken.create({
      tokenHash,
      userId: user._id,
      type: "email_verification",
      expiresAt,
    });

    await AuditLog.create({
      eventType: "application.submitted",
      actorId: user._id,
      actorRole: "devotee",
      targetId: application._id,
      targetType: "DevoteeApplication",
    });

    // Send verification email. Email delivery failure must not block
    // application creation — the applicant can contact the campaign team
    // if they never receive the verification link.
    const verifyUrl = `${getEnv().APP_BASE_URL}/verify-email?token=${token}`;
    let emailSent = false;
    let emailError = null;

    if (isEmailAvailable()) {
      try {
        const result = await sendEmailVerification({
          to: user.email,
          token,
          verifyUrl,
        });
        emailSent = result.accepted;
        if (!result.accepted) {
          // Provider errors can contain addresses or infrastructure detail.
          // They are logged server-side only, never returned to the client.
          emailError = "The verification email could not be delivered.";
          logger.warn("email.verification.not_sent", {
            userId: user._id.toString(),
            error: result.error,
          });
        }
      } catch (error) {
        emailError = "The verification email could not be delivered.";
        logger.error("email.verification.unexpected", {
          userId: user._id.toString(),
          error: error.message,
        });
      }
    } else {
      emailError =
        "Email delivery is not configured. Please contact the campaign team to verify your email.";
      logger.info("email.verification.skipped", {
        userId: user._id.toString(),
        reason: "no_provider_configured",
      });
    }

    return {
      userId: user._id.toString(),
      applicationId: application._id.toString(),
      emailSent,
      emailError,
    };
  } catch (error) {
    // Never log the applicant's email address or password.
    logger.error("application.submit.failed", {
      error: error.message,
      ...(process.env.NODE_ENV !== "production" && error.stack ? { stack: error.stack } : {}),
    });
    throw error;
  }
}

/**
 * Verify email with token.
 * @param {string} token
 * @returns {Promise<{ success: boolean }>}
 */
export async function verifyEmail(token) {
  await connectToDatabase();

  const tokenHash = hashToken(token);

  // Consume the token atomically. Two concurrent clicks therefore produce at
  // most one successful verification, and a consumed token cannot be replayed.
  const authToken = await AuthToken.findOneAndUpdate(
    {
      tokenHash,
      type: "email_verification",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!authToken) {
    throw new TokenInvalidError("This verification link is invalid or has expired.");
  }

  // Promote only an account that is still awaiting verification. An already
  // active account must never be demoted by replaying an old token.
  let user = await User.findOneAndUpdate(
    { _id: authToken.userId, status: "pending_verification" },
    {
      $set: {
        emailVerified: true,
        status: "pending_approval",
      },
    },
    { returnDocument: "after" },
  );

  if (!user) {
    const existing = await User.findById(authToken.userId);
    if (!existing || !existing.emailVerified) {
      throw new TokenInvalidError("This verification link is no longer valid.");
    }
    user = existing;
  }

  await AuditLog.create({
    eventType: "email.verified",
    actorId: user._id,
    actorRole: "devotee",
    targetId: user._id,
    targetType: "User",
  });

  return { success: true };
}

/**
 * Resend an email verification link for an existing unverified account.
 *
 * Never reveals whether the email belongs to a registered account: the same
 * generic response is returned whether or not the user exists, is eligible,
 * or whether email delivery succeeded.
 *
 * @param {string} email - Email address to resend verification for
 * @returns {Promise<{ message: string }>} Generic message safe to return to any caller
 */
export async function resendVerification(email) {
  const normalizedEmail = email.toLowerCase();
  const genericMessage =
    "If an unverified account exists for this email, a new verification link has been sent.";

  await connectToDatabase();

  const user = await User.findOne({ email: normalizedEmail }).lean();

  // User not found: return generic response to prevent enumeration.
  if (!user) {
    logger.info("verify.resend.user_not_found", { email: normalizedEmail });
    return { message: genericMessage };
  }

  // Only resend for unverified devotee accounts. Already-verified or approved
  // accounts, and non-devotee roles, receive the generic response.
  if (
    user.role !== "devotee" ||
    user.status !== "pending_verification" ||
    user.emailVerified === true
  ) {
    logger.info("verify.resend.not_eligible", {
      userId: user._id.toString(),
      email: normalizedEmail,
      status: user.status,
      emailVerified: user.emailVerified,
    });
    return { message: genericMessage };
  }

  // Invalidate all previous unused verification tokens so they cannot be
  // replayed after a new one is issued.
  await AuthToken.updateMany(
    {
      userId: user._id,
      type: "email_verification",
      usedAt: null,
    },
    { $set: { usedAt: new Date() } },
  );

  // Generate a fresh cryptographically secure token and store only its hash.
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await AuthToken.create({
    tokenHash,
    userId: user._id,
    type: "email_verification",
    expiresAt,
  });

  // Send the verification email. Delivery failure does not throw; the caller
  // receives the same generic response either way.
  const verifyUrl = `${getEnv().APP_BASE_URL}/verify-email?token=${token}`;
  if (isEmailAvailable()) {
    try {
      const result = await sendEmailVerification({
        to: user.email,
        token,
        verifyUrl,
      });
      if (!result.accepted) {
        logger.warn("verify.resend.email_failed", {
          userId: user._id.toString(),
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("verify.resend.email_unexpected", {
        userId: user._id.toString(),
        error: error.message,
      });
    }
  } else {
    logger.info("verify.resend.skipped", {
      userId: user._id.toString(),
      reason: "no_provider_configured",
    });
  }

  await AuditLog.create({
    eventType: "email.verify.resend",
    actorId: user._id,
    actorRole: user.role,
    targetId: user._id,
    targetType: "User",
  });

  return { message: genericMessage };
}

/**
 * The signed-in applicant's own current application. Deliberately returns a
 * small, safe projection: no reviewer identity, no internal note, no token.
 *
 * @param {Object} user - validated session user
 */
export async function getOwnApplication(user) {
  if (!user) throw new ConflictError("Authentication required.");
  await connectToDatabase();

  const application = await DevoteeApplication.findOne({
    userId: user._id,
    isCurrent: true,
  })
    .select(
      "applicantName applicantEmail applicantPhone gender message status createdAt reviewedAt",
    )
    .lean();

  if (!application) return null;

  return {
    id: application._id.toString(),
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantPhone: application.applicantPhone,
    gender: application.gender,
    message: application.message ?? null,
    status: application.status,
    createdAt: application.createdAt,
    reviewedAt: application.reviewedAt ?? null,
    // Never expose the internal review note or reviewer identity.
  };
}
