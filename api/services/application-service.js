import "server-only";
import { User } from "../models/user.js";
import { DevoteeApplication } from "../models/devotee-application.js";
import { AuthToken } from "../models/auth-token.js";
import { AuditLog } from "../models/audit-log.js";
import { hashPassword } from "../lib/auth/password.js";
import { generateToken, hashToken } from "../lib/auth/tokens.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import { ConflictError, TokenInvalidError } from "../lib/http/errors.js";

/**
 * Application service - handles the devotee application workflow.
 */

/**
 * Submit a devotee application.
 * @param {Object} data - Application data
 * @returns {Promise<{ userId: string, applicationId: string, verificationToken: string }>}
 */
export async function submitApplication(data) {
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

  return {
    userId: user._id.toString(),
    applicationId: application._id.toString(),
    verificationToken: token,
  };
}

/**
 * Verify email with token.
 * @param {string} token
 * @returns {Promise<{ success: boolean }>}
 */
export async function verifyEmail(token) {
  await connectToDatabase();

  const tokenHash = hashToken(token);

  const authToken = await AuthToken.findOne({
    tokenHash,
    type: "email_verification",
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!authToken) {
    throw new TokenInvalidError("This verification link is invalid or has expired.");
  }

  const user = await User.findByIdAndUpdate(
    authToken.userId,
    {
      emailVerified: true,
      status: "pending_approval",
    },
    { new: true },
  );

  if (!user) {
    throw new TokenInvalidError("This verification link is no longer valid.");
  }

  authToken.usedAt = new Date();
  await authToken.save();

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
