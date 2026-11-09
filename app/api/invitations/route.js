import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { submitReport, listReports } from "@/api/services/invitation-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { createReportSchema } from "@/api/lib/validation/invitation-schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/invitations
 * List reports for authenticated user (Devotees see own; Admins see all).
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({ code: "UNAUTHORIZED", message: "Sign in required", status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get("areaId") || undefined;
    const status = searchParams.get("status") || undefined;

    const reports = await listReports(user, { areaId, status });
    return jsonSuccess({ reports, count: reports.length });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/invitations
 * Submit a new invitation report (Active Devotees / Admins).
 */
export async function POST(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({
        code: "UNAUTHORIZED",
        message: "Sign in required to submit reports",
        status: 401,
      });
    }

    const body = await request.json();
    const validatedData = createReportSchema.parse(body);

    const report = await submitReport(user, validatedData);
    return jsonSuccess(
      { report, message: "Invitation report submitted successfully." },
      { status: 201 },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
