import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { requestPasswordReset } from "@/api/services/auth-service";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const requestResetSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
  })
  .strict();

/**
 * POST /api/auth/password-reset/request
 * Request a password reset link.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);

    const body = await request.json();
    const { email } = requestResetSchema.parse(body);

    const ip = clientAddress(request);

    await enforceRateLimit("password-reset-request-ip", ip, {
      limit: 5,
      windowSeconds: 3600,
    });
    await enforceRateLimit("password-reset-request-email", email, {
      limit: 3,
      windowSeconds: 3600,
    });

    await requestPasswordReset(email, { ip });

    // Always return an identical generic response for existing and unknown
    // emails. Delivery status is deliberately NOT exposed here: it would reveal
    // whether an account exists and break the anti-enumeration guarantee.
    return jsonSuccess({
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
