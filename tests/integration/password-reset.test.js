import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Session } from "@/api/models/session.js";
import { AuthToken } from "@/api/models/auth-token.js";
import { hashPassword } from "@/api/lib/auth/password.js";
import { hashToken } from "@/api/lib/auth/tokens.js";
import { verifyPassword } from "@/api/lib/auth/password.js";
import { login, logout } from "@/api/services/auth-service.js";

const gate = await databaseSuiteGate("password-reset");

describe.skipIf(gate.skip)("Password reset workflow", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let user;
  const sessions = [];

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    user = await User.create({
      email: `reset-${runId}@example.com`,
      fullName: "Reset Test User",
      phone: "+919876543260",
      gender: "female",
      passwordHash: await hashPassword("OldPassword123!"),
      role: "devotee",
      status: "active",
      emailVerified: true,
    });
  });

  afterAll(async () => {
    for (const token of sessions) {
      await logout(token).catch(() => {});
    }
    if (user) {
      await Session.deleteMany({ userId: user._id });
      await AuthToken.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("requests a password reset for an existing email", async () => {
    const { requestPasswordReset } = await import("@/api/services/auth-service.js");
    const result = await requestPasswordReset(user.email, { ip: "127.0.0.1" });

    expect(result.emailSent).toBeDefined();
    const token = await AuthToken.findOne({
      userId: user._id,
      type: "password_reset",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    expect(token).not.toBeNull();
  });

  it("returns a generic response for unknown email (no enumeration)", async () => {
    const { requestPasswordReset } = await import("@/api/services/auth-service.js");
    const result = await requestPasswordReset("nonexistent@example.com", { ip: "127.0.0.1" });

    // Should not throw, should return generic response
    expect(result.emailSent).toBeDefined();
    const count = await AuthToken.countDocuments({
      email: "nonexistent@example.com",
      type: "password_reset",
    });
    expect(count).toBe(0);
  });

  it("returns an identical generic HTTP response for existing and unknown emails", async () => {
    const { POST } = await import("@/app/api/auth/password-reset/request/route.js");
    const makeRequest = (email, ip) =>
      new Request("http://localhost:3000/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ email }),
      });

    const existing = await POST(makeRequest(user.email, "10.23.0.11"));
    const unknown = await POST(makeRequest("no-such-account@example.com", "10.23.0.12"));

    expect(existing.status).toBe(200);
    expect(unknown.status).toBe(200);
    const existingBody = await existing.json();
    const unknownBody = await unknown.json();
    expect(existingBody).toEqual(unknownBody);
    // Delivery status must not be exposed: it would reveal account existence.
    expect(existingBody).not.toHaveProperty("emailSent");
    expect(existingBody.data).not.toHaveProperty("emailSent");
    expect(Object.keys(existingBody.data)).toEqual(["message"]);
  });

  it("confirms a password reset with a valid token", async () => {
    const { confirmPasswordReset } = await import("@/api/services/auth-service.js");

    const rawToken = "validResetToken1234567890123456789012345678";
    const tokenHash = hashToken(rawToken);

    await AuthToken.create({
      tokenHash,
      userId: user._id,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const result = await confirmPasswordReset(rawToken, "NewPassword123!", {
      ip: "127.0.0.1",
    });
    expect(result.success).toBe(true);

    // Token should now be used
    const usedToken = await AuthToken.findOne({ tokenHash });
    expect(usedToken.usedAt).not.toBeNull();

    // Password should be updated
    const updatedUser = await User.findById(user._id).select("+passwordHash");
    expect(await verifyPassword("NewPassword123!", updatedUser.passwordHash)).toBe(true);

    // Sessions should be revoked
    const remainingSessions = await Session.countDocuments({ userId: user._id });
    expect(remainingSessions).toBe(0);

    // Old password should no longer work
    expect(await verifyPassword("OldPassword123!", updatedUser.passwordHash)).toBe(false);
  });

  it("rejects an invalid password reset token", async () => {
    const { confirmPasswordReset } = await import("@/api/services/auth-service.js");
    await expect(
      confirmPasswordReset("invalid-token-that-is-way-too-short", "NewPassword123!"),
    ).rejects.toThrow(/invalid/i);
  });

  it("rejects an expired password reset token", async () => {
    const { confirmPasswordReset } = await import("@/api/services/auth-service.js");
    const expiredToken = "expiredResetToken1234567890123456789012345678";
    const expiredHash = hashToken(expiredToken);

    await AuthToken.create({
      tokenHash: expiredHash,
      userId: user._id,
      type: "password_reset",
      expiresAt: new Date(Date.now() - 1000), // already expired
    });

    await expect(confirmPasswordReset(expiredToken, "NewPassword123!")).rejects.toThrow(/invalid/);
  });

  it("rejects a reused password reset token", async () => {
    const { confirmPasswordReset } = await import("@/api/services/auth-service.js");
    const usedToken = "usedResetToken1234567890123456789012345678";
    const usedHash = hashToken(usedToken);

    await AuthToken.create({
      tokenHash: usedHash,
      userId: user._id,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: new Date(), // already used
    });

    await expect(confirmPasswordReset(usedToken, "NewPassword123!")).rejects.toThrow(/invalid/);
  });

  it("allows login with the new password after reset", async () => {
    const { confirmPasswordReset } = await import("@/api/services/auth-service.js");
    const rawToken = "loginAfterResetToken12345678901234567890123456";
    const tokenHash = hashToken(rawToken);

    await AuthToken.create({
      tokenHash,
      userId: user._id,
      type: "password_reset",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await confirmPasswordReset(rawToken, "FinalPassword123!", { ip: "127.0.0.1" });

    // Now login with new password
    const result = await login(user.email, "FinalPassword123!", {
      userAgent: "test-agent",
      ip: "127.0.0.1",
    });
    expect(result.user).not.toBeNull();
    expect(result.user.email).toBe(user.email);
    expect(result.sessionCookie).toBeDefined();

    sessions.push(result.sessionCookie.match(/session=([^;]+)/)[1]);
  });
});
