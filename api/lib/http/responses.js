import { ZodError } from "zod";
import { AppError } from "@/api/lib/http/errors";
import { DatabaseUnavailableError } from "@/api/lib/mongodb/errors";

/**
 * JSON response envelope used by every Route Handler.
 *
 * Success:  { success: true,  data: <payload> }
 * Failure:  { success: false, error: { code, message, details? } }
 *
 * The helpers return standard `Response` objects so they work in Route
 * Handlers and in plain Node tests without a Next.js runtime.
 */

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * @param {unknown} data
 * @param {{ status?: number, headers?: Record<string, string> }} [init]
 */
export function jsonSuccess(data, init = {}) {
  return Response.json(
    { success: true, data },
    { status: init.status ?? 200, headers: { ...NO_STORE_HEADERS, ...init.headers } },
  );
}

/**
 * @param {{ code: string, message: string, details?: unknown, status?: number, extra?: Record<string, unknown> }} error
 */
export function jsonError({ code, message, details, status = 500, extra = {} }) {
  const body = { success: false, error: { code, message } };
  if (details !== undefined) {
    body.error.details = details;
  }
  return Response.json({ ...body, ...extra }, { status, headers: NO_STORE_HEADERS });
}

/**
 * Convert Zod issues into a compact, client-safe list.
 *
 * @param {ZodError} error
 */
export function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}

/**
 * Map any thrown value to a safe HTTP error response.
 *
 * - ZodError                 → 400 VALIDATION_ERROR with field issues
 * - AppError                 → its own status/code/message
 * - DatabaseUnavailableError → 503 SERVICE_UNAVAILABLE
 * - anything else            → 500 INTERNAL_ERROR with a generic message
 *
 * @param {unknown} error
 */
export function errorToResponse(error) {
  if (error instanceof ZodError) {
    return jsonError({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "The request contains invalid data.",
      details: formatZodIssues(error),
    });
  }
  if (error instanceof AppError) {
    return jsonError({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
  if (error instanceof DatabaseUnavailableError) {
    return jsonError({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: error.message,
    });
  }
  return jsonError({
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  });
}
