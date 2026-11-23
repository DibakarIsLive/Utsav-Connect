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
      index: true,
      // Optional for admin invitations: the user is created when the
      // invitation is accepted, so there is no user yet at invitation time.
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      // Stores the invitee email for admin invitations when no user exists yet.
    },
    type: {
      type: String,
      enum: ["email_verification", "password_reset", "admin_invitation"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // The TTL index below is the single index definition for this field.
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
  },
);

// TTL index
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for token lookup
authTokenSchema.index({ userId: 1, type: 1 });

export const AuthToken = mongoose.models.AuthToken || mongoose.model("AuthToken", authTokenSchema);
