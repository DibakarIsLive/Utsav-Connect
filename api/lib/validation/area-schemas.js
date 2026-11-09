import { z } from "zod";

/**
 * Zod validation schemas for Geographic Areas and Locality Proposals.
 */

// GeoJSON Point: [longitude, latitude]
export const pointSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z
    .tuple([
      z.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
      z.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
    ]),
});

// GeoJSON Polygon or MultiPolygon
export const boundarySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.any()).min(1, "At least one boundary ring is required"),
});

// Create Area Schema (Admin)
export const createAreaSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name must not exceed 120 characters"),
  type: z.string().trim().max(50).optional().default("Locality"),
  code: z.string().trim().max(30).optional(),
  parentId: z.string().trim().nullable().optional(),
  placeId: z.string().trim().max(255).optional(),
  formattedAddress: z.string().trim().max(500).optional(),
  location: pointSchema.optional(),
  boundary: boundarySchema.optional(),
  populationEstimate: z.coerce.number().int().min(0, "Population must be non-negative").optional().default(0),
  notes: z.string().trim().max(2000).optional(),
});

// Update Area Schema (Admin)
export const updateAreaSchema = createAreaSchema.partial().extend({
  status: z.enum(["approved", "archived"]).optional(),
});

// Create Proposal Schema (Devotee / Admin)
export const createProposalSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name must not exceed 120 characters"),
  type: z.string().trim().max(50).optional().default("Locality"),
  parentId: z.string().trim().nullable().optional(),
  placeId: z.string().trim().max(255).optional(),
  formattedAddress: z.string().trim().max(500).optional(),
  location: pointSchema.optional(),
  boundary: boundarySchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});

// Review Proposal Schema (Admin)
export const reviewProposalSchema = z.object({
  status: z.enum(["approved", "rejected", "needs_correction", "duplicate"]),
  reviewNotes: z.string().trim().max(2000).optional(),
  correctionNotes: z.string().trim().max(2000).optional(),
  customName: z.string().trim().min(2).max(120).optional(),
  customType: z.string().trim().max(50).optional(),
  customParentId: z.string().trim().nullable().optional(),
});
