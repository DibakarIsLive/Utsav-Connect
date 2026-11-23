/**
 * Administrative workspace navigation.
 *
 * Items are filtered against the permissions returned by the session API.
 * The API always re-checks permissions on every request; hiding a link is a
 * usability courtesy, never the security boundary.
 */

export const ADMIN_NAV_GROUPS = Object.freeze([
  {
    label: "Workspace",
    items: [
      { href: "/admin", label: "Overview", icon: "grid", exact: true },
      {
        href: "/admin/analytics",
        label: "Campaign analytics",
        icon: "chart",
        anyPermission: ["area:manage", "invitation-report:read:all"],
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/admin/devotees",
        label: "Devotee management",
        icon: "users",
        permission: "devotee:read:all",
      },
      {
        href: "/admin/applications",
        label: "Applications",
        icon: "user-check",
        permission: "application:read:all",
      },
    ],
  },
  {
    label: "Campaign geography",
    items: [
      {
        href: "/admin/areas",
        label: "Areas",
        icon: "map",
        permission: "area:manage",
      },
      {
        href: "/admin/population",
        label: "Population",
        icon: "chart",
        permission: "area:manage",
      },
      {
        href: "/admin/proposals",
        label: "Proposals",
        icon: "compass",
        permission: "proposal:review",
      },
    ],
  },
  {
    label: "Reporting",
    items: [
      {
        href: "/admin/invitations",
        label: "Invitation reports",
        icon: "report",
        permission: "invitation-report:read:all",
      },
    ],
  },
  {
    label: "Oversight",
    items: [
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: "shield",
        permission: "audit:read:all",
      },
    ],
  },
  {
    label: "Super Admin",
    superAdminOnly: true,
    items: [{ href: "/admin/users", label: "Accounts & roles", icon: "users" }],
  },
]);

export function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

export function hasAdminPermission(user, permission) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (user.role !== "admin") return false;
  return Array.isArray(user.adminPermissions) && user.adminPermissions.includes(permission);
}

/**
 * @param {Object|null} user
 * @param {{ permission?: string, anyPermission?: string[] }} item
 */
export function canAccessAdminItem(user, item) {
  if (!user) return false;
  if (user.role !== "admin" && user.role !== "super_admin") return false;
  if (item.permission) return hasAdminPermission(user, item.permission);
  if (item.anyPermission?.length) {
    return item.anyPermission.some((permission) => hasAdminPermission(user, permission));
  }
  return true;
}

/**
 * Nav groups the signed-in administrator may see. Empty groups are removed so
 * the sidebar never shows a section with nothing beneath it.
 */
export function getAdminNavGroups(user) {
  if (user?.role !== "admin" && user?.role !== "super_admin") return [];
  return ADMIN_NAV_GROUPS.filter((group) => {
    if (group.superAdminOnly && !isSuperAdmin(user)) return false;
    return group.items.some((item) => canAccessAdminItem(user, item));
  }).map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessAdminItem(user, item)),
  }));
}

/**
 * True when the current path should highlight the item. `/admin` only matches
 * exactly; nested pages highlight their section.
 */
export function isAdminPathActive(href, pathname) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
