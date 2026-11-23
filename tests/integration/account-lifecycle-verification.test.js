import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isolatedLocalDir } from "../helpers/local-workspace.js";
import { mkdirSync, rmSync } from "node:fs";
import mongoose from "mongoose";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { InvitationReport } from "@/api/models/invitation-report.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { login, validateSession } from "@/api/services/auth-service.js";
import {
  getDevoteeAccount,
  setDevoteeAccountStatus,
} from "@/api/services/devotee-directory-service.js";
import { deleteAccount } from "@/api/services/account-deletion-service.js";
import { ACCOUNT_DELETION_POLICY_APPROVED } from "@/api/lib/policies/account-deletion-policy";
import { PATCH as patchAdmin } from "@/app/api/admin/users/[id]/route.js";
import {
  writeCredentialRecord,
  findCredentialRecord,
} from "@/api/lib/auth/credential-registry-writer.js";

const gate = await databaseSuiteGate("account-lifecycle-verification");
const TEST_DIR = isolatedLocalDir("lifecycle-registry");
const ORIGINAL_CWD = process.cwd();

describe.skipIf(gate.skip)("Full devotee and administrator account lifecycle", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdIds = [];
  let actor;
  let actorCookie;

  beforeAll(async () => {
    // Explicit guard before any destructive operation in this suite.
    const dbName = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
    if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
      throw new Error(`Refusing destructive lifecycle test against database ${dbName}`);
    }
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.UTSAV_LOCAL_DIR = TEST_DIR;
    process.chdir(TEST_DIR);
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
    if (mongoose.connection.name !== dbName) {
      throw new Error(`Resolved database ${mongoose.connection.name} differs from ${dbName}`);
    }
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await Session.deleteMany({ userId: id });
      await AuthToken.deleteMany({ userId: id });
      await DevoteeApplication.deleteMany({ userId: id });
      await InvitationReport.deleteMany({ contributorId: id });
      await AuditLog.deleteMany({ targetId: id });
      await User.deleteOne({ _id: id });
    }
    await disconnectFromDatabase();
    process.chdir(ORIGINAL_CWD);
    delete process.env.UTSAV_LOCAL_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    process.env.MONGODB_URI = undefined;
    resetEnvCache();
  });

  async function makeUser(role, permissions = []) {
    const user = await User.create({
      email: `lifecycle-${role}-${runId}-${createdIds.length}@example.com`,
      fullName: `Lifecycle ${role} ${createdIds.length}`,
      phone: "+919876543210",
      gender: "male",
      passwordHash: await hashPassword("LifecycleTest!2345"),
      role,
      status: "active",
      emailVerified: true,
      adminPermissions: role === "admin" ? permissions : undefined,
    });
    createdIds.push(user._id);
    return user;
  }

  function addRegistry(user, role) {
    writeCredentialRecord({
      role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      status: "active",
      creationSource: "lifecycle-test",
      mongoId: user._id.toString(),
      allowPassword: false,
    });
  }

  function adminRequest(path, { method = "GET", cookie, body } = {}) {
    const headers = { ...(cookie ? { cookie } : {}) };
    if (body !== undefined) headers["content-type"] = "application/json";
    return new Request(`http://localhost:3000${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    actor = await makeUser("super_admin");
    addRegistry(actor, "super_admin");
    const result = await login(actor.email, "LifecycleTest!2345", { ip: "10.240.0.1" });
    actorCookie = result.sessionCookie;
  });

  it("create → inspect a disposable devotee", async () => {
    const devotee = await makeUser("devotee");
    addRegistry(devotee, "devotee");
    await DevoteeApplication.create({
      userId: devotee._id,
      applicantName: devotee.fullName,
      applicantEmail: devotee.email,
      applicantPhone: devotee.phone,
      gender: "male",
      status: "approved",
      isCurrent: true,
    });
    const detail = await getDevoteeAccount(actor, devotee._id.toString());
    expect(detail.email).toBe(devotee.email);
    expect(detail.application.status).toBe("approved");
    expect(findCredentialRecord(devotee._id.toString())).not.toBeNull();
  });

  it("suspend requires a reason, revokes sessions, syncs registry and writes audit", async () => {
    const devotee = await makeUser("devotee");
    addRegistry(devotee, "devotee");
    const sessionResult = await login(devotee.email, "LifecycleTest!2345", { ip: "10.240.0.2" });
    const token = sessionResult.sessionCookie.match(/session=([^;]+)/)[1];
    await AuthToken.create({
      tokenHash: `lifecycle-token-${runId}`,
      userId: devotee._id,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const result = await setDevoteeAccountStatus(
      actor,
      devotee._id.toString(),
      "suspended",
      "Misconduct during acceptance testing",
    );
    expect(result.status).toBe("suspended");
    expect(await Session.countDocuments({ userId: devotee._id })).toBe(0);
    expect(await validateSession(token)).toBeNull();
    await expect(login(devotee.email, "LifecycleTest!2345", { ip: "10.240.0.3" })).rejects.toThrow(
      /suspended/i,
    );
    expect(findCredentialRecord(devotee._id.toString()).status).toBe("suspended");
    const audit = await AuditLog.findOne({
      eventType: "admin.devotee.status_updated",
      targetId: devotee._id,
      "metadata.from": "active",
      "metadata.to": "suspended",
    });
    expect(audit).not.toBeNull();
    expect(audit.metadata.hasReason).toBe(true);
    expect(audit.metadata.reasonLength).toBeGreaterThan(0);
  });

  it("reinstate restores access, syncs registry and writes audit", async () => {
    const devotee = await makeUser("devotee");
    addRegistry(devotee, "devotee");
    await DevoteeApplication.create({
      userId: devotee._id,
      applicantName: devotee.fullName,
      applicantEmail: devotee.email,
      applicantPhone: devotee.phone,
      gender: "male",
      status: "approved",
      isCurrent: true,
    });
    await setDevoteeAccountStatus(
      actor,
      devotee._id.toString(),
      "suspended",
      "Temporary suspension",
    );
    const result = await setDevoteeAccountStatus(
      actor,
      devotee._id.toString(),
      "active",
      "Reinstatement after review",
    );
    expect(result.status).toBe("active");
    expect(findCredentialRecord(devotee._id.toString()).status).toBe("active");
    const audit = await AuditLog.findOne({
      eventType: "admin.devotee.status_updated",
      targetId: devotee._id,
      "metadata.to": "active",
    });
    expect(audit).not.toBeNull();
    const relogin = await login(devotee.email, "LifecycleTest!2345", { ip: "10.240.0.4" });
    expect(relogin.user.status).toBe("active");
  });

  it.skipIf(!ACCOUNT_DELETION_POLICY_APPROVED)(
    "delete a suspended devotee: identity cleanup, registry removal after commit, retained history",
    async () => {
      const devotee = await makeUser("devotee");
      addRegistry(devotee, "devotee");
      await DevoteeApplication.create({
        userId: devotee._id,
        applicantName: devotee.fullName,
        applicantEmail: devotee.email,
        applicantPhone: devotee.phone,
        gender: "male",
        status: "pending",
        isCurrent: true,
      });
      await InvitationReport.create({
        areaId: new mongoose.Types.ObjectId(),
        contributorId: devotee._id,
        invitationCount: 7,
        reportDate: new Date(),
        status: "active",
      });
      await AuthToken.create({
        tokenHash: `lifecycle-delete-token-${runId}`,
        userId: devotee._id,
        email: devotee.email,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 86400000),
      });
      await login(devotee.email, "LifecycleTest!2345", { ip: "10.240.0.5" });
      await setDevoteeAccountStatus(
        actor,
        devotee._id.toString(),
        "suspended",
        "Suspend before deletion",
      );

      const result = await deleteAccount(
        actor,
        devotee._id.toString(),
        "Remove temporary acceptance devotee",
      );
      expect(result.deleted).toBe(true);
      expect(await User.findById(devotee._id)).toBeNull();
      expect(await Session.countDocuments({ userId: devotee._id })).toBe(0);
      expect(await AuthToken.countDocuments({ userId: devotee._id })).toBe(0);
      expect(await AuthToken.countDocuments({ email: devotee.email })).toBe(0);
      expect(findCredentialRecord(devotee._id.toString())).toBeNull();
      const application = await DevoteeApplication.findOne({ userId: devotee._id });
      expect(application.applicantName).toBe("Deleted account");
      expect(application.anonymizedAt).toBeInstanceOf(Date);
      expect(await InvitationReport.countDocuments({ contributorId: devotee._id })).toBe(1);
      expect(
        await AuditLog.countDocuments({
          eventType: "admin.account.deleted",
          targetId: devotee._id,
        }),
      ).toBe(1);
    },
  );

  it.skipIf(!ACCOUNT_DELETION_POLICY_APPROVED)(
    "protects the acting Super Admin and the platform's Super Admin population",
    async () => {
      const otherSuperAdmin = await makeUser("super_admin");
      await expect(deleteAccount(actor, actor._id.toString(), "Self deletion")).rejects.toThrow(
        /own account/i,
      );
      await expect(
        deleteAccount(actor, otherSuperAdmin._id.toString(), "Delete another Super Admin"),
      ).rejects.toThrow(/Super Admin accounts cannot be deleted/i);
      expect(
        await User.countDocuments({ role: "super_admin", status: "active" }),
      ).toBeGreaterThanOrEqual(1);
    },
  );

  it.skipIf(!ACCOUNT_DELETION_POLICY_APPROVED)(
    "admin lifecycle: reason required, sessions revoked, registry synced, delete by Super Admin",
    async () => {
      const admin = await makeUser("admin", ["application:read:all"]);
      addRegistry(admin, "admin");
      const victim = await login(admin.email, "LifecycleTest!2345", { ip: "10.240.0.6" });
      const victimToken = victim.sessionCookie.match(/session=([^;]+)/)[1];
      const path = `/api/admin/users/${admin._id}`;

      const missingReason = await patchAdmin(
        adminRequest(path, {
          method: "PATCH",
          cookie: actorCookie,
          body: { status: "suspended" },
        }),
        { params: Promise.resolve({ id: admin._id.toString() }) },
      );
      expect(missingReason.status).toBe(400);

      const suspended = await patchAdmin(
        adminRequest(path, {
          method: "PATCH",
          cookie: actorCookie,
          body: { status: "suspended", reason: "Temporary admin suspension" },
        }),
        { params: Promise.resolve({ id: admin._id.toString() }) },
      );
      expect(suspended.status).toBe(200);
      expect(await Session.countDocuments({ userId: admin._id })).toBe(0);
      expect(await validateSession(victimToken)).toBeNull();
      expect(findCredentialRecord(admin._id.toString()).status).toBe("suspended");
      const audit = await AuditLog.findOne({
        eventType: "admin.user.updated",
        targetId: admin._id,
      });
      expect(audit.metadata.hasReason).toBe(true);
      expect(audit.metadata.reasonLength).toBeGreaterThan(0);

      const reinstated = await patchAdmin(
        adminRequest(path, {
          method: "PATCH",
          cookie: actorCookie,
          body: { status: "active", reason: "Reinstatement after review" },
        }),
        { params: Promise.resolve({ id: admin._id.toString() }) },
      );
      expect(reinstated.status).toBe(200);
      expect(findCredentialRecord(admin._id.toString()).status).toBe("active");

      await login(admin.email, "LifecycleTest!2345", { ip: "10.240.0.7" });
      const deleted = await deleteAccount(actor, admin._id.toString(), "Remove temporary admin");
      expect(deleted.deleted).toBe(true);
      expect(await User.findById(admin._id)).toBeNull();
      expect(await Session.countDocuments({ userId: admin._id })).toBe(0);
      expect(findCredentialRecord(admin._id.toString())).toBeNull();
      expect(
        await AuditLog.countDocuments({ eventType: "admin.account.deleted", targetId: admin._id }),
      ).toBe(1);
    },
  );
});
