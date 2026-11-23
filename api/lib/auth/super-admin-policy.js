import "server-only";
import { ConflictError } from "../http/errors.js";

/**
 * Explicit protection of the active Super Admin invariant.
 *
 * A role/status change (or any future removal operation) must be refused when
 * it would leave the platform with no active Super Admin. The rule is kept as
 * a pure, injectable function so the "only one active Super Admin" case can be
 * tested directly, independently of which actor happens to be signed in.
 *
 * Self-modification is enforced separately and unconditionally by callers.
 *
 * @param {Object} args
 * @param {{ role: string, status: string, _id: any }} args.target
 * @param {string} args.nextRole
 * @param {string} args.nextStatus
 * @param {number} args.activeSuperAdmins - count of active Super Admins including the target
 */
export function assertWouldLeaveActiveSuperAdmin({
  target,
  nextRole,
  nextStatus,
  activeSuperAdmins,
}) {
  if (!target || target.role !== "super_admin" || target.status !== "active") return;
  const removesSuperAdmin = nextRole !== "super_admin" || nextStatus !== "active";
  if (!removesSuperAdmin) return;

  const remaining = activeSuperAdmins - 1;
  if (remaining < 1) {
    throw new ConflictError("The last active Super Admin cannot be demoted or suspended.");
  }
}
