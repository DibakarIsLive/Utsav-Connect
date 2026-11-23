import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Session } from "@/api/models/session.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { Area } from "@/api/models/area.js";
import { InvitationReport } from "@/api/models/invitation-report.js";
import { login, validateSession, logout } from "@/api/services/auth-service.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { hasPermission, ADMIN_PERMISSIONS, isSuperAdmin } from "@/api/lib/auth/permissions.js";
import { listApprovedAreas, createArea } from "@/api/services/area-service.js";
import { listReports, submitReport } from "@/api/services/invitation-service.js";

const gate = await databaseSuiteGate("permission-security");

describe.skipIf(gate.skip)("Permission and security audit", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let superAdminUser, adminUser, limitedAdminUser, reportReaderAdmin, auditReaderAdmin;
  let devoteeUser, pendingUser, rejectedUser, suspendedUser;
  let testArea;
  const createdUserIds = [];
  const createdAreaIds = [];
  const createdReportIds = [];

  async function makeUser(overrides) {
    const user = await User.create({
      phone: "+919876543250",
      gender: "male",
      passwordHash: await hashPassword("TestPassword123!"),
      status: "active",
      emailVerified: true,
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    superAdminUser = await makeUser({
      email: `sa-security-${runId}@example.com`,
      fullName: "Super Admin Security Test",
      role: "super_admin",
    });

    adminUser = await makeUser({
      email: `admin-security-${runId}@example.com`,
      fullName: "Admin Security Test",
      gender: "female",
      phone: "+919876543251",
      role: "admin",
      adminPermissions: ["application:read:all"],
    });

    limitedAdminUser = await makeUser({
      email: `limited-admin-${runId}@example.com`,
      fullName: "Limited Admin Test",
      phone: "+919876543252",
      role: "admin",
      adminPermissions: ["area:manage"],
    });

    reportReaderAdmin = await makeUser({
      email: `report-reader-${runId}@example.com`,
      fullName: "Report Reader Admin",
      phone: "+919876543254",
      role: "admin",
      adminPermissions: ["invitation-report:read:all"],
    });

    auditReaderAdmin = await makeUser({
      email: `audit-reader-${runId}@example.com`,
      fullName: "Audit Reader Admin",
      phone: "+919876543255",
      role: "admin",
      adminPermissions: ["audit:read:all"],
    });

    devoteeUser = await makeUser({
      email: `security-devotee-${runId}@example.com`,
      fullName: "Security Devotee Test",
      phone: "+919876543253",
      role: "devotee",
    });

    pendingUser = await makeUser({
      email: `pending-security-${runId}@example.com`,
      fullName: "Pending Security",
      gender: "female",
      phone: "+919876543256",
      role: "devotee",
      status: "pending_approval",
    });

    rejectedUser = await makeUser({
      email: `rejected-security-${runId}@example.com`,
      fullName: "Rejected Security",
      gender: "female",
      phone: "+919876543257",
      role: "devotee",
      status: "rejected",
    });

    suspendedUser = await makeUser({
      email: `suspended-security-${runId}@example.com`,
      fullName: "Suspended Security",
      phone: "+919876543258",
      role: "devotee",
      status: "suspended",
    });

    const areaResult = await createArea(superAdminUser, {
      name: `Security Test Area ${runId}`,
      type: "Locality",
      code: `SEC-${runId.slice(-6)}`,
      populationEstimate: 5000,
      location: { type: "Point", coordinates: [77.209, 28.6139] },
    });
    testArea = areaResult.area;
    createdAreaIds.push(testArea._id);
  });

  afterAll(async () => {
    if (createdReportIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdReportIds } });
      await InvitationReport.deleteMany({ _id: { $in: createdReportIds } });
    }
    if (createdUserIds.length > 0) {
      await Session.deleteMany({ userId: { $in: createdUserIds } });
      await AuthToken.deleteMany({ userId: { $in: createdUserIds } });
      await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdAreaIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdAreaIds } });
      await Area.deleteMany({ _id: { $in: createdAreaIds } });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  describe("Geography and reporting permissions", () => {
    it("only exposes approved areas through the public listing", async () => {
      const areas = await listApprovedAreas({ search: "Security Test Area" });
      expect(areas.length).toBe(1);
      expect(areas[0].status).toBe("approved");
      expect(areas[0].notes).toBeUndefined();
    });

    it("refuses geography management without area:manage", async () => {
      await expect(
        createArea(devoteeUser, {
          name: "Devotee Area",
          type: "Locality",
          code: "DEV-SEC",
        }),
      ).rejects.toThrow(/area:manage/);

      await expect(
        createArea(adminUser, {
          name: "Admin Area",
          type: "Locality",
          code: "ADM-SEC",
        }),
      ).rejects.toThrow(/area:manage/);
    });

    it("allows an administrator explicitly granted area:manage", async () => {
      const result = await createArea(limitedAdminUser, {
        name: `Limited Admin Area ${runId}`,
        type: "Locality",
        code: `LIM-${runId.slice(-6)}`,
        populationEstimate: 5000,
      });
      createdAreaIds.push(result.area._id);
      expect(result.area.name).toBe(`Limited Admin Area ${runId}`);
    });

    it("does not treat area:manage as an implicit invitation-report grant", async () => {
      const reports = await listReports(limitedAdminUser);
      expect(Array.isArray(reports)).toBe(true);
      expect(
        reports.some((report) => report.areaId?._id?.toString() === testArea._id.toString()),
      ).toBe(false);

      await expect(
        submitReport(adminUser, {
          areaId: testArea._id,
          invitationCount: 10,
          reportDate: new Date("2026-10-01"),
        }),
      ).rejects.toThrow(/active devotees/);
    });

    it("allows an administrator explicitly granted invitation-report:read:all", async () => {
      const report = await submitReport(devoteeUser, {
        areaId: testArea._id,
        invitationCount: 10,
        reportDate: new Date("2026-10-01"),
      });
      createdReportIds.push(report._id);

      const reports = await listReports(reportReaderAdmin);
      const found = reports.find((entry) => entry._id.toString() === report._id.toString());
      expect(found).toBeDefined();
      expect(found.contributorId.email).toBe(devoteeUser.email);
    });
  });

  describe("Role hierarchy", () => {
    it("gives the Super Admin every permission", () => {
      expect(isSuperAdmin(superAdminUser)).toBe(true);
      for (const permission of Object.values(ADMIN_PERMISSIONS)) {
        expect(hasPermission(superAdminUser, permission)).toBe(true);
      }
    });

    it("does not make an audit reader a Super Admin", () => {
      expect(isSuperAdmin(auditReaderAdmin)).toBe(false);
      expect(hasPermission(auditReaderAdmin, ADMIN_PERMISSIONS.AUDIT_READ_ALL)).toBe(true);
      expect(hasPermission(auditReaderAdmin, ADMIN_PERMISSIONS.APPLICATION_REVIEW_ALL)).toBe(false);
    });

    it("never treats a devotee as an administrator", () => {
      expect(isSuperAdmin(devoteeUser)).toBe(false);
      expect(hasPermission(devoteeUser, ADMIN_PERMISSIONS.APPLICATION_READ_ALL)).toBe(false);
      expect(hasPermission(devoteeUser, ADMIN_PERMISSIONS.AUDIT_READ_ALL)).toBe(false);
    });
  });

  describe("Session scope enforcement", () => {
    it("gives an active devotee full scope", async () => {
      const result = await login(devoteeUser.email, "TestPassword123!", {
        userAgent: "test-agent",
        ip: "127.0.0.1",
      });

      expect(result.user.scope).toBe("full");
      expect(result.user.role).toBe("devotee");
      expect(result.user.status).toBe("active");
      expect(result.user).not.toHaveProperty("passwordHash");

      const token = result.sessionCookie.match(/session=([^;]+)/)[1];
      const validated = await validateSession(token);
      expect(validated).not.toBeNull();
      expect(validated.scope).toBe("full");

      await logout(token);
      await expect(validateSession(token)).resolves.toBeNull();
    });

    it("holds pending and rejected applicants to application scope", async () => {
      for (const user of [pendingUser, rejectedUser]) {
        const result = await login(user.email, "TestPassword123!", {
          userAgent: "test-agent",
          ip: "127.0.0.1",
        });
        expect(result.user.scope).toBe("application");
        expect(result.user.status).toBe(user.status);

        const token = result.sessionCookie.match(/session=([^;]+)/)[1];
        const validated = await validateSession(token);
        expect(validated.scope).toBe("application");
        await logout(token);
      }
    });

    it("promotes an existing application session after approval without a new login", async () => {
      const result = await login(pendingUser.email, "TestPassword123!", {
        userAgent: "test-agent",
        ip: "127.0.0.1",
      });
      const token = result.sessionCookie.match(/session=([^;]+)/)[1];
      expect(await validateSession(token)).toMatchObject({ scope: "application" });

      pendingUser.status = "active";
      await pendingUser.save();

      expect(await validateSession(token)).toMatchObject({
        scope: "full",
        status: "active",
      });

      // Restore the fixture for any later assertions.
      pendingUser.status = "pending_approval";
      await pendingUser.save();
      await logout(token);
    });

    it("refuses login for a suspended account", async () => {
      await expect(
        login(suspendedUser.email, "TestPassword123!", {
          userAgent: "test-agent",
          ip: "127.0.0.1",
        }),
      ).rejects.toThrow(/suspended/);
    });

    it("invalidates a live cookie when the account is suspended", async () => {
      const result = await login(devoteeUser.email, "TestPassword123!", {
        userAgent: "test-agent",
        ip: "127.0.0.1",
      });
      const token = result.sessionCookie.match(/session=([^;]+)/)[1];
      expect(await validateSession(token)).not.toBeNull();

      devoteeUser.status = "suspended";
      await devoteeUser.save();

      expect(await validateSession(token)).toBeNull();
      expect(await Session.countDocuments({ userId: devoteeUser._id })).toBe(0);

      devoteeUser.status = "active";
      await devoteeUser.save();
    });

    it("rejects an invalid or tampered session token", async () => {
      expect(await validateSession("not-a-real-token")).toBeNull();
      expect(await validateSession("")).toBeNull();
    });
  });
});
