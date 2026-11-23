import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getApplicationStats } from "@/api/services/admin-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Live application and devotee counts for the admin workspace overview.
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.APPLICATION_READ_ALL);
    const stats = await getApplicationStats(admin);
    return jsonSuccess({ stats });
  } catch (error) {
    return errorToResponse(error);
  }
}
