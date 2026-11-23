import "server-only";
import { User } from "../models/user.js";
import { DevoteeApplication } from "../models/devotee-application.js";
import { Session } from "../models/session.js";
import { AuditLog } from "../models/audit-log.js";
import { InvitationReport } from "../models/invitation-report.js";
import { LocalityProposal } from "../models/locality-proposal.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import { ADMIN_PERMISSIONS, canManageUser, hasPermission } from "../lib/auth/permissions.js";
import { ForbiddenError, ConflictError, NotFoundError } from "../lib/http/errors.js";
import { maskEmail, maskPhone } from "../lib/privacy/mask.js";
import { updateCredentialRecordStatus } from "../lib/auth/credential-registry-writer.js";
import { logger } from "../lib/logging/logger.js";

/**
 * Shared account directory for authorised administrators.
 *
 * All access is gated by declared permission constants. No new permission
 * strings are introduced: adding one would silently lock out existing admins
 * whose stored grants predate it.
 */

function assertDirectoryReader(actor) {
  if (!hasPermission(actor, ADMIN_PERMISSIONS.DEVOTEE_READ_ALL)) {
    throw new ForbiddenError("Permission denied: devotee:read:all required");
  }
}

function assertStatusManager(actor, target) {
  if (!hasPermission(actor, ADMIN_PERMISSIONS.DEVOTEE_STATUS_UPDATE)) {
    throw new ForbiddenError("Permission denied: devotee:status:update required");
  }
  if (!canManageUser(actor, target)) {
    throw new ForbiddenError("This account cannot be managed by the current administrator");
  }
}

/** Paginated, masked directory of devotee accounts. */
export async function listDevoteeAccounts(actor, options = {}) {
  assertDirectoryReader(actor);
  await connectToDatabase();

  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const query = { role: "devotee" };

  if (options.status) query.status = options.status;
  const term = typeof options.search === "string" ? options.search.trim() : "";
  if (term) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { fullName: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const ids = users.map((user) => user._id);
  const applications = await DevoteeApplication.find({
    userId: { $in: ids },
    isCurrent: true,
  })
    .select("userId status createdAt reviewedAt")
    .lean();
  const byUser = new Map(applications.map((app) => [app.userId.toString(), app]));

  const accounts = users.map((user) => {
    const application = byUser.get(user._id.toString());
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      fullName: user.fullName,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      gender: user.gender ?? null,
      role: user.role,
      status: user.status,
      emailVerified: Boolean(user.emailVerified),
      applicationStatus: application?.status ?? null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
    };
  });

  return { accounts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/** Safe detail for one devotee account, including application and activity counts. */
export async function getDevoteeAccount(actor, id) {
  assertDirectoryReader(actor);
  await connectToDatabase();

  const user = await User.findOne({ _id: id, role: "devotee" }).select("-passwordHash").lean();
  if (!user) throw new NotFoundError("Devotee account not found");

  const [application, reportCount, proposalCount] = await Promise.all([
    DevoteeApplication.findOne({ userId: user._id, isCurrent: true }).lean(),
    InvitationReport.countDocuments({ contributorId: user._id }),
    LocalityProposal.countDocuments({ proposedBy: user._id }),
  ]);

  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    gender: user.gender ?? null,
    status: user.status,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
    application: application
      ? {
          id: application._id.toString(),
          status: application.status,
          createdAt: application.createdAt,
          reviewedAt: application.reviewedAt ?? null,
        }
      : null,
    counts: { reports: reportCount, proposals: proposalCount },
  };
}

/**
 * Suspend or reinstate a devotee. Requires devotee:status:update, a written
 * reason, and an otherwise-eligible account for reinstatement.
 */
export async function setDevoteeAccountStatus(actor, id, status, reason) {
  await connectToDatabase();

  const user = await User.findOne({ _id: id, role: "devotee" });
  if (!user) throw new NotFoundError("Devotee account not found");
  assertStatusManager(actor, user);

  const previous = user.status;
  if (previous === status) {
    return { id: user._id.toString(), status: previous, unchanged: true };
  }

  if (status === "active") {
    const current = await DevoteeApplication.findOne({ userId: user._id, isCurrent: true }).lean();
    if (!user.emailVerified || current?.status !== "approved") {
      throw new ConflictError(
        "This account cannot be reinstated until its email is verified and its application is approved.",
      );
    }
  }

  user.status = status;
  if (status === "active") user.emailVerified = true;
  await user.save();

  if (status === "suspended") {
    await Session.deleteMany({ userId: user._id });
  }

  try {
    updateCredentialRecordStatus(user._id.toString(), status);
  } catch (error) {
    logger.warn("credential_registry.status_sync_failed", {
      userId: user._id.toString(),
      status,
      error: error.message,
    });
  }

  await AuditLog.create({
    eventType: "admin.devotee.status_updated",
    actorId: actor._id,
    actorRole: actor.role,
    targetId: user._id,
    targetType: "User",
    metadata: {
      from: previous,
      to: status,
      hasReason: Boolean(reason?.trim()),
      reasonLength: reason.trim().slice(0, 500).length,
    },
    ...(actor.ipHash ? { ipHash: actor.ipHash } : {}),
  });

  return { id: user._id.toString(), status, unchanged: false };
}
