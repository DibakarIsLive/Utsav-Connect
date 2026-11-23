import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listApprovedAreas, buildAreaTree } from "@/api/services/area-service";
import { requireUser } from "@/api/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * GET /api/areas
 * Approved devotee or administrator: list approved geographic areas.
 * Campaign geography is not available to anonymous or application-scope users.
 * Supports: ?search=..., ?parentId=..., ?type=..., ?format=tree
 */
export async function GET(request) {
  try {
    await requireUser(request, { full: true });

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
