import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { acceptAdminInvitation } from "@/api/services/admin-service";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const acceptInvitationSchema = z
  .object({
    token: z.string().trim().min(1).max(200),
    fullName: z.string().trim().min(2).max(120),
    password: z.string().min(12).max(128),
    phone: z.string().trim().min(10).max(20),
    gender: z.enum(["male", "female"]),
  })
  .strict();

/**
 * POST /api/auth/admin-invitation/accept
 * Accept an administrator invitation and create the account.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    await enforceRateLimit("admin-invitation-accept-ip", clientAddress(request), {
      limit: 5,
      windowSeconds: 900,
    });

    const body = await request.json();
    const { token, fullName, password, phone, gender } = acceptInvitationSchema.parse(body);

    const result = await acceptAdminInvitation(token, {
      fullName,
      password,
      phone,
      gender,
    });

    return jsonSuccess({
      message: "Invitation accepted. Your administrator account has been created.",
      user: {
        id: result.userId,
        role: result.role,
        adminPermissions: result.adminPermissions,
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
