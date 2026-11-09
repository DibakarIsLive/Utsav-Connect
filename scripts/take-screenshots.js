import { chromium } from "playwright";
import http from "http";

const URLS = [
  "http://localhost:3000/",
  "http://localhost:3000/about",
  "http://localhost:3000/map",
  "http://localhost:3000/login",
  "http://localhost:3000/apply",
  "http://localhost:3000/dashboard",
  "http://localhost:3000/admin/applications",
  "http://localhost:3000/admin/users",
];

async function checkServer() {
  return new Promise((resolve) => {
    http
      .get("http://localhost:3000/api/health", (res) => {
        resolve(res.statusCode === 200);
      })
      .on("error", () => {
        resolve(false);
      });
  });
}

async function run() {
  console.log("Checking if local server is running at http://localhost:3000...");
  const running = await checkServer();
  if (!running) {
    console.error(
      "ERROR: Local server is not running at http://localhost:3000. Please start with 'make dev' or 'npm run dev'.",
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "docs", "screenshots");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const url of URLS) {
    const page = await context.newPage();
    const routeName =
      url === "http://localhost:3000/"
        ? "home"
        : url.replace("http://localhost:3000/", "").replace(/\//g, "-");
    try {
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
      const filePath = path.join(dir, `${routeName}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Captured screenshot for ${url} -> ${filePath}`);
    } catch (err) {
      console.error(`Failed to capture ${url}:`, err.message);
    }
    await page.close();
  }

  await browser.close();
  console.log("Screenshot capture complete!");
}

run();
