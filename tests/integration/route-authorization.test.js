import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Area } from "@/api/models/area.js";
import { Session } from "@/api/models/session.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { InvitationReport } from "@/api/models/invitation-report.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { RateLimit } from "@/api/models/rate-limit.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { login } from "@/api/services/auth-service.js";
import { createArea } from "@/api/services/area-service.js";

import { GET as getAreas } from "@/app/api/areas/route.js";
import { GET as getInvitations, POST as postInvitation } from "@/app/api/invitations/route.js";
import { GET as getAdminApplications } from "@/app/api/admin/applications/route.js";
import { GET as getAdminApplication } from "@/app/api/admin/applications/[id]/route.js";
import { POST as postReview } from "@/app/api/admin/applications/[id]/review/route.js";
import { GET as getAdminInvitations } from "@/app/api/admin/invitations/route.js";
import { GET as getAuditLogs } from "@/app/api/admin/audit-logs/route.js";
import { PATCH as patchUser } from "@/app/api/admin/users/[id]/route.js";
import { POST as postLogin } from "@/app/api/auth/login/route.js";
import { POST as postRegister } from "@/app/api/auth/register/route.js";
import { POST as postVerify } from "@/app/api/auth/verify-email/route.js";

const gate = await databaseSuiteGate("route-authorization");

const BASE = "http://localhost:3000";

describe.skipIf(gate.skip)("Route-handler authorization and request hardening", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdUserIds = [];
  const createdAreaIds = [];
  const createdReportIds = [];
  const sessions = [];
  const cookies = new Map();
  let superAdmin,
    appReader,
    reviewOnly,
    areaManager,
    reportReader,
    auditReader,
    devotee,
    pendingApplicant,
    applicant,
    suspendableAdmin;
  let testArea;
  let application;

  async function makeUser(overrides) {
    const user = await User.create({
      email: `route-${runId}-${createdUserIds.length}@example.com`,
      fullName: `Route User ${createdUserIds.length}`,
      phone: "+919876543260",
      gender: "male",
      passwordHash: await hashPassword("TestPassword123!"),
      role: "devotee",
      status: "active",
      emailVerified: true,
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  async function cookieFor(user, ipSuffix) {
    if (cookies.has(user._id.toString())) return cookies.get(user._id.toString());
    const result = await login(user.email, "TestPassword123!", {
      userAgent: "route-authorization-test",
      ip: `10.10.0.${ipSuffix}`,
    });
    const token = result.sessionCookie.match(/session=([^;]+)/)[1];
    sessions.push(token);
    const cookie = `session=${token}`;
    cookies.set(user._id.toString(), cookie);
    return cookie;
  }

  function request(path, { method = "GET", cookie, body, headers = {} } = {}) {
    const finalHeaders = { ...headers };
    if (cookie) finalHeaders.cookie = cookie;
    if (body !== undefined) finalHeaders["content-type"] = "application/json";
    return new Request(`${BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function read(response) {
    return { status: response.status, body: await response.json() };
  }

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    superAdmin = await makeUser({ role: "super_admin" });
    appReader = await makeUser({
      role: "admin",
      adminPermissions: ["application:read:all"],
    });
    reviewOnly = await makeUser({
      role: "admin",
      adminPermissions: ["application:review:all"],
    });
    areaManager = await makeUser({ role: "admin", adminPermissions: ["area:manage"] });
    reportReader = await makeUser({
      role: "admin",
      adminPermissions: ["invitation-report:read:all"],
    });
    auditReader = await makeUser({
      role: "admin",
      adminPermissions: ["audit:read:all"],
    });
    devotee = await makeUser({});
    pendingApplicant = await makeUser({ status: "pending_approval" });
    applicant = await makeUser({
      status: "pending_approval",
      email: `applicant-${runId}@example.com`,
      fullName: "Application Route Applicant",
      phone: "+919876543299",
    });
    suspendableAdmin = await makeUser({
      role: "admin",
      adminPermissions: ["application:read:all"],
    });

    const areaResult = await createArea(superAdmin, {
      name: `Route Authorization Area ${runId}`,
      type: "Locality",
      code: `RTA-${runId.slice(-6)}`,
      populationEstimate: 10_000,
      location: { type: "Point", coordinates: [77.209, 28.6139] },
    });
    testArea = areaResult.area;
    createdAreaIds.push(testArea._id);

    application = await DevoteeApplication.create({
      userId: applicant._id,
      applicantName: applicant.fullName,
      applicantEmail: applicant.email,
      applicantPhone: applicant.phone,
      gender: "male",
      message: "Please consider my application.",
      status: "pending",
      isCurrent: true,
    });
  });

  afterAll(async () => {
    for (const token of sessions) {
      const { logout } = await import("@/api/services/auth-service.js");
      await logout(token).catch(() => {});
    }
    if (createdReportIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdReportIds } });
      await InvitationReport.deleteMany({ _id: { $in: createdReportIds } });
    }
    if (application) {
      await AuditLog.deleteMany({ targetId: application._id });
      await DevoteeApplication.deleteOne({ _id: application._id });
    }
    if (createdAreaIds.length > 0) {
      await AuditLog.deleteMany({ targetId: { $in: createdAreaIds } });
      await Area.deleteMany({ _id: { $in: createdAreaIds } });
    }
    if (createdUserIds.length > 0) {
      await Session.deleteMany({ userId: { $in: createdUserIds } });
      await AuthToken.deleteMany({ userId: { $in: createdUserIds } });
      await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await RateLimit.deleteMany({});
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  describe("approved-area and reporting routes", () => {
    it("rejects anonymous and application-scope callers from geography", async () => {
      expect((await getAreas(request("/api/areas"))).status).toBe(401);

      const pendingCookie = await cookieFor(pendingApplicant, 1);
      expect((await getAreas(request("/api/areas", { cookie: pendingCookie }))).status).toBe(403);
    });

    it("allows an active devotee to read approved areas", async () => {
      const devoteeCookie = await cookieFor(devotee, 2);
      const { status, body } = await read(
        await getAreas(
          request("/api/areas?search=Route%20Authorization", { cookie: devoteeCookie }),
        ),
      );
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.areas.some((area) => area._id === testArea._id.toString())).toBe(true);
    });

    it("applies contributor-only reporting rules at the route boundary", async () => {
      const pendingCookie = await cookieFor(pendingApplicant, 1);
      const adminCookie = await cookieFor(areaManager, 3);
      const devoteeCookie = await cookieFor(devotee, 2);
      const payload = {
        areaId: testArea._id.toString(),
        invitationCount: 25,
        reportDate: "2026-10-01",
      };

      expect(
        (await postInvitation(request("/api/invitations", { method: "POST", body: payload })))
          .status,
      ).toBe(401);
      expect(
        (
          await postInvitation(
            request("/api/invitations", { method: "POST", cookie: pendingCookie, body: payload }),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await postInvitation(
            request("/api/invitations", { method: "POST", cookie: adminCookie, body: payload }),
          )
        ).status,
      ).toBe(403);

      const created = await read(
        await postInvitation(
          request("/api/invitations", { method: "POST", cookie: devoteeCookie, body: payload }),
        ),
      );
      expect(created.status).toBe(201);
      expect(created.body.data.report.invitationCount).toBe(25);
      createdReportIds.push(created.body.data.report._id);
    });

    it("separates area management from invitation-report access", async () => {
      const areaManagerCookie = await cookieFor(areaManager, 3);
      const reportReaderCookie = await cookieFor(reportReader, 4);

      expect(
        (
          await getAdminInvitations(
            request("/api/admin/invitations", { cookie: areaManagerCookie }),
          )
        ).status,
      ).toBe(403);

      const { status, body } = await read(
        await getAdminInvitations(
          request("/api/admin/invitations", { cookie: reportReaderCookie }),
        ),
      );
      expect(status).toBe(200);
      expect(
        body.data.reports.some((report) => report._id === createdReportIds[0].toString()),
      ).toBe(true);
    });
  });

  describe("admin application routes", () => {
    it("requires application:read:all and masks contact data in lists", async () => {
      const devoteeCookie = await cookieFor(devotee, 2);
      const reviewCookie = await cookieFor(reviewOnly, 5);
      const readerCookie = await cookieFor(appReader, 6);

      expect(
        (await getAdminApplications(request("/api/admin/applications", { cookie: devoteeCookie })))
          .status,
      ).toBe(403);
      expect(
        (await getAdminApplications(request("/api/admin/applications", { cookie: reviewCookie })))
          .status,
      ).toBe(403);

      const { status, body } = await read(
        await getAdminApplications(
          request(`/api/admin/applications?search=${encodeURIComponent(applicant.email)}`, {
            cookie: readerCookie,
          }),
        ),
      );
      expect(status).toBe(200);
      const listed = body.data.applications.find(
        (entry) => entry.id === application._id.toString(),
      );
      expect(listed).toBeDefined();
      // The list endpoint exposes a normalized string `id`. `_id` is a
      // server-only ObjectId and must never reach client-rendered list keys.
      expect(listed.id).toBe(application._id.toString());
      expect(listed._id).toBeUndefined();
      expect(listed.applicantEmail).toBe(`a***@example.com`);
      expect(listed.applicantPhone).toBe(`***${applicant.phone.slice(-4)}`);
    });

    it("returns full contact data only from the audited detail view", async () => {
      const readerCookie = await cookieFor(appReader, 6);
      const { status, body } = await read(
        await getAdminApplication(
          request(`/api/admin/applications/${application._id}`, { cookie: readerCookie }),
          { params: Promise.resolve({ id: application._id.toString() }) },
        ),
      );
      expect(status).toBe(200);
      expect(body.data.application.applicantEmail).toBe(applicant.email);
      expect(body.data.application.applicantPhone).toBe(applicant.phone);

      const audit = await AuditLog.findOne({
        eventType: "application.viewed",
        targetId: application._id,
      }).lean();
      expect(audit).not.toBeNull();
    });
  });

  describe("admin application review (approve/reject) routes", () => {
    it("requires application:review:all permission to review", async () => {
      const appReaderCookie = await cookieFor(appReader, 6);
      const devoteeCookie = await cookieFor(devotee, 2);

      // appReader has application:read:all but NOT application:review:all
      const readerResponse = await postReview(
        request(`/api/admin/applications/${application._id}`, {
          method: "POST",
          cookie: appReaderCookie,
          body: { status: "approved" },
        }),
        { params: Promise.resolve({ id: application._id.toString() }) },
      );
      expect(readerResponse.status).toBe(403);

      // devotee has no admin permissions at all
      const devoteeResponse = await postReview(
        request(`/api/admin/applications/${application._id}`, {
          method: "POST",
          cookie: devoteeCookie,
          body: { status: "approved" },
        }),
        { params: Promise.resolve({ id: application._id.toString() }) },
      );
      expect(devoteeResponse.status).toBe(403);
    });

    it("rejects anonymous callers to the review endpoint", async () => {
      const response = await postReview(
        request(`/api/admin/applications/${application._id}`, {
          method: "POST",
          body: { status: "approved" },
        }),
        { params: Promise.resolve({ id: application._id.toString() }) },
      );
      expect(response.status).toBe(401);
    });

    it("approves a pending application and activates the devotee account", async () => {
      const reviewCookie = await cookieFor(reviewOnly, 5);

      const response = await postReview(
        request(`/api/admin/applications/${application._id}`, {
          method: "POST",
          cookie: reviewCookie,
          body: { status: "approved" },
        }),
        { params: Promise.resolve({ id: application._id.toString() }) },
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.application.status).toBe("approved");
      expect(body.data.application.reviewedAt).toBeDefined();

      // Application status updated
      const updatedApp = await DevoteeApplication.findById(application._id).lean();
      expect(updatedApp.status).toBe("approved");
      expect(updatedApp.reviewedBy.toString()).toBe(reviewOnly._id.toString());
      expect(updatedApp.reviewNote).toBeFalsy();

      // Devotee user activated
      const updatedUser = await User.findById(applicant._id).lean();
      expect(updatedUser.status).toBe("active");
      expect(updatedUser.emailVerified).toBe(true);

      // Audit log created
      const audit = await AuditLog.findOne({
        eventType: "application.approved",
        targetId: application._id,
      }).lean();
      expect(audit).not.toBeNull();
      expect(audit.actorId.toString()).toBe(reviewOnly._id.toString());
    });

    it("rejects a pending application without relying on note-write permission", async () => {
      // Create a fresh pending application for this test
      const rejectApp = await DevoteeApplication.create({
        userId: pendingApplicant._id,
        applicantName: pendingApplicant.fullName,
        applicantEmail: pendingApplicant.email,
        applicantPhone: pendingApplicant.phone,
        gender: pendingApplicant.gender,
        message: "Please consider me.",
        status: "pending",
        isCurrent: true,
      });

      const reviewCookie = await cookieFor(reviewOnly, 5);

      // Rejection no longer requires an internal note (notes are a separate permission).
      const noNoteResponse = await postReview(
        request(`/api/admin/applications/${rejectApp._id}`, {
          method: "POST",
          cookie: reviewCookie,
          body: { status: "rejected" },
        }),
        { params: Promise.resolve({ id: rejectApp._id.toString() }) },
      );
      expect(noNoteResponse.status).toBe(200);
      const body = await noNoteResponse.json();
      expect(body.success).toBe(true);
      expect(body.data.application.status).toBe("rejected");

      // Application status updated
      const updatedApp = await DevoteeApplication.findById(rejectApp._id).lean();
      expect(updatedApp.status).toBe("rejected");
      expect(updatedApp.reviewNote).toBeFalsy();

      // Devotee user set to rejected
      const updatedUser = await User.findById(pendingApplicant._id).lean();
      expect(updatedUser.status).toBe("rejected");

      // Audit log created
      const audit = await AuditLog.findOne({
        eventType: "application.rejected",
        targetId: rejectApp._id,
      }).lean();
      expect(audit).not.toBeNull();
      expect(audit.actorId.toString()).toBe(reviewOnly._id.toString());

      // Clean up
      await AuditLog.deleteMany({ targetId: rejectApp._id });
      await DevoteeApplication.deleteOne({ _id: rejectApp._id });
    });

    it("rejects review of an already-reviewed application", async () => {
      // Create a separate application for this test to avoid interfering with
      // the shared fixture used by other tests.
      const alreadyReviewedApp = await DevoteeApplication.create({
        userId: pendingApplicant._id,
        applicantName: "Already Reviewed Applicant",
        applicantEmail: `already-reviewed-${runId}@example.com`,
        applicantPhone: "+919876543297",
        gender: "female",
        message: "Already reviewed.",
        status: "pending",
        isCurrent: true,
      });

      const reviewCookie = await cookieFor(reviewOnly, 5);

      // First review approves it
      await postReview(
        request(`/api/admin/applications/${alreadyReviewedApp._id}`, {
          method: "POST",
          cookie: reviewCookie,
          body: { status: "approved" },
        }),
        { params: Promise.resolve({ id: alreadyReviewedApp._id.toString() }) },
      );

      // Second review attempt should conflict
      const response = await postReview(
        request(`/api/admin/applications/${alreadyReviewedApp._id}`, {
          method: "POST",
          cookie: reviewCookie,
          body: { status: "rejected" },
        }),
        { params: Promise.resolve({ id: alreadyReviewedApp._id.toString() }) },
      );
      expect(response.status).toBe(409);

      // Clean up
      await AuditLog.deleteMany({ targetId: alreadyReviewedApp._id });
      await DevoteeApplication.deleteOne({ _id: alreadyReviewedApp._id });
    });

    it("returns 404 for review of a nonexistent application", async () => {
      const reviewCookie = await cookieFor(reviewOnly, 5);
      const fakeId = "000000000000000000000000";

      const response = await postReview(
        request(`/api/admin/applications/${fakeId}`, {
          method: "POST",
          cookie: reviewCookie,
          body: { status: "approved" },
        }),
        { params: Promise.resolve({ id: fakeId }) },
      );
      expect(response.status).toBe(404);
    });
  });

  describe("audit and account-management routes", () => {
    it("lets only audit:read:all administrators read the audit trail", async () => {
      const devoteeCookie = await cookieFor(devotee, 2);
      const readerCookie = await cookieFor(appReader, 6);
      const auditCookie = await cookieFor(auditReader, 7);

      expect(
        (await getAuditLogs(request("/api/admin/audit-logs", { cookie: devoteeCookie }))).status,
      ).toBe(403);
      expect(
        (await getAuditLogs(request("/api/admin/audit-logs", { cookie: readerCookie }))).status,
      ).toBe(403);
      expect(
        (await getAuditLogs(request("/api/admin/audit-logs", { cookie: auditCookie }))).status,
      ).toBe(200);
    });

    it("refuses account management to non-Super Admins", async () => {
      const readerCookie = await cookieFor(appReader, 6);
      const response = await patchUser(
        request(`/api/admin/users/${suspendableAdmin._id}`, {
          method: "PATCH",
          cookie: readerCookie,
          body: { status: "suspended" },
        }),
        { params: Promise.resolve({ id: suspendableAdmin._id.toString() }) },
      );
      expect(response.status).toBe(403);
    });

    it("rejects unknown fields instead of mass-assigning them", async () => {
      const superCookie = await cookieFor(superAdmin, 8);
      const response = await patchUser(
        request(`/api/admin/users/${suspendableAdmin._id}`, {
          method: "PATCH",
          cookie: superCookie,
          body: { status: "active", isSuperAdmin: true },
        }),
        { params: Promise.resolve({ id: suspendableAdmin._id.toString() }) },
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("protects the acting Super Admin from changing their own account", async () => {
      const superCookie = await cookieFor(superAdmin, 8);
      const response = await patchUser(
        request(`/api/admin/users/${superAdmin._id}`, {
          method: "PATCH",
          cookie: superCookie,
          body: { role: "devotee" },
        }),
        { params: Promise.resolve({ id: superAdmin._id.toString() }) },
      );
      expect(response.status).toBe(409);
    });

    it("suspends an account and revokes every live session", async () => {
      const victimCookie = await cookieFor(suspendableAdmin, 9);
      expect(victimCookie).toBeTruthy();
      expect(await Session.countDocuments({ userId: suspendableAdmin._id })).toBeGreaterThan(0);

      const superCookie = await cookieFor(superAdmin, 8);
      const response = await patchUser(
        request(`/api/admin/users/${suspendableAdmin._id}`, {
          method: "PATCH",
          cookie: superCookie,
          body: { status: "suspended", reason: "Suspending temporary test administrator" },
        }),
        { params: Promise.resolve({ id: suspendableAdmin._id.toString() }) },
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.user.status).toBe("suspended");
      expect(await Session.countDocuments({ userId: suspendableAdmin._id })).toBe(0);

      const revoked = await getAreas(request("/api/areas", { cookie: victimCookie }));
      expect(revoked.status).toBe(401);
    });
  });

  describe("CSRF, validation and rate limiting", () => {
    it("blocks a mutating request whose Origin is foreign", async () => {
      const response = await postLogin(
        request("/api/auth/login", {
          method: "POST",
          headers: { origin: "https://evil.example" },
          body: { email: devotee.email, password: "TestPassword123!" },
        }),
      );
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("blocks a browser request marked cross-site", async () => {
      const response = await postInvitation(
        request("/api/invitations", {
          method: "POST",
          cookie: await cookieFor(devotee, 2),
          headers: { "sec-fetch-site": "cross-site" },
          body: { areaId: testArea._id.toString(), invitationCount: 1, reportDate: "2026-10-01" },
        }),
      );
      expect(response.status).toBe(403);
    });

    it("rejects extra fields on login and verification payloads", async () => {
      const loginResponse = await postLogin(
        request("/api/auth/login", {
          method: "POST",
          body: { email: devotee.email, password: "TestPassword123!", role: "super_admin" },
        }),
      );
      expect(loginResponse.status).toBe(400);

      const verifyResponse = await postVerify(
        request("/api/auth/verify-email", {
          method: "POST",
          body: { token: "a".repeat(32), admin: true },
        }),
      );
      expect(verifyResponse.status).toBe(400);
    });

    it("keeps registration closed", async () => {
      process.env.REGISTRATION_MODE = "closed";
      resetEnvCache();

      const response = await postRegister(
        request("/api/auth/register", {
          method: "POST",
          headers: { "x-forwarded-for": "10.10.9.9" },
          body: {
            fullName: "Should Not Be Created",
            email: `closed-${runId}@example.com`,
            password: "TestPassword123!",
            phone: "+919876543298",
            gender: "male",
          },
        }),
      );
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe("REGISTRATION_CLOSED");
      expect(await User.findOne({ email: `closed-${runId}@example.com` })).toBeNull();
    });

    it("accepts registration when mode is applications", async () => {
      process.env.REGISTRATION_MODE = "applications";
      resetEnvCache();

      const response = await postRegister(
        request("/api/auth/register", {
          method: "POST",
          headers: { "x-forwarded-for": "10.10.9.11" },
          body: {
            fullName: "Should Be Created",
            email: `open-${runId}@example.com`,
            password: "TestPassword123!",
            phone: "+919876543299",
            gender: "male",
          },
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      const createdUser = await User.findOne({ email: `open-${runId}@example.com` });
      expect(createdUser).not.toBeNull();
      expect(createdUser.status).toBe("pending_verification");
      expect(createdUser.emailVerified).toBe(false);

      // Clean up the created user and their application
      await Session.deleteMany({ userId: createdUser._id });
      await AuthToken.deleteMany({ userId: createdUser._id });
      await DevoteeApplication.deleteMany({ userId: createdUser._id });
      await User.deleteOne({ _id: createdUser._id });
    });

    it("returns 429 with Retry-After after repeated failed logins", async () => {
      const email = `missing-${runId}@example.com`;
      let lastResponse;
      for (let attempt = 0; attempt < 11; attempt += 1) {
        lastResponse = await postLogin(
          request("/api/auth/login", {
            method: "POST",
            headers: { "x-forwarded-for": "10.10.9.10" },
            body: { email, password: "WrongPassword123!" },
          }),
        );
      }
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.headers.get("retry-after")).toMatch(/^\d+$/);
      const body = await lastResponse.json();
      expect(body.error.code).toBe("RATE_LIMITED");
    });
  });
});
