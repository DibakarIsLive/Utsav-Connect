import "server-only";
import { randomBytes, createHash } from "node:crypto";

/**
 * Token generation and hashing for email verification, password reset, etc.
 */

/**
 * Generate a cryptographically secure random token.
 * @returns {string} 32-byte base64url token
 */
export function generateToken() {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a token using SHA-256.
 * @param {string} token
 * @returns {string} Hex-encoded hash
 */
export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify token format (base64url, correct length).
 * @param {string} token
 * @returns {boolean}
 */
export function isValidTokenFormat(token) {
  if (typeof token !== "string") return false;
  // Base64url tokens from 32 bytes = 43 characters
  if (token.length !== 43) return false;
  // Base64url alphabet: A-Z, a-z, 0-9, -, _
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
