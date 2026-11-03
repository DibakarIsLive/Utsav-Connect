import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger, redactContext } from "@/api/lib/logging/logger";

describe("redactContext", () => {
  it("masks well-known sensitive keys regardless of case", () => {
    const safe = redactContext({
      user: "alice",
      Password: "hunter2",
      AUTHORIZATION: "Bearer x",
      MONGODB_URI: "mongodb://u:p@h/db",
    });
    expect(safe).toEqual({
      user: "alice",
      Password: "[redacted]",
      AUTHORIZATION: "[redacted]",
      MONGODB_URI: "[redacted]",
    });
  });

  it("returns an empty object for missing context", () => {
    expect(redactContext(undefined)).toEqual({});
  });
});

describe("logger", () => {
  const originalLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLevel;
    }
  });

  it("emits one JSON line with level, time, message and context", () => {
    process.env.LOG_LEVEL = "debug";
    logger.info("test.event", { requestId: "abc" });
    expect(console.log).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(console.log.mock.calls[0][0]);
    expect(entry).toMatchObject({ level: "info", message: "test.event", requestId: "abc" });
    expect(typeof entry.time).toBe("string");
  });

  it("suppresses messages below the configured level", () => {
    process.env.LOG_LEVEL = "warn";
    logger.info("hidden");
    logger.debug("hidden");
    logger.warn("shown");
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("serializes errors to name and message", () => {
    process.env.LOG_LEVEL = "error";
    logger.error("failed", { error: new TypeError("boom") });
    const entry = JSON.parse(console.error.mock.calls[0][0]);
    expect(entry.error).toMatchObject({ name: "TypeError", message: "boom" });
  });
});
