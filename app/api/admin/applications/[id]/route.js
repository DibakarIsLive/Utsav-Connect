import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getApplication } from "@/api/services/admin-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applications/:id
 * Full applicant detail. Requires application:read:all and is written to the
 * audit log by the service before any contact data is returned.
 */
export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.APPLICATION_READ_ALL);
    const { id } = await params;

    const application = await getApplication(admin, id);

    return jsonSuccess({
      application: {
        id: application._id.toString(),
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        applicantPhone: application.applicantPhone,
        gender: application.gender,
        status: application.status,
        message: application.message,
        createdAt: application.createdAt,
        reviewedAt: application.reviewedAt,
        reviewedBy: application.reviewedBy ? application.reviewedBy.toString() : null,
        reviewNote: application.reviewNote,
        userId: application.userId.toString(),
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
