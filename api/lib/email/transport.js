import "server-only";
import { getEnv } from "../env/env.js";
import { logger } from "../logging/logger.js";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { randomBytes } from "node:crypto";
import { getDevMailDir } from "../paths/local-artifacts.js";

/**
 * Provider-agnostic email transport selection.
 *
 * Reads EMAIL_PROVIDER from validated environment and returns a transport
 * object with a single `send` method. Each provider is responsible for its
 * own credential validation and error handling.
 *
 * Supported providers:
 *   - dev:   Writes email files to .local/mail/ (no external dependency,
 *            safe for local development, never sends real email)
 *   - resend: Uses native fetch to call the Resend REST API
 *             (requires EMAIL_API_KEY)
 *
 * @returns {{ send: (options: { to: string, subject: string, text?: string, html?: string }) => Promise<{ accepted: boolean, error?: string }> } }}
 */
export async function createTransport() {
  const env = getEnv();

  switch (env.EMAIL_PROVIDER) {
    case "dev":
      return createDevTransport();
    case "resend":
      return createResendTransport(env);
    default:
      throw new Error(`Unknown email provider: ${env.EMAIL_PROVIDER}`);
  }
}

/**
 * Dev transport: writes email files to .local/mail/ for inspection.
 * Never sends real email. Safe for local development.
 */
function createDevTransport() {
  const mailDir = getDevMailDir();

  return {
    async send({ to, subject, text, html }) {
      try {
        if (!existsSync(mailDir)) {
          mkdirSync(mailDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const safeTo = to.replace(/[^a-zA-Z0-9]/g, "_");
        const nonce = randomBytes(4).toString("hex");
        const fileName = `${timestamp}-${nonce}-${safeTo}.eml`;
        const filePath = resolvePath(mailDir, fileName);

        const headers = [`To: ${to}`, `Subject: ${subject}`, `X-Utsav-Dev-Mail: true`, ""];

        const body = [...headers, text || "", html ? `\n---\nHTML:\n${html}` : ""].join("\n");

        writeFileSync(filePath, body, "utf8");

        logger.info("email.dev.written", { to, subject, file: fileName });
        return { accepted: true };
      } catch (error) {
        logger.error("email.dev.failed", { error: error.message });
        return { accepted: false, error: error.message };
      }
    },
  };
}

/**
 * Resend transport: uses native fetch to call the Resend REST API.
 * Requires EMAIL_API_KEY environment variable.
 */
function createResendTransport(env) {
  const apiKey = env.EMAIL_API_KEY;
  const from = env.EMAIL_FROM;

  if (!apiKey) {
    return {
      async send() {
        logger.error("email.resend.missing_key", {
          to: undefined,
          subject: undefined,
        });
        return {
          accepted: false,
          error:
            "Resend provider selected but EMAIL_API_KEY is not configured. Email delivery is unavailable.",
        };
      },
    };
  }

  return {
    async send({ to, subject, text, html }) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to,
            subject,
            text,
            html,
          }),
        });

        const responseBody = await response.json().catch(() => null);

        if (!response.ok) {
          logger.error("email.resend.rejected", {
            to,
            subject,
            status: response.status,
            error: responseBody?.message ?? responseBody,
          });
          return {
            accepted: false,
            error: responseBody?.message ?? `Resend API returned ${response.status}`,
          };
        }

        logger.info("email.resend.sent", { to, subject, id: responseBody?.id });
        return { accepted: true };
      } catch (error) {
        logger.error("email.resend.failed", { to, subject, error: error.message });
        return { accepted: false, error: error.message };
      }
    },
  };
}
