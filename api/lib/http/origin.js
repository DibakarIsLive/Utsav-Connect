import { ForbiddenError } from "./errors.js";

/**
 * CSRF defence for state-changing Route Handlers.
 *
 * The session cookie is HttpOnly + SameSite=Lax. This check adds a second,
 * independent layer: a mutating request is refused when the browser marks it
 * as cross-site, or when its Origin header does not match the app origin.
 *
 * Requests without an Origin header (curl, server-to-server, health probes)
 * are allowed because they cannot be forged by a browser on behalf of a
 * signed-in user. The session cookie is still required by every protected
 * route, so an anonymous curl request can never gain access.
 *
 * @param {Request} request
 * @throws {ForbiddenError}
 */
export function assertTrustedOrigin(request) {
  const method = (request.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new ForbiddenError("Cross-site request blocked.");
  }

  const origin = request.headers.get("origin");
  if (!origin) return;

  const allowed = new Set();
  try {
    allowed.add(new URL(process.env.APP_BASE_URL || "http://localhost:3000").origin);
  } catch {
    // A malformed APP_BASE_URL is reported by env validation elsewhere.
  }
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // A relative request URL cannot be trusted; rely on APP_BASE_URL only.
  }

  if (!allowed.has(origin)) {
    throw new ForbiddenError("Request origin is not allowed.");
  }
}

/**
 * Best-effort client address for rate limiting. Proxies must set
 * X-Forwarded-For / X-Real-IP; a direct client cannot spoof the socket address.
 *
 * @param {Request} request
 * @returns {string}
 */
export function clientAddress(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
