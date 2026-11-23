#!/usr/bin/env node
/**
 * Committed, idempotent E2E seed for Utsav-Connect browser journeys.
 *
 * Safety properties:
 *  - Targets ONLY `utsav_connect_test` (guard runs before connecting, and the
 *    resolved connection name is checked again after connecting).
 *  - Refuses the pilot database and any other database name.
 *  - Deletes ONLY records carrying `e2eSeedTag` from the collections it owns.
 *    It never drops a database or clears a collection.
 *  - Deterministic ObjectIds and upserts make repeated runs idempotent.
 *  - Never prints passwords, credentials or full connection strings.
 *
 * Modes:
 *   --check    validate the configured database only (no connection, no writes)
 *   --status   count tagged records (read-only)
 *   --clean    remove only tagged records
 *   (default)  seed/update tagged records
 */
import { createHash } from "node:crypto";
import { loadLocalEnvFile } from "./lib/load-env-file.js";
import { assertE2eDatabaseUri, E2E_ALLOWED_DB } from "./lib/e2e-db-guard.js";

loadLocalEnvFile();

const mode = process.argv.includes("--clean")
  ? "clean"
  : process.argv.includes("--status")
    ? "status"
    : process.argv.includes("--check")
      ? "check"
      : "seed";

const uri = process.env.MONGODB_URI_TEST;
const dbName = assertE2eDatabaseUri(uri);

if (mode === "check") {
  console.log(`E2E database guard: ACCEPTED (${dbName})`);
  process.exit(0);
}

const mongoose = (await import("mongoose")).default;
const { hash } = await import("@node-rs/argon2");

const TAG = "e2e-acceptance-seed";
const PASSWORD = "UtsavTest!2345"; // test-only credential already used by the Playwright spec

const id = (key) =>
  new mongoose.Types.ObjectId(
    createHash("sha256").update(`${TAG}:${key}`).digest().subarray(0, 12),
  );

const ids = {
  superAdmin: id("user-super"),
  admin: id("user-admin"),
  reviewer: id("user-reviewer"),
  devotee: id("user-devotee"),
  applicant: id("user-applicant"),
  suspendable: id("user-suspendable"),
  suspendableApp: id("app-suspendable"),
  pendingProposal: id("proposal-pending"),
  limitedAdmin: id("user-limited"),
  deleteAdmin: id("user-delete-admin"),
  statusOnlyAdmin: id("user-status-only-admin"),
  deleteDevotee: id("user-delete-devotee"),
  deleteDevoteeApp: id("app-delete-devotee"),
  deoghar: id("area-deoghar"),
  baidyanath: id("area-baidyanath"),
  jasidih: id("area-jasidih"),
  pendingApp: id("app-pending"),
  approvedApp: id("app-approved"),
  reportOne: id("report-one"),
  reportTwo: id("report-two"),
  auditOne: id("audit-one"),
};

const ownedCollections = [
  "users",
  "areas",
  "devoteeapplications",
  "invitationreports",
  "localityproposals",
  "auditlogs",
];

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

if (mongoose.connection.name !== E2E_ALLOWED_DB) {
  await mongoose.disconnect();
  throw new Error(
    `E2E refused after connect: resolved database ${mongoose.connection.name} is not ${E2E_ALLOWED_DB}.`,
  );
}
console.log(`E2E database guard: ACCEPTED (${mongoose.connection.name})`);

const db = mongoose.connection.db;

async function countTagged() {
  const counts = {};
  for (const name of ownedCollections) {
    counts[name] = await db.collection(name).countDocuments({ e2eSeedTag: TAG });
  }
  return counts;
}

if (mode === "status") {
  console.log("Tagged E2E records:", JSON.stringify(await countTagged()));
  await mongoose.disconnect();
  process.exit(0);
}

if (mode === "clean") {
  let removed = 0;
  for (const name of ownedCollections) {
    const result = await db.collection(name).deleteMany({ e2eSeedTag: TAG });
    removed += result.deletedCount;
  }
  console.log(`Removed ${removed} tagged E2E records from ${dbName}.`);
  await mongoose.disconnect();
  process.exit(0);
}

// Seed mode: remove only our own records first, then upsert deterministic docs.
for (const name of ownedCollections) {
  await db.collection(name).deleteMany({ e2eSeedTag: TAG });
}

const passwordHash = await hash(PASSWORD, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const tag = () => ({ e2eSeedTag: TAG });
const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const users = [
  {
    _id: ids.superAdmin,
    email: "super@utsav.test",
    role: "super_admin",
    status: "active",
    fullName: "E2E Super Admin",
  },
  {
    _id: ids.admin,
    email: "admin@utsav.test",
    role: "admin",
    status: "active",
    fullName: "E2E Admin",
    adminPermissions: [
      "application:read:all",
      "application:review:all",
      "devotee:read:all",
      "devotee:status:update",
      "invitation-report:read:all",
      "audit:read:all",
      "area:manage",
      "proposal:review",
    ],
  },
  {
    _id: ids.reviewer,
    email: "reviewer@utsav.test",
    role: "admin",
    status: "active",
    fullName: "E2E Reviewer",
    adminPermissions: ["application:read:all", "devotee:read:all"],
  },
  {
    _id: ids.devotee,
    email: "devotee@utsav.test",
    role: "devotee",
    status: "active",
    fullName: "Suman Devi",
  },
  {
    _id: ids.applicant,
    email: "applicant@utsav.test",
    role: "devotee",
    status: "pending_approval",
    fullName: "Parbati Singh",
  },
  {
    _id: ids.limitedAdmin,
    email: "limited@utsav.test",
    role: "admin",
    status: "active",
    fullName: "Limited Admin",
    adminPermissions: ["application:read:all"],
  },
  {
    _id: ids.statusOnlyAdmin,
    email: "status-only@utsav.test",
    role: "admin",
    status: "active",
    fullName: "Status Only Admin",
    adminPermissions: ["devotee:read:all", "devotee:status:update"],
  },
  {
    _id: ids.deleteAdmin,
    email: "delete-admin@utsav.test",
    role: "admin",
    status: "active",
    fullName: "Delete Me Admin",
    adminPermissions: ["application:read:all"],
  },
  {
    _id: ids.deleteDevotee,
    email: "delete-devotee@utsav.test",
    role: "devotee",
    status: "active",
    fullName: "Delete Me Devotee",
  },
  {
    _id: ids.suspendable,
    email: "suspendable@utsav.test",
    role: "devotee",
    status: "active",
    fullName: "Lifecycle Fixture",
  },
].map((u) => ({
  ...u,
  ...tag(),
  emailVerified: true,
  passwordHash,
  phone: "+919876500001",
  gender: "female",
  createdAt: daysAgo(60),
  updatedAt: now,
}));

const areas = [
  {
    _id: ids.deoghar,
    name: "Deoghar",
    normalizedName: "deoghar",
    code: "E2E-DGR",
    type: "District",
    parentId: null,
    ancestorIds: [],
    status: "approved",
    populationEstimate: 250000,
    location: { type: "Point", coordinates: [86.6954, 24.4823] },
  },
  {
    _id: ids.baidyanath,
    name: "Baidyanath Dham",
    normalizedName: "baidyanath dham",
    code: "E2E-BD",
    type: "Locality",
    parentId: ids.deoghar,
    ancestorIds: [ids.deoghar],
    status: "approved",
    populationEstimate: 5000,
    location: { type: "Point", coordinates: [86.6995, 24.4921] },
  },
  {
    _id: ids.jasidih,
    name: "Jasidih",
    normalizedName: "jasidih",
    code: "E2E-JSD",
    type: "Block",
    parentId: ids.deoghar,
    ancestorIds: [ids.deoghar],
    status: "approved",
    populationEstimate: 0,
    location: { type: "Point", coordinates: [86.6455, 24.5138] },
  },
].map((a) => ({
  ...a,
  ...tag(),
  createdBy: ids.superAdmin,
  createdAt: daysAgo(120),
  updatedAt: now,
}));

const applications = [
  {
    _id: ids.approvedApp,
    userId: ids.devotee,
    applicantName: "Suman Devi",
    applicantEmail: "devotee@utsav.test",
    applicantPhone: "+919876500001",
    gender: "female",
    status: "approved",
    isCurrent: true,
    reviewedBy: ids.admin,
    reviewedAt: daysAgo(50),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(50),
  },
  {
    _id: ids.suspendableApp,
    userId: ids.suspendable,
    applicantName: "Lifecycle Fixture",
    applicantEmail: "suspendable@utsav.test",
    applicantPhone: "+919876500003",
    gender: "male",
    status: "approved",
    isCurrent: true,
    reviewedBy: ids.admin,
    reviewedAt: daysAgo(20),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(20),
  },
  {
    _id: ids.deleteDevoteeApp,
    userId: ids.deleteDevotee,
    applicantName: "Delete Me Devotee",
    applicantEmail: "delete-devotee@utsav.test",
    applicantPhone: "+919876500004",
    gender: "female",
    status: "approved",
    isCurrent: true,
    reviewedBy: ids.admin,
    reviewedAt: daysAgo(10),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(10),
  },
  {
    _id: ids.pendingApp,
    userId: ids.applicant,
    applicantName: "Parbati Singh",
    applicantEmail: "applicant@utsav.test",
    applicantPhone: "+919876500002",
    gender: "female",
    status: "pending",
    isCurrent: true,
    // Newest first in the admin queue, so review-journey "first Review" is pending.
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
].map((a) => ({ ...a, ...tag() }));

const reports = [
  {
    _id: ids.reportOne,
    areaId: ids.baidyanath,
    contributorId: ids.devotee,
    invitationCount: 1200,
    reportDate: daysAgo(30),
    description: "E2E fixture report",
    status: "active",
  },
  {
    _id: ids.reportTwo,
    areaId: ids.jasidih,
    contributorId: ids.devotee,
    invitationCount: 300,
    reportDate: daysAgo(10),
    description: "E2E fixture report",
    status: "active",
  },
].map((r) => ({ ...r, ...tag(), createdAt: r.reportDate, updatedAt: now }));

const proposals = [
  {
    _id: ids.pendingProposal,
    name: "E2E Proposed Locality",
    normalizedName: "e2e proposed locality",
    type: "Locality",
    parentId: ids.deoghar,
    status: "pending",
    duplicates: [],
    proposedBy: ids.devotee,
    proposerName: "Suman Devi",
    proposerEmail: "devotee@utsav.test",
    notes: "E2E fixture proposal for administrative review.",
  },
].map((p) => ({ ...p, ...tag(), createdAt: daysAgo(2), updatedAt: daysAgo(2) }));

const auditLogs = [
  {
    _id: ids.auditOne,
    eventType: "e2e.seed",
    actorRole: "system",
    targetId: ids.devotee,
    targetType: "User",
    metadata: { seeded: true },
  },
].map((a) => ({ ...a, ...tag(), createdAt: now }));

const docs = {
  users,
  areas,
  devoteeapplications: applications,
  invitationreports: reports,
  localityproposals: proposals,
  auditlogs: auditLogs,
};

for (const [collection, records] of Object.entries(docs)) {
  for (const record of records) {
    await db
      .collection(collection)
      .updateOne({ _id: record._id }, { $set: record }, { upsert: true });
  }
}

console.log(`Seeded ${dbName}. Tagged records:`, JSON.stringify(await countTagged()));
console.log("Seed owner tag:", TAG);
await mongoose.disconnect();
