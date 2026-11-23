import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { approveApplication, rejectApplication } from "@/api/services/admin-service";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// Decisions and internal notes are separate capabilities. Use
// POST /api/admin/applications/:id/note with application:note:write to record
// an internal reviewer note.
const reviewSchema = z
  .object({
    status: z.enum(["approved", "rejected"]),
  })
  .strict();

/**
 * POST /api/admin/applications/:id/review
 * Approve or reject an application. Requires the granular
 * application:review:all permission.
 *
 * Rate limited to 20 review actions per 5 minutes per client IP to prevent
 * abuse while allowing legitimate administrative review work.
 */
export async function POST(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const { id } = await params;

    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.APPLICATION_REVIEW_ALL);

    await enforceRateLimit("application-review-ip", clientAddress(request), {
      limit: 20,
      windowSeconds: 300,
    });

    const body = await request.json();
    const { status } = reviewSchema.parse(body);

    const result =
      status === "approved"
        ? await approveApplication(admin, id)
        : await rejectApplication(admin, id);

    return jsonSuccess({
      application: {
        id: result.application._id.toString(),
        status: result.application.status,
        reviewedAt: result.application.reviewedAt,
      },
      notificationEmailAccepted: result.emailSent ?? false,
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
