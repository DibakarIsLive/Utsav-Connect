import "server-only";
import { z } from "zod";

/**
 * Environment configuration.
 *
 * The schema below is the single definition of every environment variable the
 * server reads. Validation is lazy (first call to `getEnv()`), so that
 * `next build` succeeds on machines without a database while every request
 * that needs configuration still fails fast with a precise message.
 */

const LOG_LEVELS = ["debug", "info", "warn", "error"];
const REGISTRATION_MODES = ["open", "closed"];
const EMAIL_PROVIDERS = ["dev", "resend", "smtp"];

const mongoUriSchema = z
  .string()
  .trim()
  .min(1, "must not be empty")
  .refine(
    (value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
    "must start with mongodb:// or mongodb+srv://",
  );

const booleanFlag = (defaultValue) =>
  z
    .union([z.boolean(), z.literal("0"), z.literal("1")])
    .transform((val) => (val === "1" || val === true ? true : val === "0" || val === false ? false : defaultValue))
    .default(defaultValue);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    MONGODB_URI: mongoUriSchema,
    MONGODB_URI_TEST: mongoUriSchema.optional(),
    APP_BASE_URL: z.url({ protocol: /^https?$/ }).default("http://localhost:3000"),
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),

    // Authentication
    AUTH_SECRET: z
      .string()
      .min(32, "must be at least 32 characters; generate with: openssl rand -base64 48"),
    REGISTRATION_MODE: z.enum(REGISTRATION_MODES).default("closed"),
    SESSION_IDLE_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    SESSION_ABSOLUTE_DAYS: z.coerce.number().int().min(1).max(365).default(30),

    // Email
    EMAIL_PROVIDER: z.enum(EMAIL_PROVIDERS).default("dev"),
    EMAIL_FROM: z.string().email().default("no-reply@example.com"),
    EMAIL_API_KEY: z.string().min(1).optional(),
    SMTP_URL: z.string().min(1).optional(),
  })
  .superRefine((env, context) => {
    if (env.SESSION_IDLE_DAYS > env.SESSION_ABSOLUTE_DAYS) {
      context.addIssue({
        code: "custom",
        path: ["SESSION_IDLE_DAYS"],
        message: "must not exceed SESSION_ABSOLUTE_DAYS",
      });
    }
  });

/**
 * Validate a raw environment object against the schema.
 *
 * @param {Record<string, string | undefined>} source
 * @returns {{ ok: true, env: z.infer<typeof envSchema> } | { ok: false, issues: Array<{ variable: string, message: string }> }}
 */
export function parseEnv(source) {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return { ok: true, env: result.data };
  }
  const issues = result.error.issues.map((issue) => ({
    variable: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
  return { ok: false, issues };
}

/**
 * Format validation issues into a single human-readable message that never
 * echoes variable values (only names), so it is safe to log.
 *
 * @param {Array<{ variable: string, message: string }>} issues
 */
export function formatEnvIssues(issues) {
  const lines = issues.map((issue) => `  - ${issue.variable}: ${issue.message}`);
  return [
    "Invalid environment configuration. Copy .env.example to .env.local and fix:",
    ...lines,
  ].join("\n");
}

export class EnvironmentError extends Error {
  /**
   * @param {Array<{ variable: string, message: string }>} issues
   */
  constructor(issues) {
    super(formatEnvIssues(issues));
    this.name = "EnvironmentError";
    this.issues = issues;
  }
}

let cachedEnv = null;

/**
 * Return the validated environment, validating on first use.
 * Throws `EnvironmentError` when required variables are missing or malformed.
 */
export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }
  const parsed = parseEnv(process.env);
  if (!parsed.ok) {
    throw new EnvironmentError(parsed.issues);
  }
  cachedEnv = parsed.env;
  return cachedEnv;
}

/**
 * Discard the memoized environment. Used by tests only.
 */
export function resetEnvCache() {
  cachedEnv = null;
}
