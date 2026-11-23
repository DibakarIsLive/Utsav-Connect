import "server-only";
import { User } from "../models/user.js";
import { Session } from "../models/session.js";
import { AuthToken } from "../models/auth-token.js";
import { AuditLog } from "../models/audit-log.js";
import { verifyPassword, hashPassword } from "../lib/auth/password.js";
import {
  generateSessionToken,
  generateSessionCookie,
  calculateSessionExpiry,
} from "../lib/auth/session.js";
import { generateToken, hashToken } from "../lib/auth/tokens.js";
import { hashIp } from "../lib/privacy/ip-hash.js";
import { getEnv } from "../lib/env/env.js";
import { logger } from "../lib/logging/logger.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";

/** Keyed, versioned IP hash fields for new audit records (no raw IP). */
function ipAuditFields(requestMeta) {
  const ipHash = hashIp(requestMeta?.ip);
  return ipHash ? { ipHash } : {};
}
import { sendPasswordReset, isEmailAvailable } from "../lib/email/adapter.js";
import {
  InvalidCredentialsError,
  ForbiddenError,
  EmailNotVerifiedError,
  TokenInvalidError,
} from "../lib/http/errors.js";

/**
 * Auth service - login, logout, session management.
 */

const APPLICATION_STATUSES = new Set(["pending_approval", "rejected"]);

/**
 * A valid Argon2id hash used to equalise the cost of a login attempt for an
 * unknown email. Without it, account existence leaks through response timing.
 * The password is deliberately unknown and never matches.
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$+zJSC/fnNQrl2aPcQtoGGA$f28fot3ic4WHZWnNZvDUA7+s91pVXPnu0ttCfihiEm0";

/**
 * Build the only user shape that is ever sent to a client. Password hashes,
 * session hashes and reviewer-only fields are deliberately absent.
 *
 * @param {Object} user
 * @param {"application" | "full"} scope
 */
function toSafeUser(user, scope) {
  const id = user._id.toString();
  return {
    _id: id,
    id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    gender: user.gender ?? null,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerified),
    adminPermissions: user.role === "admin" ? (user.adminPermissions ?? []) : [],
    isSuperAdmin: user.role === "super_admin",
    scope,
    createdAt: user.createdAt ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

/**
 * The scope a user is allowed to hold right now. Approval promotes an
 * existing application session to full access without requiring a new login;
 * a rejected or pending account is always held to application scope.
 *
 * @param {Object} user
 * @returns {"application" | "full"}
 */
export function scopeForUser(user) {
  if (!user) return "application";
  if (user.role === "admin" || user.role === "super_admin") return "full";
  if (user.status === "active") return "full";
  return "application";
}

/**
 * Authenticate user with email and password.
 * @param {string} email
 * @param {string} password
 * @param {Object} requestMeta - { userAgent, ip }
 * @returns {{ user: Object, sessionCookie: string }}
 */
export async function login(email, password, requestMeta = {}) {
  await connectToDatabase();

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  if (!user) {
    // Spend the same Argon2 work as a real verification before failing.
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    throw new InvalidCredentialsError();
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new InvalidCredentialsError();
  }

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  if (user.status === "suspended") {
    throw new ForbiddenError("Account is suspended. Contact an administrator.");
  }

  if (
    user.status !== "active" &&
    user.status !== "pending_approval" &&
    !APPLICATION_STATUSES.has(user.status)
  ) {
    throw new ForbiddenError("Account is not active.");
  }

  const scope = scopeForUser(user);

  const env = getEnv();
  const { expiresAt, absoluteExpiresAt } = calculateSessionExpiry(
    env.SESSION_IDLE_DAYS,
    env.SESSION_ABSOLUTE_DAYS,
  );
  const { token, tokenHash } = generateSessionToken();

  await Session.create({
    tokenHash: hashToken(token),
    userId: user._id,
    scope,
    expiresAt,
    absoluteExpiresAt,
    lastActivityAt: new Date(),
    userAgent: requestMeta.userAgent,
    ipHash: hashIp(requestMeta.ip),
  });

  user.lastLoginAt = new Date();
  await user.save();

  await AuditLog.create({
    eventType: "user.login",
    actorId: user._id,
    actorRole: user.role,
    targetId: user._id,
    targetType: "User",
    metadata: { scope },
    ...ipAuditFields(requestMeta),
  });

  return {
    user: toSafeUser(user, scope),
    sessionCookie: generateSessionCookie(token),
  };
}

/**
 * Logout - revoke session.
 * @param {string} token
 */
export async function logout(token) {
  if (!token) return { success: true };
  await connectToDatabase();

  const tokenHash = hashToken(token);
  const session = await Session.findOne({ tokenHash });

  if (session) {
    const user = await User.findById(session.userId);
    await session.deleteOne();

    if (user) {
      await AuditLog.create({
        eventType: "user.logout",
        actorId: user._id,
        actorRole: user.role,
        targetId: user._id,
        targetType: "User",
      });
    }
  }

  return { success: true };
}

/**
 * Request a password reset. Returns a generic success response regardless of
 * whether the email exists, to prevent account enumeration.
 *
 * @param {string} email
 * @param {Object} requestMeta - { userAgent, ip }
 * @returns {Promise<{ emailSent: boolean, emailError?: string }>}
 */
export async function requestPasswordReset(email, requestMeta = {}) {
  await connectToDatabase();

  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

  let emailSent = false;
  let emailError = null;

  if (user) {
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await AuthToken.create({
      tokenHash,
      userId: user._id,
      type: "password_reset",
      expiresAt,
    });

    const resetUrl = `${getEnv().APP_BASE_URL}/reset-password?token=${token}`;
    if (isEmailAvailable()) {
      try {
        const result = await sendPasswordReset({
          to: user.email,
          token,
          resetUrl,
        });
        emailSent = result.accepted;
        if (!result.accepted) {
          emailError = "The password reset email could not be delivered.";
          logger.warn("email.password_reset.not_sent", {
            userId: user._id.toString(),
            error: result.error,
          });
        }
      } catch (error) {
        emailError = "The password reset email could not be delivered.";
        logger.error("email.password_reset.unexpected", {
          userId: user._id.toString(),
          error: error.message,
        });
      }
    } else {
      emailError =
        "Email delivery is not configured. Please contact the campaign team to reset your password.";
      logger.info("email.password_reset.skipped", {
        userId: user._id.toString(),
        reason: "no_provider_configured",
      });
    }

    await AuditLog.create({
      eventType: "password_reset.requested",
      actorId: user._id,
      actorRole: user.role,
      targetId: user._id,
      targetType: "User",
      ...ipAuditFields(requestMeta),
    });
  }

  return { emailSent, emailError };
}

/**
 * Confirm a password reset. Validates the token, updates the password,
 * invalidates the token, and revokes all existing sessions.
 *
 * @param {string} token
 * @param {string} newPassword
 * @param {Object} requestMeta - { userAgent, ip }
 * @returns {Promise<{ success: boolean }>}
 */
export async function confirmPasswordReset(token, newPassword, requestMeta = {}) {
  await connectToDatabase();

  const tokenHash = hashToken(token);

  // Consume the token atomically: single-use, not yet used, not expired.
  const authToken = await AuthToken.findOneAndUpdate(
    {
      tokenHash,
      type: "password_reset",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!authToken) {
    throw new TokenInvalidError("This reset link is invalid or has expired.");
  }

  const user = await User.findById(authToken.userId);
  if (!user) {
    throw new TokenInvalidError("This reset link is no longer valid.");
  }

  const passwordHash = await hashPassword(newPassword);
  user.passwordHash = passwordHash;
  await user.save();

  // Revoke all existing sessions so the attacker cannot continue using them.
  await Session.deleteMany({ userId: user._id });

  await AuditLog.create({
    eventType: "password_reset.completed",
    actorId: user._id,
    actorRole: user.role,
    targetId: user._id,
    targetType: "User",
    ...ipAuditFields(requestMeta),
  });

  return { success: true };
}

/**
 * Validate session from cookie. Extends the idle timeout up to the absolute
 * limit, keeps the stored scope in sync with the account's current status,
 * and returns the full safe-user shape the UI relies on.
 *
 * @param {string} token
 */
export async function validateSession(token) {
  if (!token) return null;
  await connectToDatabase();

  const tokenHash = hashToken(token);
  const session = await Session.findOne({ tokenHash }).populate("userId");

  if (!session) return null;

  const now = new Date();
  const absoluteExpiry = session.absoluteExpiresAt ?? session.expiresAt;
  if (now > session.expiresAt || now > absoluteExpiry) {
    await session.deleteOne();
    return null;
  }

  const user = session.userId;
  if (!user || user.status === "suspended") {
    // A suspended account must not retain a usable cookie.
    if (user) await session.deleteOne();
    return null;
  }

  const effectiveScope = scopeForUser(user);
  const env = getEnv();
  const nextExpiry = new Date(
    Math.min(now.getTime() + env.SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000, absoluteExpiry.getTime()),
  );

  let dirty = false;
  if (session.scope !== effectiveScope) {
    session.scope = effectiveScope;
    dirty = true;
  }
  // Only write when the sliding window actually moved by a meaningful amount
  // to keep request latency predictable.
  if (nextExpiry.getTime() - session.expiresAt.getTime() > 60 * 60 * 1000) {
    session.expiresAt = nextExpiry;
    dirty = true;
  }
  if (dirty) {
    session.lastActivityAt = now;
    await session.save();
  }

  return toSafeUser(user, effectiveScope);
}
