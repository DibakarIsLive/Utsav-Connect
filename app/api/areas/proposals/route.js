import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { createProposal, listProposals } from "@/api/services/proposal-service";
import { requireUser } from "@/api/lib/auth/guards";
import { createProposalSchema } from "@/api/lib/validation/area-schemas";
import { assertTrustedOrigin } from "@/api/lib/http/origin";

export const dynamic = "force-dynamic";

/**
 * GET /api/areas/proposals
 * Approved devotees see their own proposals; authorised administrators see
 * all proposals. Application-scope applicants are refused.
 */
export async function GET(request) {
  try {
    const user = await requireUser(request, { full: true });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;

    const proposals = await listProposals(user, { status });
    return jsonSuccess({ proposals });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/areas/proposals
 * Submit a new locality proposal (approved devotee or administrator).
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    const user = await requireUser(request, { full: true });

    const body = await request.json();
    const validatedData = createProposalSchema.parse(body);

    const proposal = await createProposal(user, validatedData);

    return jsonSuccess(
      {
        proposal,
        message:
          "Proposal submitted successfully. It will be reviewed by an administrator before appearing on the map.",
      },
      { status: 201 },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
