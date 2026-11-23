import { describe, expect, it } from "vitest";
import { assertWouldLeaveActiveSuperAdmin } from "@/api/lib/auth/super-admin-policy.js";

const only = { _id: "target", role: "super_admin", status: "active" };

describe("active Super Admin invariant", () => {
  it("refuses demotion or suspension of the only active Super Admin", () => {
    expect(() =>
      assertWouldLeaveActiveSuperAdmin({
        target: only,
        nextRole: "admin",
        nextStatus: "active",
        activeSuperAdmins: 1,
      }),
    ).toThrow(/last active Super Admin/i);
    expect(() =>
      assertWouldLeaveActiveSuperAdmin({
        target: only,
        nextRole: "super_admin",
        nextStatus: "suspended",
        activeSuperAdmins: 1,
      }),
    ).toThrow(/last active Super Admin/i);
  });

  it("allows the change when another active Super Admin remains", () => {
    expect(() =>
      assertWouldLeaveActiveSuperAdmin({
        target: only,
        nextRole: "super_admin",
        nextStatus: "suspended",
        activeSuperAdmins: 2,
      }),
    ).not.toThrow();
  });

  it("ignores benign updates and non-Super Admin targets", () => {
    expect(() =>
      assertWouldLeaveActiveSuperAdmin({
        target: only,
        nextRole: "super_admin",
        nextStatus: "active",
        activeSuperAdmins: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertWouldLeaveActiveSuperAdmin({
        target: { role: "admin", status: "active" },
        nextRole: "devotee",
        nextStatus: "suspended",
        activeSuperAdmins: 1,
      }),
    ).not.toThrow();
    expect(() =>
      assertWouldLeaveActiveSuperAdmin({
        target: { role: "super_admin", status: "suspended" },
        nextRole: "admin",
        nextStatus: "suspended",
        activeSuperAdmins: 1,
      }),
    ).not.toThrow();
  });
});
