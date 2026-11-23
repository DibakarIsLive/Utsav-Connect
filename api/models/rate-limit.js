import "server-only";
import mongoose from "mongoose";

/**
 * Fixed-window rate-limit counters, stored in MongoDB so limits survive a
 * serverless/process restart and are shared by every app instance.
 *
 * The document key already contains the window bucket, so each bucket is a
 * separate document and the TTL index removes it shortly after the window.
 */
const rateLimitSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: false },
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

export const RateLimit = mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema);
