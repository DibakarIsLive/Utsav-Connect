import { describe, expect, it } from "vitest";
import {
  PUBLIC_NAV_ITEMS,
  getAccountAction,
  getNavigationItems,
  getPrimaryNavItems,
  isActivePath,
} from "@/ui/lib/navigation";

describe("PUBLIC_NAV_ITEMS", () => {
  it("lists only About — the brand mark is the home link", () => {
    expect(PUBLIC_NAV_ITEMS.map((item) => item.href)).toEqual(["/about"]);
    expect(PUBLIC_NAV_ITEMS.map((item) => item.label)).toEqual(["About"]);
  });

  it("never exposes a separate Home, Sign In, Map or Admin item", () => {
    const hrefs = PUBLIC_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/login");
    expect(hrefs).not.toContain("/map");
    expect(hrefs).not.toContain("/admin");
  });
});

describe("getPrimaryNavItems", () => {
  it("returns the same public link for every visitor", () => {
    expect(getPrimaryNavItems(null).map((item) => item.href)).toEqual(["/about"]);
    expect(
      getPrimaryNavItems({ role: "devotee", status: "active" }).map((item) => item.href),
    ).toEqual(["/about"]);
    expect(getPrimaryNavItems({ role: "super_admin", status: "active" }).map((item) => item.href))
      .toEqual(["/about"]);
  });
});

describe("getAccountAction", () => {
  it("offers a single Apply to Join action to signed-out visitors", () => {
    expect(getAccountAction(null)).toEqual({ href: "/apply", label: "Apply to Join" });
  });

  it("routes pending applicants to their application status", () => {
    expect(getAccountAction({ role: "devotee", status: "pending_verification" })).toEqual({
      href: "/application-status",
      label: "My Application",
    });
    expect(getAccountAction({ role: "devotee", status: "pending_approval" })).toEqual({
      href: "/application-status",
      label: "My Application",
    });
  });

  it("routes active devotees to their dashboard", () => {
    expect(getAccountAction({ role: "devotee", status: "active" })).toEqual({
      href: "/dashboard",
      label: "My Dashboard",
    });
  });

  it("routes administrators and Super Admins to the admin console", () => {
    expect(getAccountAction({ role: "admin", status: "active" })).toEqual({
      href: "/admin",
      label: "Admin Console",
    });
    expect(getAccountAction({ role: "super_admin", status: "active" })).toEqual({
      href: "/admin",
      label: "Admin Console",
    });
  });
});

describe("getNavigationItems", () => {
  it("returns one public link plus exactly one account action", () => {
    const items = getNavigationItems(null);
    expect(items.map((item) => item.href)).toEqual(["/about", "/apply"]);
    expect(items).toHaveLength(2);
  });

  it("keeps one account action for an active devotee", () => {
    const items = getNavigationItems({ role: "devotee", status: "active" });
    expect(items.map((item) => item.href)).toEqual(["/about", "/dashboard"]);
  });

  it("keeps one account action for an administrator", () => {
    const items = getNavigationItems({ role: "admin", status: "active" });
    expect(items.map((item) => item.href)).toEqual(["/about", "/admin"]);
  });
});

describe("isActivePath", () => {
  it("matches home only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/about")).toBe(false);
  });

  it("matches a section and its nested routes", () => {
    expect(isActivePath("/about", "/about")).toBe(true);
    expect(isActivePath("/about", "/about/team")).toBe(true);
    expect(isActivePath("/about", "/mapping")).toBe(false);
  });
});
