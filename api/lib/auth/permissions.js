import "server-only";

/**
 * Role and permission management.
 * 
 * Roles: devotee, admin, super_admin
 * Admins use granular permissions (D-17).
 * Super Admin capabilities are not assignable permission strings.
 */

// Granular admin permissions (assignable by Super Admin)
export const ADMIN_PERMISSIONS = {
  APPLICATION_READ_ALL: "application:read:all",
  APPLICATION_REVIEW_ALL: "application:review:all",
  APPLICATION_NOTE_WRITE: "application:note:write",
  DEVOTEE_READ_ALL: "devotee:read:all",
  DEVOTEE_STATUS_UPDATE: "devotee:status:update",
  INVITATION_REPORT_READ_ALL: "invitation-report:read:all",
  AUDIT_READ_ALL: "audit:read:all",
  AREA_MANAGE: "area:manage",
  PROPOSAL_REVIEW: "proposal:review",
};

// Default moderator permission bundle
export const MODERATOR_PERMISSIONS = [
  ADMIN_PERMISSIONS.APPLICATION_READ_ALL,
  ADMIN_PERMISSIONS.APPLICATION_REVIEW_ALL,
  ADMIN_PERMISSIONS.APPLICATION_NOTE_WRITE,
  ADMIN_PERMISSIONS.DEVOTEE_READ_ALL,
  ADMIN_PERMISSIONS.INVITATION_REPORT_READ_ALL,
  ADMIN_PERMISSIONS.AREA_MANAGE,
  ADMIN_PERMISSIONS.PROPOSAL_REVIEW,
];

/**
 * Check if user has a specific permission.
 * @param {Object} user
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "admin") return false;
  return user.adminPermissions?.includes(permission) || false;
}

/**
 * Require Super Admin role.
 * @param {Object} user
 * @returns {boolean}
 */
export function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

/**
 * Check if actor can manage target user.
 * @param {Object} actor
 * @param {Object} target
 * @returns {boolean}
 */
export function canManageUser(actor, target) {
  if (!actor || !target) return false;
  
  // Cannot manage yourself
  if (actor._id.toString() === target._id.toString()) return false;
  
  // Only Super Admin can manage other admins/super admins
  if (target.role === "admin" || target.role === "super_admin") {
    return actor.role === "super_admin";
  }
  
  // Admins with correct permission can manage devotees
  if (target.role === "devotee") {
    return actor.role === "super_admin" || hasPermission(actor, ADMIN_PERMISSIONS.DEVOTEE_STATUS_UPDATE);
  }
  
  return false;
}
