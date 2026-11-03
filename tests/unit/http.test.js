import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/api/lib/http/errors";
import { errorToResponse, jsonError, jsonSuccess } from "@/api/lib/http/responses";
import { DatabaseUnavailableError } from "@/api/lib/mongodb/errors";

describe("jsonSuccess", () => {
  it("wraps data in the success envelope with no-store caching", async () => {
    const response = jsonSuccess({ hello: "world" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ success: true, data: { hello: "world" } });
  });

  it("supports a custom status such as 201", () => {
    expect(jsonSuccess({ id: 1 }, { status: 201 }).status).toBe(201);
  });
});

describe("jsonError", () => {
  it("builds the failure envelope and omits details when absent", async () => {
    const response = jsonError({ status: 418, code: "TEAPOT", message: "I am a teapot" });
    expect(response.status).toBe(418);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code: "TEAPOT", message: "I am a teapot" },
    });
  });
});

describe("errorToResponse", () => {
  it("maps ZodError to 400 with field-level issues", async () => {
    const schema = z.object({ count: z.number().int().positive() });
    const result = schema.safeParse({ count: -3 });
    const response = errorToResponse(result.error);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].path).toBe("count");
  });

  it.each([
    [new ValidationError([{ path: "x", message: "bad" }]), 400, "VALIDATION_ERROR"],
    [new UnauthorizedError(), 401, "UNAUTHORIZED"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new NotFoundError(), 404, "NOT_FOUND"],
    [new AppError("CUSTOM", "custom message", 409), 409, "CUSTOM"],
  ])("maps %o to its own status and code", async (error, status, code) => {
    const response = errorToResponse(error);
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(code);
    expect(body.error.message).toBe(error.message);
  });

  it("maps DatabaseUnavailableError to 503", async () => {
    const response = errorToResponse(new DatabaseUnavailableError());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("hides internal details for unknown errors", async () => {
    const response = errorToResponse(new Error("connection string mongodb://user:pw@host"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    });
    expect(JSON.stringify(body)).not.toContain("mongodb://");
  });
});
