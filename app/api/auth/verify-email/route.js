import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { verifyEmail } from "@/api/services/application-service";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const verifySchema = z
  .object({
    token: z.string().trim().min(1).max(200),
  })
  .strict();

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    await enforceRateLimit("verify-email-ip", clientAddress(request), {
      limit: 20,
      windowSeconds: 900,
    });

    const body = await request.json();
    const { token } = verifySchema.parse(body);

    await verifyEmail(token);

    return jsonSuccess({
      message: "Email verified successfully. Your application is now pending approval.",
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
