import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { logout } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Revoke session
 */
export async function POST(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);

    await logout(token);

    return jsonSuccess({ message: "Logged out successfully" }, {
      headers: {
        "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    });

  } catch (error) {
    return errorToResponse(error);
  }
}