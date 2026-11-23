import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REAL_REGISTRY = join(PROJECT_ROOT, ".local", "test-users");
export const TEST_RUNS_ROOT = join(PROJECT_ROOT, ".local", "test-runs");

/**
 * True only for paths strictly inside .local/test-runs/. Guards cleanup so a
 * bad value can never delete the real registry or another test's workspace.
 */
export function isInsideTestRuns(dir) {
  if (typeof dir !== "string" || !dir) return false;
  const target = resolve(dir);
  const rel = relative(TEST_RUNS_ROOT, target);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** @returns {string} A new, unique, run-specific workspace directory. */
export function isolatedLocalDir(name) {
  const suffix = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  return join(TEST_RUNS_ROOT, `${name}-${suffix}`);
}

export function createIsolatedLocalDir(name) {
  const dir = isolatedLocalDir(name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Reuse an already-approved workspace (so a spawned server can share the
 * runner's workspace), otherwise create a fresh one. Never accepts an
 * out-of-repository or real-registry path.
 */
export function ensureIsolatedWorkspace(existing, prefix) {
  if (isInsideTestRuns(existing)) {
    mkdirSync(resolve(existing), { recursive: true });
    return resolve(existing);
  }
  return createIsolatedLocalDir(prefix);
}

/**
 * Remove ONLY a run-specific workspace. Refuses anything outside
 * .local/test-runs/, including the real registry and parent directories.
 */
export function removeIsolatedLocalDir(dir) {
  if (!isInsideTestRuns(dir)) {
    throw new Error(`Refusing to clean a path outside .local/test-runs/: ${String(dir)}`);
  }
  rmSync(resolve(dir), { recursive: true, force: true });
}

/** Read-only snapshot of the real credential registry for isolation checks. */
export function snapshotRealRegistry() {
  const files = readdirSync(REAL_REGISTRY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      readdirSync(join(REAL_REGISTRY, entry.name))
        .filter((file) => file.endsWith(".json"))
        .map((file) => join(entry.name, file)),
    )
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readFileSync(join(REAL_REGISTRY, file)));
    hash.update("\0");
  }
  return { count: files.length, digest: hash.digest("hex") };
}

/** @returns {string|null} Difference description, or null when unchanged. */
export function registryDifference(before, after) {
  if (!before || !after) return "registry snapshot missing";
  if (before.count !== after.count) {
    return `file count changed ${before.count} -> ${after.count}`;
  }
  if (before.digest !== after.digest) return "file contents changed";
  return null;
}

/**
 * Run work inside a fresh workspace and always clean it up, including when
 * the callback throws. Used by regression tests for failure-safe cleanup.
 */
export async function withIsolatedWorkspace(prefix, callback) {
  const workspace = createIsolatedLocalDir(prefix);
  const previous = process.env.UTSAV_LOCAL_DIR;
  process.env.UTSAV_LOCAL_DIR = workspace;
  try {
    return await callback(workspace);
  } finally {
    if (previous === undefined) delete process.env.UTSAV_LOCAL_DIR;
    else process.env.UTSAV_LOCAL_DIR = previous;
    removeIsolatedLocalDir(workspace);
  }
}

export function workspaceStats(dir) {
  const stat = statSync(dir, { throwIfNoEntry: false });
  return stat ? { exists: true, isDirectory: stat.isDirectory() } : { exists: false };
}
