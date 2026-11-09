import "server-only";
import mongoose from "mongoose";

/**
 * Auth token model - email verification, password reset, admin invitations.
 * 
 * Token is hashed at rest. Email/URL contains the unhashed token.
 */

const authTokenSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["email_verification", "password_reset", "admin_invitation"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // For admin invitation: { invitedBy, permissions }
    },
  },
  {
    timestamps: true,
  }
);

// TTL index
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for token lookup
authTokenSchema.index({ userId: 1, type: 1 });

export const AuthToken = mongoose.models.AuthToken || mongoose.model("AuthToken", authTokenSchema);
