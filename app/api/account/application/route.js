import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { getOwnApplication } from "@/api/services/application-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/account/application
 * The signed-in applicant's own current application. Safe projection only:
 * reviewer notes and reviewer identities are never included.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({
        code: "UNAUTHORIZED",
        message: "Sign in required",
        status: 401,
      });
    }

    if (user.role !== "devotee") {
      return jsonSuccess({ application: null });
    }

    const application = await getOwnApplication(user);
    return jsonSuccess({ application });
  } catch (error) {
    return errorToResponse(error);
  }
}
