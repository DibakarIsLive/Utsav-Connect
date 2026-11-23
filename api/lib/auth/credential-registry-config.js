import "server-only";

/**
 * Local Development Test Credential Registry - configuration resolver.
 *
 * Centralized, reusable resolver for the STORE_CREDENTIALS_* environment
 * settings. Reads process.env at call time (no module-level caching).
 *
 * IMPORTANT: Next.js loads .env.local into process.env only when the dev
 * server starts. Changing .env.local does NOT take effect until the running
 * Next.js development server is restarted. This module reads the values
 * already present in process.env; it does not re-read .env.local on each
 * call and cannot pick up .env.local changes at runtime.
 *
 * Master switch logic:
 *   - STORE_CREDENTIALS_FOR_ALL_USERS=false  -> all storage disabled
 *   - STORE_CREDENTIALS_FOR_ALL_USERS=true   -> evaluate role-specific settings
 *   - Missing/empty/invalid values default to false
 *   - Only explicit "true" (case-insensitive, trimmed) enables storage
 *
 * This module is server-only. It must never be imported by client code,
 * frontend bundles, or API responses.
 */

const ROLE_KEYS = {
  super_admin: "STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS",
  admin: "STORE_CREDENTIALS_FOR_ALL_ADMINS",
  devotee: "STORE_CREDENTIALS_FOR_ALL_DEVOTEES",
};

const MASTER_KEY = "STORE_CREDENTIALS_FOR_ALL_USERS";

/**
 * Parse a boolean environment value.
 * Accepts only explicit "true" (case-insensitive, trimmed).
 * Missing, empty, or any other value defaults to false.
 *
 * @param {string | undefined} raw
 * @returns {boolean}
 */
function parseBool(raw) {
  if (typeof raw !== "string") {
    return false;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return trimmed.toLowerCase() === "true";
}

/**
 * Determine whether the master switch enables credential storage.
 * Reads process.env at call time (no caching).
 *
 * @returns {boolean}
 */
export function isCredentialStorageEnabled() {
  return parseBool(process.env[MASTER_KEY]);
}

/**
 * Determine whether credential storage is enabled for a specific role.
 * Checks the master switch first, then the role-specific setting.
 *
 * @param {string} role - One of "super_admin", "admin", "devotee"
 * @returns {boolean}
 */
export function isCredentialStorageEnabledForRole(role) {
  if (!isCredentialStorageEnabled()) {
    return false;
  }
  const envKey = ROLE_KEYS[role];
  if (!envKey) {
    return false;
  }
  return parseBool(process.env[envKey]);
}

/**
 * Determine whether plaintext password storage is permitted.
 * Requires all of:
 *   1. Master switch enabled
 *   2. Role-specific switch enabled
 *   3. NODE_ENV === "development" (explicitly local development)
 *
 * @param {string} role - One of "super_admin", "admin", "devotee"
 * @returns {boolean}
 */
export function isPlaintextPasswordStorageEnabled(role) {
  if (!isCredentialStorageEnabledForRole(role)) {
    return false;
  }
  return process.env.NODE_ENV === "development";
}

/**
 * Resolve the complete credential storage configuration for all roles.
 * Useful for diagnostics and the `make users` command.
 *
 * @returns {Object} Object with master switch and per-role booleans
 */
export function resolveCredentialStorageConfig() {
  const master = isCredentialStorageEnabled();
  const roles = {};
  for (const role of Object.keys(ROLE_KEYS)) {
    roles[role] = isCredentialStorageEnabledForRole(role);
  }
  return {
    master,
    roles,
    plaintextPasswordEnabled: {
      super_admin: isPlaintextPasswordStorageEnabled("super_admin"),
      admin: isPlaintextPasswordStorageEnabled("admin"),
      devotee: isPlaintextPasswordStorageEnabled("devotee"),
    },
  };
}
