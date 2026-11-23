import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Area } from "@/api/models/area.js";
import { InvitationReport } from "@/api/models/invitation-report.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import {
  submitReport,
  listReports,
  reviewReport,
  getCoverageAnalytics,
} from "@/api/services/invitation-service.js";
import { createArea } from "@/api/services/area-service.js";
import { hashPassword } from "@/api/lib/auth/password.js";

const gate = await databaseSuiteGate("invitation-workflow");

describe.skipIf(gate.skip)("Invitation report workflow", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let activeDevotee, otherDevotee, pendingDevotee;
  let adminReader, areaOnlyAdmin, superAdminUser;
  let testArea;
  const createdUserIds = [];
  const createdAreaIds = [];
  const createdReportIds = [];

  async function makeUser(overrides) {
    const user = await User.create({
      phone: "+919876543230",
      gender: "male",
      passwordHash: await hashPassword("TestPassword123!"),
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
      email: `sa-inv-${runId}@example.com`,
      fullName: "SA Test",
      role: "super_admin",
      status: "active",
    });

    adminReader = await makeUser({
      email: `admin-reader-inv-${runId}@example.com`,
      fullName: "Admin Reader",
      gender: "female",
      phone: "+919876543231",
      role: "admin",
      status: "active",
      adminPermissions: ["invitation-report:read:all", "application:read:all"],
    });

    areaOnlyAdmin = await makeUser({
      email: `admin-area-inv-${runId}@example.com`,
      fullName: "Area Only Admin",
      phone: "+919876543234",
      role: "admin",
      status: "active",
      adminPermissions: ["area:manage"],
    });

    activeDevotee = await makeUser({
      email: `active-devotee-${runId}@example.com`,
      fullName: "Active Devotee Test",
      phone: "+919876543232",
      role: "devotee",
      status: "active",
    });

    otherDevotee = await makeUser({
      email: `other-devotee-${runId}@example.com`,
      fullName: "Other Devotee Test",
      gender: "female",
      phone: "+919876543235",
      role: "devotee",
      status: "active",
    });

    pendingDevotee = await makeUser({
      email: `nonactive-devotee-${runId}@example.com`,
      fullName: "Pending Devotee Test",
      gender: "female",
      phone: "+919876543233",
      role: "devotee",
      status: "pending_approval",
    });

    const areaResult = await createArea(superAdminUser, {
      name: `Invitation Reporting Area ${runId}`,
      type: "Locality",
      code: `TRA-${runId.slice(-6)}`,
      location: { type: "Point", coordinates: [77.209, 28.6139] },
      populationEstimate: 10_000,
    });
    testArea = areaResult.area;
    createdAreaIds.push(testArea._id);
  });

  afterAll(async () => {
    if (createdReportIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdReportIds } });
    }
    await InvitationReport.deleteMany({
      $or: [{ _id: { $in: createdReportIds } }, { areaId: { $in: createdAreaIds } }],
    });
    if (createdAreaIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdAreaIds } });
      await Area.deleteMany({ _id: { $in: createdAreaIds } });
    }
    if (createdUserIds.length > 0) {
      await Session.deleteMany({ userId: { $in: createdUserIds } });
      await AuthToken.deleteMany({ userId: { $in: createdUserIds } });
      await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("submits a report for an approved area and records an audit event", async () => {
    const report = await submitReport(activeDevotee, {
      areaId: testArea._id,
      invitationCount: 500,
      reportDate: new Date("2026-10-01"),
      description: "Door-to-door invitations in the reporting area.",
    });
    createdReportIds.push(report._id);

    expect(report.areaId.toString()).toBe(testArea._id.toString());
    expect(report.contributorId.toString()).toBe(activeDevotee._id.toString());
    expect(report.invitationCount).toBe(500);
    expect(report.status).toBe("active");

    const audit = await AuditLog.findOne({
      targetId: report._id,
      targetType: "InvitationReport",
      eventType: "invitation.reported",
    }).lean();
    expect(audit).not.toBeNull();
    expect(audit.metadata.invitationCount).toBe(500);
    expect(audit.metadata.areaName).toBe(`Invitation Reporting Area ${runId}`);
    expect(audit.metadata).not.toHaveProperty("description");
  });

  it("prevents applicants and administrators from submitting reports", async () => {
    const base = {
      areaId: testArea._id,
      invitationCount: 100,
      reportDate: new Date("2026-10-01"),
    };

    await expect(submitReport(pendingDevotee, base)).rejects.toThrow(/active devotees/);
    await expect(submitReport(superAdminUser, base)).rejects.toThrow(/active devotees/);
    await expect(submitReport(adminReader, base)).rejects.toThrow(/active devotees/);
    await expect(submitReport(null, base)).rejects.toThrow(/Authentication required/);
  });

  it("rejects reports for archived areas and future dates", async () => {
    const archivedArea = await Area.create({
      name: `Archived Invitation Area ${runId}`,
      normalizedName: "archived invitation area",
      type: "Locality",
      code: `ARC-${runId.slice(-6)}`,
      status: "archived",
      location: { type: "Point", coordinates: [77.21, 28.614] },
      populationEstimate: 5000,
    });
    createdAreaIds.push(archivedArea._id);

    await expect(
      submitReport(activeDevotee, {
        areaId: archivedArea._id,
        invitationCount: 100,
        reportDate: new Date("2026-10-01"),
      }),
    ).rejects.toThrow(/not approved/);

    await expect(
      submitReport(activeDevotee, {
        areaId: testArea._id,
        invitationCount: 100,
        reportDate: new Date("2030-10-01"),
      }),
    ).rejects.toMatchObject({
      details: [expect.objectContaining({ message: expect.stringMatching(/future/) })],
    });

    await expect(
      submitReport(activeDevotee, {
        areaId: testArea._id,
        invitationCount: 100,
        reportDate: "not-a-date",
      }),
    ).rejects.toMatchObject({
      details: [expect.objectContaining({ message: expect.stringMatching(/valid report date/) })],
    });
  });

  it("limits devotees to their own reports without exposing contributor identity", async () => {
    const reports = await listReports(activeDevotee);
    const ownReport = reports.find(
      (report) => report._id.toString() === createdReportIds[0].toString(),
    );
    expect(ownReport).toBeDefined();
    expect(ownReport.contributorId).toBeUndefined();

    const otherReports = await listReports(otherDevotee);
    expect(
      otherReports.some((report) => report._id.toString() === createdReportIds[0].toString()),
    ).toBe(false);
  });

  it("does not grant all-report visibility through area:manage", async () => {
    const reports = await listReports(areaOnlyAdmin);
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.some((report) => report._id.toString() === createdReportIds[0].toString())).toBe(
      false,
    );

    await expect(
      reviewReport(areaOnlyAdmin, createdReportIds[0], { status: "flagged" }),
    ).rejects.toThrow(/permission denied/i);
  });

  it("lets an authorised administrator see contributor identity", async () => {
    const reports = await listReports(adminReader);
    const report = reports.find((entry) => entry._id.toString() === createdReportIds[0].toString());
    expect(report).toBeDefined();
    expect(report.contributorId).toBeDefined();
    expect(report.contributorId.fullName).toBe("Active Devotee Test");
    expect(report.contributorId.email).toBe(`active-devotee-${runId}@example.com`);
    expect(report.contributorId.role).toBe("devotee");
  });

  it("requires a written note to invalidate a report", async () => {
    const report = await submitReport(activeDevotee, {
      areaId: testArea._id,
      invitationCount: 300,
      reportDate: new Date("2026-10-02"),
      description: "Second report for review testing.",
    });
    createdReportIds.push(report._id);

    await expect(reviewReport(adminReader, report._id, { status: "invalid" })).rejects.toThrow(
      /audit note/,
    );

    const invalidated = await reviewReport(adminReader, report._id, {
      status: "invalid",
      adminNotes: "Duplicate submission, same day as previous report.",
    });
    expect(invalidated.status).toBe("invalid");
    expect(invalidated.adminNotes).toBe("Duplicate submission, same day as previous report.");
    expect(invalidated.reviewedBy.toString()).toBe(adminReader._id.toString());

    const audit = await AuditLog.findOne({
      targetId: report._id,
      targetType: "InvitationReport",
      eventType: "invitation.invalid",
    }).lean();
    expect(audit).not.toBeNull();
    expect(audit.metadata.hasNote).toBe(true);
    expect(audit.metadata).not.toHaveProperty("adminNotes");
  });

  it("excludes invalidated reports from coverage", async () => {
    const analytics = await getCoverageAnalytics();
    const areaAnalytics = analytics.find((entry) => entry.areaId === testArea._id.toString());
    expect(areaAnalytics).toBeDefined();
    expect(areaAnalytics.totalInvitations).toBe(500);
    expect(areaAnalytics.reportCount).toBe(1);
    expect(areaAnalytics.coveragePercentage).toBe(5);
    expect(areaAnalytics.coverageStatus).toBe("available");
    expect(areaAnalytics.contributorCount).toBe(1);
  });
});
