import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { reviewReport } from "@/api/services/invitation-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { reviewReportSchema } from "@/api/lib/validation/invitation-schemas";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/:id/review
 * Review, flag, or invalidate an invitation report. Invalidating a report
 * requires an audit note, enforced by the schema, route and service.
 */
export async function POST(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.INVITATION_REPORT_READ_ALL);
    const { id } = await params;

    const body = await request.json();
    const validatedData = reviewReportSchema.parse(body);

    if (
      (validatedData.status === "invalid" || validatedData.status === "flagged") &&
      !validatedData.adminNotes?.trim()
    ) {
      return errorToResponse({
        code: "VALIDATION_ERROR",
        message: "An audit note is required to flag or invalidate an invitation report.",
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
