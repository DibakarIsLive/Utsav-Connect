import { z } from "zod";
import { jsonSuccess, errorToResponse } from "@/api/lib/http/responses";
import { submitApplication } from "@/api/services/application-service";
import { getEnv } from "@/api/lib/env/env";

export const dynamic = "force-dynamic";

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(12).max(128),
  phone: z.string().trim().min(10).max(20), // E.164 format validation could be stricter
  gender: z.enum(["male", "female"]),
  message: z.string().trim().max(500).optional(),
});

/**
 * POST /api/auth/register
 * Submit devotee application
 */
export async function POST(request) {
  try {
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

    return jsonSuccess({
      message: "Application submitted successfully. Please check your email to verify your account.",
      userId: result.userId,
      // Include token in dev for testing
      ...(env.NODE_ENV === "development" && { verificationToken: result.verificationToken }),
    }, { status: 201 });

  } catch (error) {
    return errorToResponse(error);
  }
}
