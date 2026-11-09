import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listApplications } from "@/api/services/admin-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { hasPermission, ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applications
 * List applications with pagination and filtering (admin only)
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin || !hasPermission(admin, ADMIN_PERMISSIONS.APPLICATION_READ_ALL)) {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Admin application access required",
        status: 403,
      });
    }

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
        applicantEmail: a.applicantEmail,
        applicantPhone: a.applicantPhone,
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
