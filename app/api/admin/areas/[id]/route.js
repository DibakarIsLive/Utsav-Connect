import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { updateArea, archiveArea, getAreaById } from "@/api/services/area-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { updateAreaSchema } from "@/api/lib/validation/area-schemas";
import { hasPermission } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas/:id
 * Admin: Get area details.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin || admin.role === "devotee") {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin access required", status: 403 });
    }

    const area = await getAreaById(id, { includeUnapproved: true });
    return jsonSuccess({ area });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * PATCH /api/admin/areas/:id
 * Admin: Update area details, parent hierarchy (prevents cycles), or boundary.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin || admin.role === "devotee" || (!hasPermission(admin, "area:manage") && admin.role !== "super_admin")) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin area:manage access required", status: 403 });
    }

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
 * Admin: Archive an area (soft archive, never hard deletes).
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin || admin.role === "devotee" || (!hasPermission(admin, "area:manage") && admin.role !== "super_admin")) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin area:manage access required", status: 403 });
    }

    const archived = await archiveArea(admin, id);
    return jsonSuccess({ area: archived, message: "Area successfully archived" });
  } catch (error) {
    return errorToResponse(error);
  }
}
