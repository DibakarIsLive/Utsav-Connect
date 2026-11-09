/**
 * Public navigation items.
 *
 * The brand mark is the home link; a separate "Home" item is intentionally
 * absent. Sign-in lives inside /apply, so there is exactly one account entry.
 */
export const PUBLIC_NAV_ITEMS = Object.freeze([
  { href: "/about", label: "About" },
]);

export const ADMIN_PERMISSION_LABELS = Object.freeze({
  "application:read:all": "View applications",
  "application:review:all": "Review applications",
  "application:note:write": "Write review notes",
  "devotee:read:all": "View devotees",
  "devotee:status:update": "Update devotee status",
  "invitation-report:read:all": "View invitation reports",
  "audit:read:all": "View audit log",
  "area:manage": "Manage geographic areas",
  "proposal:review": "Review locality proposals",
});

/**
 * Links shown in the middle of the header.
 * Admins get a single additional workspace link.
 *
 * @param {Object|null} user
 * @returns {Array<{href: string, label: string}>}
 */
export function getPrimaryNavItems(user = null) {
  // The account action already routes signed-in administrators to the admin
  // console, so a second "Admin" link would duplicate it.
  return [...PUBLIC_NAV_ITEMS];
}

/**
 * The single account action in the header. Signed-out visitors always see
 * "Apply to Join" (which contains both application and sign-in). Signed-in
 * users are taken to the one workspace that matches their status.
 *
 * @param {Object|null} user
 * @returns {{href: string, label: string}}
 */
export function getAccountAction(user = null) {
  if (!user) return { href: "/apply", label: "Apply to Join" };
  if (user.role === "admin" || user.role === "super_admin") {
    return { href: "/admin", label: "Admin Console" };
  }
  if (user.status === "active") return { href: "/dashboard", label: "My Dashboard" };
  return { href: "/application-status", label: "My Application" };
}

/**
 * Full navigation model, retained for tests and callers that need both the
 * public links and the account action.
 *
 * @param {Object|null} user
 * @returns {Array<{href: string, label: string}>}
 */
export function getNavigationItems(user = null) {
  return [...getPrimaryNavItems(user), getAccountAction(user)];
}

/**
 * Whether a navigation item should be marked active for the current pathname.
 * The home item is active only on an exact match; other items also match
 * their nested routes (e.g. /map/anything).
 *
 * @param {string} href
 * @param {string} pathname
 */
export function isActivePath(href, pathname) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
