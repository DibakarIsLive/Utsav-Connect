import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { submitApplication } from "@/api/services/application-service";
import { getEnv } from "@/api/lib/env/env";
import { assertTrustedOrigin, clientAddress } from "@/api/lib/http/origin";
import { enforceRateLimit } from "@/api/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Validate a phone number is a well-formed E.164 number using libphonenumber-js.
 * Returns true if valid, false otherwise. Used with Zod .refine().
 */
function validateE164Phone(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();

  // Must start with '+' followed by digits (E.164 format).
  if (!/^\+[1-9]\d{1,14}$/.test(trimmed)) {
    return false;
  }

  // Use libphonenumber-js to validate the number is real and parseable.
  // parsePhoneNumber can throw for values that look like E.164 but carry no
  // subscriber number (e.g. a bare country prefix such as "+91"); treat those
  // as invalid rather than surfacing a server error.
  let parsed;
  try {
    parsed = parsePhoneNumber(trimmed);
  } catch {
    parsed = null;
  }
  return Boolean(parsed && parsed.isValid());
}

const applicationSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(12).max(128),
    phone: z.string().refine(validateE164Phone, {
      message: "Enter a valid phone number with country code (e.g. +919876543210).",
    }),
    gender: z.enum(["male", "female"]),
    message: z.string().trim().max(500).optional(),
  })
  .strict();

export { applicationSchema };

/**
 * POST /api/auth/register
 * Submit devotee application
 */
export async function POST(request) {
  try {
    assertTrustedOrigin(request);
    await enforceRateLimit("register-ip", clientAddress(request), {
      limit: 5,
      windowSeconds: 3600,
    });

    const env = getEnv();

    // Check if registration is open
    if (env.REGISTRATION_MODE === "closed") {
      return errorToResponse({
        code: "REGISTRATION_CLOSED",
        message: "Applications are currently closed.",
        status: 403,
      });
    }

    const body = await request.json();
    const data = applicationSchema.parse(body);

    const result = await submitApplication(data);

    let message;
    if (result.emailSent) {
      message =
        "Application submitted successfully. Please check your email to verify your account.";
    } else {
      message =
        "Application submitted successfully. Email delivery is not configured, so a verification link could not be sent. Please contact the campaign team to verify your email address.";
    }

    return jsonSuccess(
      {
        message,
        userId: result.userId,
        emailSent: result.emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorToResponse(error);
  }
}
