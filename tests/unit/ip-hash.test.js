import { afterEach, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { hashIp } from "@/api/lib/privacy/ip-hash.js";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_SECRET = ORIGINAL_SECRET;
  resetEnvCache();
});

describe("privacy-preserving IP hashing", () => {
  it("produces a stable, versioned digest that does not contain the raw address", () => {
    const first = hashIp("203.0.113.42");
    expect(first).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.42");
    expect(hashIp("203.0.113.42")).toBe(first);
    expect(hashIp("203.0.113.43")).not.toBe(first);
  });

  it("is keyed by AUTH_SECRET so the digest cannot be reversed without the secret", () => {
    const original = hashIp("198.51.100.7");
    process.env.AUTH_SECRET = "b".repeat(48);
    resetEnvCache();
    expect(hashIp("198.51.100.7")).not.toBe(original);
  });

  it("omits missing or unknown addresses", () => {
    expect(hashIp(undefined)).toBeUndefined();
    expect(hashIp("")).toBeUndefined();
    expect(hashIp("unknown")).toBeUndefined();
  });
});
