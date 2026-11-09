import "server-only";
import { DevoteeApplication } from "../models/devotee-application.js";
import { AuditLog } from "../models/audit-log.js";
import { User } from "../models/user.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../lib/http/errors.js";
import { hasPermission, ADMIN_PERMISSIONS } from "../lib/auth/permissions.js";

/**
 * Admin service - application review, devotee management.
 */

const APPLICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const ALLOWED_APPLICATION_STATUSES = new Set(Object.values(APPLICATION_STATUS));

function assertApplicationReader(admin) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.APPLICATION_READ_ALL)) {
    throw new ForbiddenError("Permission denied: application:read:all required");
  }
}

function assertApplicationReviewer(admin) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.APPLICATION_REVIEW_ALL)) {
    throw new ForbiddenError("Permission denied: application:review:all required");
  }
}

/**
 * List applications with pagination and search (admin).
 * @param {Object} admin - Admin user
 * @param {Object} options - Filter, search and pagination options
 */
export async function listApplications(admin, options = {}) {
  assertApplicationReader(admin);
  await connectToDatabase();

  const { status, search } = options;
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));

  const query = {};
  if (status && ALLOWED_APPLICATION_STATUSES.has(status)) query.status = status;

  if (search && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { applicantName: { $regex: term, $options: "i" } },
      { applicantEmail: { $regex: term, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [total, applications] = await Promise.all([
    DevoteeApplication.countDocuments(query),
    DevoteeApplication.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Counts used by the admin overview. Every value is a live aggregation.
 */
export async function getApplicationStats(admin) {
  assertApplicationReader(admin);
  await connectToDatabase();

  const [pending, approved, rejected, activeDevotees] = await Promise.all([
    DevoteeApplication.countDocuments({ status: APPLICATION_STATUS.PENDING }),
    DevoteeApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED }),
    DevoteeApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED }),
    User.countDocuments({ role: "devotee", status: "active" }),
  ]);

  return {
    pending,
    approved,
    rejected,
    activeDevotees,
    total: pending + approved + rejected,
  };
}

/**
 * Get single application details (admin).
 * @param {Object} admin - Admin user
 * @param {string} applicationId
 */
export async function getApplication(admin, applicationId) {
  assertApplicationReader(admin);
  await connectToDatabase();

  const application = await DevoteeApplication.findById(applicationId).lean();
  if (!application) {
    throw new NotFoundError("Application not found");
  }

  return application;
}

/**
 * Approve an application. Approval is the moment a devotee becomes active:
 * the account status becomes `active` (not another pending state) and the
 * verified email is treated as confirmed by the reviewing administrator.
 *
 * @param {Object} admin - Approving admin
 * @param {string} applicationId
 * @param {string} note - Optional review note
 */
export async function approveApplication(admin, applicationId, note = null) {
  assertApplicationReviewer(admin);
  await connectToDatabase();

  const application = await DevoteeApplication.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new ConflictError("Application has already been reviewed");
  }

  application.status = APPLICATION_STATUS.APPROVED;
  application.reviewedBy = admin._id;
  application.reviewedAt = new Date();
  application.reviewNote = note?.trim() || null;
  await application.save();

  await User.findByIdAndUpdate(application.userId, {
    status: "active",
    emailVerified: true,
  });

  await AuditLog.create({
    eventType: "application.approved",
    actorId: admin._id,
    actorRole: admin.role,
    targetId: application._id,
    targetType: "DevoteeApplication",
    metadata: { note: note ? "[REDACTED]" : undefined },
  });

  return { success: true, application };
}

/**
 * Reject an application. A reason is mandatory so the decision is documented
 * internally; the applicant still never sees the reviewer's note.
 *
 * @param {Object} admin - Rejecting admin
 * @param {string} applicationId
 * @param {string} note - Internal review note (never shown to applicant)
 */
export async function rejectApplication(admin, applicationId, note = null) {
  assertApplicationReviewer(admin);
  await connectToDatabase();

  if (!note || !note.trim()) {
    throw new ValidationError(
      [{ path: "note", message: "A short internal reason is required when rejecting an application." }],
      "A review note is required to reject an application.",
    );
  }

  const application = await DevoteeApplication.findById(applicationId);
  if (!application) {
    throw new NotFoundError("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new ConflictError("Application has already been reviewed");
  }

  application.status = APPLICATION_STATUS.REJECTED;
  application.reviewedBy = admin._id;
  application.reviewedAt = new Date();
  application.reviewNote = note.trim();
  await application.save();

  await User.findByIdAndUpdate(application.userId, { status: "rejected" });

  await AuditLog.create({
    eventType: "application.rejected",
    actorId: admin._id,
    actorRole: admin.role,
    targetId: application._id,
    targetType: "DevoteeApplication",
    metadata: { note: "[REDACTED]" },
  });

  return { success: true, application };
}
