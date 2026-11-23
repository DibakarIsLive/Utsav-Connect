import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
// Playwright cannot import server-only modules; the resolver itself is safe.
// eslint-disable-next-line no-restricted-imports
import { getCredentialRegistryDir } from "../../api/lib/paths/local-artifacts.js";
import {
  isInsideTestRuns,
  registryDifference,
  snapshotRealRegistry,
} from "../../tests/helpers/local-workspace.js";
import { loadLocalEnvFile } from "../../scripts/lib/load-env-file.js";

loadLocalEnvFile();
const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100";

// The filesystem isolation checks do not require MongoDB. The account-creation
// check does, so skip only that case when the test database is unreachable.
const dbAvailable = await (async () => {
  let connection;
  try {
    connection = await mongoose
      .createConnection(process.env.MONGODB_URI_TEST, {
        serverSelectionTimeoutMS: 8000,
      })
      .asPromise();
    await connection.db.collection("users").countDocuments({});
    return true;
  } catch {
    return false;
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
})();

function randomIp() {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

test.describe("Playwright credential isolation", () => {
  test("browser run uses an isolated workspace and leaves the real registry unchanged", async () => {
    const registry = getCredentialRegistryDir();
    expect(process.env.UTSAV_LOCAL_DIR).toBeTruthy();
    expect(isInsideTestRuns(registry)).toBe(true);
    expect(registry.startsWith(process.env.UTSAV_LOCAL_DIR)).toBe(true);

    const before = JSON.parse(
      readFileSync(join(process.env.UTSAV_LOCAL_DIR, ".registry-snapshot.json"), "utf8"),
    );
    expect(registryDifference(before, snapshotRealRegistry())).toBeNull();
  });

  test("account creation writes only inside the run workspace", async ({ page }) => {
    test.skip(!dbAvailable, "test database unavailable; account creation cannot be exercised");
    const registry = getCredentialRegistryDir();
    const beforeFiles = readdirSync(join(registry, "Devotee")).filter((f) => f.endsWith(".json"));

    await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
    await page.goto(`${BASE}/apply?mode=login`);
    await page.getByRole("tab", { name: /Sign in/ }).click();
    await page.getByLabel(/Email address/).fill("super@utsav.test");
    await page.getByLabel(/Password/).fill("UtsavTest!2345");
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(`${BASE}/admin`);

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const email = `isolated-${stamp}@example.com`;
    const created = await page.evaluate(
      async (payload) => {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json().catch(() => null);
        return { status: response.status, id: body?.data?.user?._id };
      },
      {
        fullName: `Isolation ${stamp}`,
        email,
        password: "IsolationTest!2345",
        phone: "+919876543990",
        gender: "male",
        role: "devotee",
      },
    );
    expect(created.status).toBe(201);
    expect(created.id).toBeTruthy();

    await expect
      .poll(
        () => {
          const files = readdirSync(join(registry, "Devotee")).filter((f) => f.endsWith(".json"));
          return files.length > beforeFiles.length;
        },
        { timeout: 15000 },
      )
      .toBe(true);

    const newFiles = readdirSync(join(registry, "Devotee"))
      .filter((f) => f.endsWith(".json"))
      .filter((f) => !beforeFiles.includes(f));
    expect(newFiles.length).toBeGreaterThan(0);

    const record = JSON.parse(readFileSync(join(registry, "Devotee", newFiles.at(-1)), "utf8"));
    expect(record.email).toBe(email);
    expect(record.mongoId).toBe(created.id);

    const before = JSON.parse(
      readFileSync(join(process.env.UTSAV_LOCAL_DIR, ".registry-snapshot.json"), "utf8"),
    );
    expect(registryDifference(before, snapshotRealRegistry())).toBeNull();
  });
});
