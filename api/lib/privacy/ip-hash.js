import "server-only";
import { createHmac } from "node:crypto";
import { getEnv } from "../env/env.js";

/**
 * Privacy-preserving IP hashing for new audit and session records.
 *
 * A plain SHA-256 of an IP address is reversible by enumeration because IPv4
 * space is small. This helper uses keyed HMAC-SHA256 with the server-only
 * AUTH_SECRET, so the digest cannot be reversed without the secret. The `v1:`
 * prefix allows the algorithm or secret to be rotated later without silently
 * changing the meaning of existing records.
 *
 * Existing historical `ipHash` values are NOT rewritten.
 *
 * @param {string|undefined|null} ip
 * @returns {string|undefined}
 */
export function hashIp(ip) {
  if (!ip) return undefined;
  const normalized = String(ip).trim();
  if (!normalized || normalized === "unknown") return undefined;
  return `v1:${createHmac("sha256", getEnv().AUTH_SECRET).update(normalized).digest("hex")}`;
}
