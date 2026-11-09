import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with Argon2id.
 * 
 * Uses @node-rs/argon2 (approved in D-06).
 * Parameters tuned for balance between security and performance.
 */

const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hash a plaintext password.
 * @param {string} plaintext
 * @returns {Promise<string>} Argon2id hash
 */
export async function hashPassword(plaintext) {
  return hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a hash.
 * @param {string} plaintext
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plaintext, passwordHash) {
  try {
    return await verify(passwordHash, plaintext);
  } catch (error) {
    // Invalid hash format or verification error
    return false;
  }
}

/**
 * Check if a hash needs rehashing (e.g., after parameter updates).
 * For now, always returns false. Implement when upgrading parameters.
 * @param {string} passwordHash
 * @returns {boolean}
 */
export function needsRehash(passwordHash) {
  return false;
}
