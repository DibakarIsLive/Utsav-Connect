import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Area } from "@/api/models/area.js";
import { InvitationReport } from "@/api/models/invitation-report.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { LocalityProposal } from "@/api/models/locality-proposal.js";
import { getCoverageAnalytics } from "@/api/services/invitation-service.js";
import { hashPassword } from "@/api/lib/auth/password.js";

const gate = await databaseSuiteGate("database-consistency");

describe.skipIf(gate.skip)("Database consistency and coverage analytics", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdUserIds = [];
  const createdAreaIds = [];
  const createdReportIds = [];
  const createdProposalIds = [];

  async function makeDevotee(label) {
    const user = await User.create({
      email: `${label}-${runId}@example.com`,
      fullName: `Consistency ${label}`,
      phone: "+919876543240",
      gender: "male",
      passwordHash: await hashPassword("TestPassword123!"),
      role: "devotee",
      status: "active",
      emailVerified: true,
    });
    createdUserIds.push(user._id);
    return user;
  }

  async function makeArea(name, extra = {}) {
    const area = await Area.create({
      name,
      normalizedName: name.toLowerCase(),
      type: "Locality",
      code: `C-${runId.slice(-6)}-${createdAreaIds.length + 1}`,
      populationEstimate: 1000,
      location: { type: "Point", coordinates: [77.209, 28.6139] },
      ...extra,
    });
    createdAreaIds.push(area._id);
    return area;
  }

  async function makeReport(area, contributor, extra = {}) {
    const report = await InvitationReport.create({
      areaId: area._id,
      contributorId: contributor._id,
      invitationCount: 100,
      reportDate: new Date("2026-10-01"),
      status: "active",
      ...extra,
    });
    createdReportIds.push(report._id);
    return report;
  }

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
  });

  afterAll(async () => {
    if (createdReportIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdReportIds } });
      await InvitationReport.deleteMany({ _id: { $in: createdReportIds } });
    }
    if (createdProposalIds.length > 0) {
      await LocalityProposal.deleteMany({ _id: { $in: createdProposalIds } });
    }
    if (createdAreaIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdAreaIds } });
      await Area.deleteMany({ _id: { $in: createdAreaIds } });
    }
    if (createdUserIds.length > 0) {
      await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("keeps every active report attached to an existing approved area", async () => {
    const devotee = await makeDevotee("area-report");
    const area = await makeArea(`Consistency Area ${runId}`);
    await makeReport(area, devotee);

    const reports = await InvitationReport.find({ _id: { $in: createdReportIds } }).lean();
    for (const report of reports) {
      const referenced = await Area.findById(report.areaId).lean();
      expect(referenced).not.toBeNull();
      expect(referenced.status).toBe("approved");
    }
  });

  it("never counts pending proposals as approved areas", async () => {
    const approvedCountBefore = await Area.countDocuments({ status: "approved" });

    const proposal = await LocalityProposal.create({
      name: `Pending Proposal Area ${runId}`,
      normalizedName: `pending proposal area ${runId}`,
      type: "Locality",
      status: "pending",
      proposedBy: new mongoose.Types.ObjectId(),
      proposerName: "Test Proposer",
      proposerEmail: `proposer-${runId}@example.com`,
    });
    createdProposalIds.push(proposal._id);

    const approvedCountAfter = await Area.countDocuments({ status: "approved" });
    expect(approvedCountAfter).toBe(approvedCountBefore);
  });

  it("excludes invalidated reports from coverage", async () => {
    const devotee = await makeDevotee("invalidated");
    const area = await makeArea(`Invalidated Coverage Area ${runId}`);
    await makeReport(area, devotee, { invitationCount: 150 });
    await makeReport(area, devotee, {
      invitationCount: 50,
      reportDate: new Date("2026-10-02"),
      status: "invalid",
    });

    const analytics = await getCoverageAnalytics();
    const areaAnalytics = analytics.find((entry) => entry.areaId === area._id.toString());
    expect(areaAnalytics).toBeDefined();
    expect(areaAnalytics.totalInvitations).toBe(150);
    expect(areaAnalytics.reportCount).toBe(1);
    expect(areaAnalytics.coveragePercentage).toBe(15);
  });

  it("aggregates descendant reports exactly once at the parent", async () => {
    const parent = await makeArea(`Parent Consistency Area ${runId}`, {
      type: "Region",
      populationEstimate: 100_000,
    });
    const child = await makeArea(`Child Consistency Area ${runId}`, {
      parentId: parent._id,
      ancestorIds: [parent._id],
      populationEstimate: 100_000,
    });
    const devotee = await makeDevotee("child");
    await makeReport(child, devotee, { invitationCount: 50 });

    const analytics = await getCoverageAnalytics();
    const parentAnalytics = analytics.find((entry) => entry.areaId === parent._id.toString());
    const childAnalytics = analytics.find((entry) => entry.areaId === child._id.toString());

    expect(parentAnalytics.totalInvitations).toBe(50);
    expect(parentAnalytics.reportCount).toBe(1);
    expect(parentAnalytics.directInvitationCount).toBe(0);
    expect(childAnalytics.totalInvitations).toBe(50);
    expect(childAnalytics.reportCount).toBe(1);
    expect(childAnalytics.directInvitationCount).toBe(50);
  });

  it("reports coverage as unavailable when population is missing", async () => {
    const devotee = await makeDevotee("no-population");
    const area = await makeArea(`No Population Area ${runId}`, { populationEstimate: 0 });
    await makeReport(area, devotee, { invitationCount: 100 });

    const analytics = await getCoverageAnalytics();
    const areaAnalytics = analytics.find((entry) => entry.areaId === area._id.toString());
    expect(areaAnalytics.coveragePercentage).toBeNull();
    expect(areaAnalytics.coverageStatus).toBe("unavailable");
  });

  it("keeps coverage above 100% visible and flags it", async () => {
    const devotee = await makeDevotee("small-population");
    const area = await makeArea(`Small Population Area ${runId}`, { populationEstimate: 50 });
    await makeReport(area, devotee, { invitationCount: 500 });

    const analytics = await getCoverageAnalytics();
    const areaAnalytics = analytics.find((entry) => entry.areaId === area._id.toString());
    expect(areaAnalytics.coveragePercentage).toBe(1000);
    expect(areaAnalytics.coverageStatus).toBe("exceeds_100");
  });

  it("enforces append-only audit records outside the test environment", async () => {
    const log = await AuditLog.create({
      eventType: "test.append_only",
      actorRole: "system",
      metadata: { runId },
    });

    const previousNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      await expect(
        AuditLog.updateOne({ _id: log._id }, { eventType: "test.tampered" }),
      ).rejects.toThrow(/append-only/);
      await expect(AuditLog.deleteOne({ _id: log._id })).rejects.toThrow(/append-only/);

      const reloaded = await AuditLog.findById(log._id).lean();
      expect(reloaded).not.toBeNull();
      expect(reloaded.eventType).toBe("test.append_only");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    await AuditLog.deleteOne({ _id: log._id });
  });
});
