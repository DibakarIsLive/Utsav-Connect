import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { AuditLog } from "@/api/models/audit-log";
import { validateSession } from "@/api/services/auth-service";
import { parseSessionToken } from "@/api/lib/auth/session";
import { connectToDatabase } from "@/api/lib/mongodb/connection";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit-logs
 * Super Admin only: View system-wide security audit logs.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || undefined;
    const token = parseSessionToken(cookieHeader);
    const user = await validateSession(token);

    if (!user || user.role !== "super_admin") {
      return errorToResponse({
        code: "FORBIDDEN",
        message: "Super Admin audit log access required",
        status: 403,
      });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));

    const logs = await AuditLog.find({})
      .populate("actorId", "fullName email role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return jsonSuccess({ logs, count: logs.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
