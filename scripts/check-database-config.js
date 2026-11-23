#!/usr/bin/env node
/**
 * scripts/check-database-config.js
 *
 * Show database configuration status.
 * Displays only database names, never credentials or full URIs.
 */
import { loadLocalEnvFile } from "./lib/load-env-file.js";

loadLocalEnvFile();

try {
  const uri = process.env.MONGODB_URI;
  const testUri = process.env.MONGODB_URI_TEST;

  const dbName = (uri) => {
    const pathPart = uri.split("/")[3];
    return pathPart ? pathPart.split("?")[0] : "unknown";
  };

  const appDb = uri ? dbName(uri) : "not configured";
  const testDb = testUri ? dbName(testUri) : "not configured";

  console.log("Database Configuration");
  console.log("────────────────────────────");
  console.log(`Application DB : ${appDb}`);
  console.log(`Test DB        : ${testDb}`);
  console.log("");

  if (uri && testUri && uri === testUri) {
    console.error("\n⚠ WARNING: Application and test databases are the SAME database.");
    process.exit(1);
  } else if (uri && testUri) {
    console.log("✓ Application and test databases are different.");
  } else if (!uri) {
    console.error("❌ MONGODB_URI is not configured.");
    process.exit(1);
  } else if (!testUri) {
    console.error("❌ MONGODB_URI_TEST is not configured.");
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ Environment error: ${error.message}`);
  process.exit(1);
}
