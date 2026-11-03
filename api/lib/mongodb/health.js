import "server-only";
import mongoose from "mongoose";
import { connectToDatabase } from "@/api/lib/mongodb/connection";
import { logger } from "@/api/lib/logging/logger";

/**
 * Database health probe used by GET /api/health.
 *
 * Returns a small, non-sensitive summary. Driver errors are logged
 * server-side and never included in the response.
 *
 * @param {{ uri?: string }} [options]
 * @returns {Promise<{ status: "ok" | "unavailable", latencyMs: number, message?: string }>}
 */
export async function checkDatabaseHealth(options = {}) {
  const startedAt = performance.now();
  try {
    await connectToDatabase(options);
    await mongoose.connection.db.admin().ping();
    return { status: "ok", latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    logger.warn("health.database_unavailable", { error });
    return {
      status: "unavailable",
      latencyMs: Math.round(performance.now() - startedAt),
      message: "MongoDB did not respond to a ping.",
    };
  }
}
