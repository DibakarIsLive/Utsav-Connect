import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";
import { writeApplicationNote } from "@/api/services/admin-service";

export const dynamic = "force-dynamic";

const noteSchema = z.object({ note: z.string().trim().min(1).max(1000) }).strict();

/**
 * POST /api/admin/applications/:id/note — write an internal reviewer note.
 * Requires the distinct application:note:write permission. Never visible to
 * the applicant.
 */
export async function POST(request, { params }) {
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin(request, ADMIN_PERMISSIONS.APPLICATION_NOTE_WRITE);
    await enforceRateLimit("application-note-ip", clientAddress(request), {
      limit: 20,
      windowSeconds: 300,
    });
    const { id } = await params;
    const { note } = noteSchema.parse(await request.json());
    const result = await writeApplicationNote(admin, id, note);
    return jsonSuccess({ ...result, message: "Internal note saved." });
  } catch (error) {
    return errorToResponse(error);
  }
}
