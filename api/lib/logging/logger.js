import "server-only";

/**
 * Minimal structured logger for server-side code.
 *
 * Emits one JSON object per line so logs can be parsed by any log collector.
 * Callers are responsible for never passing secrets; the logger additionally
 * redacts a small set of well-known sensitive keys as a safety net.
 */

const LEVEL_PRIORITY = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "mongodb_uri",
  "mongodb_uri_test",
]);

function currentLevel() {
  const configured = (process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVEL_PRIORITY[configured] ?? LEVEL_PRIORITY.info;
}

/**
 * Replace values of sensitive keys (case-insensitive) with "[redacted]".
 * Only one level deep by design: log context should stay small and flat.
 *
 * @param {Record<string, unknown> | undefined} context
 */
export function redactContext(context) {
  if (!context || typeof context !== "object") {
    return {};
  }
  const safe = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return safe;
}

function serializeError(error) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  return {
    name: error.name,
    message: error.message,
    ...(process.env.NODE_ENV !== "production" && error.stack ? { stack: error.stack } : {}),
  };
}

function write(level, message, context) {
  if (LEVEL_PRIORITY[level] < currentLevel()) {
    return;
  }
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...redactContext(context),
  };
  if (entry.error) {
    entry.error = serializeError(entry.error);
  }
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message, context) => write("debug", message, context),
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
};
