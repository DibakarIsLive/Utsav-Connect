import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { User } from "@/api/models/user";
import { Session } from "@/api/models/session";
import { AuditLog } from "@/api/models/audit-log";
import { connectToDatabase } from "@/api/lib/mongodb/connection";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { requireSuperAdmin } from "@/api/lib/auth/guards";
import { assertTrustedOrigin } from "@/api/lib/http/origin";
import { ConflictError, ForbiddenError, NotFoundError } from "@/api/lib/http/errors";
import { assertWouldLeaveActiveSuperAdmin } from "@/api/lib/auth/super-admin-policy";
import { writeCredentialRecord } from "@/api/lib/auth/credential-registry-writer";
import { isPlaintextPasswordStorageEnabled } from "@/api/lib/auth/credential-registry-config";
import { updateCredentialRecordStatus } from "@/api/lib/auth/credential-registry-writer";
import { logger } from "@/api/lib/logging/logger";

export const dynamic = "force-dynamic";

const PERMISSION_VALUES = Object.values(ADMIN_PERMISSIONS);

const updateUserSchema = z
  .object({
    role: z.enum(["devotee", "admin", "super_admin"]).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    adminPermissions: z.array(z.enum(PERMISSION_VALUES)).max(20).optional(),
    reason: z.string().trim().min(5, "A written reason is required").max(500).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

async function activeSuperAdminCount(excludeId) {
  return User.countDocuments({
    role: "super_admin",
    status: "active",
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
}

/**
 * PATCH /api/admin/users/:id
 * Super Admin only: change a role, suspend/reactivate an account, or assign
 * granular permissions. Self-modification and removal of the last active
 * Super Admin are refused.
 */
export async function PATCH(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const actor = await requireSuperAdmin(request);
    const { id } = await params;

    await connectToDatabase();

    const target = await User.findById(id).select("-passwordHash");
    if (!target) {
      throw new NotFoundError("Account not found.");
    }

    if (target._id.toString() === actor._id.toString()) {
      throw new ConflictError(
        "You cannot change your own role, status or permissions from this endpoint.",
      );
    }

    const body = await request.json();
    const update = updateUserSchema.parse(body);

    // Super Admin is a role, not an assignable permission: promotion is an
    // owner-controlled operation (D-24) and must never happen via this route.
    if (update.role === "super_admin" && target.role !== "super_admin") {
      throw new ForbiddenError(
        "Super Admin promotion is only available through the owner-controlled bootstrap or recovery process.",
      );
    }

    const nextRole = update.role ?? target.role;
    const nextStatus = update.status ?? target.status;

    // Explicit, testable protection: compute the post-operation count and
    // refuse if it would leave no active Super Admin. Self-modification was
    // already refused above, so the acting Super Admin always remains.
    assertWouldLeaveActiveSuperAdmin({
      target,
      nextRole,
      nextStatus,
      activeSuperAdmins: await activeSuperAdminCount(),
    });

    const changed = {};
    const previousRole = target.role;

    if (update.role !== undefined && update.role !== target.role) {
      changed.role = { from: target.role, to: update.role };
      target.role = update.role;
    }

    if (nextRole === "admin") {
      if (update.adminPermissions !== undefined) {
        target.adminPermissions = [...new Set(update.adminPermissions)];
      } else if (previousRole !== "admin" || !Array.isArray(target.adminPermissions)) {
        target.adminPermissions = [];
      }
      // Otherwise keep the existing grants when only status is being changed.
    } else {
      target.adminPermissions = undefined;
    }

    if (update.status !== undefined && update.status !== target.status) {
      if (!update.reason?.trim()) {
        return errorToResponse({
          code: "VALIDATION_ERROR",
          message: "A written reason is required to change account status.",
          status: 400,
        });
      }
      changed.status = { from: target.status, to: update.status };
      target.status = update.status;
      if (update.status === "active") {
        target.emailVerified = true;
      }
    }

    await target.save();

    // Sync credential registry status (best-effort). `target.status` has
    // already been overwritten above, so the comparison must use the change
    // captured before the assignment — otherwise this branch never runs.
    if (changed.status) {
      try {
        updateCredentialRecordStatus(target._id.toString(), changed.status.to);
      } catch (error) {
        // MongoDB is the source of truth: a registry failure must not fail an
        // already-committed account update. Log identifiers and error text only.
        logger.warn("credential_registry.status_sync_failed", {
          userId: target._id.toString(),
          status: changed.status.to,
          error: error.message,
        });
      }
    }

    if (nextStatus === "suspended") {
      // Revoke every live session immediately; validation also rejects a
      // suspended account, but deleting the records leaves no usable cookie.
      await Session.deleteMany({ userId: target._id });
    }

    await AuditLog.create({
      eventType: "admin.user.updated",
      actorId: actor._id,
      actorRole: actor.role,
      targetId: target._id,
      targetType: "User",
      metadata: {
        changes: changed,
        ...(changed.status
          ? {
              hasReason: Boolean(update.reason?.trim()),
              reasonLength: update.reason.trim().slice(0, 500).length,
            }
          : {}),
        permissionCount: target.adminPermissions?.length ?? 0,
      },
    });

    const safeUser = target.toObject();
    delete safeUser.passwordHash;
    return jsonSuccess({ user: safeUser, message: "Account updated successfully." });
  } catch (error) {
    return errorToResponse(error);
  }
}
