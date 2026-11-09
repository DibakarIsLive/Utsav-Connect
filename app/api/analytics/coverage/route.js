import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getCoverageAnalytics } from "@/api/services/invitation-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/coverage
 * Authenticated: Get area-based coverage analytics and invitation rollups.
 * Coverage data is part of the devotee portal and admin workspace — not public.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({
        code: "UNAUTHORIZED",
        message: "Sign in required to view coverage analytics",
        status: 401,
      });
    }

    const analytics = await getCoverageAnalytics();
    return jsonSuccess({ analytics, count: analytics.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
