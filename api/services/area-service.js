import "server-only";
import { Area } from "../models/area.js";
import { AuditLog } from "../models/audit-log.js";
import { connectToDatabase } from "../lib/mongodb/connection.js";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/http/errors.js";
import { hasPermission, ADMIN_PERMISSIONS } from "../lib/auth/permissions.js";

export function normalizeName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ");
}

function calculateDistanceMeters(coord1, coord2) {
  if (!coord1 || !coord2) return Infinity;
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function detectDuplicates({
  name,
  placeId,
  parentId = null,
  location = null,
  excludeAreaId = null,
}) {
  await connectToDatabase();

  const duplicates = [];
  const normalized = normalizeName(name);

  if (placeId && placeId.trim()) {
    const placeMatches = await Area.find({
      placeId: placeId.trim(),
      ...(excludeAreaId && { _id: { $ne: excludeAreaId } }),
    }).lean();

    for (const match of placeMatches) {
      duplicates.push({
        areaId: match._id,
        areaName: match.name,
        reason: "Identical Google Maps Place ID (" + placeId.trim() + ")",
        confidence: "high",
      });
    }
  }

  const sameParentMatches = await Area.find({
    normalizedName: normalized,
    parentId: parentId || null,
    ...(excludeAreaId && { _id: { $ne: excludeAreaId } }),
  }).lean();

  for (const match of sameParentMatches) {
    if (!duplicates.some((d) => d.areaId.toString() === match._id.toString())) {
      duplicates.push({
        areaId: match._id,
        areaName: match.name,
        reason: parentId
          ? "Identical name under the same parent area"
          : "Identical top-level area name",
        confidence: "high",
      });
    }
  }

  const anyNameMatches = await Area.find({
    normalizedName: normalized,
    ...(excludeAreaId && { _id: { $ne: excludeAreaId } }),
  }).lean();

  for (const match of anyNameMatches) {
    if (!duplicates.some((d) => d.areaId.toString() === match._id.toString())) {
      duplicates.push({
        areaId: match._id,
        areaName: match.name,
        reason: "Same area name under a different parent hierarchy",
        confidence: "medium",
      });
    }
  }

  if (location?.coordinates) {
    const allApproved = await Area.find({
      status: "approved",
      location: { $exists: true },
      ...(excludeAreaId && { _id: { $ne: excludeAreaId } }),
    }).lean();

    for (const match of allApproved) {
      if (match.location?.coordinates) {
        const dist = calculateDistanceMeters(location.coordinates, match.location.coordinates);
        if (dist <= 350) {
          if (!duplicates.some((d) => d.areaId.toString() === match._id.toString())) {
            duplicates.push({
              areaId: match._id,
              areaName: match.name,
              reason: "Geographic proximity within " + Math.round(dist) + "m",
              confidence: dist < 100 ? "high" : "medium",
            });
          }
        }
      }
    }
  }

  return duplicates;
}

export async function listApprovedAreas(options = {}) {
  await connectToDatabase();

  const query = { status: "approved" };

  if (options.search) {
    query.$or = [
      { name: new RegExp(options.search, "i") },
      { formattedAddress: new RegExp(options.search, "i") },
    ];
  }
  if (options.parentId !== undefined) {
    query.parentId = options.parentId ? options.parentId : null;
  }
  if (options.type) {
    query.type = options.type;
  }

  const areas = await Area.find(query)
    .select("-notes -createdBy -updatedBy")
    .populate("parentId", "name type code")
    .sort({ name: 1 })
    .lean();

  return areas;
}

export async function listAdminAreas(admin, options = {}) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.AREA_MANAGE) && admin?.role !== "super_admin") {
    throw new ForbiddenError("Permission denied: area:manage required");
  }

  await connectToDatabase();

  const query = {};
  if (options.search) {
    query.$or = [
      { name: new RegExp(options.search, "i") },
      { code: new RegExp(options.search, "i") },
      { formattedAddress: new RegExp(options.search, "i") },
    ];
  }
  if (options.status) {
    query.status = options.status;
  }

  const areas = await Area.find(query)
    .populate("parentId", "name type code")
    .sort({ createdAt: -1 })
    .lean();

  return areas;
}

export async function getAreaById(id, options = {}) {
  await connectToDatabase();

  const query = { _id: id };
  let projection = "";
  if (!options.includeUnapproved) {
    query.status = "approved";
    projection = "-notes -createdBy -updatedBy";
  }

  const area = await Area.findOne(query)
    .select(projection)
    .populate("parentId", "name type code")
    .lean();
  if (!area) {
    throw new NotFoundError("Area not found");
  }
  return area;
}

export async function createArea(admin, data) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.AREA_MANAGE) && admin?.role !== "super_admin") {
    throw new ForbiddenError("Permission denied: area:manage required");
  }

  await connectToDatabase();

  const normalized = normalizeName(data.name);

  let ancestorIds = [];
  if (data.parentId) {
    const parent = await Area.findById(data.parentId);
    if (!parent) {
      throw new NotFoundError("Parent area not found");
    }
    ancestorIds = [...(parent.ancestorIds || []), parent._id];
  }

  const duplicates = await detectDuplicates({
    name: data.name,
    placeId: data.placeId,
    parentId: data.parentId || null,
    location: data.location,
  });

  const area = await Area.create({
    name: data.name.trim(),
    normalizedName: normalized,
    type: data.type?.trim() || "Locality",
    code: data.code?.trim() || undefined,
    parentId: data.parentId || null,
    ancestorIds,
    placeId: data.placeId?.trim() || undefined,
    formattedAddress: data.formattedAddress?.trim() || undefined,
    location: data.location || undefined,
    boundary: data.boundary || undefined,
    populationEstimate: data.populationEstimate || 0,
    notes: data.notes?.trim() || undefined,
    status: "approved",
    createdBy: admin._id,
    updatedBy: admin._id,
  });

  await AuditLog.create({
    eventType: "area.created",
    actorId: admin._id,
    actorRole: admin.role,
    targetId: area._id,
    targetType: "Area",
    metadata: {
      name: area.name,
      type: area.type,
      parentId: area.parentId,
      duplicatesFound: duplicates.length,
    },
  });

  return { area, duplicates };
}

export async function updateArea(admin, id, data) {
  if (!hasPermission(admin, ADMIN_PERMISSIONS.AREA_MANAGE) && admin?.role !== "super_admin") {
    throw new ForbiddenError("Permission denied: area:manage required");
  }

  await connectToDatabase();

  const area = await Area.findById(id);
  if (!area) {
    throw new NotFoundError("Area not found");
  }

  if (data.parentId !== undefined && data.parentId !== (area.parentId?.toString() || null)) {
    if (data.parentId) {
      if (data.parentId === id) {
        throw new ConflictError("An area cannot be its own parent");
      }
      const newParent = await Area.findById(data.parentId);
      if (!newParent) {
        throw new ConflictError("Selected parent area does not exist");
      }
      if (newParent.ancestorIds?.some((ancId) => ancId.toString() === id)) {
        throw new ConflictError("Cannot set parent: this would create a circular hierarchy");
      }
      area.parentId = newParent._id;
      area.ancestorIds = [...(newParent.ancestorIds || []), newParent._id];
    } else {
      area.parentId = null;
      area.ancestorIds = [];
    }
  }

  if (data.name !== undefined) {
    area.name = data.name.trim();
    area.normalizedName = normalizeName(data.name);
  }
  if (data.type !== undefined) area.type = data.type.trim();
  if (data.code !== undefined) area.code = data.code.trim();
  if (data.placeId !== undefined) area.placeId = data.placeId.trim() || undefined;
  if (data.formattedAddress !== undefined)
    area.formattedAddress = data.formattedAddress.trim() || undefined;
  if (data.location !== undefined) area.location = data.location;
  if (data.boundary !== undefined) area.boundary = data.boundary;
  if (data.populationEstimate !== undefined) area.populationEstimate = data.populationEstimate;
  if (data.notes !== undefined) area.notes = data.notes.trim() || undefined;
  if (data.status !== undefined) area.status = data.status;

  area.updatedBy = admin._id;
  await area.save();

  await AuditLog.create({
    eventType: "area.updated",
    actorId: admin._id,
    actorRole: admin.role,
    targetId: area._id,
    targetType: "Area",
    metadata: { name: area.name, status: area.status },
  });

  return area;
}

export async function archiveArea(admin, id) {
  return updateArea(admin, id, { status: "archived" });
}

export function buildAreaTree(areas) {
  const map = new Map();
  const roots = [];

  for (const area of areas) {
    map.set(area._id.toString(), { ...area, children: [] });
  }

  for (const area of areas) {
    const node = map.get(area._id.toString());
    const parentKey = area.parentId?._id?.toString() || area.parentId?.toString();

    if (parentKey && map.has(parentKey)) {
      map.get(parentKey).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
