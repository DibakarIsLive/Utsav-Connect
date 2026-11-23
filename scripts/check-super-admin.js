#!/usr/bin/env node
/**
 * scripts/check-super-admin.js
 *
 * Read-only inspection of Super Admin accounts in the pilot database (MONGODB_URI).
 *
 * Reports:
 *   - the number of active Super Admin accounts
 *   - whether sa@utsav.test exists, and its role/status only
 *
 * Safety properties:
 *   - Never reveals password hashes, tokens, or other personal information.
 *   - Never writes to the database (countDocuments and findOne only).
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

  const dbName = (u) => {
    const pathPart = u.split("/")[3];
    return pathPart ? pathPart.split("?")[0] : "unknown";
  };

  console.log("Super Admin accounts (pilot database)");
  console.log("────────────────────────────");
  console.log(`Database : ${dbName(uri)}`);
  console.log("");

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });

    const activeCount = await User.countDocuments({
      role: "super_admin",
      status: "active",
    });
    console.log(`Active Super Admins : ${activeCount}`);

    // Projection excludes passwordHash and every other field; role/status only.
    const target = await User.findOne({ email: "sa@utsav.test" })
      .select("email role status")
      .lean();

    if (target) {
      console.log(`sa@utsav.test       : exists  (role: ${target.role}, status: ${target.status})`);
    } else {
      console.log("sa@utsav.test       : not found");
    }
  } catch (error) {
    console.error(`❌ Unable to inspect pilot database: ${error.message}`);
    console.error("   Confirm MONGODB_URI in .env.local and Atlas Network Access for this IP.");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
