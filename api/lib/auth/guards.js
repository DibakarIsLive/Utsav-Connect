import "server-only";
import { parseSessionToken } from "./session.js";
import { validateSession } from "../../services/auth-service.js";
import { ForbiddenError, UnauthorizedError } from "../http/errors.js";
import { hasPermission } from "./permissions.js";

/**
 * Resolve the signed-in user from the request cookie. Never trusts a user id
 * supplied by the client.
 *
 * @param {Request} request
 * @returns {Promise<Object|null>}
 */
export async function getRequestUser(request) {
  const token = parseSessionToken(request.headers.get("cookie") || undefined);
  if (!token) return null;
  return validateSession(token);
}

/**
 * Require an authenticated session, optionally requiring full (approved)
 * scope. An application-scope session belongs to a pending or rejected
 * applicant and must never reach campaign or devotee data.
 *
 * @param {Request} request
 * @param {{ full?: boolean }} [options]
 * @returns {Promise<Object>}
 */
export async function requireUser(request, options = {}) {
  const user = await getRequestUser(request);
  if (!user) {
    throw new UnauthorizedError("Sign in is required.");
  }
  if (options.full && user.scope !== "full") {
    throw new ForbiddenError("Approved devotee or administrator access is required.");
  }
  return user;
}

/**
 * Require an administrator (full scope) with a specific granular permission.
 * Super Admins hold every permission by definition.
 *
 * @param {Request} request
 * @param {string} [permission]
 * @returns {Promise<Object>}
 */
export async function requireAdmin(request, permission) {
  const user = await requireUser(request, { full: true });
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new ForbiddenError("Administrator access is required.");
  }
  if (permission && !hasPermission(user, permission)) {
    throw new ForbiddenError(`Permission denied: ${permission} required.`);
  }
  return user;
}

/**
 * Require the Super Admin role. Used for administrator account management,
 * where ordinary administrators must never be able to escalate themselves.
 *
 * @param {Request} request
 * @returns {Promise<Object>}
 */
export async function requireSuperAdmin(request) {
  const user = await requireUser(request, { full: true });
  if (user.role !== "super_admin") {
    throw new ForbiddenError("Super Admin access required.");
  }
  return user;
}
