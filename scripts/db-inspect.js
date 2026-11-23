#!/usr/bin/env node
/**
 * scripts/db-inspect.js
 *
 * Read-only inspection of the configured application database (MONGODB_URI).
 *
 * Reports:
 *   - Connected database name
 *   - User document count
 *   - Active users by role
 *   - Pending applicants (role: devotee, status: pending_verification / pending_approval)
 *   - Suspended accounts
 *   - A safe user listing with email, role, status and creation date
 *
 * Safety properties:
 *   - Read-only: countDocuments, find, aggregate only. No writes.
 *   - Never reveals password hashes, session tokens, reset tokens or verification tokens.
 *   - Never modifies the database.
 */

import { loadLocalEnvFile } from "./lib/load-env-file.js";

loadLocalEnvFile();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not configured (see .env.local).");
    process.exit(1);
  }

  const mongoose = await import("mongoose");
  const { User } = await import("../api/models/user.js");

  const dbName = uri.split("/")[3].split("?")[0];

  console.log("Database inspection (read-only)");
  console.log("────────────────────────────");
  console.log(`Database : ${dbName}`);
  console.log("");

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });

    const totalUsers = await User.countDocuments({});
    console.log(`Total users              : ${totalUsers}`);

    const byRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log("");
    console.log("Users by role:");
    for (const entry of byRole) {
      console.log(`  ${entry._id.padEnd(14)} ${entry.count}`);
    }

    const byStatus = await User.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log("");
    console.log("Users by status:");
    for (const entry of byStatus) {
      console.log(`  ${entry._id.padEnd(20)} ${entry.count}`);
    }

    const activeDevotees = await User.countDocuments({
      role: "devotee",
      status: "active",
    });
    const pendingApplicants = await User.countDocuments({
      role: "devotee",
      status: { $in: ["pending_verification", "pending_approval"] },
    });
    const suspendedAccounts = await User.countDocuments({ status: "suspended" });
    const activeAdmins = await User.countDocuments({
      role: "admin",
      status: "active",
    });
    const activeSuperAdmins = await User.countDocuments({
      role: "super_admin",
      status: "active",
    });

    console.log("");
    console.log("Summary:");
    console.log(`  Active Super Admins   : ${activeSuperAdmins}`);
    console.log(`  Active Administrators : ${activeAdmins}`);
    console.log(`  Active Devotees       : ${activeDevotees}`);
    console.log(`  Pending Applicants    : ${pendingApplicants}`);
    console.log(`  Suspended Accounts    : ${suspendedAccounts}`);

    console.log("");
    console.log("Safe user listing (email, role, status, created):");
    console.log("──────────────────────────────────────────────────────────────────────");
    const users = await User.find({})
      .select("email role status createdAt")
      .sort({ createdAt: -1 })
      .lean();
    for (const u of users) {
      const created = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "-";
      console.log(
        `  ${(u.email || "-").padEnd(34)} ${(u.role || "-").padEnd(14)} ${(u.status || "-").padEnd(20)} ${created}`,
      );
    }
  } catch (error) {
    console.error(`❌ Unable to inspect database: ${error.message}`);
    console.error("   Confirm MONGODB_URI in .env.local and Atlas Network Access for this IP.");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
