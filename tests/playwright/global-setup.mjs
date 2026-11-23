import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { isInsideTestRuns, snapshotRealRegistry } from "../helpers/local-workspace.js";

/** Record the real registry state so teardown can prove it was untouched. */
export default function globalSetup() {
  const workspace = process.env.UTSAV_LOCAL_DIR;
  if (!isInsideTestRuns(workspace)) {
    throw new Error(`Playwright workspace is not inside .local/test-runs/: ${String(workspace)}`);
  }
  writeFileSync(
    join(workspace, ".registry-snapshot.json"),
    JSON.stringify(snapshotRealRegistry()),
    "utf8",
  );
}
