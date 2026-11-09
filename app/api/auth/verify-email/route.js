import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { verifyEmail } from "@/api/services/application-service";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  token: z.string().min(1),
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
export async function POST(request) {
  try {
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
