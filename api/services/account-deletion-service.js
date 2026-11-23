import "server-only";
import mongoose from "mongoose";
import { User } from "../models/user.js";
import { Session } from "../models/session.js";
import { AuthToken } from "../models/auth-token.js";
import { AuditLog } from "../models/audit-log.js";
import { DevoteeApplication } from "../models/devotee-application.js";
import { LocalityProposal } from "../models/locality-proposal.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import { ADMIN_PERMISSIONS, hasPermission } from "../lib/auth/permissions.js";
import { ForbiddenError, ConflictError } from "../lib/http/errors.js";
import { assertAccountDeletionEnabled } from "../lib/policies/account-deletion-policy.js";
import { assertWouldLeaveActiveSuperAdmin } from "../lib/auth/super-admin-policy.js";
import { removeCredentialRecord } from "../lib/auth/credential-registry-writer.js";
import { logger } from "../lib/logging/logger.js";

/**
 * Permanent account deletion.
 *
 * Policy (deliberate, not a blind cascade):
 *  - DELETE: User document, all sessions, all auth/recovery/invitation tokens
 *    for the account, and the local credential-registry file (after commit).
 *  - ANONYMIZE: applicant snapshots (DevoteeApplication) and proposal
 *    attribution (LocalityProposal) keep their historical records but lose
 *    personal data and gain an anonymized marker.
 *  - RETAIN: audit history and invitation reports. Audit keeps the target id
 *    as historical attribution; reports keep aggregate counts. A deleted
 *    contributor's identity cannot be resolved from the removed User record.
 *
 * Super Admin accounts cannot be deleted. Self-deletion is refused.
 */

function assertCanDelete(actor, target) {
  if (!actor || !actor._id || actor._id.toString() === target._id.toString()) {
    throw new ForbiddenError("You cannot delete your own account.");
  }

  if (target.role === "devotee") {
    // Deletion is deliberately separate from suspension/reinstatement.
    if (!hasPermission(actor, ADMIN_PERMISSIONS.DEVOTEE_DELETE)) {
      throw new ForbiddenError("Permission denied: devotee:delete required");
    }
    return;
  }

  // Administrator and Super Admin accounts are Super Admin-only, regardless
  // of any granular permission an ordinary admin holds.
  if (actor.role !== "super_admin") {
    throw new ForbiddenError("Only a Super Admin can delete administrator accounts");
  }
  if (target.role === "super_admin") {
    throw new ForbiddenError("Super Admin accounts cannot be deleted.");
  }
}

function anonymizedEmail(userId) {
  return `deleted-${userId}@invalid.local`;
}

/**
 * @param {Object} actor - validated session user
 * @param {string} id - target user id
 * @param {string} reason - mandatory audit reason
 */
export async function deleteAccount(actor, id, reason) {
  // Policy gate: no deletion, anonymization or migration may run until the
  // data-retention policy is formally approved.
  assertAccountDeletionEnabled();

  await connectToDatabase();

  const target = await User.findById(id).lean();
  if (!target) {
    return { id, deleted: false, alreadyDeleted: true };
  }

  assertCanDelete(actor, target);

  assertWouldLeaveActiveSuperAdmin({
    target,
    nextRole: null,
    nextStatus: "suspended",
    activeSuperAdmins: await User.countDocuments({ role: "super_admin", status: "active" }),
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = target._id;
    const deletedAt = new Date();

    await Session.deleteMany({ userId }, { session });
    await AuthToken.deleteMany({ userId }, { session });
    await AuthToken.deleteMany({ email: target.email }, { session });

    // Anonymize applicant snapshots rather than destroying review history.
    await DevoteeApplication.updateMany(
      { userId },
      {
        $set: {
          applicantName: "Deleted account",
          applicantEmail: anonymizedEmail(userId.toString()),
          applicantPhone: "",
          message: "",
          anonymizedAt: deletedAt,
          anonymizedForUserId: userId,
        },
      },
      { session },
    );

    // Keep proposal history; remove the proposer's personal snapshot.
    await LocalityProposal.updateMany(
      { proposedBy: userId },
      {
        $set: {
          proposerName: "Deleted account",
          proposerEmail: anonymizedEmail(userId.toString()),
          anonymizedAt: deletedAt,
          anonymizedForUserId: userId,
        },
      },
      { session },
    );

    await User.deleteOne({ _id: userId }, { session });

    await AuditLog.create(
      [
        {
          eventType: "admin.account.deleted",
          actorId: actor._id,
          actorRole: actor.role,
          targetId: userId,
          targetType: "User",
          metadata: {
            role: target.role,
            previousStatus: target.status,
            hasReason: Boolean(reason?.trim()),
            reasonLength: reason.trim().slice(0, 500).length,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // The original error takes precedence.
    }
    throw error;
  } finally {
    await session.endSession();
  }

  // Only after the database deletion succeeds may local credentials be removed.
  try {
    removeCredentialRecord(target._id.toString());
  } catch (error) {
    logger.warn("credential_registry.delete_failed", {
      userId: target._id.toString(),
      error: error.message,
    });
  }

  return {
    id: target._id.toString(),
    deleted: true,
    role: target.role,
    anonymizedApplications: true,
    retainedAudit: true,
    retainedReports: true,
  };
}
