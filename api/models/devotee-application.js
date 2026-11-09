import "server-only";
import mongoose from "mongoose";

/**
 * Devotee application model.
 * 
 * Separate from User - preserves complete application history.
 * Status: pending, approved, rejected
 * isCurrent: true for the active application record
 */

const devoteeApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applicantName: {
      type: String,
      required: true,
    },
    applicantEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    applicantPhone: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    message: {
      type: String, // Optional custom message
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
      index: true,
    },
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNote: {
      type: String, // Internal note (admin-only)
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
devoteeApplicationSchema.index({ userId: 1, isCurrent: 1 });
devoteeApplicationSchema.index({ status: 1, createdAt: -1 });

// Safe projection (exclude internal notes)
devoteeApplicationSchema.statics.applicantProjection = {
  reviewNote: 0,
  reviewedBy: 0,
};

export const DevoteeApplication = mongoose.models.DevoteeApplication || 
  mongoose.model("DevoteeApplication", devoteeApplicationSchema);
