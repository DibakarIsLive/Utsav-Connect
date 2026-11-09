#!/usr/bin/env node
/**
 * Create Super Admin - Bootstrap and recovery script.
 * 
 * Usage:
 *   npm run auth:create-super-admin -- --email admin@example.com --name "Admin Name"
 *   
 * Recovery mode (allows creating second Super Admin if first is compromised):
 *   npm run auth:create-super-admin -- --recovery --email new@example.com --name "New Admin"
 */

import { loadLocalEnvFile } from "./lib/load-env-file.js";
import mongoose from "mongoose";
import { hash } from "@node-rs/argon2";
import { createInterface } from "node:readline/promises";

loadLocalEnvFile();

const args = process.argv.slice(2);
const emailArg = args[args.indexOf("--email") + 1];
const nameArg = args[args.indexOf("--name") + 1];
const recoveryMode = args.includes("--recovery");

async function promptPassword() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Hide password input
  process.stdout.write("Password (min 12 characters): ");
  const password = await new Promise((resolve) => {
    process.stdin.setRawMode(true);
    let pwd = "";
    process.stdin.on("data", (char) => {
      char = char.toString();
      if (char === "\n" || char === "\r" || char === "\u0004") {
        process.stdin.setRawMode(false);
        process.stdout.write("\n");
        resolve(pwd);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f") {
        pwd = pwd.slice(0, -1);
      } else {
        pwd += char;
      }
    });
  });

  rl.close();
  return password;
}

async function main() {
  if (!emailArg || !nameArg) {
    console.error("Usage: npm run auth:create-super-admin -- --email admin@example.com --name \"Admin Name\"");
    console.error("\nRecovery mode: add --recovery flag to create second Super Admin");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const User = mongoose.model("User", new mongoose.Schema({
      email: String,
      fullName: String,
      phone: String,
      gender: String,
      passwordHash: String,
      role: String,
      status: String,
      emailVerified: Boolean,
    }));

    const AuditLog = mongoose.model("AuditLog", new mongoose.Schema({
      eventType: String,
      actorRole: String,
      targetId: mongoose.Schema.Types.ObjectId,
      targetType: String,
      metadata: mongoose.Schema.Types.Mixed,
    }, { timestamps: true }));

    // Check for existing Super Admin
    const existingSuperAdmin = await User.findOne({ role: "super_admin", status: "active" });

    if (existingSuperAdmin && !recoveryMode) {
      console.error("❌ Super Admin already exists.");
      console.error("   Email:", existingSuperAdmin.email);
      console.error("\nIf you need to create a recovery Super Admin, use --recovery flag.");
      process.exit(1);
    }

    // Check email not in use
    const existingUser = await User.findOne({ email: emailArg.toLowerCase() });
    if (existingUser) {
      console.error(`❌ Email ${emailArg} is already in use.`);
      process.exit(1);
    }

    // Prompt for password
    const password = await promptPassword();

    if (password.length < 12) {
      console.error("❌ Password must be at least 12 characters.");
      process.exit(1);
    }

    // Create Super Admin
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const superAdmin = await User.create({
      email: emailArg.toLowerCase(),
      fullName: nameArg,
      phone: "+00000000000",
      gender: "male",
      passwordHash,
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });

    // Write audit log
    await AuditLog.create({
      eventType: "super_admin.created",
      actorRole: "system",
      targetId: superAdmin._id,
      targetType: "User",
      metadata: {
        recovery: recoveryMode,
        email: superAdmin.email,
      },
    });

    console.log("\n✅ Super Admin created successfully!");
    console.log("   Email:", superAdmin.email);
    console.log("   Name:", superAdmin.fullName);
    console.log("   Role:", superAdmin.role);
    
    if (recoveryMode) {
      console.log("\n⚠️  Recovery mode was used. Review and secure this account immediately.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
