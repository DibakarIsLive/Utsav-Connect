#!/usr/bin/env node
/**
 * scripts/check-email-config.js
 *
 * Show email delivery configuration.
 * Shows provider, sender, and whether API key is present without revealing it.
 */
import { loadLocalEnvFile } from "./lib/load-env-file.js";
import { existsSync, readdirSync } from "node:fs";
// Node scripts and Playwright resolve relative paths; the @/ alias is not available here.
// eslint-disable-next-line no-restricted-imports
import { getDevMailDir } from "../api/lib/paths/local-artifacts.js";

loadLocalEnvFile();

try {
  const provider = process.env.EMAIL_PROVIDER;
  const from = process.env.EMAIL_FROM;
  const apiKey = process.env.EMAIL_API_KEY;

  console.log("Email Configuration");
  console.log("────────────────────────────");
  console.log(`Provider   : ${provider}`);
  console.log(`Sender     : ${from}`);
  console.log(`API key:   ${apiKey ? "present (not shown)" : "not set"}`);
  console.log("");

  if (provider === "dev") {
    const mailDir = getDevMailDir();
    const files = existsSync(mailDir) ? readdirSync(mailDir).filter((f) => f.endsWith(".eml")) : [];
    console.log(`Dev mail files: ${files.length}`);
    if (files.length > 0) {
      files.forEach((f) => console.log(`  ${f}`));
    }
  }

  console.log("");

  if (provider === "dev") {
    console.log("✓ Development mode: emails written to .local/mail/");
  } else if (provider === "resend" && apiKey) {
    console.log("✓ Resend configured with API key");
  } else if (provider === "resend") {
    console.log("⚠ Resend selected but EMAIL_API_KEY is missing");
  } else {
    console.log("⚠ Unknown or missing email provider");
  }
} catch (error) {
  console.error(`❌ Environment error: ${error.message}`);
  process.exit(1);
}
