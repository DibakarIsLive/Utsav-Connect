#!/usr/bin/env node
/**
 * Enforce the JavaScript-only rule (roadmap Phase 2.3 / 2.4).
 *
 * Fails when any TypeScript source or TypeScript-only configuration exists
 * outside ignored directories. Run as `npm run check:js-only`; also used by
 * `make check`. Exported helpers are unit-tested.
 */
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "build",
  "coverage",
]);

const FORBIDDEN_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const FORBIDDEN_FILENAMES = new Set(["next-env.d.ts"]);
const FORBIDDEN_FILENAME_PATTERNS = [/^tsconfig(\..+)?\.json$/];

/**
 * @param {string} fileName
 * @returns {boolean}
 */
export function isForbiddenFile(fileName) {
  if (FORBIDDEN_FILENAMES.has(fileName)) {
    return true;
  }
  if (FORBIDDEN_FILENAME_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return true;
  }
  // `.d.ts` ends with `.ts`, so the extension check covers it as well.
  return FORBIDDEN_EXTENSIONS.has(path.extname(fileName));
}

/**
 * Walk a directory tree and collect forbidden files (relative paths).
 *
 * @param {string} rootDirectory
 * @returns {string[]}
 */
export function findForbiddenFiles(rootDirectory) {
  const offenders = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }
      if (entry.isFile() && isForbiddenFile(entry.name)) {
        offenders.push(path.relative(rootDirectory, fullPath));
      }
    }
  }

  if (!statSync(rootDirectory).isDirectory()) {
    throw new Error(`Not a directory: ${rootDirectory}`);
  }
  walk(rootDirectory);
  return offenders.sort();
}

function main() {
  const root = process.cwd();
  const offenders = findForbiddenFiles(root);
  if (offenders.length === 0) {
    console.log("JavaScript-only check passed: no TypeScript files or configuration found.");
    return 0;
  }
  console.error("JavaScript-only check FAILED. Remove or convert the following:");
  for (const file of offenders) {
    console.error(`  - ${file}`);
  }
  return 1;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  process.exitCode = main();
}
