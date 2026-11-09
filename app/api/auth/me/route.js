import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);

    if (!token) {
      return jsonSuccess({ user: null });
    }

    const user = await validateSession(token);

    return jsonSuccess({ user });
  } catch (error) {
    return errorToResponse(error);
  }
}
