import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import {
  sendEmailVerification,
  sendPasswordReset,
  sendAdminInvitation,
  sendApplicationDecision,
  isEmailAvailable,
  resetTransport,
} from "@/api/lib/email/adapter.js";
import { createTransport } from "@/api/lib/email/transport.js";
import { existsSync, unlinkSync, readdirSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { getDevMailDir } from "@/api/lib/paths/local-artifacts.js";

const MAIL_DIR = getDevMailDir();

const originalEnv = { ...process.env };
let fetchMock;

function setEnvForTest(vars) {
  Object.assign(process.env, vars);
  resetEnvCache();
  resetTransport();
}

function restoreOriginalEnv() {
  process.env = { ...originalEnv };
  resetEnvCache();
  resetTransport();
}

function cleanupMailDir() {
  if (existsSync(MAIL_DIR)) {
    for (const file of readdirSync(MAIL_DIR)) {
      if (file.endsWith(".eml")) {
        try {
          unlinkSync(resolvePath(MAIL_DIR, file));
        } catch {}
      }
    }
  }
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreOriginalEnv();
  cleanupMailDir();
});

describe("Provider selection (createTransport)", () => {
  it("returns a dev transport when EMAIL_PROVIDER=dev", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev", EMAIL_FROM: "test@example.com" });
    const transport = await createTransport();
    expect(transport).toBeDefined();
    expect(typeof transport.send).toBe("function");
  });

  it("returns a resend transport when EMAIL_PROVIDER=resend with key", async () => {
    setEnvForTest({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "test@example.com",
      EMAIL_API_KEY: "re_test_key",
    });
    const transport = await createTransport();
    expect(transport).toBeDefined();
    expect(typeof transport.send).toBe("function");
  });

  it("returns a resend transport that reports missing key when EMAIL_API_KEY is absent", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "resend", EMAIL_FROM: "test@example.com" });
    delete process.env.EMAIL_API_KEY;
    resetEnvCache();
    const transport = await createTransport();
    const result = await transport.send({
      to: "user@example.com",
      subject: "Test",
      text: "Test body",
    });
    expect(result.accepted).toBe(false);
    expect(result.error).toContain("EMAIL_API_KEY");
  });

  it("throws for an unknown email provider", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "invalid_provider" });
    let threw = false;
    try {
      await createTransport();
    } catch (e) {
      threw = true;
      expect(e.message).toContain("expected one of");
    }
    expect(threw).toBe(true);
  });
});

describe("isEmailAvailable", () => {
  it("returns true for dev provider", () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev" });
    expect(isEmailAvailable()).toBe(true);
  });

  it("returns true for resend with EMAIL_API_KEY", () => {
    setEnvForTest({ EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "re_test_key" });
    expect(isEmailAvailable()).toBe(true);
  });

  it("returns false for resend without EMAIL_API_KEY", () => {
    setEnvForTest({ EMAIL_PROVIDER: "resend" });
    delete process.env.EMAIL_API_KEY;
    resetEnvCache();
    expect(isEmailAvailable()).toBe(false);
  });

  it("returns false for unknown provider", () => {
    setEnvForTest({ EMAIL_PROVIDER: "invalid_provider" });
    let result = false;
    try {
      result = isEmailAvailable();
    } catch {
      // Environment validation rejects unknown providers - equivalent to unavailable
      result = false;
    }
    expect(result).toBe(false);
  });
});

describe("Email template generation", () => {
  const testToken = "test_token_abc123";
  const testUrl = "http://localhost:3000/verify-email?token=test_token_abc123";

  it("sendEmailVerification includes token URL, expiry, and security notice", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev", EMAIL_FROM: "test@example.com" });
    const result = await sendEmailVerification({
      to: "user@example.com",
      token: testToken,
      verifyUrl: testUrl,
    });
    expect(result.accepted).toBe(true);

    const mailFiles = readdirSync(MAIL_DIR).filter((f) => f.endsWith(".eml"));
    expect(mailFiles.length).toBeGreaterThan(0);

    const content = readFileSync(resolvePath(MAIL_DIR, mailFiles[0]), "utf8");
    expect(content).toContain(testUrl);
    expect(content).toContain("Verify your email address");
    expect(content).toContain("24 hours");
    expect(content).toContain("If you did not apply to join Utsav-Connect");
  });

  it("sendPasswordReset includes reset URL, expiry, and security notice", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev", EMAIL_FROM: "test@example.com" });
    const resetUrl = "http://localhost:3000/reset-password?token=test_token_abc123";
    const result = await sendPasswordReset({
      to: "user@example.com",
      token: testToken,
      resetUrl,
    });
    expect(result.accepted).toBe(true);

    const mailFiles = readdirSync(MAIL_DIR).filter((f) => f.endsWith(".eml"));
    expect(mailFiles.length).toBeGreaterThan(0);

    const content = readFileSync(resolvePath(MAIL_DIR, mailFiles[0]), "utf8");
    expect(content).toContain(resetUrl);
    expect(content).toContain("Reset your password");
    expect(content).toContain("24 hours");
    expect(content).toContain("If you did not request a password reset");
  });

  it("sendAdminInvitation includes invite URL, 7-day expiry, and inviter name", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev", EMAIL_FROM: "test@example.com" });
    const inviteUrl = "http://localhost:3000/accept-invitation?token=test_token_abc123";
    const result = await sendAdminInvitation({
      to: "user@example.com",
      token: testToken,
      inviteUrl,
      invitedBy: "Super Admin User",
    });
    expect(result.accepted).toBe(true);

    const mailFiles = readdirSync(MAIL_DIR).filter((f) => f.endsWith(".eml"));
    expect(mailFiles.length).toBeGreaterThan(0);

    const content = readFileSync(resolvePath(MAIL_DIR, mailFiles[0]), "utf8");
    expect(content).toContain(inviteUrl);
    expect(content).toContain("Administrator invitation");
    expect(content).toContain("Super Admin User");
    expect(content).toContain("7 days");
  });

  it("sendApplicationDecision approved includes approval content", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev", EMAIL_FROM: "test@example.com" });
    const result = await sendApplicationDecision({
      to: "user@example.com",
      decision: "approved",
      nextStepsUrl: "http://localhost:3000/apply?mode=login",
    });
    expect(result.accepted).toBe(true);

    const mailFiles = readdirSync(MAIL_DIR).filter((f) => f.endsWith(".eml"));
    expect(mailFiles.length).toBeGreaterThan(0);

    const content = readFileSync(resolvePath(MAIL_DIR, mailFiles[0]), "utf8");
    expect(content).toContain("Application approved");
    expect(content).toContain("approved");
  });

  it("sendApplicationDecision rejected includes rejection content", async () => {
    setEnvForTest({ EMAIL_PROVIDER: "dev", EMAIL_FROM: "test@example.com" });
    const result = await sendApplicationDecision({
      to: "user@example.com",
      decision: "rejected",
    });
    expect(result.accepted).toBe(true);

    const mailFiles = readdirSync(MAIL_DIR).filter((f) => f.endsWith(".eml"));
    expect(mailFiles.length).toBeGreaterThan(0);

    const content = readFileSync(resolvePath(MAIL_DIR, mailFiles[0]), "utf8");
    expect(content).toContain("Application decision");
    expect(content).toContain("unable to approve");
  });
});

describe("Resend adapter with mocked fetch", () => {
  const testToken = "test_token_abc123";
  const testUrl = "http://localhost:3000/verify-email?token=test_token_abc123";

  it("sends email successfully when Resend returns 200", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "resend_12345" }),
    });

    setEnvForTest({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "noreply@example.com",
      EMAIL_API_KEY: "re_test_key",
    });

    const result = await sendEmailVerification({
      to: "user@example.com",
      token: testToken,
      verifyUrl: testUrl,
    });

    expect(result.accepted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe("https://api.resend.com/emails");
    expect(callArgs[1].method).toBe("POST");
    expect(callArgs[1].headers.Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(callArgs[1].body);
    expect(body.from).toBe("noreply@example.com");
    expect(body.to).toBe("user@example.com");
    expect(body.subject).toBe("Verify your email address — Utsav-Connect");
    expect(body.text).toContain(testUrl);
  });

  it("returns accepted=false when Resend returns non-200", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid API key" }),
    });

    setEnvForTest({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "noreply@example.com",
      EMAIL_API_KEY: "re_bad_key",
    });

    const result = await sendEmailVerification({
      to: "user@example.com",
      token: testToken,
      verifyUrl: testUrl,
    });

    expect(result.accepted).toBe(false);
    expect(result.error).toContain("Invalid API key");
  });

  it("returns accepted=false when Resend network fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    setEnvForTest({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "noreply@example.com",
      EMAIL_API_KEY: "re_test_key",
    });

    const result = await sendEmailVerification({
      to: "user@example.com",
      token: testToken,
      verifyUrl: testUrl,
    });

    expect(result.accepted).toBe(false);
    expect(result.error).toContain("Network error");
  });

  it("does not expose API key in error messages", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Unauthorized" }),
    });

    setEnvForTest({
      EMAIL_PROVIDER: "resend",
      EMAIL_FROM: "noreply@example.com",
      EMAIL_API_KEY: "re_secret_key_12345",
    });

    const result = await sendEmailVerification({
      to: "user@example.com",
      token: testToken,
      verifyUrl: testUrl,
    });

    expect(result.accepted).toBe(false);
    expect(result.error).not.toContain("re_secret_key_12345");
  });
});
