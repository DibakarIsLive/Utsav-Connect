import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { login } from "@/api/services/auth-service";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 * Authenticate and create session
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Get request metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

    const result = await login(email, password, { userAgent, ip });

    return jsonSuccess(
      {
        user: result.user,
      },
      {
        headers: {
          "Set-Cookie": result.sessionCookie,
        },
      },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
