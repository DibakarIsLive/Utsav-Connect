import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin } from "@/api/lib/http/origin";
import { getDevoteeAccount } from "@/api/services/devotee-directory-service";
import { deleteAccount } from "@/api/services/account-deletion-service";
import {
  ACCOUNT_DELETION_DISABLED_MESSAGE,
  ACCOUNT_DELETION_POLICY_APPROVED,
} from "@/api/lib/policies/account-deletion-policy";

export const dynamic = "force-dynamic";

/** GET /api/admin/accounts/:id — safe devotee account detail. */
export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.DEVOTEE_READ_ALL);
    const { id } = await params;
    const account = await getDevoteeAccount(admin, id);
    return jsonSuccess({ account });
  } catch (error) {
    return errorToResponse(error);
  }
}

const deleteSchema = z
  .object({
    reason: z.string().trim().min(5, "A deletion reason is required").max(500),
  })
  .strict();

/**
 * DELETE /api/admin/accounts/:id — DISABLED until retention policy approval.
 *
 * The handler still authenticates the administrator and verifies origin, but
 * unconditionally returns 410 while the policy is unapproved. The service
 * repeats the check as defence in depth. Hiding a button in the UI is never the
 * authorization boundary.
 */
export async function DELETE(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request);
    if (!ACCOUNT_DELETION_POLICY_APPROVED) {
      return errorToResponse({
        code: "FEATURE_DISABLED",
        message: ACCOUNT_DELETION_DISABLED_MESSAGE,
        status: 410,
      });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = deleteSchema.parse(body);
    const result = await deleteAccount(admin, id, reason);
    return jsonSuccess({
      ...result,
      message: result.deleted
        ? "Account permanently deleted. Related credentials were revoked and historical records preserved."
        : "Account was already deleted.",
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
