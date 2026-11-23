import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { Session } from "@/api/models/session.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { login } from "@/api/services/auth-service.js";
import { setDevoteeAccountStatus } from "@/api/services/devotee-directory-service.js";
import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route.js";

const gate = await databaseSuiteGate("audit-privacy");

describe.skipIf(gate.skip)("Audit log privacy", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const originalUri = process.env.MONGODB_URI;
  const createdUserIds = [];
  const createdAuditIds = [];
  let superAdmin, reader, nonReader, target, readerCookie, nonReaderCookie;

  async function makeUser(overrides) {
    const user = await User.create({
      email: `audit-${runId}-${createdUserIds.length}@example.com`,
      fullName: `Audit Privacy ${createdUserIds.length}`,
      phone: "+919876543301",
      gender: "male",
      passwordHash: await hashPassword("AuditPrivacy!2345"),
      status: "active",
      emailVerified: true,
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  async function cookieFor(user, ip) {
    const result = await login(user.email, "AuditPrivacy!2345", {
      ip,
      userAgent: "privacy-test-agent",
    });
    return `session=${result.sessionCookie.match(/session=([^;]+)/)[1]}`;
  }

  function request(cookie) {
    return new Request("http://localhost:3000/api/admin/audit-logs", {
      headers: cookie ? { cookie } : {},
    });
  }

  beforeAll(async () => {
    const dbName = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
    if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
      throw new Error(`Refusing audit test against database ${dbName}`);
    }
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
    superAdmin = await makeUser({ role: "super_admin" });
    reader = await makeUser({ role: "admin", adminPermissions: ["audit:read:all"] });
    nonReader = await makeUser({ role: "admin", adminPermissions: ["application:read:all"] });
    target = await makeUser({ role: "devotee" });
    readerCookie = await cookieFor(reader, "10.252.0.1");
    nonReaderCookie = await cookieFor(nonReader, "10.252.0.2");

    await setDevoteeAccountStatus(
      superAdmin,
      target._id.toString(),
      "suspended",
      "Highly sensitive free-text reason that must not be exposed",
    );
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ _id: { $in: createdAuditIds } });
    await AuditLog.deleteMany({ targetId: { $in: createdUserIds } });
    await Session.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("allows an authorized audit reader and refuses everyone else", async () => {
    expect((await getAuditLogs(request(readerCookie))).status).toBe(200);
    expect((await getAuditLogs(request(nonReaderCookie))).status).toBe(403);
    expect((await getAuditLogs(request())).status).toBe(401);
  });

  it("never returns raw user agents or IP hashes to the browser", async () => {
    const response = await getAuditLogs(request(readerCookie));
    const body = await response.json();
    expect(Array.isArray(body.data.logs)).toBe(true);
    for (const entry of body.data.logs) {
      expect(entry).not.toHaveProperty("userAgent");
      expect(entry).not.toHaveProperty("ipHash");
      expect(JSON.stringify(entry)).not.toContain("privacy-test-agent");
    }
  });

  it("redacts free-text reasons and invitee emails from metadata on read", async () => {
    const stored = await AuditLog.create({
      eventType: "test.legacy_pii",
      actorId: superAdmin._id,
      actorRole: "super_admin",
      targetId: target._id,
      targetType: "User",
      metadata: {
        email: `legacy-${runId}@example.com`,
        reason: "Legacy free-text reason",
        permissionCount: 2,
      },
    });
    createdAuditIds.push(stored._id);

    const response = await getAuditLogs(request(readerCookie));
    const body = await response.json();
    const rendered = body.data.logs.find((entry) => entry.eventType === "test.legacy_pii");
    expect(rendered).toBeDefined();
    expect(rendered.metadata).not.toHaveProperty("email");
    expect(rendered.metadata).not.toHaveProperty("reason");
    expect(rendered.metadata.permissionCount).toBe(2);

    // The stored record is not rewritten or destroyed.
    const unchanged = await AuditLog.findById(stored._id);
    expect(unchanged.metadata.email).toBe(`legacy-${runId}@example.com`);
    expect(unchanged.metadata.reason).toBe("Legacy free-text reason");
  });

  it("stores new status-change reasons without the free text", async () => {
    const stored = await AuditLog.findOne({
      eventType: "admin.devotee.status_updated",
      targetId: target._id,
    });
    expect(stored).not.toBeNull();
    expect(stored.metadata).not.toHaveProperty("reason");
    expect(stored.metadata.hasReason).toBe(true);
    expect(stored.metadata.reasonLength).toBeGreaterThan(0);
  });

  it("uses keyed, versioned IP hashes for new records", async () => {
    const stored = await AuditLog.findOne({ eventType: "user.login", actorId: reader._id });
    expect(stored).not.toBeNull();
    expect(stored.ipHash).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(stored.ipHash).not.toContain("10.252.0.1");
  });
});
