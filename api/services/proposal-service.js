import "server-only";
import { LocalityProposal } from "../models/locality-proposal.js";
import { Area } from "../models/area.js";
import { AuditLog } from "../models/audit-log.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/http/errors.js";
import { hasPermission, ADMIN_PERMISSIONS } from "../lib/auth/permissions.js";
import { detectDuplicates, normalizeName } from "./area-service.js";

/**
 * Submit a new locality proposal (Devotee or Admin).
 */
export async function createProposal(user, data) {
  if (!user) {
    throw new ForbiddenError("Authentication required to submit proposals");
  }

  await connectToDatabase();

  const normalized = normalizeName(data.name);

  // Run duplicate detection against existing official areas
  const duplicates = await detectDuplicates({
    name: data.name,
    placeId: data.placeId,
    parentId: data.parentId,
    location: data.location,
  });

  const proposal = await LocalityProposal.create({
    name: data.name.trim(),
    normalizedName: normalized,
    type: data.type?.trim() || "Locality",
    parentId: data.parentId || null,
    placeId: data.placeId?.trim() || undefined,
    formattedAddress: data.formattedAddress?.trim() || undefined,
    location: data.location || undefined,
    boundary: data.boundary || undefined,
    status: "pending",
    duplicates,
    proposedBy: user._id,
    proposerName: user.fullName,
    proposerEmail: user.email,
    notes: data.notes?.trim() || undefined,
  });

  await AuditLog.create({
    eventType: "proposal.created",
    actorId: user._id,
    actorRole: user.role,
    targetId: proposal._id,
    targetType: "LocalityProposal",
    metadata: {
      name: proposal.name,
      duplicatesFound: duplicates.length,
    },
  });

  return proposal;
}

/**
 * List proposals.
 * Admins see all matching proposals; Devotees see only their own proposals.
 */
export async function listProposals(user, options = {}) {
  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  await connectToDatabase();

  const isAdmin =
    user.role === "super_admin" ||
    hasPermission(user, ADMIN_PERMISSIONS.PROPOSAL_REVIEW) ||
    hasPermission(user, ADMIN_PERMISSIONS.AREA_MANAGE);

  const query = {};
  if (!isAdmin) {
    query.proposedBy = user._id;
  }

  if (options.status) {
    query.status = options.status;
  }

  const proposals = await LocalityProposal.find(query)
    .populate("parentId", "name type")
    .sort({ createdAt: -1 })
    .lean();

  return proposals;
}

/**
 * Get proposal details.
 */
export async function getProposalById(user, id) {
  if (!user) {
    throw new ForbiddenError("Authentication required");
  }

  await connectToDatabase();

  const proposal = await LocalityProposal.findById(id).populate("parentId", "name type").lean();
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }

  const isAdmin =
    user.role === "super_admin" ||
    hasPermission(user, ADMIN_PERMISSIONS.PROPOSAL_REVIEW) ||
    hasPermission(user, ADMIN_PERMISSIONS.AREA_MANAGE);
  if (!isAdmin && proposal.proposedBy.toString() !== user._id.toString()) {
    throw new ForbiddenError("Permission denied: cannot access another devotee's proposal");
  }

  return proposal;
}

/**
 * Admin: Review and approve/reject/request correction on a proposal.
 * If approved: creates official Area record in areas collection.
 * Duplicate detection results are reviewed, but never automatically merged or deleted.
 */
export async function reviewProposal(admin, id, reviewData) {
  const isAdmin =
    admin?.role === "super_admin" ||
    hasPermission(admin, ADMIN_PERMISSIONS.PROPOSAL_REVIEW) ||
    hasPermission(admin, ADMIN_PERMISSIONS.AREA_MANAGE);
  if (!isAdmin) {
    throw new ForbiddenError("Permission denied: proposal review requires admin permissions");
  }

  await connectToDatabase();

  const proposal = await LocalityProposal.findById(id);
  if (!proposal) {
    throw new NotFoundError("Proposal not found");
  }

  if (proposal.status === "approved") {
    throw new ConflictError("Proposal has already been approved");
  }

  const { status, reviewNotes, correctionNotes, customName, customType, customParentId } = reviewData;

  let createdArea = null;

  if (status === "approved") {
    const areaName = (customName || proposal.name).trim();
    const areaType = (customType || proposal.type || "Locality").trim();
    const parentId = customParentId !== undefined ? customParentId : proposal.parentId;

    let ancestorIds = [];
    if (parentId) {
      const parent = await Area.findById(parentId);
      if (parent) {
        ancestorIds = [...(parent.ancestorIds || []), parent._id];
      }
    }

    // Create official Area
    createdArea = await Area.create({
      name: areaName,
      normalizedName: normalizeName(areaName),
      type: areaType,
      parentId: parentId || null,
      ancestorIds,
      placeId: proposal.placeId,
      formattedAddress: proposal.formattedAddress,
      location: proposal.location,
      boundary: proposal.boundary,
      status: "approved",
      notes: proposal.notes,
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    proposal.status = "approved";
    proposal.approvedAreaId = createdArea._id;
  } else if (status === "needs_correction") {
    proposal.status = "needs_correction";
    proposal.correctionNotes = correctionNotes?.trim() || reviewNotes?.trim();
  } else if (status === "duplicate") {
    proposal.status = "duplicate";
  } else if (status === "rejected") {
    proposal.status = "rejected";
  } else {
    throw new ConflictError("Invalid proposal review status");
  }

  proposal.reviewedBy = admin._id;
  proposal.reviewedAt = new Date();
  if (reviewNotes) proposal.reviewNotes = reviewNotes.trim();

  await proposal.save();

  await AuditLog.create({
    eventType: `proposal.${status}`,
    actorId: admin._id,
    actorRole: admin.role,
    targetId: proposal._id,
    targetType: "LocalityProposal",
    metadata: {
      status,
      createdAreaId: createdArea?._id,
      proposalName: proposal.name,
    },
  });

  return { proposal, createdArea };
}
