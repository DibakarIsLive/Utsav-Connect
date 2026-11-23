import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isolatedLocalDir } from "../helpers/local-workspace.js";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { LocalityProposal } from "@/api/models/locality-proposal.js";
import { InvitationReport } from "@/api/models/invitation-report.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import {
  writeCredentialRecord,
  findCredentialRecord,
} from "@/api/lib/auth/credential-registry-writer.js";
import { deleteAccount } from "@/api/services/account-deletion-service.js";
import { ACCOUNT_DELETION_POLICY_APPROVED } from "@/api/lib/policies/account-deletion-policy";

const gate = await databaseSuiteGate("account-deletion");
const TEST_DIR = isolatedLocalDir("deletion-registry");
const ORIGINAL_CWD = process.cwd();

describe.skipIf(gate.skip || !ACCOUNT_DELETION_POLICY_APPROVED)(
  "Permanent account deletion",
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let userCounter = 0;
    const createdIds = [];
    const superAdmin = {
      _id: new mongoose.Types.ObjectId(),
      role: "super_admin",
      adminPermissions: [],
    };
    const limitedAdmin = {
      _id: new mongoose.Types.ObjectId(),
      role: "admin",
      adminPermissions: ["devotee:read:all", "devotee:status:update", "devotee:delete"],
    };

    beforeAll(async () => {
      const dbName = new URL(TEST_DB_URI).pathname.slice(1);
      if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
        throw new Error(`Refusing destructive deletion test against database ${dbName}`);
      }
      mkdirSync(TEST_DIR, { recursive: true });
      process.env.UTSAV_LOCAL_DIR = TEST_DIR;
      process.chdir(TEST_DIR);
      process.env.MONGODB_URI = TEST_DB_URI;
      resetEnvCache();
      await connectToDatabase({ uri: TEST_DB_URI });
    });

    afterAll(async () => {
      for (const id of createdIds) {
        await Session.deleteMany({ userId: id });
        await AuthToken.deleteMany({ userId: id });
        await DevoteeApplication.deleteMany({ userId: id });
        await LocalityProposal.deleteMany({ proposedBy: id });
        await InvitationReport.deleteMany({ contributorId: id });
        await AuditLog.deleteMany({ targetId: id });
        await User.deleteOne({ _id: id });
      }
      await disconnectFromDatabase();
      process.chdir(ORIGINAL_CWD);
      delete process.env.UTSAV_LOCAL_DIR;
      delete process.env.UTSAV_LOCAL_DIR;
      rmSync(TEST_DIR, { recursive: true, force: true });
      process.env.MONGODB_URI = undefined;
      resetEnvCache();
    });

    async function makeUser(role, permissions = []) {
      userCounter += 1;
      const user = await User.create({
        email: `delete-${role}-${userCounter}-${runId}@example.com`,
        fullName: `Delete ${role} ${runId}`,
        phone: "+919876543210",
        gender: "male",
        passwordHash: await hashPassword("DeletionTest!2345"),
        role,
        status: "active",
        emailVerified: true,
        adminPermissions: role === "admin" ? permissions : undefined,
      });
      createdIds.push(user._id);
      return user;
    }

    it("permanently deletes an administrator and cleans sessions, tokens and local credentials", async () => {
      const target = await makeUser("admin", ["application:read:all"]);
      await Session.create({
        tokenHash: `session-${runId}`,
        userId: target._id,
        scope: "full",
        expiresAt: new Date(Date.now() + 86400000),
        absoluteExpiresAt: new Date(Date.now() + 86400000),
      });
      await AuthToken.create({
        tokenHash: `token-${runId}`,
        userId: target._id,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 86400000),
      });
      writeCredentialRecord({
        role: "admin",
        fullName: target.fullName,
        email: target.email,
        phone: target.phone,
        gender: "male",
        status: "active",
        creationSource: "test",
        mongoId: target._id.toString(),
        allowPassword: false,
      });

      const result = await deleteAccount(
        superAdmin,
        target._id.toString(),
        "Test cleanup of phase account",
      );

      expect(result.deleted).toBe(true);
      expect(await User.findById(target._id)).toBeNull();
      expect(await Session.countDocuments({ userId: target._id })).toBe(0);
      expect(await AuthToken.countDocuments({ userId: target._id })).toBe(0);
      expect(findCredentialRecord(target._id.toString())).toBeNull();
      const audit = await AuditLog.findOne({
        eventType: "admin.account.deleted",
        targetId: target._id,
      });
      expect(audit).not.toBeNull();
      expect(audit.metadata.reason).toMatch(/Test cleanup/);
    });

    it("deletes a devotee by an admin with devotee:delete and anonymizes history", async () => {
      const target = await makeUser("devotee");
      await DevoteeApplication.create({
        userId: target._id,
        applicantName: target.fullName,
        applicantEmail: target.email,
        applicantPhone: target.phone,
        gender: "female",
        status: "pending",
        isCurrent: true,
      });
      await LocalityProposal.create({
        name: `Proposal ${runId}`,
        normalizedName: `proposal ${runId}`,
        status: "pending",
        proposedBy: target._id,
        proposerName: target.fullName,
        proposerEmail: target.email,
      });
      await InvitationReport.create({
        areaId: new mongoose.Types.ObjectId(),
        contributorId: target._id,
        invitationCount: 5,
        reportDate: new Date(),
        status: "active",
      });

      const result = await deleteAccount(
        limitedAdmin,
        target._id.toString(),
        "Temporary test devotee",
      );

      expect(result.deleted).toBe(true);
      expect(await User.findById(target._id)).toBeNull();
      const application = await DevoteeApplication.findOne({ userId: target._id });
      expect(application.applicantName).toBe("Deleted account");
      expect(application.applicantEmail).not.toContain(runId);
      const proposal = await LocalityProposal.findOne({ proposedBy: target._id });
      expect(proposal.proposerName).toBe("Deleted account");
      expect(proposal.anonymizedAt).toBeInstanceOf(Date);
      expect(await InvitationReport.countDocuments({ contributorId: target._id })).toBe(1);
    });

    it("refuses deletion from an admin holding only devotee:status:update", async () => {
      const target = await makeUser("devotee");
      const statusOnly = {
        _id: new mongoose.Types.ObjectId(),
        role: "admin",
        adminPermissions: ["devotee:read:all", "devotee:status:update"],
      };
      await expect(
        deleteAccount(statusOnly, target._id.toString(), "Status-only admin deletion attempt"),
      ).rejects.toThrow(/devotee:delete required/i);
    });

    it("refuses administrator deletion by an ordinary admin with devotee:delete", async () => {
      const target = await makeUser("admin", ["application:read:all"]);
      await expect(
        deleteAccount(limitedAdmin, target._id.toString(), "Privileged deletion attempt"),
      ).rejects.toThrow(/Only a Super Admin/i);
    });

    it("refuses self-deletion, Super Admin deletion and unauthorized callers", async () => {
      const target = await makeUser("devotee");

      const selfActor = await makeUser("super_admin");
      await expect(
        deleteAccount(
          { _id: selfActor._id, role: "super_admin", adminPermissions: [] },
          selfActor._id.toString(),
          "Self deletion",
        ),
      ).rejects.toThrow(/own account/i);
      const otherSuperAdmin = await makeUser("super_admin");
      await expect(
        deleteAccount(superAdmin, otherSuperAdmin._id.toString(), "Delete super admin"),
      ).rejects.toThrow(/Super Admin accounts cannot be deleted/i);

      const unauthorised = {
        _id: new mongoose.Types.ObjectId(),
        role: "admin",
        adminPermissions: ["application:read:all"],
      };
      await expect(
        deleteAccount(unauthorised, target._id.toString(), "Unauthorised deletion"),
      ).rejects.toThrow(/Permission denied/i);
    });

    it("keeps the credential file when the database deletion fails", async () => {
      const target = await makeUser("admin", ["application:read:all"]);
      writeCredentialRecord({
        role: "admin",
        fullName: target.fullName,
        email: target.email,
        phone: target.phone,
        gender: "male",
        status: "active",
        creationSource: "test",
        mongoId: target._id.toString(),
        allowPassword: false,
      });

      const spy = vi.spyOn(User, "deleteOne").mockRejectedValueOnce(new Error("simulated failure"));
      await expect(
        deleteAccount(superAdmin, target._id.toString(), "Simulated failed deletion"),
      ).rejects.toThrow(/simulated failure/i);
      spy.mockRestore();

      expect(findCredentialRecord(target._id.toString())).not.toBeNull();
      expect(await User.findById(target._id)).not.toBeNull();
    });

    it("is idempotent for a repeated deletion request", async () => {
      const target = await makeUser("devotee");
      const first = await deleteAccount(superAdmin, target._id.toString(), "First deletion");
      const second = await deleteAccount(superAdmin, target._id.toString(), "Second deletion");
      expect(first.deleted).toBe(true);
      expect(second).toMatchObject({ deleted: false, alreadyDeleted: true });
    });
  },
);
