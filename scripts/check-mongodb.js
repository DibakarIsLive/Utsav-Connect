#!/usr/bin/env node
/**
 * Verify that MongoDB is reachable with the configured MONGODB_URI.
 * Run as `npm run check:db` / `make check-db`. Exit code 0 = reachable.
 *
 * Loads `.env.local` (if present) the same way the test setup does, then
 * performs a single ping with a short timeout. Prints host and database
 * name only — never the full URI, which may contain credentials.
 */
import mongoose from "mongoose";
import { loadLocalEnvFile } from "./lib/load-env-file.js";

loadLocalEnvFile();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env.local and configure it.");
  process.exit(1);
}

const startedAt = performance.now();

try {
  const instance = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
  await instance.connection.db.admin().ping();
  const latency = Math.round(performance.now() - startedAt);
  console.log(
    `MongoDB reachable: host=${instance.connection.host} database=${instance.connection.name} latency=${latency}ms`,
  );
  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error(`MongoDB NOT reachable: ${error.name}: ${error.message}`);
  process.exit(1);
}
