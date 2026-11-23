/**
 * Shared safety guard for the committed E2E workflow.
 *
 * E2E setup and the E2E app server are only ever allowed to target the
 * dedicated test database. No database name is accepted other than
 * `utsav_connect_test`; the pilot database is explicitly rejected.
 *
 * This module prints no URIs, credentials or secrets — only database names.
 */

export const E2E_ALLOWED_DB = "utsav_connect_test";
export const E2E_FORBIDDEN_DBS = Object.freeze(["utsav_connect_pilot"]);

/**
 * Extract the database name from a MongoDB URI without exposing credentials.
 * @param {unknown} uri
 * @returns {string|null}
 */
export function databaseNameFromUri(uri) {
  if (typeof uri !== "string" || uri.length === 0) return null;
  try {
    const withoutOptions = uri.split("?")[0];
    const schemeEnd = withoutOptions.indexOf("://");
    const authorityAndPath = schemeEnd >= 0 ? withoutOptions.slice(schemeEnd + 3) : withoutOptions;
    const pathSlash = authorityAndPath.indexOf("/");
    if (pathSlash === -1) return null;
    const name = authorityAndPath.slice(pathSlash + 1);
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/**
 * Throw unless the URI points exactly at the permitted E2E database.
 * @param {unknown} uri
 * @returns {string} the validated database name
 */
export function assertE2eDatabaseUri(uri) {
  const name = databaseNameFromUri(uri);
  if (!name) {
    throw new Error("E2E refused: the URI contains no database name.");
  }
  if (E2E_FORBIDDEN_DBS.includes(name)) {
    throw new Error(`E2E refused: ${name} is the real pilot database.`);
  }
  if (name !== E2E_ALLOWED_DB) {
    throw new Error(`E2E refused: ${name} is not the permitted test database (${E2E_ALLOWED_DB}).`);
  }
  return name;
}
