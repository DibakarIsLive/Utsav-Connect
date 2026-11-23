import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { inviteAdministrator, listAdminInvitations } from "@/api/services/admin-service";
import { requireSuperAdmin } from "@/api/lib/auth/guards";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

const PERMISSION_VALUES = Object.values(ADMIN_PERMISSIONS);

const createInvitationSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    permissions: z.array(z.enum(PERMISSION_VALUES)).max(20).optional().default([]),
  })
  .strict();

/**
 * GET /api/admin/users/invitations
 * Super Admin only: list pending administrator invitations.
 */
export async function GET(request) {
  try {
    const actor = await requireSuperAdmin(request);
    const deliberateView = new URL(request.url).searchParams.get("view") === "1";

    const invitations = await listAdminInvitations(actor, { audit: deliberateView });
    return jsonSuccess({ invitations });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/admin/users/invitations
 * Super Admin only: invite a new administrator.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    const actor = await requireSuperAdmin(request);
    await enforceRateLimit("admin-invitation-create-ip", clientAddress(request), {
      limit: 5,
      windowSeconds: 900,
    });

    const body = await request.json();
    const { email, permissions } = createInvitationSchema.parse(body);

    const result = await inviteAdministrator(actor, email, permissions);
    return jsonSuccess(result, { status: 201 });
  } catch (error) {
    return errorToResponse(error);
  }
}
