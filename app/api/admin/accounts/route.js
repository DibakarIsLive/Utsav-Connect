import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { listDevoteeAccounts } from "@/api/services/devotee-directory-service";

export const dynamic = "force-dynamic";

/** GET /api/admin/accounts — shared devotee directory (masked list). */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.DEVOTEE_READ_ALL);
    const { searchParams } = new URL(request.url);
    const result = await listDevoteeAccounts(admin, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
    });
    return jsonSuccess(result);
  } catch (error) {
    return errorToResponse(error);
  }
}
