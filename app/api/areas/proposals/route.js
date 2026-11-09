import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { createProposal, listProposals } from "@/api/services/proposal-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { createProposalSchema } from "@/api/lib/validation/area-schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/areas/proposals
 * List proposals for current authenticated devotee (or all if admin).
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({ code: "UNAUTHORIZED", message: "Sign in required to view proposals", status: 401 });
    }

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
 * Submit a new locality proposal (Devotee or Admin).
 */
export async function POST(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user) {
      return errorToResponse({ code: "UNAUTHORIZED", message: "Sign in required to propose areas", status: 401 });
    }

    // Must be active devotee or admin
    if (user.role === "devotee" && user.status !== "active") {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Only active devotees with approved applications can propose localities",
        status: 403,
      });
    }

    const body = await request.json();
    const validatedData = createProposalSchema.parse(body);

    const proposal = await createProposal(user, validatedData);

    return jsonSuccess(
      {
        proposal,
        message: "Proposal submitted successfully. It will be reviewed by an administrator before appearing on the map.",
      },
      { status: 201 },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
