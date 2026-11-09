import { afterEach, describe, expect, it } from "vitest";
import {
  EnvironmentError,
  formatEnvIssues,
  getEnv,
  parseEnv,
  resetEnvCache,
} from "@/api/lib/env/env";

const VALID = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/utsav_connect",
  MONGODB_URI_TEST: "mongodb://127.0.0.1:27017/utsav_connect_test",
  APP_BASE_URL: "http://localhost:3000",
  LOG_LEVEL: "debug",
  NODE_ENV: "test",
  AUTH_SECRET: "a".repeat(32), // 32+ characters required
  REGISTRATION_MODE: "closed",
  // Schema coerces these to numbers, so validate against expected output
  SESSION_IDLE_DAYS: 7, // coerced from "7"
  SESSION_ABSOLUTE_DAYS: 30, // coerced from "30"
  EMAIL_PROVIDER: "dev",
  EMAIL_FROM: "test@example.com",
};

describe("parseEnv", () => {
  it("accepts a complete, valid environment", () => {
    const result = parseEnv(VALID);
    expect(result.ok).toBe(true);
    expect(result.env).toMatchObject(VALID);
  });

  it("applies defaults for optional values", () => {
    const result = parseEnv({ MONGODB_URI: VALID.MONGODB_URI, AUTH_SECRET: VALID.AUTH_SECRET });
    expect(result.ok).toBe(true);
    expect(result.env.APP_BASE_URL).toBe("http://localhost:3000");
    expect(result.env.LOG_LEVEL).toBe("info");
    expect(result.env.NODE_ENV).toBe("development");
    expect(result.env.MONGODB_URI_TEST).toBeUndefined();
    expect(result.env.REGISTRATION_MODE).toBe("closed");
    expect(result.env.SESSION_IDLE_DAYS).toBe(7);
    expect(result.env.SESSION_ABSOLUTE_DAYS).toBe(30);
    expect(result.env.EMAIL_PROVIDER).toBe("dev");
  });

  it("rejects a missing MONGODB_URI and names the variable", () => {
    const result = parseEnv({ AUTH_SECRET: VALID.AUTH_SECRET });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.variable)).toContain("MONGODB_URI");
  });

  it("rejects a MongoDB URI with the wrong scheme", () => {
    const result = parseEnv({
      MONGODB_URI: "postgres://localhost/db",
      AUTH_SECRET: VALID.AUTH_SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toEqual({
      variable: "MONGODB_URI",
      message: "must start with mongodb:// or mongodb+srv://",
    });
  });

  it("accepts mongodb+srv URIs", () => {
    const result = parseEnv({
      MONGODB_URI: "mongodb+srv://cluster.example.net/db",
      AUTH_SECRET: VALID.AUTH_SECRET,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an APP_BASE_URL that is not an http(s) URL", () => {
    const result = parseEnv({
      MONGODB_URI: VALID.MONGODB_URI,
      AUTH_SECRET: VALID.AUTH_SECRET,
      APP_BASE_URL: "ftp://x",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.variable)).toContain("APP_BASE_URL");
  });

  it("rejects an unknown LOG_LEVEL", () => {
    const result = parseEnv({
      MONGODB_URI: VALID.MONGODB_URI,
      AUTH_SECRET: VALID.AUTH_SECRET,
      LOG_LEVEL: "verbose",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.variable)).toContain("LOG_LEVEL");
  });
});

describe("formatEnvIssues", () => {
  it("lists variable names but never values", () => {
    const text = formatEnvIssues([{ variable: "MONGODB_URI", message: "must not be empty" }]);
    expect(text).toContain("MONGODB_URI: must not be empty");
    expect(text).toContain(".env.example");
  });
});

describe("getEnv", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    resetEnvCache();
  });

  it("throws EnvironmentError when configuration is invalid", () => {
    delete process.env.MONGODB_URI;
    expect(() => getEnv()).toThrow(EnvironmentError);
  });

  it("memoizes the validated environment until reset", () => {
    process.env.MONGODB_URI = VALID.MONGODB_URI;
    const first = getEnv();
    process.env.MONGODB_URI = "mongodb://changed.example/db";
    expect(getEnv()).toBe(first);
    resetEnvCache();
    expect(getEnv().MONGODB_URI).toBe("mongodb://changed.example/db");
  });
});
