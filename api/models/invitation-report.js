import "server-only";
import mongoose from "mongoose";

/**
 * Invitation Report model.
 * Records invitation activity submitted by active devotees against approved geographic areas.
 * Does NOT collect invitee names, phone numbers, or personal information.
 */
const invitationReportSchema = new mongoose.Schema(
  {
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      required: true,
      index: true,
    },
    contributorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitationCount: {
      type: Number,
      required: true,
      min: [1, "Invitation count must be at least 1"],
    },
    reportDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["active", "flagged", "invalid"],
      default: "active",
      required: true,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for reporting queries & analytics rollups
invitationReportSchema.index({ areaId: 1, status: 1 });
invitationReportSchema.index({ contributorId: 1, status: 1 });
invitationReportSchema.index({ reportDate: 1, status: 1 });

export const InvitationReport =
  mongoose.models.InvitationReport || mongoose.model("InvitationReport", invitationReportSchema);
