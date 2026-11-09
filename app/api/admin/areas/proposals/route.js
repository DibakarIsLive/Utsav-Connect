import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listProposals } from "@/api/services/proposal-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { hasPermission } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas/proposals
 * Admin: List proposals submitted for review with duplicate status.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (
      !admin ||
      admin.role === "devotee" ||
      (!hasPermission(admin, "proposal:review") && !hasPermission(admin, "area:manage") && admin.role !== "super_admin")
    ) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin proposal review access required", status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const proposals = await listProposals(admin, { status });
    return jsonSuccess({ proposals, count: proposals.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
