import "server-only";
import mongoose from "mongoose";
import { getEnv } from "@/api/lib/env/env";
import { logger } from "@/api/lib/logging/logger";
import { DatabaseUnavailableError } from "@/api/lib/mongodb/errors";

export { DatabaseUnavailableError };

/**
 * MongoDB connection module (roadmap task 3.2).
 *
 * Next.js re-evaluates server modules during development (hot reloading), so
 * the connection promise is cached on `globalThis`. In production the module
 * is evaluated once per server process, and the cache simply memoizes.
 *
 * Failure behaviour is deliberate:
 *  - A failed attempt clears the cached promise so the next request retries.
 *  - Callers receive a `DatabaseUnavailableError` with a safe message; the
 *    underlying driver error is logged server-side only.
 */

const GLOBAL_KEY = Symbol.for("utsav-connect.mongoose");

function getCache() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = { promise: null };
  }
  return globalThis[GLOBAL_KEY];
}

/**
 * Driver options shared by every connection. Short selection timeouts keep
 * request handlers from hanging when MongoDB is down.
 */
export const CONNECTION_OPTIONS = Object.freeze({
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 30_000,
  maxPoolSize: 10,
  // Fail fast instead of buffering commands while disconnected.
  bufferCommands: false,
});

/**
 * Open (or reuse) the application connection.
 *
 * @param {{ uri?: string }} [options] Override the URI (tests use MONGODB_URI_TEST).
 * @returns {Promise<typeof mongoose>}
 */
export async function connectToDatabase(options = {}) {
  const cache = getCache();

  if (mongoose.connection.readyState === 1 && cache.promise) {
    return cache.promise;
  }

  if (!cache.promise) {
    const uri = options.uri ?? getEnv().MONGODB_URI;
    cache.promise = mongoose
      .connect(uri, CONNECTION_OPTIONS)
      .then((instance) => {
        logger.info("mongodb.connected", {
          host: instance.connection.host,
          database: instance.connection.name,
        });
        return instance;
      })
      .catch((error) => {
        cache.promise = null;
        logger.error("mongodb.connection_failed", { error });
        throw new DatabaseUnavailableError();
      });
  }

  return cache.promise;
}

/**
 * Close the connection and clear the cache. Used by tests and scripts; the
 * Next.js server keeps its pool open for the lifetime of the process.
 */
export async function disconnectFromDatabase() {
  const cache = getCache();
  cache.promise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("mongodb.disconnected");
  }
}

/**
 * Human-readable connection state, for diagnostics.
 */
export function getConnectionState() {
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  return states[mongoose.connection.readyState] ?? "unknown";
}
