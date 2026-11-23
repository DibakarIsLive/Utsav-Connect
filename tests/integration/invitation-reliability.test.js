import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { RateLimit } from "@/api/models/rate-limit.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { hashToken, generateToken } from "@/api/lib/auth/tokens.js";
import { login } from "@/api/services/auth-service.js";
import { acceptAdminInvitation, listAdminInvitations } from "@/api/services/admin-service.js";
import { GET as listInvitationsRoute } from "@/app/api/admin/users/invitations/route.js";
import { POST as acceptInviteRoute } from "@/app/api/auth/admin-invitation/accept/route.js";

const gate = await databaseSuiteGate("invitation-reliability");

describe.skipIf(gate.skip)("Invitation acceptance reliability", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const originalUri = process.env.MONGODB_URI;
  const createdUserIds = [];
  const createdTokenIds = [];
  const createdAuditIds = [];
  let superAdmin, cookie;

  async function makeInvitation(email, permissions = []) {
    const rawToken = generateToken();
    const token = await AuthToken.create({
      tokenHash: hashToken(rawToken),
      email,
      type: "admin_invitation",
      metadata: { invitedBy: superAdmin._id, permissions },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    createdTokenIds.push(token._id);
    return { rawToken, token };
  }

  const setup = {
    fullName: "Reliable Invitee",
    password: "ReliableTest!2345",
    phone: "+919876543501",
    gender: "male",
  };

  beforeAll(async () => {
    const dbName = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
    if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
      throw new Error(`Refusing invitation test against database ${dbName}`);
    }
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
    superAdmin = await User.create({
      email: `reliable-sa-${runId}@example.com`,
      fullName: "Reliability Super Admin",
      phone: "+919876543500",
      gender: "male",
      passwordHash: await hashPassword("ReliableTest!2345"),
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });
    createdUserIds.push(superAdmin._id);
    const result = await login(superAdmin.email, "ReliableTest!2345", { ip: "10.254.0.1" });
    cookie = `session=${result.sessionCookie.match(/session=([^;]+)/)[1]}`;
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ _id: { $in: createdAuditIds } });
    await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
    await AuditLog.deleteMany({
      eventType: "admin.invitation.list_viewed",
      actorId: superAdmin._id,
    });
    await AuthToken.deleteMany({ _id: { $in: createdTokenIds } });
    await SessionCleanup();
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await RateLimit.deleteMany({ key: /admin-invitation/ });
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  async function SessionCleanup() {
    const { Session } = await import("@/api/models/session.js");
    await Session.deleteMany({ userId: { $in: createdUserIds } });
  }

  it("allows exactly one of two concurrent acceptances of the same token", async () => {
    const { rawToken } = await makeInvitation(`concurrent-${runId}@example.com`, [
      "application:read:all",
    ]);
    const results = await Promise.allSettled([
      acceptAdminInvitation(rawToken, setup),
      acceptAdminInvitation(rawToken, setup),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const createdUser = await User.findOne({ email: `concurrent-${runId}@example.com` });
    createdUserIds.push(createdUser._id);
    const accounts = await User.countDocuments({ email: `concurrent-${runId}@example.com` });
    expect(accounts).toBe(1);
  });

  it("leaves the token reusable when account creation fails, then succeeds", async () => {
    const email = `recovery-${runId}@example.com`;
    const { rawToken, token } = await makeInvitation(email, ["devotee:read:all"]);
    const blocking = await User.create({
      email,
      fullName: "Blocking Account",
      phone: "+919876543502",
      gender: "male",
      passwordHash: await hashPassword("ReliableTest!2345"),
      role: "devotee",
      status: "active",
      emailVerified: true,
    });
    createdUserIds.push(blocking._id);

    await expect(acceptAdminInvitation(rawToken, setup)).rejects.toThrow(/already exists/i);
    expect((await AuthToken.findById(token._id)).usedAt).toBeFalsy();

    await User.deleteOne({ _id: blocking._id });
    const result = await acceptAdminInvitation(rawToken, setup);
    createdUserIds.push((await User.findOne({ email }))._id);
    expect(result.role).toBe("admin");
    expect((await AuthToken.findById(token._id)).usedAt).toBeInstanceOf(Date);
  });

  it("audits only a deliberate invitation-list view, with a count and no invitee PII", async () => {
    // A background fetch (no view flag) must not create an audit event.
    await listInvitationsRoute(
      new Request("http://localhost:3000/api/admin/users/invitations", {
        headers: { cookie },
      }),
    );
    const before = await AuditLog.countDocuments({
      eventType: "admin.invitation.list_viewed",
      actorId: superAdmin._id,
    });

    const response = await listInvitationsRoute(
      new Request("http://localhost:3000/api/admin/users/invitations?view=1", {
        headers: { cookie },
      }),
    );
    expect(response.status).toBe(200);
    const after = await AuditLog.countDocuments({
      eventType: "admin.invitation.list_viewed",
      actorId: superAdmin._id,
    });
    expect(after).toBe(before + 1);
    const audit = await AuditLog.findOne({
      eventType: "admin.invitation.list_viewed",
      actorId: superAdmin._id,
    });
    expect(audit).not.toBeNull();
    expect(audit.metadata).toHaveProperty("count");
    expect(audit.metadata).not.toHaveProperty("email");
    createdAuditIds.push(audit._id);
  });

  it("rate limits repeated acceptance attempts from the same client", async () => {
    const statuses = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await acceptInviteRoute(
        new Request("http://localhost:3000/api/auth/admin-invitation/accept", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "10.254.9.9",
          },
          body: JSON.stringify({ token: `bad-token-${attempt}`, ...setup }),
        }),
      );
      statuses.push(response.status);
    }
    expect(statuses).toContain(429);
    expect(statuses[statuses.length - 1]).toBe(429);
  });
});
