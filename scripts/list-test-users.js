#!/usr/bin/env node
/**
 * scripts/list-test-users.js
 *
 * Read-only listing of local development test credential registry records.
 * Displays a styled summary of accounts stored in .local/test-users/.
 *
 * Never displays plaintext passwords.
 * Server-only concept: reads from the filesystem directly, never connects
 * to MongoDB. Does not import any server-only modules so it can be run
 * directly with `node`.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// Node scripts and Playwright resolve relative paths; the @/ alias is not available here.
// eslint-disable-next-line no-restricted-imports
import { getCredentialRegistryDir } from "../api/lib/paths/local-artifacts.js";

async function main() {
  const BASE_DIR = getCredentialRegistryDir();
  const ROLE_DIRS = {
    super_admin: join(BASE_DIR, "SuperAdmin"),
    admin: join(BASE_DIR, "Admin"),
    devotee: join(BASE_DIR, "Devotee"),
  };

  const records = [];
  for (const role of Object.keys(ROLE_DIRS)) {
    const dir = ROLE_DIRS[role];
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = join(dir, file);
      try {
        const content = readFileSync(filePath, "utf8");
        const record = JSON.parse(content);
        // Never include password in listing
        const { password, ...safeRecord } = record;
        records.push(safeRecord);
      } catch {
        // Skip malformed files
      }
    }
  }
  // Sort by createdAt descending (newest first)
  records.sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const total = records.length;
  const counts = { super_admin: 0, admin: 0, devotee: 0 };
  for (const r of records) {
    counts[r.role] = (counts[r.role] || 0) + 1;
  }

  // Status totals
  const statusCounts = {};
  for (const r of records) {
    const s = r.status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";
  const DIM = "\x1b[2m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";
  const MAGENTA = "\x1b[35m";

  const hasColor = process.env.NO_COLOR === undefined && process.stdout.isTTY;

  function c(str, code) {
    return hasColor ? code + str + RESET : str;
  }

  console.log("");
  console.log(
    c("╭──────────────────────────────────────────────────────────────────────╮", MAGENTA),
  );
  console.log(
    c("│  Local Development Test Credential Registry                            │", MAGENTA),
  );
  console.log(
    c("╰──────────────────────────────────────────────────────────────────────╯", MAGENTA),
  );
  console.log("");
  console.log(
    "  " +
      c("Directory:", BOLD) +
      " " +
      (hasColor ? CYAN : "") +
      BASE_DIR +
      (hasColor ? RESET : ""),
  );
  console.log("");

  console.log("  " + c("Total accounts:", BOLD) + " " + total);
  console.log("  " + c("  Super Admins:", DIM) + " " + counts.super_admin);
  console.log("  " + c("  Administrators:", DIM) + " " + counts.admin);
  console.log("  " + c("  Devotees:", DIM) + " " + counts.devotee);
  console.log("");

  console.log("  " + c("By status:", BOLD));
  const statusLabelWidth = Math.max(14, ...Object.keys(statusCounts).map((s) => s.length));
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log("    " + c(status.padEnd(statusLabelWidth), DIM) + " " + count);
  }
  console.log("");

  if (total === 0) {
    console.log("  " + c("No locally recorded accounts.", YELLOW));
    console.log(
      "  " + c("Create accounts via: make createsuperuser, /api/admin/users (POST),", DIM),
    );
    console.log("  " + c("or devotee registration.", DIM));
  } else {
    // Dynamic column widths so values never run into one another, no matter
    // how long an email or status string is. Widths are derived from the
    // actual data (with sane minimums) and kept consistent across the table.
    const emailWidth = Math.max(24, ...records.map((r) => String(r.email || "-").length));
    const roleWidth = Math.max(12, ...records.map((r) => String(r.role || "-").length));
    const statusWidth = Math.max(14, ...records.map((r) => String(r.status || "-").length));
    const createdWidth = 10;

    console.log("  " + c("Account listing (no plaintext passwords):", BOLD));
    console.log("");
    console.log(
      "  " +
        c("Email".padEnd(emailWidth), BOLD) +
        " " +
        c("Role".padEnd(roleWidth), BOLD) +
        " " +
        c("Status".padEnd(statusWidth), BOLD) +
        " " +
        c("Created", BOLD),
    );
    console.log(
      "  " +
        c("─".repeat(emailWidth), DIM) +
        "─" +
        c("─".repeat(roleWidth), DIM) +
        "─" +
        c("─".repeat(statusWidth), DIM) +
        "─" +
        c("─".repeat(createdWidth), DIM),
    );
    for (const r of records) {
      const created = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "-";
      console.log(
        "  " +
          (r.email || "-").padEnd(emailWidth) +
          " " +
          (r.role || "-").padEnd(roleWidth) +
          " " +
          (r.status || "-").padEnd(statusWidth) +
          " " +
          created.padEnd(createdWidth),
      );
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
