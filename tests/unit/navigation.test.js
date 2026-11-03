import { describe, expect, it } from "vitest";
import { PRIMARY_NAV_ITEMS, isActivePath } from "@/ui/lib/navigation";

describe("PRIMARY_NAV_ITEMS", () => {
  it("only lists routes that exist in app/", () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.href)).toEqual(["/", "/map", "/about"]);
  });
});

describe("isActivePath", () => {
  it("matches home only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/map")).toBe(false);
  });

  it("matches a section and its nested routes", () => {
    expect(isActivePath("/map", "/map")).toBe(true);
    expect(isActivePath("/map", "/map/area-1")).toBe(true);
    expect(isActivePath("/map", "/mapping")).toBe(false);
  });
});
