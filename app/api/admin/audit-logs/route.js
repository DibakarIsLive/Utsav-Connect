import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { AuditLog } from "@/api/models/audit-log";
import { requireAdmin } from "@/api/lib/auth/guards";
import { ADMIN_PERMISSIONS } from "@/api/lib/auth/permissions";
import { connectToDatabase } from "@/api/lib/mongodb/connection";

export const dynamic = "force-dynamic";

// Keys that must never reach an audit reader, including legacy records written
// before write-time redaction was introduced.
const SENSITIVE_METADATA_KEYS = new Set([
  "email",
  "emails",
  "reason",
  "note",
  "notes",
  "reviewNote",
  "adminNotes",
  "description",
  "password",
  "token",
  "ip",
  "userAgent",
]);

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !SENSITIVE_METADATA_KEYS.has(key.toLowerCase()))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 120) : value]),
  );
}

/**
 * GET /api/admin/audit-logs
 * Read the append-only security audit trail. Super Admins and administrators
 * explicitly granted audit:read:all may read it.
 */
export async function GET(request) {
  try {
    await requireAdmin(request, ADMIN_PERMISSIONS.AUDIT_READ_ALL);

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));
    const query = {};

    const eventType = searchParams.get("eventType");
    const actorId = searchParams.get("actorId");
    const targetId = searchParams.get("targetId");
    if (eventType) query.eventType = eventType;
    if (actorId) query.actorId = actorId;
    if (targetId) query.targetId = targetId;

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const start = new Date(from);
        if (Number.isNaN(start.getTime())) {
          return errorToResponse({
            code: "VALIDATION_ERROR",
            message: "Invalid from date.",
            status: 400,
          });
        }
        query.createdAt.$gte = start;
      }
      if (to) {
        const end = new Date(to);
        if (Number.isNaN(end.getTime())) {
          return errorToResponse({
            code: "VALIDATION_ERROR",
            message: "Invalid to date.",
            status: 400,
          });
        }
        query.createdAt.$lte = end;
      }
    }

    const logs = await AuditLog.find(query)
      .populate("actorId", "fullName role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Historical records are left untouched, but the browser response exposes
    // only an allowlist of fields. Raw user agents and IP hashes are never
    // returned, and legacy free-text PII in metadata is redacted on read.
    const safeLogs = logs.map(
      ({ _id, eventType, actorId, actorRole, targetId, targetType, metadata, createdAt }) => ({
        _id,
        eventType,
        actorId,
        actorRole,
        targetId,
        targetType,
        metadata: sanitizeMetadata(metadata),
        createdAt,
      }),
    );

    return jsonSuccess({ logs: safeLogs, count: safeLogs.length });
  } catch (error) {
    return errorToResponse(error);
  }
}
