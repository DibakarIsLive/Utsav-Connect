import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { listProposals } from "@/api/services/proposal-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas/proposals
 * List proposals submitted for review. Requires proposal:review;
 * `area:manage` is a separate geography responsibility.
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.PROPOSAL_REVIEW);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const proposals = await listProposals(admin, { status });
    return jsonSuccess({ proposals, count: proposals.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
