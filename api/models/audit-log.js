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
  }
);

// Indexes for audit queries
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
