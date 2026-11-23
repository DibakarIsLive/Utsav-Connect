import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { updateArea, archiveArea, getAreaById } from "@/api/services/area-service";
import { updateAreaSchema } from "@/api/lib/validation/area-schemas";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas/:id
 * Admin: area details, including archived records.
 */
export async function GET(request, { params }) {
  try {
    await requireAdmin(request, ADMIN_PERMISSIONS.AREA_MANAGE);
    const { id } = await params;
    const area = await getAreaById(id, { includeUnapproved: true });
    return jsonSuccess({ area });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * PATCH /api/admin/areas/:id
 * Admin: update area details, parent hierarchy (cycles blocked) or boundary.
 */
export async function PATCH(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.AREA_MANAGE);
    const { id } = await params;

    const body = await request.json();
    const validatedData = updateAreaSchema.parse(body);

    const updated = await updateArea(admin, id, validatedData);
    return jsonSuccess({ area: updated });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * DELETE /api/admin/areas/:id
 * Admin: archive an area (soft archive, never a hard delete).
 */
export async function DELETE(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.AREA_MANAGE);
    const { id } = await params;

    const archived = await archiveArea(admin, id);
    return jsonSuccess({ area: archived, message: "Area successfully archived" });
  } catch (error) {
    return errorToResponse(error);
  }
}
