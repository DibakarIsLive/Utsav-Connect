import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { DevoteeApplication } from "@/api/models/devotee-application.js";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { submitApplication, verifyEmail } from "@/api/services/application-service.js";
import { login, logout, validateSession } from "@/api/services/auth-service.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { generateToken, hashToken } from "@/api/lib/auth/tokens.js";

const gate = await databaseSuiteGate("user-workflow");

describe.skipIf(gate.skip)("User registration and application workflow", () => {
  const originalUri = process.env.MONGODB_URI;
  let createdUserId;
  let testEmail;

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    // Create a test user before all tests
    testEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const result = await submitApplication({
      fullName: "Integration Test Devotee",
      email: testEmail,
      password: "TestPassword123!",
      phone: "+919876543210",
      gender: "male",
      message: "Integration test application message.",
    });
    createdUserId = result.userId;
  });

  afterAll(async () => {
    // Clean up test data
    if (createdUserId) {
      await User.deleteOne({ _id: createdUserId });
      await DevoteeApplication.deleteOne({ userId: createdUserId });
      await Session.deleteMany({ userId: createdUserId });
      await AuthToken.deleteMany({ userId: createdUserId });
      await AuditLog.deleteMany({ actorId: createdUserId });
      await AuditLog.deleteMany({ targetId: createdUserId });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("submits a devotee application with all six fields", async () => {
    expect(createdUserId).toBeDefined();

    const user = await User.findById(createdUserId).select("+passwordHash").lean();
    expect(user).not.toBeNull();
    expect(user.email).toBe(testEmail);
    expect(user.fullName).toBe("Integration Test Devotee");
    expect(user.phone).toBe("+919876543210");
    expect(user.gender).toBe("male");
    expect(user.role).toBe("devotee");
    expect(user.status).toBe("pending_verification");
    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe("TestPassword123!"); // Should be hashed

    const application = await DevoteeApplication.findOne({ userId: createdUserId }).lean();
    expect(application).not.toBeNull();
    expect(application.applicantName).toBe("Integration Test Devotee");
    expect(application.applicantEmail).toBe(testEmail);
    expect(application.applicantPhone).toBe("+919876543210");
    expect(application.gender).toBe("male");
    expect(application.message).toBe("Integration test application message.");
    expect(application.status).toBe("pending");
    expect(application.isCurrent).toBe(true);

    expect(application.dateOfBirth).toBeUndefined();
    expect(application.occupation).toBeUndefined();
  });

  it("rejects duplicate email registration", async () => {
    await expect(
      submitApplication({
        fullName: "Duplicate Test",
        email: testEmail,
        password: "TestPassword123!",
        phone: "+919876543211",
        gender: "female",
        message: "Duplicate application.",
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("creates an email verification token", async () => {
    const authToken = await AuthToken.findOne({
      userId: createdUserId,
      type: "email_verification",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    expect(authToken).not.toBeNull();
    expect(authToken.tokenHash).toBeDefined();
  });

  it("rejects email verification with invalid token", async () => {
    await expect(verifyEmail("invalid-token-that-is-way-too-short")).rejects.toThrow(/invalid/i);
  });

  it("rejects expired verification token", async () => {
    const expiredToken = generateToken();
    const expiredHash = hashToken(expiredToken);
    await AuthToken.create({
      tokenHash: expiredHash,
      userId: createdUserId,
      type: "email_verification",
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(verifyEmail(expiredToken)).rejects.toThrow(/invalid/);
  });

  it("rejects reused verification token", async () => {
    const usedToken = generateToken();
    const usedHash = hashToken(usedToken);
    await AuthToken.create({
      tokenHash: usedHash,
      userId: createdUserId,
      type: "email_verification",
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(),
    });

    await expect(verifyEmail(usedToken)).rejects.toThrow(/invalid/);
  });

  it("logs in successfully after email verification", async () => {
    const authToken = await AuthToken.findOne({
      userId: createdUserId,
      type: "email_verification",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    const user = await User.findByIdAndUpdate(
      createdUserId,
      { emailVerified: true, status: "pending_approval" },
      { new: true },
    );
    expect(user).not.toBeNull();
    expect(user.emailVerified).toBe(true);
    expect(user.status).toBe("pending_approval");

    await AuthToken.findOneAndUpdate(
      { userId: createdUserId, type: "email_verification", usedAt: null },
      { usedAt: new Date() },
    );

    const result = await login(testEmail, "TestPassword123!", {
      userAgent: "test-agent",
      ip: "127.0.0.1",
    });

    expect(result.user).not.toBeNull();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.role).toBe("devotee");
    expect(result.user.status).toBe("pending_approval");
    expect(result.user.scope).toBe("application");
    expect(result.sessionCookie).toBeDefined();
    expect(result.sessionCookie).toContain("session=");
    expect(result.sessionCookie).toContain("HttpOnly");
    expect(result.sessionCookie).toContain("SameSite=Lax");

    const tokenMatch = result.sessionCookie.match(/session=([^;]+)/);
    const sessionToken = tokenMatch[1];

    const validatedUser = await validateSession(sessionToken);
    expect(validatedUser).not.toBeNull();
    expect(validatedUser.email).toBe(testEmail);
    expect(validatedUser.scope).toBe("application");

    const logoutResult = await logout(sessionToken);
    expect(logoutResult.success).toBe(true);

    await expect(validateSession(sessionToken)).resolves.toBeNull();
  });

  it("cannot access dashboard with pending_approval status", async () => {
    const result = await login(testEmail, "TestPassword123!", {
      userAgent: "test-agent",
      ip: "127.0.0.1",
    });
    const tokenMatch = result.sessionCookie.match(/session=([^;]+)/);
    const sessionToken = tokenMatch[1];

    const validatedUser = await validateSession(sessionToken);
    expect(validatedUser.scope).toBe("application");
    expect(validatedUser.status).toBe("pending_approval");

    await logout(sessionToken);
  });
});
