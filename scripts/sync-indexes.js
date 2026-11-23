#!/usr/bin/env node
/**
 * Non-destructive MongoDB index management for all nine Mongoose models.
 *
 * Modes:
 *   --inspect       READ ONLY: report existing, missing and conflicting indexes
 *   --dry-run       READ ONLY: also print the exact createIndex calls planned
 *   --apply         create ONLY missing indexes (additive; never drops)
 *
 * The legacy `model.syncIndexes()` approach is deliberately NOT used: it drops
 * indexes that are absent from the current schema. This script never calls
 * dropIndexes(), syncIndexes(), or any destructive operation.
 *
 * The pilot database is protected: --apply on `utsav_connect_pilot` requires
 * an explicit --allow-pilot flag. --inspect and --dry-run are always read-only.
 */
import { loadLocalEnvFile } from "./lib/load-env-file.js";

loadLocalEnvFile();

const args = process.argv.slice(2);
const mode = args.includes("--apply")
  ? "apply"
  : args.includes("--dry-run")
    ? "dry-run"
    : "inspect";
const allowPilot = args.includes("--allow-pilot");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not configured.");
  process.exit(1);
}

const dbName = (() => {
  try {
    const withoutOptions = uri.split("?")[0];
    const schemeEnd = withoutOptions.indexOf("://");
    const authorityAndPath = schemeEnd >= 0 ? withoutOptions.slice(schemeEnd + 3) : withoutOptions;
    const pathSlash = authorityAndPath.indexOf("/");
    return pathSlash === -1 ? null : authorityAndPath.slice(pathSlash + 1) || null;
  } catch {
    return null;
  }
})();

if (!dbName) {
  console.error("Refusing to manage indexes: the URI has no database name.");
  process.exit(1);
}
if (mode === "apply" && dbName === "utsav_connect_pilot" && !allowPilot) {
  console.error(
    "Refusing to modify pilot database indexes without --allow-pilot. Use --inspect for a read-only check.",
  );
  process.exit(1);
}

const mongoose = (await import("mongoose")).default;

const modelFiles = [
  "../api/models/user.js",
  "../api/models/session.js",
  "../api/models/auth-token.js",
  "../api/models/rate-limit.js",
  "../api/models/devotee-application.js",
  "../api/models/area.js",
  "../api/models/locality-proposal.js",
  "../api/models/invitation-report.js",
  "../api/models/audit-log.js",
];
for (const file of modelFiles) await import(file);

const modelNames = [
  "User",
  "Session",
  "AuthToken",
  "RateLimit",
  "DevoteeApplication",
  "Area",
  "LocalityProposal",
  "InvitationReport",
  "AuditLog",
];

function canonicalKeys(spec) {
  return JSON.stringify(
    Object.keys(spec)
      .sort()
      .reduce((acc, key) => {
        acc[key] = spec[key];
        return acc;
      }, {}),
  );
}

function comparableOptions(options = {}) {
  const picked = {};
  for (const key of ["unique", "sparse", "partialFilterExpression"]) {
    if (options[key] !== undefined) picked[key] = options[key];
  }
  return JSON.stringify(
    Object.keys(picked)
      .sort()
      .reduce((acc, key) => {
        acc[key] = picked[key];
        return acc;
      }, {}),
  );
}

function describe(spec, options = {}) {
  const keys = Object.entries(spec)
    .map(([key, direction]) => `${key}:${direction}`)
    .join(",");
  const flags = [];
  if (options.unique) flags.push("unique");
  if (options.sparse) flags.push("sparse");
  if (options.expireAfterSeconds !== undefined) flags.push(`TTL:${options.expireAfterSeconds}`);
  if (options.partialFilterExpression) flags.push("partial");
  return `${keys}${flags.length ? ` [${flags.join(" ")}]` : ""}`;
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
if (mongoose.connection.name !== dbName) {
  await mongoose.disconnect();
  throw new Error("Resolved database name did not match the configured URI.");
}

console.log(`Index management — database: ${dbName} (${mode})`);
console.log(`Models inspected: ${modelNames.length}`);

const report = { existing: [], missing: [], conflicting: [] };

for (const name of modelNames) {
  const model = mongoose.model(name);
  const collection = model.collection;
  const existing = await collection.indexes();
  const desired = model.schema.indexes();

  const existingByKeys = new Map(existing.map((idx) => [canonicalKeys(idx.key), idx]));
  const desiredByKeys = new Map(
    desired.map(([spec]) => [
      canonicalKeys(spec),
      { spec, options: desired.find(([s]) => canonicalKeys(s) === canonicalKeys(spec))[1] },
    ]),
  );
  const existingNames = new Set(existing.map((idx) => idx.name).filter(Boolean));

  for (const idx of existing) {
    report.existing.push({ model: name, name: idx.name, spec: describe(idx.key, idx) });
  }

  for (const [keyKey, entry] of desiredByKeys) {
    const found = existingByKeys.get(keyKey);
    const desiredName = entry.options?.name;
    if (!found) {
      if (desiredName && existingNames.has(desiredName)) {
        report.conflicting.push({
          model: name,
          detail: `desired ${desiredName} (${describe(entry.spec, entry.options)}) conflicts with an existing index of the same name on different keys`,
        });
      } else {
        report.missing.push({
          model: name,
          collection: collection.name,
          spec: entry.spec,
          options: entry.options || {},
          label: describe(entry.spec, entry.options),
        });
      }
      continue;
    }
    if (comparableOptions(found) !== comparableOptions(entry.options || {})) {
      report.conflicting.push({
        model: name,
        detail: `options differ for ${describe(entry.spec, entry.options)} (existing: ${describe(found.key, found)})`,
      });
    }
  }
}

function section(title, rows, render) {
  console.log(`\n${title}: ${rows.length}`);
  rows.forEach((row) => console.log(`  ${render(row)}`));
}

section("EXISTING indexes", report.existing, (r) => `${r.model}.${r.name}: ${r.spec}`);
section("MISSING indexes", report.missing, (r) => `${r.model} (${r.collection}): ${r.label}`);
section(
  "CONFLICTING indexes (manual action required)",
  report.conflicting,
  (r) => `${r.model}: ${r.detail}`,
);

if (mode === "dry-run") {
  console.log("\nPLANNED createIndex calls (not executed):");
  report.missing.forEach((r) =>
    console.log(
      `  db.${r.collection}.createIndex(${JSON.stringify(r.spec)}, ${JSON.stringify(r.options)})`,
    ),
  );
}

if (mode === "apply") {
  if (report.conflicting.length > 0) {
    console.error("\nConflicting indexes detected. No changes made; resolve them manually.");
    await mongoose.disconnect();
    process.exit(1);
  }
  let created = 0;
  for (const r of report.missing) {
    try {
      await mongoose.connection.db.collection(r.collection).createIndex(r.spec, r.options || {});
      created += 1;
      console.log(`  CREATED ${r.model}: ${r.label}`);
    } catch (error) {
      console.error(`  FAILED ${r.model}: ${error.message}`);
    }
  }
  console.log(`\nCreated ${created} missing index(es). No indexes were dropped.`);
}

await mongoose.disconnect();
