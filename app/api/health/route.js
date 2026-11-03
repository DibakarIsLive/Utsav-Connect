import { APP_VERSION } from "@/api/lib/app-info";
import { jsonError, jsonSuccess } from "@/api/lib/http/responses";
import { checkDatabaseHealth } from "@/api/lib/mongodb/health";

/**
 * GET /api/health
 *
 * Liveness + dependency check. Always computed at request time (never cached).
 *   200 → { success: true,  data: { status: "ok", checks, version, timestamp } }
 *   503 → { success: false, error: { code: "SERVICE_DEGRADED", message }, data: {...} }
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await checkDatabaseHealth();
  const healthy = database.status === "ok";

  const data = {
    status: healthy ? "ok" : "degraded",
    checks: { database },
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  };

  if (healthy) {
    return jsonSuccess(data);
  }

  return jsonError({
    status: 503,
    code: "SERVICE_DEGRADED",
    message: "One or more dependencies are unavailable.",
    extra: { data },
  });
}
