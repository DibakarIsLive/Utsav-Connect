import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { approveApplication, rejectApplication } from "@/api/services/admin-service";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { hasPermission, ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/admin/applications/:id/review
 * Approve or reject an application. The service enforces the granular
 * application:review:all permission; the route only rejects anonymous users.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const admin = await validateSession(token);

    if (!admin) {
      return errorToResponse({ code: "FORBIDDEN", message: "Admin access required", status: 403 });
    }
    if (
      !hasPermission(admin, ADMIN_PERMISSIONS.APPLICATION_REVIEW_ALL)
    ) {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Your admin account cannot review applications.",
        status: 403,
      });
    }

    const body = await request.json();
    const { status, note } = reviewSchema.parse(body);

    const result =
      status === "approved"
        ? await approveApplication(admin, id, note)
        : await rejectApplication(admin, id, note);

    return jsonSuccess({
      application: {
        id: result.application._id.toString(),
        status: result.application.status,
        reviewedAt: result.application.reviewedAt,
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
