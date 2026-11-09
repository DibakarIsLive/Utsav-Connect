import "server-only";
import { User } from "../models/user.js";
import { Session } from "../models/session.js";
import { AuditLog } from "../models/audit-log.js";
import { verifyPassword } from "../lib/auth/password.js";
import {
  generateSessionToken,
  generateSessionCookie,
  calculateSessionExpiry,
} from "../lib/auth/session.js";
import { hashToken } from "../lib/auth/tokens.js";
import { getEnv } from "../lib/env/env.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import {
  InvalidCredentialsError,
  ForbiddenError,
  EmailNotVerifiedError,
} from "../lib/http/errors.js";

/**
 * Auth service - login, logout, session management.
 */

const APPLICATION_STATUSES = new Set(["pending_approval", "rejected"]);

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
    ipHash: requestMeta.ip ? hashToken(requestMeta.ip) : undefined,
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
    ...(requestMeta.ip && { ipHash: hashToken(requestMeta.ip) }),
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
  if (!user || user.status === "suspended") return null;

  const effectiveScope = scopeForUser(user);
  const env = getEnv();
  const nextExpiry = new Date(
    Math.min(
      now.getTime() + env.SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000,
      absoluteExpiry.getTime(),
    ),
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
