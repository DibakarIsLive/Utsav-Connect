import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listApprovedAreas, buildAreaTree } from "@/api/services/area-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/areas
 * Authenticated: List approved geographic areas for the devotee portal and
 * admin workspace. Campaign geography is not public.
 * Supports: ?search=..., ?parentId=..., ?type=..., ?format=tree
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({
        code: "UNAUTHORIZED",
        message: "Sign in required to view campaign areas",
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const parentId = searchParams.get("parentId") || undefined;
    const type = searchParams.get("type") || undefined;
    const format = searchParams.get("format") || "flat";

    const areas = await listApprovedAreas({ search, parentId, type });

    if (format === "tree") {
      const tree = buildAreaTree(areas);
      return jsonSuccess({ areas: tree, count: areas.length });
    }

    return jsonSuccess({ areas, count: areas.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
