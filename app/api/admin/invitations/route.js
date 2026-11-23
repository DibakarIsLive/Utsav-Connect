import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listReports } from "@/api/services/invitation-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invitations
 * List all invitation reports with filters. Requires
 * invitation-report:read:all; `area:manage` is not an implicit grant.
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.INVITATION_REPORT_READ_ALL);

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get("areaId") || undefined;
    const status = searchParams.get("status") || undefined;
    const contributorId = searchParams.get("contributorId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const reports = await listReports(admin, { areaId, status, contributorId, from, to });
    return jsonSuccess({ reports, count: reports.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
