/**
 * Small browser-side API helper used by the client components.
 *
 * The API always answers with `{ success, data }` or `{ success, error }`.
 * Keeping the envelope handling in one place means every screen reacts to
 * failures the same way instead of inventing its own fallback values.
 */
export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.error?.message || "The request could not be completed.", {
      code: payload?.error?.code,
      status: response.status,
      details: payload?.error?.details,
    });
  }

  return payload?.data ?? null;
}

/**
 * Turn a Zod/validation issue list into a { field: message } map.
 * @param {{ path?: string, message?: string }[] | undefined} details
 */
export function fieldErrors(details) {
  if (!Array.isArray(details)) return {};
  return details.reduce((accumulator, issue) => {
    if (issue?.path && issue?.message) accumulator[issue.path] = issue.message;
    return accumulator;
  }, {});
}
