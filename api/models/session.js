import "server-only";
import mongoose from "mongoose";

/**
 * Session model - opaque MongoDB-backed sessions.
 * 
 * Token is hashed at rest. Cookie contains the unhashed token.
 * Scopes: "application" (limited) or "full" (complete access)
 */

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ["application", "full"],
      required: true,
      default: "full",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    absoluteExpiresAt: {
      type: Date,
      required: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    userAgent: {
      type: String,
    },
    ipHash: {
      type: String, // Hashed IP for audit purposes
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - MongoDB removes expired sessions automatically
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
