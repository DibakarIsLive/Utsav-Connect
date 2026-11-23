import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { Session } from "@/api/models/session.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { login } from "@/api/services/auth-service.js";
import { GET as getOwnApplication } from "@/app/api/account/application/route.js";
import { POST as postNote } from "@/app/api/admin/applications/[id]/note/route.js";
import { POST as postReview } from "@/app/api/admin/applications/[id]/review/route.js";

const gate = await databaseSuiteGate("application-note");

describe.skipIf(gate.skip)("Separate internal note permission", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const originalUri = process.env.MONGODB_URI;
  const createdUserIds = [];
  let reviewer, noteWriter, superAdmin, applicant, application;
  const cookies = new Map();

  async function makeUser(overrides) {
    const user = await User.create({
      email: `note-${runId}-${createdUserIds.length}@example.com`,
      fullName: `Note Test ${createdUserIds.length}`,
      phone: "+919876543401",
      gender: "male",
      passwordHash: await hashPassword("NoteTest!2345"),
      status: "active",
      emailVerified: true,
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  async function cookieFor(user, ip) {
    if (cookies.has(user._id.toString())) return cookies.get(user._id.toString());
    const result = await login(user.email, "NoteTest!2345", { ip });
    const cookie = `session=${result.sessionCookie.match(/session=([^;]+)/)[1]}`;
    cookies.set(user._id.toString(), cookie);
    return cookie;
  }

  function request(path, cookie, body) {
    return new Request(`http://localhost:3000${path}`, {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    const dbName = new URL(TEST_DB_URI).pathname.split("?")[0].slice(1);
    if (!dbName.endsWith("_test") || dbName === "utsav_connect_pilot") {
      throw new Error(`Refusing note test against database ${dbName}`);
    }
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });
    reviewer = await makeUser({
      role: "admin",
      adminPermissions: ["application:read:all", "application:review:all"],
    });
    noteWriter = await makeUser({
      role: "admin",
      adminPermissions: ["application:read:all", "application:note:write"],
    });
    superAdmin = await makeUser({ role: "super_admin" });
    applicant = await makeUser({ role: "devotee", status: "active" });
    application = await DevoteeApplication.create({
      userId: applicant._id,
      applicantName: applicant.fullName,
      applicantEmail: applicant.email,
      applicantPhone: applicant.phone,
      gender: applicant.gender,
      status: "pending",
      isCurrent: true,
    });
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ targetId: application._id });
    await DevoteeApplication.deleteMany({ userId: { $in: createdUserIds } });
    await Session.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("refuses note writes to a reviewer who lacks application:note:write", async () => {
    const response = await postNote(
      request(
        `/api/admin/applications/${application._id}/note`,
        await cookieFor(reviewer, "10.253.0.1"),
        {
          note: "Secret internal note",
        },
      ),
      { params: Promise.resolve({ id: application._id.toString() }) },
    );
    expect(response.status).toBe(403);
  });

  it("ignores a note supplied with a decision and still allows the decision", async () => {
    const response = await postReview(
      request(
        `/api/admin/applications/${application._id}/review`,
        await cookieFor(reviewer, "10.253.0.2"),
        { status: "approved", note: "Trying to sneak a note through review" },
      ),
      { params: Promise.resolve({ id: application._id.toString() }) },
    );
    expect(response.status).toBe(400);
    const decision = await postReview(
      request(
        `/api/admin/applications/${application._id}/review`,
        await cookieFor(reviewer, "10.253.0.3"),
        {
          status: "approved",
        },
      ),
      { params: Promise.resolve({ id: application._id.toString() }) },
    );
    expect(decision.status).toBe(200);
    const stored = await DevoteeApplication.findById(application._id);
    expect(stored.reviewNote).toBeFalsy();
  });

  it("lets an explicitly granted note writer save a note with a safe audit record", async () => {
    const response = await postNote(
      request(
        `/api/admin/applications/${application._id}/note`,
        await cookieFor(noteWriter, "10.253.0.4"),
        {
          note: "Applicant called the office; documents verified.",
        },
      ),
      { params: Promise.resolve({ id: application._id.toString() }) },
    );
    expect(response.status).toBe(200);
    const stored = await DevoteeApplication.findById(application._id);
    expect(stored.reviewNote).toMatch(/documents verified/i);
    const audit = await AuditLog.findOne({
      eventType: "application.note.updated",
      targetId: application._id,
    });
    expect(audit.metadata.hasNote).toBe(true);
    expect(audit.metadata.noteLength).toBeGreaterThan(0);
    expect(audit.metadata).not.toHaveProperty("note");
  });

  it("refuses a note-only admin the ability to decide applications", async () => {
    const response = await postReview(
      request(
        `/api/admin/applications/${application._id}/review`,
        await cookieFor(noteWriter, "10.253.0.5"),
        {
          status: "approved",
        },
      ),
      { params: Promise.resolve({ id: application._id.toString() }) },
    );
    expect(response.status).toBe(403);
  });

  it("never exposes the internal note through the applicant-facing endpoint", async () => {
    const cookie = await cookieFor(applicant, "10.253.0.6");
    const response = await getOwnApplication(
      new Request("http://localhost:3000/api/account/application", { headers: { cookie } }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("documents verified");
    expect(JSON.stringify(body)).not.toContain("reviewNote");
  });

  it("lets a Super Admin write notes by role", async () => {
    const response = await postNote(
      request(
        `/api/admin/applications/${application._id}/note`,
        await cookieFor(superAdmin, "10.253.0.7"),
        {
          note: "Super admin note",
        },
      ),
      { params: Promise.resolve({ id: application._id.toString() }) },
    );
    expect(response.status).toBe(200);
  });
});
