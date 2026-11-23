import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin } from "@/api/lib/http/origin";
import { setDevoteeAccountStatus } from "@/api/services/devotee-directory-service";

export const dynamic = "force-dynamic";

const statusSchema = z
  .object({
    status: z.enum(["active", "suspended"]),
    reason: z.string().trim().min(5, "A written reason is required").max(500),
  })
  .strict();

/** PATCH /api/admin/accounts/:id/status — suspend or reinstate a devotee. */
export async function PATCH(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.DEVOTEE_STATUS_UPDATE);
    const { id } = await params;
    const { status, reason } = statusSchema.parse(await request.json());
    const result = await setDevoteeAccountStatus(admin, id, status, reason);
    return jsonSuccess({
      ...result,
      message: result.unchanged ? "Account status was already set." : "Account status updated.",
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
