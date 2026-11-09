import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { reviewProposal, getProposalById } from "@/api/services/proposal-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { reviewProposalSchema } from "@/api/lib/validation/area-schemas";
import { hasPermission } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/areas/proposals/:id/review
 * Admin: Get single proposal details with duplicate warnings.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
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

    const proposal = await getProposalById(admin, id);
    return jsonSuccess({ proposal });
  } catch (error) {
    return errorToResponse(error);
  }
}

/**
 * POST /api/admin/areas/proposals/:id/review
 * Admin: Review proposal (approve, reject, needs_correction, duplicate).
 * If approved: automatically creates the Area record in areas collection.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
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
