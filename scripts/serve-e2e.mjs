#!/usr/bin/env node
/**
 * Start a Next.js server whose application database is the E2E test database.
 * Refuses to start against the pilot database or any other database.
 *
 * Usage: node scripts/serve-e2e.mjs [--production]
 * Port: E2E_PORT (default 3100). Playwright must use the same base URL.
 */
import { spawn } from "node:child_process";
import { loadLocalEnvFile } from "./lib/load-env-file.js";
import { assertE2eDatabaseUri } from "./lib/e2e-db-guard.js";
import { ensureIsolatedWorkspace } from "../tests/helpers/local-workspace.js";

loadLocalEnvFile();

const dbName = assertE2eDatabaseUri(process.env.MONGODB_URI_TEST);
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST; // override the pilot URI

// Credential registry and dev mail must stay in a run-specific test workspace.
// Reuse the workspace supplied by Playwright, otherwise create a fresh one.
process.env.UTSAV_LOCAL_DIR = ensureIsolatedWorkspace(process.env.UTSAV_LOCAL_DIR, "serve-e2e");

const port = Number(process.env.E2E_PORT || 3100);
const mode = process.argv.includes("--production") ? "start" : "dev";

console.log(`E2E server: ${mode} on port ${port}, database ${dbName}`);

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", mode, "--port", String(port)],
  { stdio: "inherit", env: process.env },
);
child.on("exit", (code) => process.exit(code ?? 0));
