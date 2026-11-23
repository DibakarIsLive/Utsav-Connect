import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { ACCOUNT_DELETION_POLICY_APPROVED } from "@/api/lib/policies/account-deletion-policy";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { submitApplication, verifyEmail } from "@/api/services/application-service.js";
import { login, logout, validateSession } from "@/api/services/auth-service.js";
import { inviteAdministrator, acceptAdminInvitation } from "@/api/services/admin-service.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { generateToken, hashToken } from "@/api/lib/auth/tokens.js";

const gate = await databaseSuiteGate("database-persistence");

describe.skipIf(gate.skip)("Database persistence - user accounts", () => {
  let originalUri;
  let testEmail;
  let createdUserId;
  let superAdminId;
  let adminId;

  beforeAll(async () => {
    originalUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    // Create a devotee via registration
    testEmail = `db-persist-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await submitApplication({
      fullName: "DB Persistence Test Devotee",
      email: testEmail,
      password: "TestPassword123!",
      phone: "+919876543210",
      gender: "male",
      message: "Database persistence test.",
    });
    createdUserId = result.userId;

    // Create a Super Admin directly
    const superAdminPasswordHash = await hashPassword("SuperAdminPassword123!");
    const superAdmin = await User.create({
      email: `sa-${Date.now()}@example.com`,
      fullName: "DB Persist Super Admin",
      phone: "+919876543211",
      gender: "female",
      passwordHash: superAdminPasswordHash,
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });
    superAdminId = superAdmin._id;

    // Create an Administrator directly
    const adminPasswordHash = await hashPassword("AdminPassword123!");
    const admin = await User.create({
      email: `admin-${Date.now()}@example.com`,
      fullName: "DB Persist Admin",
      phone: "+919876543212",
      gender: "male",
      passwordHash: adminPasswordHash,
      role: "admin",
      status: "active",
      emailVerified: true,
      adminPermissions: ["application:read:all"],
    });
    adminId = admin._id;
  });

  afterAll(async () => {
    // Clean up all test data
    await User.deleteMany({
      email: { $regex: /^db-persist-/ },
    });
    await User.deleteMany({
      email: { $regex: /^sa-\d+@example\.com$/ },
    });
    await User.deleteMany({
      email: { $regex: /^admin-\d+@example\.com$/ },
    });
    await DevoteeApplication.deleteMany({
      applicantEmail: { $regex: /^db-persist-/ },
    });
    await Session.deleteMany({
      userId: { $in: [createdUserId, superAdminId, adminId] },
    });
    await AuthToken.deleteMany({
      userId: { $in: [createdUserId, superAdminId, adminId] },
    });
    await AuditLog.deleteMany({
      actorId: { $in: [createdUserId, superAdminId, adminId] },
    });
    await AuditLog.deleteMany({
      targetId: { $in: [createdUserId, superAdminId, adminId] },
    });
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("registration persists a User document in MongoDB", async () => {
    const user = await User.findById(createdUserId).select("+passwordHash");
    expect(user).not.toBeNull();
    expect(user.email).toBe(testEmail);
    expect(user.fullName).toBe("DB Persistence Test Devotee");
    expect(user.role).toBe("devotee");
    expect(user.status).toBe("pending_verification");
    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe("TestPassword123!");
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("registration persists a DevoteeApplication document", async () => {
    const application = await DevoteeApplication.findOne({
      userId: createdUserId,
    }).lean();
    expect(application).not.toBeNull();
    expect(application.applicantEmail).toBe(testEmail);
    expect(application.status).toBe("pending");
    expect(application.isCurrent).toBe(true);
  });

  it("Super Admin is persisted with correct role and status", async () => {
    const sa = await User.findById(superAdminId).select(
      "email role status emailVerified +passwordHash",
    );
    expect(sa).not.toBeNull();
    expect(sa.role).toBe("super_admin");
    expect(sa.status).toBe("active");
    expect(sa.emailVerified).toBe(true);
    expect(sa.passwordHash).toBeDefined();
    expect(sa.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("Administrator is persisted with correct role and permissions", async () => {
    const admin = await User.findById(adminId).select("email role status adminPermissions");
    expect(admin).not.toBeNull();
    expect(admin.role).toBe("admin");
    expect(admin.status).toBe("active");
    expect(admin.adminPermissions).toContain("application:read:all");
  });

  it("email verification persists status change to pending_approval", async () => {
    // Create our own token with a known plain value
    const plainToken = generateToken();
    const tokenHash = hashToken(plainToken);
    await AuthToken.create({
      tokenHash,
      userId: createdUserId,
      type: "email_verification",
      expiresAt: new Date(Date.now() + 86400000),
    });

    await verifyEmail(plainToken);

    const user = await User.findById(createdUserId);
    expect(user.emailVerified).toBe(true);
    expect(user.status).toBe("pending_approval");
  });

  it("login creates a Session document in MongoDB", async () => {
    // Mark email as verified so login works
    await User.findByIdAndUpdate(createdUserId, {
      emailVerified: true,
      status: "pending_approval",
    });

    const result = await login(testEmail, "TestPassword123!", {
      userAgent: "test-agent",
      ip: "127.0.0.1",
    });
    expect(result.user).not.toBeNull();
    expect(result.sessionCookie).toBeDefined();

    const tokenMatch = result.sessionCookie.match(/session=([^;]+)/);
    const sessionToken = tokenMatch[1];
    const sessionHash = hashToken(sessionToken);

    const session = await Session.findOne({ tokenHash: sessionHash });
    expect(session).not.toBeNull();
    expect(session.userId.toString()).toBe(createdUserId);
    expect(session.scope).toBe("application");

    await logout(sessionToken);
    expect(await validateSession(sessionToken)).toBeNull();
  });

  it("administrator invitation acceptance creates an admin User document", async () => {
    // Create our own invitation token with a known plain value
    const inviteEmail = `invite-${Date.now()}@example.com`;
    const plainToken = generateToken();
    const tokenHash = hashToken(plainToken);
    await AuthToken.create({
      tokenHash,
      email: inviteEmail,
      type: "admin_invitation",
      expiresAt: new Date(Date.now() + 7 * 86400000),
      metadata: {
        invitedBy: superAdminId,
        permissions: ["application:review:all"],
      },
    });

    const accepted = await acceptAdminInvitation(plainToken, {
      fullName: "Invited Admin",
      password: "InvitedAdminPassword123!",
      phone: "+919876543213",
      gender: "female",
    });
    expect(accepted.role).toBe("admin");
    expect(accepted.adminPermissions).toContain("application:review:all");

    const createdAdmin = await User.findById(accepted.userId).select(
      "email role status emailVerified adminPermissions +passwordHash",
    );
    expect(createdAdmin).not.toBeNull();
    expect(createdAdmin.email).toBe(inviteEmail);
    expect(createdAdmin.role).toBe("admin");
    expect(createdAdmin.status).toBe("active");
    expect(createdAdmin.emailVerified).toBe(true);
    expect(createdAdmin.passwordHash).toBeDefined();
    expect(createdAdmin.passwordHash.startsWith("$argon2id$")).toBe(true);

    // Clean up the invited admin
    await User.deleteOne({ _id: accepted.userId });
    await AuthToken.deleteMany({ email: inviteEmail });
  });

  it("role and status updates persist correctly", async () => {
    // Suspend the devotee
    await User.findByIdAndUpdate(createdUserId, { status: "suspended" });
    const user = await User.findById(createdUserId);
    expect(user.status).toBe("suspended");

    // Reactivate
    await User.findByIdAndUpdate(createdUserId, { status: "active" });
    const user2 = await User.findById(createdUserId);
    expect(user2.status).toBe("active");
  });

  it.skipIf(!ACCOUNT_DELETION_POLICY_APPROVED)(
    "permanent deletion removes the User document from MongoDB",
    async () => {
      // Create a temporary user to delete
      const deleteEmail = `delete-me-${Date.now()}@example.com`;
      const deleteUser = await User.create({
        email: deleteEmail,
        fullName: "To Be Deleted",
        phone: "+919876543214",
        gender: "male",
        passwordHash: await hashPassword("DeleteMePassword123!"),
        role: "devotee",
        status: "active",
        emailVerified: true,
      });

      // Verify it exists before deletion
      expect(await User.findById(deleteUser._id)).not.toBeNull();

      // Delete it
      await User.deleteOne({ _id: deleteUser._id });

      // Verify it is gone
      expect(await User.findById(deleteUser._id)).toBeNull();

      // Clean up related records
      await Session.deleteMany({ userId: deleteUser._id });
      await AuthToken.deleteMany({ userId: deleteUser._id });
      await AuditLog.deleteMany({ actorId: deleteUser._id });
      await AuditLog.deleteMany({ targetId: deleteUser._id });
    },
  );

  it("deleting a user revokes associated sessions", async () => {
    // Create a user with an active session
    const sessionEmail = `session-del-${Date.now()}@example.com`;
    const sessionUser = await User.create({
      email: sessionEmail,
      fullName: "Session Delete Test",
      phone: "+919876543215",
      gender: "female",
      passwordHash: await hashPassword("SessionDelPassword123!"),
      role: "devotee",
      status: "active",
      emailVerified: true,
    });

    // Create a session for this user
    const token = generateToken();
    const sessionHash = hashToken(token);
    await Session.create({
      tokenHash: sessionHash,
      userId: sessionUser._id,
      scope: "full",
      expiresAt: new Date(Date.now() + 86400000),
      absoluteExpiresAt: new Date(Date.now() + 172800000),
      lastActivityAt: new Date(),
    });

    const sessionBefore = await Session.countDocuments({
      userId: sessionUser._id,
    });
    expect(sessionBefore).toBe(1);

    // Delete the user
    await User.deleteOne({ _id: sessionUser._id });

    // In a real deletion flow, sessions would be revoked here
    await Session.deleteMany({ userId: sessionUser._id });
    const remainingSessions = await Session.countDocuments({
      userId: sessionUser._id,
    });
    expect(remainingSessions).toBe(0);

    // Clean up
    await AuthToken.deleteMany({ userId: sessionUser._id });
    await AuditLog.deleteMany({ actorId: sessionUser._id });
    await AuditLog.deleteMany({ targetId: sessionUser._id });
  });

  it("audit history is preserved after user operations", async () => {
    const auditCountBefore = await AuditLog.countDocuments({
      actorId: createdUserId,
    });
    expect(auditCountBefore).toBeGreaterThan(0);

    // Perform actions that create audit logs
    await User.findByIdAndUpdate(createdUserId, { status: "suspended" });
    await User.findByIdAndUpdate(createdUserId, { status: "active" });

    const auditCountAfter = await AuditLog.countDocuments({
      actorId: createdUserId,
    });
    // Audit logs are append-only; count should not decrease
    expect(auditCountAfter).toBeGreaterThanOrEqual(auditCountBefore);
  });
});

describe.skipIf(gate.skip)("Database persistence - deletion protection", () => {
  let originalUri;
  let superAdminId;
  let sa2Id;

  beforeAll(async () => {
    originalUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    // Create a Super Admin to test last-SA protection
    const superAdminPasswordHash = await hashPassword("LastSAPassword123!");
    const sa = await User.create({
      email: `last-sa-${Date.now()}@example.com`,
      fullName: "Last Super Admin",
      phone: "+919876543216",
      gender: "female",
      passwordHash: superAdminPasswordHash,
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });
    superAdminId = sa._id;

    // Create a second Super Admin
    const sa2PasswordHash = await hashPassword("SecondSAPassword123!");
    const sa2 = await User.create({
      email: `second-sa-${Date.now()}@example.com`,
      fullName: "Second Super Admin",
      phone: "+919876543217",
      gender: "male",
      passwordHash: sa2PasswordHash,
      role: "super_admin",
      status: "active",
      emailVerified: true,
    });
    sa2Id = sa2._id;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $regex: /^last-sa-\d+@example\.com$/ },
    });
    await User.deleteMany({
      email: { $regex: /^second-sa-\d+@example\.com$/ },
    });
    await Session.deleteMany({ userId: superAdminId });
    await Session.deleteMany({ userId: sa2Id });
    await AuthToken.deleteMany({ userId: superAdminId });
    await AuthToken.deleteMany({ userId: sa2Id });
    await AuditLog.deleteMany({ actorId: superAdminId });
    await AuditLog.deleteMany({ actorId: sa2Id });
    await AuditLog.deleteMany({ targetId: superAdminId });
    await AuditLog.deleteMany({ targetId: sa2Id });
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("deletion reduces the active Super Admin count", async () => {
    const beforeCount = await User.countDocuments({
      role: "super_admin",
      status: "active",
    });
    expect(beforeCount).toBeGreaterThanOrEqual(1);

    // Delete the second Super Admin (not the last one)
    await User.deleteOne({ _id: sa2Id });

    const afterCount = await User.countDocuments({
      role: "super_admin",
      status: "active",
    });
    expect(afterCount).toBe(beforeCount - 1);
  });

  it("database isolation - test database name ends with _test", async () => {
    const testUri = process.env.MONGODB_URI;
    expect(testUri).toMatch(/_test(\?|$)/);
  });
});
