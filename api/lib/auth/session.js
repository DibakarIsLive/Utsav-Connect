import "server-only";
import { generateToken, hashToken } from "./tokens.js";

/**
 * Session management with MongoDB-backed opaque tokens.
 * 
 * Session scopes:
 * - "application": Limited access for verified pending/rejected applicants (D-25)
 * - "full": Complete access for approved devotees and administrators
 */

/**
 * Calculate session expiry timestamps.
 * @param {number} idleDays
 * @param {number} absoluteDays
 * @returns {{ expiresAt: Date, absoluteExpiresAt: Date }}
 */
export function calculateSessionExpiry(idleDays, absoluteDays) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + idleDays * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(now.getTime() + absoluteDays * 24 * 60 * 60 * 1000);
  return { expiresAt, absoluteExpiresAt };
}

/**
 * Generate session token and hash.
 * @returns {{ token: string, tokenHash: string }}
 */
export function generateSessionToken() {
  const token = generateToken();
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

/**
 * Generate secure session cookie value.
 * @param {string} token
 * @returns {string} Cookie string with secure flags
 */
export function generateSessionCookie(token) {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `session=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  
  if (isProduction) {
    parts.push("Secure");
  }
  
  return parts.join("; ");
}

/**
 * Generate cookie to clear session.
 * @returns {string}
 */
export function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

/**
 * Parse session token from cookie header.
 * @param {string | null} cookieHeader
 * @returns {string | null}
 */
export function parseSessionToken(cookieHeader) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith("session="));
  
  if (!sessionCookie) return null;
  
  const token = sessionCookie.substring(8); // "session=".length
  return token || null;
}
