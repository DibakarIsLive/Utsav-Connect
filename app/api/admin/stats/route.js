import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getApplicationStats } from "@/api/services/admin-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Live application and devotee counts for the admin workspace overview.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin access required", status: 403 });
    }

    const stats = await getApplicationStats(admin);
    return jsonSuccess({ stats });
  } catch (error) {
    return errorToResponse(error);
  }
}
