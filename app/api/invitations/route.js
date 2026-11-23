import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { submitReport, listReports } from "@/api/services/invitation-service";
import { requireUser } from "@/api/lib/auth/guards";
import { createReportSchema } from "@/api/lib/validation/invitation-schemas";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/invitations
 * Approved devotees see their own reports; authorised administrators see all.
 * Application-scope applicants cannot reach campaign reporting data.
 */
export async function GET(request) {
  try {
    const user = await requireUser(request, { full: true });

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
 * Record an invitation report. Only an active devotee may be a contributor;
 * administrators review reports rather than submitting them.
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser(request, { full: true });

    if (user.role !== "devotee" || user.status !== "active") {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Only active devotees with approved applications can submit invitation reports",
        status: 403,
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
