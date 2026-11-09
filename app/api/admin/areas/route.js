import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listAdminAreas, createArea } from "@/api/services/area-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { createAreaSchema } from "@/api/lib/validation/area-schemas";
import { hasPermission } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas
 * Admin: List all areas (including archived), with search and filter.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin || admin.role === "devotee" || (!hasPermission(admin, "area:manage") && admin.role !== "super_admin")) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin area:manage access required", status: 403 });
    }

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
 * Admin: Create an area directly with boundary, parent, and duplicate check.
 */
export async function POST(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin || admin.role === "devotee" || (!hasPermission(admin, "area:manage") && admin.role !== "super_admin")) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin area:manage access required", status: 403 });
    }

    const body = await request.json();
    const validatedData = createAreaSchema.parse(body);

    const result = await createArea(admin, validatedData);
    return jsonSuccess({ area: result.area, duplicatesFound: result.duplicates }, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
