import "server-only";
import mongoose from "mongoose";

/**
 * User model - core account entity.
 * 
 * Roles: devotee, admin, super_admin
 * Status: pending_verification, pending_approval, active, rejected, suspended
 */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never include in queries by default
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    role: {
      type: String,
      enum: ["devotee", "admin", "super_admin"],
      default: "devotee",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending_verification", "pending_approval", "active", "rejected", "suspended", "invited"],
      default: "pending_verification",
      required: true,
      index: true,
    },
    adminPermissions: {
      type: [String],
      default: undefined, // Only set for admin role
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for role + status queries
userSchema.index({ role: 1, status: 1 });

// Safe projection (exclude sensitive fields)
userSchema.statics.safeProjection = {
  passwordHash: 0,
};

// Projection for admin list views (masked PII)
userSchema.statics.adminListProjection = {
  passwordHash: 0,
  phone: 0, // Mask in lists, show in detail with permission
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
