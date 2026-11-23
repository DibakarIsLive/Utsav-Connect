import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/api/lib/auth/password.js";

const PASSWORD = "TestPassword123!";

describe("hashPassword", () => {
  it("generates an Argon2id hash", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(hash.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
  });

  it("produces a hash that does not contain the plaintext password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(hash.includes(PASSWORD)).toBe(false);
  });

  it("produces a different hash on each call (random salt)", async () => {
    const hash1 = await hashPassword(PASSWORD);
    const hash2 = await hashPassword(PASSWORD);
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for the correct password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
  });

  it("returns false for an incorrect password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("returns false for an empty password", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("returns false for an invalid hash format", async () => {
    expect(await verifyPassword(PASSWORD, "not-a-hash")).toBe(false);
  });
});
