import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getApplication } from "@/api/services/admin-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applications/:id
 * Get application details (admin only)
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin access required", status: 403 });
    }

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
