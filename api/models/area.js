import "server-only";
import mongoose from "mongoose";

/**
 * Geographic Area model.
 *
 * Represents an official, approved area in the campaign hierarchy.
 * Supports unlimited, flexible parent-child relationships (e.g. Region -> Town -> Locality -> Block).
 * Area types are completely open-ended and not hardcoded to one administrative system.
 * Boundaries are stored as GeoJSON (Polygon or MultiPolygon).
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
      type: Array, // GeoJSON linear ring arrays
      required: true,
    },
  },
  { _id: false },
);

const areaSchema = new mongoose.Schema(
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
    code: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    type: {
      type: String,
      trim: true,
      default: "Locality", // Flexible, free-form, not an enum
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Area",
      default: null,
      index: true,
    },
    ancestorIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Area",
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ["approved", "archived"],
      default: "approved",
      required: true,
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
    populationEstimate: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// 2dsphere indexes for spatial queries
areaSchema.index({ location: "2dsphere" }, { sparse: true });
areaSchema.index({ boundary: "2dsphere" }, { sparse: true });

// Compound indexes for hierarchy and duplicate lookups
areaSchema.index({ parentId: 1, status: 1 });
areaSchema.index({ normalizedName: 1, parentId: 1 });
areaSchema.index({ status: 1, name: 1 });

export const Area = mongoose.models.Area || mongoose.model("Area", areaSchema);
