import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isInsideTestRuns,
  registryDifference,
  removeIsolatedLocalDir,
  snapshotRealRegistry,
} from "../helpers/local-workspace.js";

/**
 * Always remove only this run's workspace. A mismatch in the real registry is
 * reported as a failure after cleanup, so test data never goes unnoticed.
 */
export default function globalTeardown() {
  const workspace = process.env.UTSAV_LOCAL_DIR;
  let difference = "workspace missing";
  if (isInsideTestRuns(workspace)) {
    try {
      const before = JSON.parse(readFileSync(join(workspace, ".registry-snapshot.json"), "utf8"));
      difference = registryDifference(before, snapshotRealRegistry());
    } catch {
      difference = "registry snapshot unavailable";
    }
    removeIsolatedLocalDir(workspace);
  }

  if (difference) {
    throw new Error(`Playwright credential isolation failed: ${difference}`);
  }
}
