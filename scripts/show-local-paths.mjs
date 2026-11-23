#!/usr/bin/env node
/**
 * Print the resolved, project-anchored local-data directories. Never prints
 * credentials, tokens, secrets or file contents.
 */
import { existsSync, readdirSync } from "node:fs";
// Node scripts resolve relative paths; the @/ alias is not available here.
// eslint-disable-next-line no-restricted-imports
import {
  getCredentialRegistryDir,
  getDevMailDir,
  getLocalPath,
  getProjectRoot,
} from "../api/lib/paths/local-artifacts.js";

const mailDir = getDevMailDir();
console.log(`Project root : ${getProjectRoot()}`);
console.log(`Local data   : ${getLocalPath()}`);
console.log(`Dev mail     : ${mailDir}`);
console.log(`Credentials  : ${getCredentialRegistryDir()}`);
console.log(`Screenshots  : ${getLocalPath("browser-screenshots")}`);

if (process.argv.includes("--mail")) {
  const files = existsSync(mailDir)
    ? readdirSync(mailDir).filter((file) => file.endsWith(".eml"))
    : [];
  console.log(`Dev email files: ${files.length}`);
  for (const file of files) console.log(`  ${file}`);
}
