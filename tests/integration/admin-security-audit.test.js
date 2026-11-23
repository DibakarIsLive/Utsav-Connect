import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isolatedLocalDir } from "../helpers/local-workspace.js";
import { mkdirSync, rmSync } from "node:fs";
import mongoose from "mongoose";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { login } from "@/api/services/auth-service.js";
import { generateToken, hashToken } from "@/api/lib/auth/tokens.js";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions.js";
import {
  getApplicationStats,
  getDevoteeStats,
  inviteAdministrator,
  acceptAdminInvitation,
  revokeAdminInvitation,
} from "@/api/services/admin-service.js";
import { deleteAccount } from "@/api/services/account-deletion-service.js";

import { GET as getUsers, POST as postUser } from "@/app/api/admin/users/route.js";
import { GET as getInvites, POST as postInvite } from "@/app/api/admin/users/invitations/route.js";
import { PATCH as revokeInvite } from "@/app/api/admin/users/invitations/[id]/revoke/route.js";
import { POST as acceptInvite } from "@/app/api/auth/admin-invitation/accept/route.js";
import { PATCH as patchUser } from "@/app/api/admin/users/[id]/route.js";
import { PATCH as patchStatus } from "@/app/api/admin/accounts/[id]/status/route.js";
import { DELETE as deleteAccountRoute } from "@/app/api/admin/accounts/[id]/route.js";
import { POST as postArea } from "@/app/api/admin/areas/route.js";
import { GET as getReports } from "@/app/api/admin/invitations/route.js";
import { GET as getAudit } from "@/app/api/admin/audit-logs/route.js";
import { POST as postReview } from "@/app/api/admin/applications/[id]/review/route.js";

const gate = await databaseSuiteGate("admin-security-audit");
const TEST_DIR = isolatedLocalDir("security-registry");
const ORIGINAL_CWD = process.cwd();
const BASE = "http://localhost:3000";

describe.skipIf(gate.skip)("Administrator creation, permissions and dashboard audit", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdUserIds = [];
  const createdTokenIds = [];
  const createdAreaIds = [];
  const createdApplicationIds = [];
  const cookies = new Map();
  const originalUri = process.env.MONGODB_URI;
  const previouslyActiveSuperAdmins = [];
  let superAdmin, fullAdmin, limitedAdmin, devotee;

  async function makeUser(overrides) {
    const user = await User.create({
      email: `sec-${runId}-${createdUserIds.length}@example.com`,
      fullName: `Security ${createdUserIds.length}`,
      phone: "+919876543299",
      gender: "male",
      passwordHash: await hashPassword("SecurityTest!2345"),
      status: "active",
      emailVerified: true,
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  async function cookieFor(user, ip) {
    if (cookies.has(user._id.toString())) return cookies.get(user._id.toString());
    const result = await login(user.email, "SecurityTest!2345", { ip });
    const token = result.sessionCookie.match(/session=([^;]+)/)[1];
    const cookie = `session=${token}`;
    cookies.set(user._id.toString(), cookie);
    return cookie;
  }

  function request(path, { method = "GET", cookie, body } = {}) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers["content-type"] = "application/json";
    // Acceptance is rate limited per client IP; give each call a fresh bucket.
    if (path.includes("admin-invitation/accept")) {
      const octet = () => Math.floor(Math.random() * 254) + 1;
      headers["x-forwarded-for"] = `10.${octet()}.${octet()}.${octet()}`;
    }
    return new Request(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    const dbName = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
    if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
      throw new Error(`Refusing destructive admin audit against database ${dbName}`);
    }
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.UTSAV_LOCAL_DIR = TEST_DIR;
    process.chdir(TEST_DIR);
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
    if (mongoose.connection.name !== dbName) {
      throw new Error(`Resolved database ${mongoose.connection.name} differs from ${dbName}`);
    }

    superAdmin = await makeUser({ role: "super_admin" });
    fullAdmin = await makeUser({
      role: "admin",
      adminPermissions: Object.values(ADMIN_PERMISSIONS),
    });
    limitedAdmin = await makeUser({ role: "admin", adminPermissions: ["application:read:all"] });
    devotee = await makeUser({ role: "devotee" });
  });

  afterAll(async () => {
    // Restore any super admins temporarily suspended by the last-admin test.
    for (const id of previouslyActiveSuperAdmins) {
      await User.updateOne({ _id: id }, { $set: { status: "active" } });
    }
    await Session.deleteMany({ userId: { $in: createdUserIds } });
    await AuthToken.deleteMany({ _id: { $in: createdTokenIds } });
    await AuthToken.deleteMany({ userId: { $in: createdUserIds } });
    await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
    await AuditLog.deleteMany({ targetId: { $in: createdUserIds } });
    await DevoteeApplication.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    for (const id of createdAreaIds) {
      await AuditLog.deleteMany({ targetId: id });
    }
    await disconnectFromDatabase();
    process.chdir(ORIGINAL_CWD);
    delete process.env.UTSAV_LOCAL_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  describe("Administrator creation paths", () => {
    it("requires Super Admin for both account creation and invitation management", async () => {
      const adminCookie = await cookieFor(limitedAdmin, "10.250.1.1");
      expect(
        (
          await postUser(
            request("/api/admin/users", { method: "POST", cookie: adminCookie, body: {} }),
          )
        ).status,
      ).toBe(403);
      expect((await getUsers(request("/api/admin/users", { cookie: adminCookie }))).status).toBe(
        403,
      );
      expect(
        (
          await postInvite(
            request("/api/admin/users/invitations", {
              method: "POST",
              cookie: adminCookie,
              body: {},
            }),
          )
        ).status,
      ).toBe(403);
      expect(
        (await getInvites(request("/api/admin/users/invitations", { cookie: adminCookie }))).status,
      ).toBe(403);
    });

    it("refuses to create a Super Admin through the Create account path", async () => {
      const cookie = await cookieFor(superAdmin, "10.250.1.2");
      const response = await postUser(
        request("/api/admin/users", {
          method: "POST",
          cookie,
          body: {
            fullName: "Escalated Admin",
            email: `escalated-${runId}@example.com`,
            password: "EscalationTest!2345",
            phone: "+919876543211",
            gender: "male",
            role: "super_admin",
          },
        }),
      );
      expect(response.status).toBe(400);
      expect(await User.findOne({ email: `escalated-${runId}@example.com` })).toBeNull();
    });

    it("refuses unknown and arbitrary permission strings, and de-duplicates valid grants", async () => {
      const cookie = await cookieFor(superAdmin, "10.250.1.3");
      for (const permissions of [
        ["super_admin"],
        ["audit:read:all:everything"],
        ["not:a:permission"],
      ]) {
        const response = await postUser(
          request("/api/admin/users", {
            method: "POST",
            cookie,
            body: {
              fullName: "Bad Permissions",
              email: `badperm-${runId}-${permissions[0]}@example.com`,
              password: "BadPermTest!2345",
              phone: "+919876543212",
              gender: "male",
              role: "admin",
              adminPermissions: permissions,
            },
          }),
        );
        expect(response.status).toBe(400);
      }

      const email = `dedupe-${runId}@example.com`;
      const response = await postUser(
        request("/api/admin/users", {
          method: "POST",
          cookie,
          body: {
            fullName: "Deduped Admin",
            email,
            password: "DedupeTest!2345",
            phone: "+919876543213",
            gender: "male",
            role: "admin",
            adminPermissions: ["devotee:read:all", "devotee:read:all"],
          },
        }),
      );
      expect(response.status).toBe(201);
      const created = await User.findOne({ email });
      createdUserIds.push(created._id);
      expect(created.adminPermissions).toEqual(["devotee:read:all"]);
      const audit = await AuditLog.findOne({
        eventType: "admin.user.created",
        targetId: created._id,
      });
      expect(audit.metadata.permissionCount).toBe(1);
    });
  });

  describe("Administrator invitations", () => {
    it("creates a single-use seven-day token and rejects invalid states", async () => {
      const cookie = await cookieFor(superAdmin, "10.250.2.1");
      const email = `invitee-${runId}@example.com`;
      const created = await inviteAdministrator(superAdmin, email, ["application:read:all"]);
      const token = await AuthToken.findById(created.invitationId);
      createdTokenIds.push(token._id);
      const ageDays = (token.expiresAt - token.createdAt) / 86400000;
      expect(ageDays).toBeCloseTo(7, 1);
      expect(token.tokenHash).not.toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(token.usedAt).toBeFalsy();
      expect(
        await AuditLog.countDocuments({
          eventType: "admin.invitation.created",
          targetId: token._id,
        }),
      ).toBe(1);
      expect((await getInvites(request("/api/admin/users/invitations", { cookie }))).status).toBe(
        200,
      );

      const setup = (overrides = {}) => ({
        token: "not-a-valid-token",
        fullName: "Invitee Person",
        password: "InviteeTest!2345",
        phone: "+919876543214",
        gender: "male",
        ...overrides,
      });

      // Invalid token.
      expect(
        (
          await acceptInvite(
            request("/api/auth/admin-invitation/accept", { method: "POST", body: setup() }),
          )
        ).status,
      ).toBe(400);

      // Expired token.
      await AuthToken.updateOne(
        { _id: token._id },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
      expect(
        (
          await acceptInvite(
            request("/api/auth/admin-invitation/accept", {
              method: "POST",
              body: setup({ token: "expired" }),
            }),
          )
        ).status,
      ).toBe(400);
      await AuthToken.updateOne(
        { _id: token._id },
        { $set: { expiresAt: new Date(Date.now() + 86400000) } },
      );

      // Wrong token type.
      const wrongType = await AuthToken.create({
        tokenHash: hashToken("wrong-type-token"),
        type: "password_reset",
        expiresAt: new Date(Date.now() + 86400000),
      });
      createdTokenIds.push(wrongType._id);
      expect(
        (
          await acceptInvite(
            request("/api/auth/admin-invitation/accept", {
              method: "POST",
              body: setup({ token: "wrong-type-token" }),
            }),
          )
        ).status,
      ).toBe(400);

      // Revoked token (revocation deletes the record).
      const revokeResponse = await revokeInvite(
        request(`/api/admin/users/invitations/${token._id}/revoke`, { method: "PATCH", cookie }),
        { params: Promise.resolve({ id: token._id.toString() }) },
      );
      expect(revokeResponse.status).toBe(200);
      expect(await AuthToken.findById(token._id)).toBeNull();
      expect(
        (
          await acceptInvite(
            request("/api/auth/admin-invitation/accept", {
              method: "POST",
              body: setup({ token: "revoked" }),
            }),
          )
        ).status,
      ).toBe(400);
    });

    it("accepts a valid token into an Admin account with audit, and rejects reuse", async () => {
      const email = `accept-${runId}@example.com`;
      const rawToken = generateToken();
      const invitation = await AuthToken.create({
        tokenHash: hashToken(rawToken),
        email,
        type: "admin_invitation",
        metadata: {
          invitedBy: superAdmin._id,
          permissions: ["devotee:read:all", "devotee:read:all", "audit:read:all"],
        },
        expiresAt: new Date(Date.now() + 86400000),
      });
      createdTokenIds.push(invitation._id);

      const response = await acceptInvite(
        request("/api/auth/admin-invitation/accept", {
          method: "POST",
          body: {
            token: rawToken,
            fullName: "Accepted Admin",
            password: "AcceptedTest!2345",
            phone: "+919876543215",
            gender: "male",
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.user.role).toBe("admin");
      expect(body.data.user.adminPermissions).toEqual(["devotee:read:all", "audit:read:all"]);
      const account = await User.findOne({ email });
      createdUserIds.push(account._id);
      expect(account.role).toBe("admin");
      expect(
        await AuditLog.countDocuments({
          eventType: "admin.invitation.accepted",
          targetId: account._id,
        }),
      ).toBe(1);

      // Already-used token is rejected.
      const reuse = await acceptInvite(
        request("/api/auth/admin-invitation/accept", {
          method: "POST",
          body: {
            token: rawToken,
            fullName: "Reuse Admin",
            password: "ReuseTest!2345",
            phone: "+919876543216",
            gender: "male",
          },
        }),
      );
      expect(reuse.status).toBe(400);
    });
  });

  describe("Granular permission enforcement on real route handlers", () => {
    it("refuses Super Admin account management to ordinary administrators", async () => {
      const cookie = await cookieFor(limitedAdmin, "10.250.3.1");
      expect((await getUsers(request("/api/admin/users", { cookie }))).status).toBe(403);
      expect(
        (
          await patchUser(
            request(`/api/admin/users/${devotee._id}`, {
              method: "PATCH",
              cookie,
              body: { status: "suspended" },
            }),
            { params: Promise.resolve({ id: devotee._id.toString() }) },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await revokeInvite(
            request(`/api/admin/users/invitations/${new mongoose.Types.ObjectId()}/revoke`, {
              method: "PATCH",
              cookie,
            }),
            { params: Promise.resolve({ id: "000000000000000000000000" }) },
          )
        ).status,
      ).toBe(403);
    });

    it("rejects promotion of an ordinary admin to Super Admin", async () => {
      const target = await makeUser({ role: "admin", adminPermissions: [] });
      const cookie = await cookieFor(superAdmin, "10.250.3.2");
      const response = await patchUser(
        request(`/api/admin/users/${target._id}`, {
          method: "PATCH",
          cookie,
          body: { role: "super_admin" },
        }),
        { params: Promise.resolve({ id: target._id.toString() }) },
      );
      expect(response.status).toBe(403);
      expect((await User.findById(target._id)).role).toBe("admin");
    });

    it("enforces devotee:status:update and devotee:delete separately", async () => {
      const target = await makeUser({ role: "devotee" });
      const limitedCookie = await cookieFor(limitedAdmin, "10.250.3.3");
      const fullCookie = await cookieFor(fullAdmin, "10.250.3.4");
      expect(
        (
          await patchStatus(
            request(`/api/admin/accounts/${target._id}/status`, {
              method: "PATCH",
              cookie: limitedCookie,
              body: { status: "suspended", reason: "No permission check" },
            }),
            { params: Promise.resolve({ id: target._id.toString() }) },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await deleteAccountRoute(
            request(`/api/admin/accounts/${target._id}`, {
              method: "DELETE",
              cookie: limitedCookie,
              body: { reason: "No permission" },
            }),
            { params: Promise.resolve({ id: target._id.toString() }) },
          )
        ).status,
      ).toBe(410);
      expect(
        (
          await patchStatus(
            request(`/api/admin/accounts/${target._id}/status`, {
              method: "PATCH",
              cookie: fullCookie,
              body: { status: "suspended", reason: "Full admin suspension" },
            }),
            { params: Promise.resolve({ id: target._id.toString() }) },
          )
        ).status,
      ).toBe(200);
    });

    it("enforces area:manage, proposal:review, report and audit permissions on direct API calls", async () => {
      const limitedCookie = await cookieFor(limitedAdmin, "10.250.3.5");
      const fullCookie = await cookieFor(fullAdmin, "10.250.3.6");
      const areaBody = {
        name: `Security Area ${runId}`,
        type: "Locality",
        code: `SEC-${runId.slice(-6)}`,
        populationEstimate: 1000,
        location: { type: "Point", coordinates: [77.2, 28.6] },
      };
      expect(
        (
          await postArea(
            request("/api/admin/areas", { method: "POST", cookie: limitedCookie, body: areaBody }),
          )
        ).status,
      ).toBe(403);
      const createdArea = await postArea(
        request("/api/admin/areas", { method: "POST", cookie: fullCookie, body: areaBody }),
      );
      expect(createdArea.status).toBe(201);
      const areaBodyResult = await createdArea.json();
      createdAreaIds.push(areaBodyResult.data.area._id ?? areaBodyResult.data.area.id);

      const fakeId = new mongoose.Types.ObjectId().toString();
      expect(
        (
          await postReview(
            request(`/api/admin/applications/${fakeId}/review`, {
              method: "POST",
              cookie: limitedCookie,
              body: { status: "approved" },
            }),
            { params: Promise.resolve({ id: fakeId }) },
          )
        ).status,
      ).toBe(403);
      expect(
        (await getReports(request("/api/admin/invitations", { cookie: limitedCookie }))).status,
      ).toBe(403);
      expect(
        (await getReports(request("/api/admin/invitations", { cookie: fullCookie }))).status,
      ).toBe(200);
      expect(
        (await getAudit(request("/api/admin/audit-logs", { cookie: limitedCookie }))).status,
      ).toBe(403);
      expect(
        (await getAudit(request("/api/admin/audit-logs", { cookie: fullCookie }))).status,
      ).toBe(200);
    });

    it("keeps note writing separate from application review", async () => {
      const reviewer = await makeUser({
        role: "admin",
        adminPermissions: ["application:read:all", "application:review:all"],
      });
      const cookie = await cookieFor(reviewer, "10.250.3.7");
      const application = await DevoteeApplication.create({
        userId: reviewer._id,
        applicantName: reviewer.fullName,
        applicantEmail: reviewer.email,
        applicantPhone: reviewer.phone,
        gender: reviewer.gender,
        status: "pending",
        isCurrent: true,
      });
      createdApplicationIds.push(application._id);
      // A reviewer without note:write cannot smuggle a note through review.
      const response = await postReview(
        request(`/api/admin/applications/${application._id}/review`, {
          method: "POST",
          cookie,
          body: { status: "approved", note: "Note written without note:write grant" },
        }),
        { params: Promise.resolve({ id: application._id.toString() }) },
      );
      expect(response.status).toBe(400);
      expect(reviewer.adminPermissions).not.toContain(ADMIN_PERMISSIONS.APPLICATION_NOTE_WRITE);
    });
  });

  describe("Account protection", () => {
    it("refuses self-modification and deletion of any Super Admin target", async () => {
      const cookie = await cookieFor(superAdmin, "10.250.4.1");
      expect(
        (
          await patchUser(
            request(`/api/admin/users/${superAdmin._id}`, {
              method: "PATCH",
              cookie,
              body: { status: "suspended", reason: "Self suspension" },
            }),
            { params: Promise.resolve({ id: superAdmin._id.toString() }) },
          )
        ).status,
      ).toBe(409);
      await expect(
        deleteAccount(superAdmin, superAdmin._id.toString(), "Self deletion"),
      ).rejects.toThrow(/disabled/i);
      const other = await makeUser({ role: "super_admin" });
      await expect(
        deleteAccount(superAdmin, other._id.toString(), "Delete another Super Admin"),
      ).rejects.toThrow(/disabled/i);
    });

    it("preserves an active Super Admin: self-suspension and Super Admin deletion are refused", async () => {
      const actor = await makeUser({ role: "super_admin" });
      const cookie = await cookieFor(actor, "10.250.4.2");
      const response = await patchUser(
        request(`/api/admin/users/${actor._id}`, {
          method: "PATCH",
          cookie,
          body: { status: "suspended", reason: "Suspend the only admin" },
        }),
        { params: Promise.resolve({ id: actor._id.toString() }) },
      );
      expect(response.status).toBe(409);
      await expect(
        deleteAccount(superAdmin, actor._id.toString(), "Delete a Super Admin"),
      ).rejects.toThrow(/disabled/i);
      expect((await User.findById(actor._id)).status).toBe("active");
    });
  });

  describe("Dashboard metrics and audit metadata", () => {
    it("returns database-backed counts and enforces the devotee permission", async () => {
      for (const status of ["pending", "approved", "rejected"]) {
        const dev = await makeUser({ role: "devotee" });
        const app = await DevoteeApplication.create({
          userId: dev._id,
          applicantName: dev.fullName,
          applicantEmail: dev.email,
          applicantPhone: dev.phone,
          gender: dev.gender,
          status,
          isCurrent: true,
        });
        createdApplicationIds.push(app._id);
      }
      const activeDevotees = await User.countDocuments({ role: "devotee", status: "active" });
      const suspendedDevotees = await User.countDocuments({ role: "devotee", status: "suspended" });
      const stats = await getApplicationStats(superAdmin);
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.approved).toBeGreaterThanOrEqual(1);
      expect(stats.rejected).toBeGreaterThanOrEqual(1);
      const devoteeStats = await getDevoteeStats(superAdmin);
      expect(devoteeStats.activeDevotees).toBe(activeDevotees);
      expect(devoteeStats.suspendedDevotees).toBe(suspendedDevotees);
      await expect(getDevoteeStats(limitedAdmin)).rejects.toThrow(/devotee:read:all/);
    });

    it("exposes audit metadata only to admins holding audit:read:all", async () => {
      const target = await makeUser({ role: "devotee" });
      const cookie = await cookieFor(fullAdmin, "10.250.5.1");
      await patchStatus(
        request(`/api/admin/accounts/${target._id}/status`, {
          method: "PATCH",
          cookie,
          body: { status: "suspended", reason: "Audit metadata check" },
        }),
        { params: Promise.resolve({ id: target._id.toString() }) },
      );
      const audit = await AuditLog.findOne({
        eventType: "admin.devotee.status_updated",
        targetId: target._id,
      });
      expect(audit.metadata).toHaveProperty("from");
      expect(audit.metadata).toHaveProperty("to");
      const limitedCookie = await cookieFor(limitedAdmin, "10.250.5.2");
      expect(
        (await getAudit(request("/api/admin/audit-logs", { cookie: limitedCookie }))).status,
      ).toBe(403);
    });
  });
});
