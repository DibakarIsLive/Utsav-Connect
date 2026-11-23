import "server-only";
import mongoose from "mongoose";
import { DevoteeApplication } from "../models/devotee-application.js";
import { AuditLog } from "../models/audit-log.js";
import { User } from "../models/user.js";
import { AuthToken } from "../models/auth-token.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TokenInvalidError,
} from "../lib/http/errors.js";
import { hasPermission, ADMIN_PERMISSIONS } from "../lib/auth/permissions.js";
import { getEnv } from "../lib/env/env.js";
import {
  sendApplicationDecision,
  sendAdminInvitation,
  isEmailAvailable,
} from "../lib/email/adapter.js";
import { logger } from "../lib/logging/logger.js";
import { generateToken, hashToken } from "../lib/auth/tokens.js";
import { hashPassword } from "../lib/auth/password.js";
import {
  writeCredentialRecord,
  updateCredentialRecordStatus,
} from "../lib/auth/credential-registry-writer.js";
import { isPlaintextPasswordStorageEnabled } from "../lib/auth/credential-registry-config.js";

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

  const [pending, approved, rejected, activeDevotees, suspendedDevotees] = await Promise.all([
    DevoteeApplication.countDocuments({ status: APPLICATION_STATUS.PENDING }),
    DevoteeApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED }),
    DevoteeApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED }),
    User.countDocuments({ role: "devotee", status: "active" }),
    User.countDocuments({ role: "devotee", status: "suspended" }),
  ]);

  return {
    pending,
    approved,
    rejected,
    activeDevotees,
    suspendedDevotees,
    total: pending + approved + rejected,
  };
}

/**
 * Devotee account counts for the overview. Gated by devotee:read:all so an
 * administrator who can only read applications never sees a fabricated "0"
 * for accounts they are not permitted to view.
 */
export async function getDevoteeStats(admin) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.DEVOTEE_READ_ALL)) {
    throw new ForbiddenError("Permission denied: devotee:read:all required");
  }
  await connectToDatabase();

  const [activeDevotees, suspendedDevotees] = await Promise.all([
    User.countDocuments({ role: "devotee", status: "active" }),
    User.countDocuments({ role: "devotee", status: "suspended" }),
  ]);

  return { activeDevotees, suspendedDevotees };
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

  // Full applicant contact data is only exposed through this audited detail
  // view; list endpoints return masked values.
  await AuditLog.create({
    eventType: "application.viewed",
    actorId: admin._id,
    actorRole: admin.role,
    targetId: application._id,
    targetType: "DevoteeApplication",
  });

  return application;
}

/**
 * Write or replace the internal reviewer note. This is deliberately separate
 * from the approve/reject decision: reviewing an application does not imply
 * permission to write internal notes. The note is never emailed to the
 * applicant and is excluded from applicant-facing projections.
 */
export async function writeApplicationNote(admin, applicationId, note) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.APPLICATION_NOTE_WRITE)) {
    throw new ForbiddenError("Permission denied: application:note:write required");
  }
  const trimmed = typeof note === "string" ? note.trim() : "";
  if (!trimmed) {
    throw new ValidationError(
      [{ path: "note", message: "Enter an internal note." }],
      "An internal note is required.",
    );
  }
  if (trimmed.length > 1000) {
    throw new ValidationError(
      [{ path: "note", message: "Keep the note under 1000 characters." }],
      "The internal note is too long.",
    );
  }

  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const application = await DevoteeApplication.findById(applicationId).session(session);
    if (!application) {
      await session.abortTransaction();
      throw new NotFoundError("Application not found");
    }
    application.reviewNote = trimmed;
    await application.save({ session });
    await session.commitTransaction();
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}
    throw error;
  } finally {
    await session.endSession();
  }

  // Only a length indicator is audited; note content never enters the log.
  await AuditLog.create({
    eventType: "application.note.updated",
    actorId: admin._id,
    actorRole: admin.role,
    targetId: applicationId,
    targetType: "DevoteeApplication",
    metadata: { noteLength: trimmed.length, hasNote: true },
  });

  return { id: applicationId.toString(), noteLength: trimmed.length };
}

/**
 * Approve an application. Approval is the moment a devotee becomes active:
 * the account status becomes `active` (not another pending state) and the
 * verified email is treated as confirmed by the reviewing administrator.
 *
 * @param {Object} admin - Approving admin
 * @param {string} applicationId
 */
export async function approveApplication(admin, applicationId) {
  assertApplicationReviewer(admin);
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await DevoteeApplication.findById(applicationId).session(session);
    if (!application) {
      await session.abortTransaction();
      throw new NotFoundError("Application not found");
    }

    if (application.status !== APPLICATION_STATUS.PENDING) {
      await session.abortTransaction();
      throw new ConflictError("Application has already been reviewed");
    }

    application.status = APPLICATION_STATUS.APPROVED;
    application.reviewedBy = admin._id;
    application.reviewedAt = new Date();
    await application.save({ session });

    await User.findByIdAndUpdate(
      application.userId,
      { status: "active", emailVerified: true },
      { session },
    );

    await session.commitTransaction();

    // Sync credential registry status (best-effort, after commit)
    updateCredentialRecordStatus(application.userId.toString(), "active");

    // Notify the applicant. A delivery failure never rolls back an approval;
    // the decision is recorded regardless and the error stays server-side.
    let emailSent = false;
    if (isEmailAvailable()) {
      try {
        const result = await sendApplicationDecision({
          to: application.applicantEmail,
          decision: "approved",
          nextStepsUrl: `${getEnv().APP_BASE_URL}/apply?mode=login`,
        });
        emailSent = result.accepted;
        if (!result.accepted) {
          logger.warn("application.approved.email_failed", {
            applicationId: application._id.toString(),
            error: result.error,
          });
        }
      } catch (error) {
        logger.error("application.approved.email_failed", {
          applicationId: application._id.toString(),
          error: error.message,
        });
      }
    }

    await AuditLog.create({
      eventType: "application.approved",
      actorId: admin._id,
      actorRole: admin.role,
      targetId: application._id,
      targetType: "DevoteeApplication",
      metadata: {
        notificationEmailAccepted: emailSent,
      },
    });

    return { success: true, application, emailSent };
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // Abort may fail if the transaction was already committed/aborted;
      // the original error takes precedence.
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Reject an application. A reason is mandatory so the decision is documented
 * internally; the applicant still never sees the reviewer's note.
 *
 * @param {Object} admin - Rejecting admin
 * @param {string} applicationId
 */
export async function rejectApplication(admin, applicationId) {
  assertApplicationReviewer(admin);
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await DevoteeApplication.findById(applicationId).session(session);
    if (!application) {
      await session.abortTransaction();
      throw new NotFoundError("Application not found");
    }

    if (application.status !== APPLICATION_STATUS.PENDING) {
      await session.abortTransaction();
      throw new ConflictError("Application has already been reviewed");
    }

    application.status = APPLICATION_STATUS.REJECTED;
    application.reviewedBy = admin._id;
    application.reviewedAt = new Date();
    await application.save({ session });

    await User.findByIdAndUpdate(application.userId, { status: "rejected" }, { session });

    await session.commitTransaction();

    // Sync credential registry status (best-effort, after commit)
    updateCredentialRecordStatus(application.userId.toString(), "rejected");

    let emailSent = false;
    if (isEmailAvailable()) {
      try {
        const result = await sendApplicationDecision({
          to: application.applicantEmail,
          decision: "rejected",
        });
        emailSent = result.accepted;
        if (!result.accepted) {
          logger.warn("application.rejected.email_failed", {
            applicationId: application._id.toString(),
            error: result.error,
          });
        }
      } catch (error) {
        logger.error("application.rejected.email_failed", {
          applicationId: application._id.toString(),
          error: error.message,
        });
      }
    }

    await AuditLog.create({
      eventType: "application.rejected",
      actorId: admin._id,
      actorRole: admin.role,
      targetId: application._id,
      targetType: "DevoteeApplication",
      metadata: {
        notificationEmailAccepted: emailSent,
      },
    });

    return { success: true, application, emailSent };
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // Abort may fail if the transaction was already committed/aborted;
      // the original error takes precedence.
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Invite an administrator. Creates a single-use invitation token and sends an
 * invitation email. Only Super Admin can invite administrators.
 *
 * @param {Object} actor - Super Admin user
 * @param {string} email - Invitee email
 * @param {string[]} permissions - Granular admin permissions to assign
 * @returns {Promise<{ invitationId: string, emailSent: boolean, emailError?: string }>}
 */
export async function inviteAdministrator(actor, email, permissions = []) {
  if (!actor || actor.role !== "super_admin") {
    throw new ForbiddenError("Only Super Admin can invite administrators.");
  }

  await connectToDatabase();

  const normalizedEmail = email.toLowerCase();

  // Validate every requested permission against the known permission set, and
  // store each grant exactly once. Only the 10 declared strings are accepted.
  const validPermissions = new Set(Object.values(ADMIN_PERMISSIONS));
  for (const permission of permissions) {
    if (!validPermissions.has(permission)) {
      throw new ValidationError(
        [{ path: "permissions", message: `Unknown permission: ${permission}` }],
        "Invalid permission requested.",
      );
    }
  }
  const grantedPermissions = [...new Set(permissions)];

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError("An account with this email already exists.");
  }

  // Prevent duplicate active invitations for the same email.
  const existingInvitation = await AuthToken.findOne({
    email: normalizedEmail,
    type: "admin_invitation",
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (existingInvitation) {
    throw new ConflictError("An active invitation already exists for this email.");
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await AuthToken.create({
    tokenHash,
    email: normalizedEmail,
    type: "admin_invitation",
    expiresAt,
    metadata: {
      invitedBy: actor._id,
      permissions: grantedPermissions,
    },
  });

  // Send invitation email.
  let emailSent = false;
  let emailError = null;

  if (isEmailAvailable()) {
    try {
      const inviteUrl = `${getEnv().APP_BASE_URL}/accept-invitation?token=${token}`;
      const result = await sendAdminInvitation({
        to: normalizedEmail,
        token,
        inviteUrl,
        invitedBy: actor.fullName,
      });
      emailSent = result.accepted;
      if (!result.accepted) {
        emailError = "The invitation email could not be delivered.";
        logger.warn("email.admin_invitation.not_sent", {
          invitationId: invitation._id.toString(),
          error: result.error,
        });
      }
    } catch (error) {
      emailError = "The invitation email could not be delivered.";
      logger.error("email.admin_invitation.unexpected", {
        invitationId: invitation._id.toString(),
        error: error.message,
      });
    }
  } else {
    emailError =
      "Email delivery is not configured. Please contact the campaign team to send the invitation.";
    logger.info("email.admin_invitation.skipped", {
      invitationId: invitation._id.toString(),
      reason: "no_provider_configured",
    });
  }

  await AuditLog.create({
    eventType: "admin.invitation.created",
    actorId: actor._id,
    actorRole: actor.role,
    targetId: invitation._id,
    targetType: "AdminInvitation",
    metadata: {
      // Invitee email is PII: never store it in the audit log.
      permissionCount: grantedPermissions.length,
      emailStored: false,
    },
  });

  return {
    invitationId: invitation._id.toString(),
    emailSent,
    emailError,
  };
}

/**
 * Accept an administrator invitation. Validates the token, creates the
 * administrator account with the assigned permissions, and marks the
 * invitation as used.
 *
 * @param {string} token
 * @param {Object} setup - { fullName, password, phone, gender }
 * @returns {Promise<{ userId: string, role: string, adminPermissions: string[] }>}
 */
export async function acceptAdminInvitation(token, setup) {
  await connectToDatabase();

  const tokenHash = hashToken(token);
  const { fullName, password, phone, gender } = setup;

  // Token consumption and account creation must succeed together. Without a
  // transaction, a failed User.create would leave the invitation permanently
  // spent. The atomic findOneAndUpdate below also prevents two concurrent
  // acceptances from both succeeding.
  const session = await mongoose.startSession();
  session.startTransaction();
  let newUser;
  let invitation;
  let grantedPermissions;

  try {
    invitation = await AuthToken.findOneAndUpdate(
      {
        tokenHash,
        type: "admin_invitation",
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after", session },
    );

    if (!invitation) {
      throw new TokenInvalidError("This invitation link is invalid or has expired.");
    }

    const existingUser = await User.findOne({ email: invitation.email }).session(session);
    if (existingUser) {
      throw new ConflictError("An account with this email already exists.");
    }

    // Re-validate at acceptance: invitation metadata lives in the database, so
    // a tampered or legacy record must not grant unknown capabilities.
    const validPermissions = new Set(Object.values(ADMIN_PERMISSIONS));
    grantedPermissions = [...new Set(invitation.metadata?.permissions ?? [])].filter((permission) =>
      validPermissions.has(permission),
    );

    const passwordHash = await hashPassword(password);
    const created = await User.create(
      [
        {
          email: invitation.email,
          fullName: fullName.trim(),
          phone: phone.trim(),
          gender,
          passwordHash,
          role: "admin",
          status: "active",
          emailVerified: true,
          adminPermissions: grantedPermissions,
        },
      ],
      { session },
    );
    newUser = created[0];

    await AuditLog.create(
      [
        {
          eventType: "admin.invitation.accepted",
          actorId: newUser._id,
          actorRole: "admin",
          targetId: newUser._id,
          targetType: "User",
          metadata: {
            invitationId: invitation._id.toString(),
            permissionCount: grantedPermissions.length,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}
    throw error;
  } finally {
    await session.endSession();
  }

  // Local filesystem artifacts are best-effort and must never roll back the
  // committed account.
  const allowPassword = isPlaintextPasswordStorageEnabled("admin");
  const regResult = writeCredentialRecord({
    role: "admin",
    fullName: fullName.trim(),
    email: invitation.email,
    phone: phone.trim(),
    gender,
    status: "active",
    creationSource: "invitation",
    mongoId: newUser._id.toString(),
    password: allowPassword ? password : undefined,
    allowPassword,
  });
  if (!regResult.written) {
    logger.warn("Credential registry write failed: " + regResult.reason);
  }

  return {
    userId: newUser._id.toString(),
    role: newUser.role,
    adminPermissions: newUser.adminPermissions ?? [],
  };
}

/**
 * List pending administrator invitations. Super Admin only.
 *
 * @param {Object} actor - Super Admin user
 * @returns {Promise<Array<{ id, email, invitedBy, invitedAt, expiresAt, permissions }>>}
 */
export async function listAdminInvitations(actor, { audit = false } = {}) {
  if (!actor || actor.role !== "super_admin") {
    throw new ForbiddenError("Only Super Admin can list administrator invitations.");
  }

  await connectToDatabase();

  const invitations = await AuthToken.find({
    type: "admin_invitation",
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  // A deliberate view is audited with only a count — no invitee addresses or
  // permission details. Background refetches after mutations are not views.
  if (audit) {
    await AuditLog.create({
      eventType: "admin.invitation.list_viewed",
      actorId: actor._id,
      actorRole: actor.role,
      targetType: "AdminInvitation",
      metadata: { count: invitations.length },
    });
  }

  return invitations.map((invitation) => ({
    id: invitation._id.toString(),
    email: invitation.email,
    invitedBy: invitation.metadata?.invitedBy,
    invitedAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    permissions: invitation.metadata?.permissions ?? [],
  }));
}

/**
 * Revoke a pending administrator invitation. Super Admin only.
 *
 * @param {Object} actor - Super Admin user
 * @param {string} invitationId
 * @returns {Promise<{ success: boolean }>}
 */
export async function revokeAdminInvitation(actor, invitationId) {
  if (!actor || actor.role !== "super_admin") {
    throw new ForbiddenError("Only Super Admin can revoke administrator invitations.");
  }

  await connectToDatabase();

  const invitation = await AuthToken.findById(invitationId);
  if (!invitation || invitation.type !== "admin_invitation") {
    throw new NotFoundError("Invitation not found.");
  }

  if (invitation.usedAt) {
    throw new ConflictError("This invitation has already been used.");
  }

  await invitation.deleteOne();

  await AuditLog.create({
    eventType: "admin.invitation.revoked",
    actorId: actor._id,
    actorRole: actor.role,
    targetId: invitation._id,
    targetType: "AdminInvitation",
    metadata: {
      // Invitee email is PII: never store it in the audit log.
      revoked: true,
    },
  });

  return { success: true };
}
