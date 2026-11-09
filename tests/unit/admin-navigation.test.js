import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  getAdminNavGroups,
  hasAdminPermission,
  isAdminPathActive,
  isSuperAdmin,
} from "@/ui/lib/admin-navigation";

const devotee = { role: "devotee", status: "active" };
const bareAdmin = { role: "admin", status: "active", adminPermissions: [] };
const moderator = {
  role: "admin",
  status: "active",
  adminPermissions: ["application:read:all", "proposal:review"],
};
const superAdmin = { role: "super_admin", status: "active" };

describe("admin role checks", () => {
  it("recognises only the super_admin role as Super Admin", () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(isSuperAdmin(moderator)).toBe(false);
    expect(isSuperAdmin(devotee)).toBe(false);
  });

  it("grants granular permissions to admins and everything to Super Admins", () => {
    expect(hasAdminPermission(moderator, "application:read:all")).toBe(true);
    expect(hasAdminPermission(moderator, "area:manage")).toBe(false);
    expect(hasAdminPermission(superAdmin, "area:manage")).toBe(true);
    expect(hasAdminPermission(devotee, "application:read:all")).toBe(false);
    expect(hasAdminPermission(null, "application:read:all")).toBe(false);
  });
});

describe("getAdminNavGroups", () => {
  it("returns nothing for devotees and signed-out visitors", () => {
    expect(getAdminNavGroups(devotee)).toEqual([]);
    expect(getAdminNavGroups(null)).toEqual([]);
  });

  it("only shows sections the admin can actually use", () => {
    const groups = getAdminNavGroups(moderator);
    const links = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(links).toContain("/admin");
    expect(links).toContain("/admin/applications");
    expect(links).toContain("/admin/proposals");
    expect(links).not.toContain("/admin/areas");
    expect(links).not.toContain("/admin/invitations");
  });

  it("removes empty sections so the sidebar never shows a dead heading", () => {
    for (const group of getAdminNavGroups(bareAdmin)) {
      expect(group.items.length).toBeGreaterThan(0);
    }
    expect(getAdminNavGroups(bareAdmin).map((group) => group.label)).toEqual(["Workspace"]);
  });

  it("keeps Super Admin functions separated in their own section", () => {
    const groups = getAdminNavGroups(superAdmin);
    const superGroup = groups.find((group) => group.label === "Super Admin");
    expect(superGroup).toBeTruthy();
    expect(superGroup.items.map((item) => item.href)).toEqual([
      "/admin/users",
      "/admin/audit",
    ]);

    const moderatorLinks = getAdminNavGroups(moderator).flatMap((group) =>
      group.items.map((item) => item.href),
    );
    expect(moderatorLinks).not.toContain("/admin/users");
    expect(moderatorLinks).not.toContain("/admin/audit");
  });

  it("every declared item has a real admin route, a label and an icon", () => {
    const items = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
    for (const item of items) {
      expect(item.href.startsWith("/admin")).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
    }
  });
});

describe("isAdminPathActive", () => {
  it("highlights the overview only on an exact match", () => {
    expect(isAdminPathActive("/admin", "/admin")).toBe(true);
    expect(isAdminPathActive("/admin", "/admin/applications")).toBe(false);
  });

  it("highlights nested sections", () => {
    expect(isAdminPathActive("/admin/applications", "/admin/applications/abc")).toBe(true);
    expect(isAdminPathActive("/admin/areas", "/admin/areas/abc")).toBe(true);
    expect(isAdminPathActive("/admin/areas", "/admin/proposals")).toBe(false);
  });
});
