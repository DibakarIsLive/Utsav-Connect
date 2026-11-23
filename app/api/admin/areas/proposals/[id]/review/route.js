import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { reviewProposal, getProposalById } from "@/api/services/proposal-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { reviewProposalSchema } from "@/api/lib/validation/area-schemas";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas/proposals/:id/review
 * Proposal detail with duplicate warnings. Requires proposal:review.
 */
export async function GET(request, { params }) {
  try {
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.PROPOSAL_REVIEW);
    const { id } = await params;
    const proposal = await getProposalById(admin, id);
    return jsonSuccess({ proposal });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/admin/areas/proposals/:id/review
 * Review a proposal (approve, reject, needs_correction, duplicate).
 * Approval creates the official Area record atomically with the status change.
 */
export async function POST(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.PROPOSAL_REVIEW);
    const { id } = await params;

    const body = await request.json();
    const validatedData = reviewProposalSchema.parse(body);

    const result = await reviewProposal(admin, id, validatedData);
    return jsonSuccess({
      proposal: result.proposal,
      createdArea: result.createdArea,
      message: `Proposal marked as ${validatedData.status}`,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
