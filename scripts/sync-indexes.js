#!/usr/bin/env node
/**
 * Sync MongoDB indexes for all models.
 * 
 * Run once per environment after deploying model changes.
 * Safe to run multiple times.
 */

import { loadLocalEnvFile } from "./lib/load-env-file.js";
import mongoose from "mongoose";

loadLocalEnvFile();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Import models to register them
    await import("../api/models/user.js");
    await import("../api/models/session.js");
    await import("../api/models/auth-token.js");
    await import("../api/models/audit-log.js");
    await import("../api/models/devotee-application.js");
    await import("../api/models/area.js");
    await import("../api/models/locality-proposal.js");

    const models = [
      { name: "User", model: mongoose.model("User") },
      { name: "Session", model: mongoose.model("Session") },
      { name: "AuthToken", model: mongoose.model("AuthToken") },
      { name: "AuditLog", model: mongoose.model("AuditLog") },
      { name: "DevoteeApplication", model: mongoose.model("DevoteeApplication") },
      { name: "Area", model: mongoose.model("Area") },
      { name: "LocalityProposal", model: mongoose.model("LocalityProposal") },
    ];

    console.log("🔄 Synchronizing indexes...\n");

    for (const { name, model } of models) {
      console.log(`   ${name}...`);
      await model.syncIndexes();
    }

    console.log("\n✅ All indexes synchronized successfully!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
