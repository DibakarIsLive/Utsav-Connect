import { z } from "zod";

/**
 * Zod validation schemas for Invitation Reports and Analytics.
 */

export const createReportSchema = z.object({
  areaId: z.string().trim().min(1, "Geographic area ID is required"),
  invitationCount: z.coerce
    .number()
    .int()
    .min(1, "Invitation count must be at least 1")
    .max(100000, "Invitation count seems excessively high"),
  reportDate: z
    .string()
    .trim()
    .min(1, "Report date is required")
    .refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional(),
});

export const reviewReportSchema = z.object({
  status: z.enum(["active", "flagged", "invalid"]),
  adminNotes: z.string().trim().max(1000, "Admin notes cannot exceed 1000 characters").optional(),
});
