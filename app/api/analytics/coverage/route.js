import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getCoverageAnalytics } from "@/api/services/invitation-service";
import { requireUser } from "@/api/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/coverage
 * Approved devotee or administrator: coverage analytics and invitation
 * rollups. Never public and never available to application-scope users.
 */
export async function GET(request) {
  try {
    await requireUser(request, { full: true });

    const analytics = await getCoverageAnalytics();
    return jsonSuccess({ analytics, count: analytics.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
