import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listReports } from "@/api/services/invitation-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { hasPermission, ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invitations
 * Admin: List all invitation reports with filters.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (
      !admin ||
      (!hasPermission(admin, ADMIN_PERMISSIONS.INVITATION_REPORT_READ_ALL) &&
        !hasPermission(admin, ADMIN_PERMISSIONS.AREA_MANAGE) &&
        admin.role !== "super_admin")
    ) {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Admin invitation report access required",
        status: 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get("areaId") || undefined;
    const status = searchParams.get("status") || undefined;
    const contributorId = searchParams.get("contributorId") || undefined;

    const reports = await listReports(admin, { areaId, status, contributorId });
    return jsonSuccess({ reports, count: reports.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
