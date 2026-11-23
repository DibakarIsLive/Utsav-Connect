#!/usr/bin/env node
/**
 * Create Super Admin - Bootstrap and recovery script.
 *
 * Usage:
 *   make createsuperuser
 *
 * The command prompts interactively for email, full name, password and
 * password confirmation. No account is created until every prompt is answered.
 *
 * Recovery mode (allows creating a second Super Admin if the first is
 * compromised):
 *   make recover-super-admin
 *
 * No command-line arguments are accepted; all input is interactive.
 */

import { loadLocalEnvFile } from "./lib/load-env-file.js";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

loadLocalEnvFile();

/**
 * Password visibility for the interactive Super Admin CLI only.
 * true  : echo password characters while typing.
 * false / unset / invalid : hide password characters while typing.
 *
 * This setting affects ONLY scripts/create-super-admin.js. It is never stored in
 * MongoDB and never changes website login, registration, or password reset.
 */
export const SHOW_PASSWORD = process.env.SUPER_ADMIN_SHOW_PASSWORD === "true";

const args = process.argv.slice(2);
const recoveryMode = args.includes("--recovery");

/**
 * Read one line of input from a real TTY using raw mode.
 *
 * Handles Enter (\r / \n / \r\n), Backspace (\u007f / \u0008),
 * and Ctrl+C (\u0003 -> exit code 1). Terminal raw mode is always
 * restored on resolution, rejection, or cancellation.
 *
 * @param {string} label - Prompt label (written verbatim before input)
 * @param {boolean} echo - Whether to echo typed characters to stdout
 * @returns {Promise<string>} The entered value (trimmed, without newline)
 */
export async function promptInput(label, echo = false) {
  if (!process.stdin.isTTY) {
    throw new Error(
      "promptInput requires a real TTY (interactive terminal). Run `make createsuperuser` in a terminal, not with piped input.",
    );
  }

  process.stdout.write(label);

  let input = "";
  process.stdin.setRawMode(true);
  process.stdin.resume();

  try {
    const value = await new Promise((resolve) => {
      const onData = (char) => {
        const c = char.toString();

        // Enter: \n, \r, or \r\n -> submit the input.
        if (c === "\n" || c === "\r") {
          process.stdin.removeListener("data", onData);
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          resolve(input);
          return;
        }

        // Ctrl+C: abort safely with exit code 1.
        if (c === "\u0003") {
          process.stdin.removeListener("data", onData);
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(1);
        }

        // Backspace or Delete: erase the last character in both modes.
        if (c === "\u007f" || c === "\u0008") {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
          return;
        }

        // Printable characters: append and optionally echo.
        if (c.length === 1 && c >= " ") {
          input += c;
          if (echo) {
            process.stdout.write(c);
          }
          // Hidden mode: do NOT echo password characters.
        }
      };

      process.stdin.on("data", onData);
    });

    return value.trim();
  } finally {
    // Always restore terminal mode and pause stdin, even if an error occurs
    // after resolution. A paused stdin stream keeps the Node event loop
    // alive, which would prevent the process from exiting after completion.
    try {
      process.stdin.setRawMode(false);
    } catch {}
    process.stdin.pause();
  }
}

/**
 * Prompt for visible text input (echoed) using raw mode.
 * Requires a real TTY; fails safely and clearly on piped/non-interactive input.
 */
export async function promptText(label) {
  return promptInput(label + ": ", true);
}

/**
 * Prompt for password input using raw mode (no echo unless SHOW_PASSWORD).
 * Requires a real TTY; fails safely and clearly on piped/non-interactive input.
 */
export async function promptPassword(label = "Password (min 12 characters): ") {
  return promptInput(label, SHOW_PASSWORD);
}

async function main() {
  const mongoose = await import("mongoose");
  const { User } = await import("../api/models/user.js");
  const { AuditLog } = await import("../api/models/audit-log.js");
  const { hashPassword } = await import("../api/lib/auth/password.js");

  console.log("Super Admin Bootstrap");
  console.log("────────────────────────────");

  // Prompt for email and full name (interactive only; fails safely on piped input.
  // MongoDB is not connected until after these prompts succeed, so a non-TTY run
  // creates nothing and touches no database.)
  let email;
  let name;
  try {
    email = await promptText("Email");
    name = await promptText("Full name");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  if (!email || !name) {
    console.error("Email and full name are required.");
    process.exit(1);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("❌ Enter a valid email address.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check for existing Super Admin
    const existingSuperAdmin = await User.findOne({ role: "super_admin", status: "active" });

    if (existingSuperAdmin && !recoveryMode) {
      console.error("❌ Super Admin already exists.");
      console.error("   Email:", existingSuperAdmin.email);
      console.error("\nIf you need to create a recovery Super Admin, use --recovery flag.");
      process.exit(1);
    }

    // Check email not in use
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.error(`❌ Email ${email} is already in use.`);
      process.exit(1);
    }

    // Prompt for password and confirmation (hidden input, no echo).
    // Re-prompt until they match; Ctrl+C aborts at any prompt.
    let password;
    for (let attempt = 1; ; attempt += 1) {
      password = await promptPassword();
      if (password.length < 12 || password.length > 128) {
        console.error("❌ Password must be between 12 and 128 characters.");
        continue;
      }
      const confirmation = await promptPassword("Confirm password: ");
      if (password === confirmation) {
        break;
      }
      console.error("❌ Passwords do not match. Try again.");
      if (attempt >= 5) {
        console.error("   Too many failed attempts. Aborted.");
        process.exit(1);
      }
    }

    // Create Super Admin
    const passwordHash = await hashPassword(password);

    const superAdmin = await User.create({
      email: email.toLowerCase(),
      fullName: name,
      phone: "+00000000000",
      gender: "male",
      passwordHash,
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });

    // Write local development credential registry record (after MongoDB creation).
    // Registry write failure does not roll back the MongoDB account.
    try {
      const { writeCredentialRecord } =
        await import("../api/lib/auth/credential-registry-writer.js");
      const { isPlaintextPasswordStorageEnabled } =
        await import("../api/lib/auth/credential-registry-config.js");
      const allowPassword = isPlaintextPasswordStorageEnabled("super_admin");
      const result = writeCredentialRecord({
        role: "super_admin",
        fullName: name,
        email: email.toLowerCase(),
        phone: "+00000000000",
        gender: "male",
        status: "active",
        creationSource: "bootstrap",
        mongoId: superAdmin._id.toString(),
        password: allowPassword ? password : undefined,
        allowPassword,
      });
      if (!result.written) {
        console.warn("⚠️  Credential registry write failed:", result.reason);
      }
    } catch (registryError) {
      console.warn("⚠️  Credential registry unavailable:", registryError.message);
    }

    // Write audit log
    await AuditLog.create({
      eventType: "super_admin.created",
      actorRole: "system",
      targetId: superAdmin._id,
      targetType: "User",
      // No PII in audit metadata. The target id identifies the account.
      metadata: {
        recovery: recoveryMode,
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

// Only run the creation workflow when this script is the direct entry point
// (not when imported by tests or other modules).
const isEntryPoint = fileURLToPath(import.meta.url) === realpathSync(process.argv[1] || "");
if (isEntryPoint) {
  main();
}
