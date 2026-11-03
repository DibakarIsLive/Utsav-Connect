import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, UNREACHABLE_DB_URI, databaseSuiteGate } from "../helpers/database.js";

const gate = await databaseSuiteGate("health-route");

/**
 * Exercises the real Route Handler module (app/api/health/route.js) by
 * calling its exported GET function directly — the same code path Next.js
 * invokes, minus the HTTP server.
 */
describe.skipIf(gate.skip)("GET /api/health", () => {
  const originalUri = process.env.MONGODB_URI;
  let GET;

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    ({ GET } = await import("@/app/api/health/route"));
  });

  afterAll(async () => {
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("returns 200 with the success envelope when MongoDB responds", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.checks.database.status).toBe("ok");
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(() => new Date(body.data.timestamp).toISOString()).not.toThrow();
  });

  it("returns 503 SERVICE_DEGRADED when MongoDB is unreachable", async () => {
    await disconnectFromDatabase();
    process.env.MONGODB_URI = UNREACHABLE_DB_URI;
    resetEnvCache();

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("SERVICE_DEGRADED");
    expect(body.data.checks.database.status).toBe("unavailable");
    // Driver error text must never leak to clients.
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|MongooseServerSelectionError/);
  });
});
