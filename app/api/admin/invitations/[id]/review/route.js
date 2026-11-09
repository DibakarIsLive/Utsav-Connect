import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { reviewReport } from "@/api/services/invitation-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { reviewReportSchema } from "@/api/lib/validation/invitation-schemas";
import { hasPermission, ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/:id/review
 * Admin: Review, flag, or invalidate an invitation report. Invalidating a
 * report requires an audit note, enforced by the service as well.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const validatedData = reviewReportSchema.parse(body);

    if (validatedData.status === "invalid" && !validatedData.adminNotes?.trim()) {
      return errorToResponse({
        code: "VALIDATION_ERROR",
        message: "An audit note is required to invalidate an invitation report.",
        status: 400,
      });
    }

    const report = await reviewReport(admin, id, validatedData);
    return jsonSuccess({
      report,
      message: `Invitation report marked as ${validatedData.status}`,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
