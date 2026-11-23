import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { confirmPasswordReset } from "@/api/services/auth-service";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

const confirmResetSchema = z
  .object({
    token: z.string().trim().min(1).max(200),
    password: z.string().min(12).max(128),
  })
  .strict();

/**
 * POST /api/auth/password-reset/confirm
 * Confirm a password reset with a valid token.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);

    const body = await request.json();
    const { token, password } = confirmResetSchema.parse(body);

    await confirmPasswordReset(token, password);

    return jsonSuccess({
      message: "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
