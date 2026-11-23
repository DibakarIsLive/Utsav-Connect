import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { login } from "@/api/services/auth-service";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(1).max(128),
  })
  .strict();

/**
 * POST /api/auth/login
 * Authenticate and create session
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Get request metadata
    const userAgent = request.headers.get("user-agent") || undefined;
    const ip = clientAddress(request);

    // Limit guessing for one account and, more broadly, from one address.
    await enforceRateLimit("login-account", `${ip}:${email}`, {
      limit: 10,
      windowSeconds: 900,
    });
    await enforceRateLimit("login-ip", ip, { limit: 50, windowSeconds: 900 });

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
