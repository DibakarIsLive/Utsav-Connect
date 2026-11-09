import "server-only";
import { InvitationReport } from "../models/invitation-report.js";
import { Area } from "../models/area.js";
import { AuditLog } from "../models/audit-log.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../lib/http/errors.js";
import { hasPermission, ADMIN_PERMISSIONS } from "../lib/auth/permissions.js";

function canReadAllReports(user) {
  return (
    user?.role === "super_admin" ||
    hasPermission(user, ADMIN_PERMISSIONS.INVITATION_REPORT_READ_ALL) ||
    hasPermission(user, ADMIN_PERMISSIONS.AREA_MANAGE)
  );
}

/**
 * Submit a new invitation report (Active Devotees only).
 */
export async function submitReport(user, data) {
  if (!user) {
    throw new ForbiddenError("Authentication required");
  }
  if (user.role === "devotee" && user.status !== "active") {
    throw new ForbiddenError(
      "Only active devotees with approved applications can submit invitation reports",
    );
  }

  await connectToDatabase();

  const area = await Area.findById(data.areaId);
  if (!area || area.status !== "approved") {
    throw new NotFoundError("Selected geographic area is not approved or does not exist");
  }

  const reportDate = new Date(data.reportDate);
  if (Number.isNaN(reportDate.getTime())) {
    throw new ValidationError([{ path: "reportDate", message: "Enter a valid report date." }]);
  }
  if (reportDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new ValidationError([
      { path: "reportDate", message: "A report date cannot be in the future." },
    ]);
  }

  const report = await InvitationReport.create({
    areaId: area._id,
    contributorId: user._id,
    invitationCount: Number(data.invitationCount),
    reportDate,
    description: data.description?.trim() || undefined,
    status: "active",
  });

  await AuditLog.create({
    eventType: "invitation.reported",
    actorId: user._id,
    actorRole: user.role,
    targetId: report._id,
    targetType: "InvitationReport",
    metadata: {
      areaId: area._id,
      areaName: area.name,
      invitationCount: report.invitationCount,
    },
  });

  return report;
}

/**
 * List invitation reports. Devotees only ever see their own; the contributor
 * filter is not accepted from unprivileged callers.
 */
export async function listReports(user, options = {}) {
  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  await connectToDatabase();

  const isAdmin = canReadAllReports(user);

  const query = {};
  if (!isAdmin) {
    query.contributorId = user._id;
  } else if (options.contributorId) {
    query.contributorId = options.contributorId;
  }

  if (options.areaId) {
    query.areaId = options.areaId;
  }
  if (options.status) {
    query.status = options.status;
  }

  const reports = await InvitationReport.find(query)
    .populate("areaId", "name type code")
    .populate("contributorId", "fullName email role")
    .sort({ reportDate: -1, createdAt: -1 })
    .lean();

  // Contributor identity is an administrative concern. A devotee's own
  // records do not need the populate result echoed back to them.
  if (!isAdmin) {
    return reports.map((report) => ({ ...report, contributorId: undefined }));
  }
  return reports;
}

/**
 * Admin: Review, flag, or invalidate an invitation report.
 * Marking a report invalid requires a written audit note.
 */
export async function reviewReport(admin, reportId, reviewData) {
  if (!canReadAllReports(admin)) {
    throw new ForbiddenError("Permission denied: invitation report access required");
  }

  await connectToDatabase();

  const report = await InvitationReport.findById(reportId);
  if (!report) {
    throw new NotFoundError("Invitation report not found");
  }

  const { status, adminNotes } = reviewData;

  if (status === "invalid" && (!adminNotes || !adminNotes.trim())) {
    throw new ValidationError(
      [{ path: "adminNotes", message: "An audit note is required to invalidate a report." }],
      "An audit note is required to invalidate an invitation report.",
    );
  }

  report.status = status;
  report.reviewedBy = admin._id;
  if (adminNotes !== undefined) {
    report.adminNotes = adminNotes.trim();
  }

  await report.save();

  await AuditLog.create({
    eventType: `invitation.${status}`,
    actorId: admin._id,
    actorRole: admin.role,
    targetId: report._id,
    targetType: "InvitationReport",
    metadata: {
      status,
      hasNote: Boolean(report.adminNotes),
    },
  });

  return report;
}

/**
 * Get coverage analytics for approved areas.
 * Formula: Reported invitation coverage = reported invitations / valid population estimate * 100.
 * Rules:
 * - Missing or zero population means coverage is unavailable (null), not zero.
 * - Values above 100% are displayed and flagged, never capped.
 * - Parent-area aggregates include descendant reports exactly once without double counting.
 */
export async function getCoverageAnalytics() {
  await connectToDatabase();

  const [approvedAreas, activeReports] = await Promise.all([
    Area.find({ status: "approved" }).lean(),
    InvitationReport.find({ status: "active" }).lean(),
  ]);

  const reportsByArea = new Map();
  for (const report of activeReports) {
    const aid = report.areaId.toString();
    if (!reportsByArea.has(aid)) {
      reportsByArea.set(aid, []);
    }
    reportsByArea.get(aid).push(report);
  }

  const childMap = new Map();
  for (const area of approvedAreas) {
    const pid = area.parentId ? area.parentId.toString() : "root";
    if (!childMap.has(pid)) {
      childMap.set(pid, []);
    }
    childMap.get(pid).push(area._id.toString());
  }

  function getDescendantIds(areaId) {
    const children = childMap.get(areaId) || [];
    let descendants = [...children];
    for (const cid of children) {
      descendants = descendants.concat(getDescendantIds(cid));
    }
    return descendants;
  }

  const analytics = [];

  for (const area of approvedAreas) {
    const aid = area._id.toString();
    const descendantIds = [aid, ...getDescendantIds(aid)];

    const countedReportIds = new Set();
    const contributorIds = new Set();
    let totalInvitations = 0;

    const directReports = reportsByArea.get(aid) || [];
    const directInvitationCount = directReports.reduce(
      (sum, report) => sum + (report.invitationCount || 0),
      0,
    );

    for (const did of descendantIds) {
      const areaReports = reportsByArea.get(did) || [];
      for (const report of areaReports) {
        const rid = report._id.toString();
        if (!countedReportIds.has(rid)) {
          countedReportIds.add(rid);
          totalInvitations += report.invitationCount;
          contributorIds.add(report.contributorId.toString());
        }
      }
    }

    const population = area.populationEstimate || 0;
    let coveragePercentage = null;
    let coverageStatus = "available";

    if (population > 0) {
      coveragePercentage = (totalInvitations / population) * 100;
      if (coveragePercentage > 100) {
        coverageStatus = "exceeds_100";
      }
    } else {
      coverageStatus = "unavailable";
    }

    analytics.push({
      areaId: aid,
      name: area.name,
      type: area.type || "Locality",
      code: area.code ?? null,
      parentId: area.parentId ? area.parentId.toString() : null,
      populationEstimate: population > 0 ? population : null,
      totalInvitations,
      reportCount: countedReportIds.size,
      // Direct figures allow a campaign-wide total to be summed without
      // counting any descendant report twice.
      directInvitationCount,
      directReportCount: directReports.length,
      // A count only, never contributor identities or report contents.
      contributorCount: contributorIds.size,
      coveragePercentage:
        coveragePercentage !== null ? Number(coveragePercentage.toFixed(2)) : null,
      coverageStatus,
    });
  }

  return analytics;
}
