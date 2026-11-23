import { createIsolatedLocalDir, removeIsolatedLocalDir } from "../helpers/local-workspace.js";

/**
 * One isolated local-data workspace per Vitest run. Global teardown runs even
 * when every suite is skipped, so no empty workspaces are left behind.
 */
let workspace;

export async function setup() {
  workspace = createIsolatedLocalDir("vitest");
  process.env.UTSAV_LOCAL_DIR = workspace;
}

export async function teardown() {
  if (workspace) removeIsolatedLocalDir(workspace);
}
