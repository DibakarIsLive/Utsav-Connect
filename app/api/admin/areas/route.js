import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listAdminAreas, createArea } from "@/api/services/area-service";
import { createAreaSchema } from "@/api/lib/validation/area-schemas";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas
 * Admin: list all areas (including archived), with search and filter.
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.AREA_MANAGE);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const areas = await listAdminAreas(admin, { search, status });
    return jsonSuccess({ areas, count: areas.length });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/admin/areas
 * Admin: create an area directly with boundary, parent and duplicate check.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.AREA_MANAGE);

    const body = await request.json();
    const validatedData = createAreaSchema.parse(body);

    const result = await createArea(admin, validatedData);
    return jsonSuccess({ area: result.area, duplicatesFound: result.duplicates }, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
