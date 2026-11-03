/**
 * Primary navigation items.
 *
 * Only routes that exist are listed. Authentication, dashboard, and
 * administration entries are added when their pages are implemented
 * (roadmap Stages 2 and 5), never as dead placeholders.
 */
export const PRIMARY_NAV_ITEMS = Object.freeze([
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
]);

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
