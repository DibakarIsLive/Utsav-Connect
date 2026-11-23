import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for the password-reset logger defect (D1).
 *
 * Dependencies are mocked so delivery-failure branches can be forced without
 * contacting MongoDB, sending email, or touching the pilot database. The
 * mocked adapter deliberately never performs network I/O.
 */
const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  tokenCreate: vi.fn(),
  auditCreate: vi.fn(),
  connect: vi.fn(),
  isEmailAvailable: vi.fn(),
  sendPasswordReset: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const testUser = {
  _id: { toString: () => "test-user-id" },
  email: "existing@example.com",
  role: "devotee",
};

vi.mock("@/api/models/user.js", () => ({ User: { findOne: mocks.findOne } }));
vi.mock("@/api/models/auth-token.js", () => ({ AuthToken: { create: mocks.tokenCreate } }));
vi.mock("@/api/models/audit-log.js", () => ({ AuditLog: { create: mocks.auditCreate } }));
vi.mock("@/api/models/session.js", () => ({ Session: {} }));
vi.mock("@/api/lib/mongodb/connection.js", () => ({
  connectToDatabase: mocks.connect,
  disconnectFromDatabase: vi.fn(),
}));
vi.mock("@/api/lib/email/adapter.js", () => ({
  isEmailAvailable: mocks.isEmailAvailable,
  sendPasswordReset: mocks.sendPasswordReset,
  sendEmailVerification: vi.fn(),
  sendApplicationDecision: vi.fn(),
  sendAdminInvitation: vi.fn(),
}));
vi.mock("@/api/lib/logging/logger.js", () => ({
  logger: { warn: mocks.warn, error: mocks.error, info: mocks.info, debug: vi.fn() },
}));

import { requestPasswordReset } from "@/api/services/auth-service.js";

describe("password reset delivery failures never throw a logger ReferenceError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue(undefined);
    mocks.findOne.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue(testUser),
    }));
    mocks.tokenCreate.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
    mocks.isEmailAvailable.mockReturnValue(true);
    mocks.sendPasswordReset.mockResolvedValue({ accepted: true });
  });

  it("logs a rejected delivery without throwing and keeps the token/audit flow intact", async () => {
    mocks.sendPasswordReset.mockResolvedValue({
      accepted: false,
      error: "simulated transport rejection",
    });

    const result = await requestPasswordReset(testUser.email, { ip: "127.0.0.1" });

    expect(result.emailSent).toBe(false);
    expect(result.emailError).toMatch(/could not be delivered/i);
    expect(mocks.warn).toHaveBeenCalledWith(
      "email.password_reset.not_sent",
      expect.objectContaining({ userId: "test-user-id" }),
    );
    expect(mocks.tokenCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("logs an unexpected transport exception without throwing", async () => {
    mocks.sendPasswordReset.mockRejectedValue(new Error("simulated transport exception"));

    const result = await requestPasswordReset(testUser.email, { ip: "127.0.0.1" });

    expect(result.emailSent).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith(
      "email.password_reset.unexpected",
      expect.objectContaining({ userId: "test-user-id", error: "simulated transport exception" }),
    );
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("logs the no-provider branch without throwing", async () => {
    mocks.isEmailAvailable.mockReturnValue(false);

    const result = await requestPasswordReset(testUser.email, { ip: "127.0.0.1" });

    expect(result.emailSent).toBe(false);
    expect(result.emailError).toMatch(/not configured/i);
    expect(mocks.info).toHaveBeenCalledWith(
      "email.password_reset.skipped",
      expect.objectContaining({ userId: "test-user-id", reason: "no_provider_configured" }),
    );
    expect(mocks.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("returns the same generic result shape for an unknown email without logging or writes", async () => {
    mocks.findOne.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue(null),
    }));

    const result = await requestPasswordReset("unknown@example.com", { ip: "127.0.0.1" });

    expect(result).toEqual({ emailSent: false, emailError: null });
    expect(mocks.tokenCreate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.warn).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.info).not.toHaveBeenCalled();
  });

  it("never writes the reset token, link or recipient address to logger calls", async () => {
    mocks.sendPasswordReset.mockResolvedValue({ accepted: false, error: "failure" });

    await requestPasswordReset(testUser.email, { ip: "127.0.0.1" });

    const call = mocks.sendPasswordReset.mock.calls[0][0];
    expect(call.token).toBeTypeOf("string");
    expect(call.token.length).toBeGreaterThan(20);
    const logged = JSON.stringify([
      ...mocks.warn.mock.calls,
      ...mocks.error.mock.calls,
      ...mocks.info.mock.calls,
    ]);
    expect(logged).not.toContain(call.token);
    expect(logged).not.toContain(call.resetUrl);
    expect(logged).not.toContain(call.to);
  });
});
