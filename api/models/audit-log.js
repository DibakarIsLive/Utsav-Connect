import "server-only";
import mongoose from "mongoose";

/**
 * Audit log model - append-only event log.
 *
 * No PII in metadata. IDs and codes only.
 */

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
      // Examples: user.login, user.logout, application.submitted, application.approved, etc.
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["devotee", "admin", "super_admin", "system"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId, // User, Application, etc.
    },
    targetType: {
      type: String, // "User", "DevoteeApplication", etc.
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Safe, non-PII context
    },
    ipHash: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable after creation
  },
);

// Indexes for audit queries
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

/**
 * Application-level append-only enforcement.
 *
 * An audit record may be inserted, never edited or removed. This protects
 * against accidental or malicious use of the application's own models. It is
 * not a substitute for a database role that denies update/delete at the
 * storage layer, which Atlas shared tiers cannot express per collection.
 *
 * Integration tests run with NODE_ENV=test and clean their own fixtures, so
 * the guard is bypassed only in that environment.
 */
function auditMutationError() {
  return new Error("Audit log entries are append-only and cannot be modified or deleted.");
}

// Mongoose 9 middleware is promise-based: throwing rejects the operation.
// The older `next(err)` callback signature is no longer passed.
auditLogSchema.pre("save", function enforceAppendOnlyOnSave() {
  if (!this.isNew && process.env.NODE_ENV !== "test") {
    throw auditMutationError();
  }
});

for (const operation of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
]) {
  auditLogSchema.pre(operation, function enforceAppendOnlyOnQuery() {
    if (process.env.NODE_ENV === "test") return;
    throw auditMutationError();
  });
}

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
