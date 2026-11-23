import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { login } from "@/api/services/auth-service.js";
import { deleteAccount } from "@/api/services/account-deletion-service.js";
import { DELETE as deleteAccountRoute } from "@/app/api/admin/accounts/[id]/route.js";
import {
  ACCOUNT_DELETION_POLICY_APPROVED,
  ACCOUNT_DELETION_DISABLED_MESSAGE,
} from "@/api/lib/policies/account-deletion-policy";

const gate = await databaseSuiteGate("account-deletion-disabled");

describe.skipIf(gate.skip)("Account deletion is disabled until retention policy approval", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const originalUri = process.env.MONGODB_URI;
  const createdIds = [];
  let superAdmin, target, cookie;

  beforeAll(async () => {
    const dbName = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
    if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
      throw new Error(`Refusing destructive test against database ${dbName}`);
    }
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
    superAdmin = await User.create({
      email: `disabled-sa-${runId}@example.com`,
      fullName: "Disabled Policy Super Admin",
      phone: "+919876543201",
      gender: "male",
      passwordHash: await hashPassword("DisabledTest!2345"),
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });
    target = await User.create({
      email: `disabled-target-${runId}@example.com`,
      fullName: "Disabled Policy Target",
      phone: "+919876543202",
      gender: "male",
      passwordHash: await hashPassword("DisabledTest!2345"),
      role: "devotee",
      status: "active",
      emailVerified: true,
    });
    createdIds.push(superAdmin._id, target._id);
    const result = await login(superAdmin.email, "DisabledTest!2345", { ip: "10.251.0.1" });
    cookie = `session=${result.sessionCookie.match(/session=([^;]+)/)[1]}`;
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ targetId: { $in: createdIds } });
    await User.deleteMany({ _id: { $in: createdIds } });
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("declares the retention policy unapproved", () => {
    expect(ACCOUNT_DELETION_POLICY_APPROVED).toBe(false);
  });

  it("rejects the DELETE API request with 410 and changes nothing", async () => {
    const response = await deleteAccountRoute(
      new Request(`http://localhost:3000/api/admin/accounts/${target._id}`, {
        method: "DELETE",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ reason: "Attempted deletion while policy is unapproved" }),
      }),
      { params: Promise.resolve({ id: target._id.toString() }) },
    );
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.error?.message ?? body.message).toMatch(/disabled/i);
    expect(await User.findById(target._id)).not.toBeNull();
    expect(
      await AuditLog.countDocuments({ eventType: "admin.account.deleted", targetId: target._id }),
    ).toBe(0);
  });

  it("refuses the service call before any database mutation", async () => {
    await expect(
      deleteAccount(superAdmin, target._id.toString(), "Attempted service deletion"),
    ).rejects.toThrow(/disabled/i);
    expect(await User.findById(target._id)).not.toBeNull();
    expect(
      await AuditLog.countDocuments({ eventType: "admin.account.deleted", targetId: target._id }),
    ).toBe(0);
  });

  it("does not expose a delete path for a Super Admin target either", async () => {
    await expect(
      deleteAccount(superAdmin, superAdmin._id.toString(), "Attempted self deletion"),
    ).rejects.toThrow(/disabled/i);
    expect(await User.findById(superAdmin._id)).not.toBeNull();
  });

  it("does not anonymize or migrate historical records", async () => {
    expect(ACCOUNT_DELETION_DISABLED_MESSAGE).toMatch(/data-retention policy/i);
    expect(await User.findById(target._id)).not.toBeNull();
  });
});
