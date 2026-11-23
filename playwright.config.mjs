import { defineConfig, devices } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getLocalPath } from "./api/lib/paths/local-artifacts.js";
import { ensureIsolatedWorkspace } from "./tests/helpers/local-workspace.js";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));

// Unique per run: browser tests, the managed Next.js server and every spawned
// child process share this workspace instead of the real credential registry.
const E2E_WORKSPACE = ensureIsolatedWorkspace(process.env.UTSAV_LOCAL_DIR, "playwright");
process.env.UTSAV_LOCAL_DIR = E2E_WORKSPACE;

/**
 * Playwright config for Utsav-Connect browser journeys.
 *
 * By default Playwright manages its own server on port 3100, pointed at the
 * test database by scripts/serve-e2e.mjs. This never touches an existing
 * `make dev` process on port 3000. Set PLAYWRIGHT_BASE_URL to use an already
 * running server instead (no managed server is started in that case).
 */
const managedPort = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${managedPort}`;
const managed = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: join(PROJECT_ROOT, "tests", "playwright"),
  globalSetup: join(PROJECT_ROOT, "tests", "playwright", "global-setup.mjs"),
  globalTeardown: join(PROJECT_ROOT, "tests", "playwright", "global-teardown.mjs"),
  // Keep generated reports and failure artifacts inside the project .local/.
  outputDir: getLocalPath("playwright-results"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Two workers keep login/rate-limit and font-loading contention low when
  // the full suite runs across all three viewports.
  workers: 2,
  reporter: [["html", { outputFolder: getLocalPath("playwright-report"), open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: devices["Desktop Chrome"] },
    { name: "tablet", use: devices["iPad Air"] },
    { name: "mobile", use: devices["Pixel 7"] },
  ],
  webServer: managed
    ? {
        command: "node scripts/serve-e2e.mjs --production",
        env: { ...process.env, UTSAV_LOCAL_DIR: E2E_WORKSPACE },
        url: `${baseURL}/api/health`,
        // Never reuse a server started with a different workspace: its env
        // could still point at the real credential registry.
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
});
