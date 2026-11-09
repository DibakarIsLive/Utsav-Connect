import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getAreaById } from "@/api/services/area-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/areas/:id
 * Public: Get single approved area details with parent and children.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const area = await getAreaById(id);
    return jsonSuccess({ area });
  } catch (error) {
    return errorToResponse(error);
  }
}
