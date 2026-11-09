import "server-only";
import mongoose from "mongoose";

/**
 * Locality Proposal model.
 *
 * Devotees and administrators propose new areas and localities here.
 * Pending proposals NEVER touch official Area records or public statistics
 * until an administrator approves them.
 *
 * Lifecycle: pending -> needs_correction -> approved (creates Area) | rejected | duplicate | withdrawn
 * Duplicate detection flags potential matches without automatic merging/deletion.
 */

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  { _id: false },
);

const boundarySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Polygon", "MultiPolygon"],
      required: true,
    },
    coordinates: {
      type: Array,
      required: true,
    },
  },
  { _id: false },
);

const duplicateMatchSchema = new mongoose.Schema(
  {
    areaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
    },
    areaName: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    confidence: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
  },
  { _id: false },
);

const localityProposalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      trim: true,
      default: "Locality",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      default: null,
      index: true,
    },
    placeId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    formattedAddress: {
      type: String,
      trim: true,
    },
    location: {
      type: pointSchema,
      default: undefined,
    },
    boundary: {
      type: boundarySchema,
      default: undefined,
    },
    status: {
      type: String,
      enum: ["pending", "needs_correction", "approved", "rejected", "duplicate", "withdrawn"],
      default: "pending",
      required: true,
      index: true,
    },
    duplicates: {
      type: [duplicateMatchSchema],
      default: [],
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    proposerName: {
      type: String,
      required: true,
    },
    proposerEmail: {
      type: String,
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    correctionNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    approvedAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
localityProposalSchema.index({ status: 1, createdAt: -1 });
localityProposalSchema.index({ proposedBy: 1, status: 1 });
localityProposalSchema.index({ location: "2dsphere" }, { sparse: true });

export const LocalityProposal =
  mongoose.models.LocalityProposal || mongoose.model("LocalityProposal", localityProposalSchema);
