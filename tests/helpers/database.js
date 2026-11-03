import mongoose from "mongoose";

/**
 * Test-only helpers for the MongoDB integration suites.
 *
 * Integration tests run against MONGODB_URI_TEST (never the development
 * database). When MongoDB is unreachable the suites are skipped with a clear
 * message, unless UTSAV_TEST_REQUIRE_DB=1 turns that into a failure (CI).
 */

export const TEST_DB_URI = process.env.MONGODB_URI_TEST ?? "";
export const UNREACHABLE_DB_URI = "mongodb://127.0.0.1:1/utsav_connect_unreachable";

export function assertSafeTestUri(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI_TEST is not set (see .env.example).");
  }
  if (!/_test(\?|$)/.test(uri)) {
    throw new Error(
      'Refusing to run integration tests: MONGODB_URI_TEST must point at a database whose name ends with "_test".',
    );
  }
}

/**
 * @returns {Promise<{ reachable: boolean, reason?: string }>}
 */
export async function probeTestDatabase() {
  if (!TEST_DB_URI) {
    return { reachable: false, reason: "MONGODB_URI_TEST is not set" };
  }
  assertSafeTestUri(TEST_DB_URI);
  const probe = mongoose.createConnection(TEST_DB_URI, {
    serverSelectionTimeoutMS: 2_000,
    connectTimeoutMS: 2_000,
  });
  try {
    await probe.asPromise();
    await probe.db.admin().ping();
    return { reachable: true };
  } catch (error) {
    return { reachable: false, reason: `${error.name}: ${error.message}` };
  } finally {
    await probe.close().catch(() => {});
  }
}

/**
 * Decide whether an integration suite should run, honouring UTSAV_TEST_REQUIRE_DB.
 *
 * @param {string} suiteName
 */
export async function databaseSuiteGate(suiteName) {
  const { reachable, reason } = await probeTestDatabase();
  if (reachable) {
    return { skip: false };
  }
  const message = `[${suiteName}] MongoDB test database unreachable: ${reason}.`;
  if (process.env.UTSAV_TEST_REQUIRE_DB === "1") {
    throw new Error(`${message} UTSAV_TEST_REQUIRE_DB=1 so this is a failure.`);
  }
  console.warn(`${message} Suite skipped (set UTSAV_TEST_REQUIRE_DB=1 to fail instead).`);
  return { skip: true };
}
