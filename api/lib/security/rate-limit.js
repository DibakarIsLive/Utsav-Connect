import "server-only";
import { createHash } from "node:crypto";
import { RateLimit } from "../../models/rate-limit.js";
import { connectToDatabase } from "../mongodb/connection.js";
import { RateLimitError } from "../http/errors.js";

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

/**
 * Enforce a fixed-window rate limit backed by MongoDB.
 *
 * Example: enforceRateLimit("login-ip", ip, { limit: 20, windowSeconds: 900 })
 *
 * @param {string} namespace - stable bucket name, e.g. "login-email"
 * @param {string} identifier - IP, email, or combination
 * @param {{ limit: number, windowSeconds: number }} options
 * @returns {Promise<void>}
 * @throws {RateLimitError}
 */
export async function enforceRateLimit(namespace, identifier, options) {
  const { limit, windowSeconds } = options;
  if (!limit || !windowSeconds) return;

  await connectToDatabase();

  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const key = `${namespace}:${bucket}:${digest(identifier || "unknown")}`;
  const expiresAt = new Date((bucket + 1) * windowMs + 60_000);

  const document = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();

  if (document.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000));
    throw new RateLimitError(retryAfterSeconds);
  }
}
