import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { resendVerification } from "@/api/services/application-service";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const resendSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
  })
  .strict();

/**
 * POST /api/auth/verify-email/resend
 * Resend an email verification link for an existing unverified account.
 *
 * Always returns a generic success response to prevent account enumeration.
 * Rate limited by IP and by email address.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);

    const ip = clientAddress(request);

    await enforceRateLimit("verify-email-resend-ip", ip, {
      limit: 3,
      windowSeconds: 300,
    });

    const body = await request.json();
    const { email } = resendSchema.parse(body);

    await enforceRateLimit("verify-email-resend-email", email, {
      limit: 3,
      windowSeconds: 300,
    });

    await resendVerification(email);

    // Generic response regardless of whether the user exists or is eligible,
    // to prevent account enumeration.
    return jsonSuccess({
      message:
        "If an unverified account exists for this email, a new verification link has been sent.",
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
