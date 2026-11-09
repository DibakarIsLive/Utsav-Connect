import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Utsav-Connect browser journeys.
 * Assumes the Next.js dev server is already running on http://localhost:3000.
 */
export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: devices["Desktop Chrome"],
    },
    {
      name: "tablet",
      use: devices["iPad Air"],
    },
    {
      name: "mobile",
      use: devices["Pixel 7"],
    },
  ],
  webServer: undefined, // server already running via `make dev`
});
