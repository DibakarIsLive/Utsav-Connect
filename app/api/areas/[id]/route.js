import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getAreaById } from "@/api/services/area-service";
import { requireUser } from "@/api/lib/auth/guards";

export const dynamic = "force-dynamic";

/**
 * GET /api/areas/:id
 * Approved devotee or administrator: get one approved area with its parent.
 * Campaign geography is private; an application-scope applicant cannot read it.
 */
export async function GET(request, { params }) {
  try {
    await requireUser(request, { full: true });

    const { id } = await params;
    const area = await getAreaById(id);
    return jsonSuccess({ area });
  } catch (error) {
    return errorToResponse(error);
  }
}
