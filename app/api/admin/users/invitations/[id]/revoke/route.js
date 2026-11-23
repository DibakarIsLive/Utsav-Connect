import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { revokeAdminInvitation } from "@/api/services/admin-service";
import { requireSuperAdmin } from "@/api/lib/auth/guards";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/users/invitations/[id]/revoke
 * Super Admin only: revoke a pending administrator invitation.
 */
export async function PATCH(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const actor = await requireSuperAdmin(request);
    await enforceRateLimit("admin-invitation-revoke-ip", clientAddress(request), {
      limit: 10,
      windowSeconds: 900,
    });
    const { id } = await params;

    await revokeAdminInvitation(actor, id);
    return jsonSuccess({ success: true, message: "Invitation revoked." });
  } catch (error) {
    return errorToResponse(error);
  }
}
