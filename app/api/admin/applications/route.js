import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listApplications } from "@/api/services/admin-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { maskEmail, maskPhone } from "@/api/lib/privacy/mask";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applications
 * List applications with pagination and filtering. Requires
 * application:read:all. Contact data is masked; full values are available
 * only from the audited detail endpoint.
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.APPLICATION_READ_ALL);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await listApplications(admin, { status, search, page, limit });

    return jsonSuccess({
      applications: result.applications.map((a) => ({
        id: a._id.toString(),
        applicantName: a.applicantName,
        applicantEmail: maskEmail(a.applicantEmail),
        applicantPhone: maskPhone(a.applicantPhone),
        gender: a.gender,
        status: a.status,
        message: a.message,
        createdAt: a.createdAt,
        reviewedAt: a.reviewedAt,
        reviewedBy: a.reviewedBy ? a.reviewedBy.toString() : null,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
