import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/api/lib/env/env";
import { connectToDatabase, disconnectFromDatabase } from "@/api/lib/mongodb/connection";
import { TEST_DB_URI, databaseSuiteGate } from "../helpers/database.js";
import { User } from "@/api/models/user.js";
import { Area } from "@/api/models/area.js";
import { AuditLog } from "@/api/models/audit-log.js";
import { Session } from "@/api/models/session.js";
import {
  listApprovedAreas,
  listAdminAreas,
  getAreaById,
  createArea,
  updateArea,
  archiveArea,
  detectDuplicates,
  normalizeName,
} from "@/api/services/area-service.js";
import { hashPassword } from "@/api/lib/auth/password.js";

const gate = await databaseSuiteGate("area-workflow");

describe.skipIf(gate.skip)("Area workflow - geographic data management", () => {
  const originalUri = process.env.MONGODB_URI;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let superAdminUser, areaAdminUser, readOnlyAdminUser, devoteeUser;
  const createdAreaIds = [];
  const createdUserIds = [];

  async function makeUser(overrides) {
    const user = await User.create({
      phone: "+919876543220",
      gender: "male",
      passwordHash: await hashPassword("TestPassword123!"),
      status: "active",
      emailVerified: true,
      ...overrides,
    });
    createdUserIds.push(user._id);
    return user;
  }

  function createTestArea(admin, name, extra = {}) {
    return createArea(admin, {
      name,
      type: "Locality",
      code: `T-${runId.slice(-6)}-${createdAreaIds.length + 1}`,
      populationEstimate: 10_000,
      ...extra,
    }).then((result) => {
      createdAreaIds.push(result.area._id);
      return result;
    });
  }

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    resetEnvCache();
    await connectToDatabase({ uri: TEST_DB_URI });

    superAdminUser = await makeUser({
      email: `superadmin-area-${runId}@example.com`,
      fullName: "Super Admin Test",
      role: "super_admin",
    });

    areaAdminUser = await makeUser({
      email: `area-admin-${runId}@example.com`,
      fullName: "Area Admin Test",
      gender: "female",
      phone: "+919876543221",
      role: "admin",
      adminPermissions: ["area:manage", "proposal:review"],
    });

    readOnlyAdminUser = await makeUser({
      email: `readonly-admin-${runId}@example.com`,
      fullName: "Read Only Admin Test",
      phone: "+919876543223",
      role: "admin",
      adminPermissions: ["application:read:all"],
    });

    devoteeUser = await makeUser({
      email: `devotee-area-${runId}@example.com`,
      fullName: "Devotee Test",
      phone: "+919876543222",
      role: "devotee",
    });
  });

  afterAll(async () => {
    if (createdAreaIds.length > 0) {
      await Area.deleteMany({ _id: { $in: createdAreaIds } });
      await AuditLog.deleteMany({ targetId: { $in: createdAreaIds } });
    }
    if (createdUserIds.length > 0) {
      await Session.deleteMany({ userId: { $in: createdUserIds } });
      await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectFromDatabase();
    process.env.MONGODB_URI = originalUri;
    resetEnvCache();
  });

  it("normalises names consistently for duplicate detection", () => {
    expect(normalizeName("  Kulti, Golf-Ground! ")).toBe("kulti golfground");
  });

  it("creates an approved area with all fields and an audit event", async () => {
    const code = `TLA-${runId.slice(-6)}`;
    const { area, duplicates } = await createArea(superAdminUser, {
      name: "Test Locality Alpha",
      type: "Locality",
      code,
      parentId: null,
      formattedAddress: "Test Locality Alpha, Test City, Test State",
      location: { type: "Point", coordinates: [77.209, 28.6139] },
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [77.208, 28.6129],
            [77.21, 28.6129],
            [77.21, 28.6149],
            [77.208, 28.6149],
            [77.208, 28.6129],
          ],
        ],
      },
      populationEstimate: 50000,
      notes: "Test area for integration testing.",
    });
    createdAreaIds.push(area._id);

    expect(area.name).toBe("Test Locality Alpha");
    expect(area.type).toBe("Locality");
    expect(area.code).toBe(code.toUpperCase());
    expect(area.status).toBe("approved");
    expect(area.location.coordinates).toEqual([77.209, 28.6139]);
    expect(area.populationEstimate).toBe(50000);
    expect(Array.isArray(duplicates)).toBe(true);

    const audit = await AuditLog.findOne({
      eventType: "area.created",
      targetId: area._id,
    }).lean();
    expect(audit).not.toBeNull();
    expect(audit.actorId.toString()).toBe(superAdminUser._id.toString());
  });

  it("rejects a parent that does not exist or is not approved", async () => {
    await expect(
      createArea(superAdminUser, {
        name: "Orphan Locality",
        parentId: "000000000000000000000000",
      }),
    ).rejects.toThrow(/Parent area not found/);
  });

  it("refuses to create a circular hierarchy", async () => {
    const parent = await createTestArea(superAdminUser, "Hierarchy Parent", { type: "Region" });
    const child = await createTestArea(superAdminUser, "Hierarchy Child", {
      parentId: parent.area._id,
    });

    await expect(
      updateArea(superAdminUser, parent.area._id, { parentId: child.area._id }),
    ).rejects.toThrow(/circular hierarchy/);

    const fetchedChild = await getAreaById(child.area._id);
    expect(fetchedChild.parentId._id.toString()).toBe(parent.area._id.toString());
    expect(fetchedChild.parentId.name).toBe("Hierarchy Parent");
    expect(fetchedChild.parentId.type).toBe("Region");
  });

  it("shows only approved areas publicly and hides internal fields", async () => {
    const visible = await createTestArea(superAdminUser, "Public Visible Area", {
      notes: "Internal note that must not leak",
    });
    const archived = await createTestArea(superAdminUser, "Public Archived Area");
    await archiveArea(superAdminUser, archived.area._id);

    const areas = await listApprovedAreas({ search: "Public" });
    const names = areas.map((area) => area.name);
    expect(names).toContain("Public Visible Area");
    expect(names).not.toContain("Public Archived Area");

    const found = areas.find((area) => area._id.toString() === visible.area._id.toString());
    expect(found).toBeDefined();
    expect(found.notes).toBeUndefined();
    expect(found.createdBy).toBeUndefined();
    expect(found.updatedBy).toBeUndefined();
  });

  it("supports search without treating user input as a regular expression", async () => {
    const result = await listApprovedAreas({ search: "Public Visible (.*" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("rejects public reads of archived areas", async () => {
    const archived = await createTestArea(superAdminUser, "Archived Detail Area");
    await archiveArea(superAdminUser, archived.area._id);

    await expect(getAreaById(archived.area._id)).rejects.toThrow(/not found/i);
    const internal = await getAreaById(archived.area._id, { includeUnapproved: true });
    expect(internal.status).toBe("archived");
  });

  it("detects duplicates by exact top-level name", async () => {
    await createTestArea(superAdminUser, "Duplicate Test Area");

    const duplicates = await detectDuplicates({
      name: "Duplicate Test Area",
      parentId: null,
    });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].reason).toMatch(/Identical top-level area name/);
    expect(duplicates[0].confidence).toBe("high");
  });

  it("detects duplicates by geographic proximity", async () => {
    await createTestArea(superAdminUser, "Original Proximity Area", {
      location: { type: "Point", coordinates: [77.209, 28.6139] },
    });

    const duplicates = await detectDuplicates({
      name: "Nearby Different Name",
      location: { type: "Point", coordinates: [77.2091, 28.614] },
    });
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].reason).toMatch(/Geographic proximity/);
    expect(duplicates[0].confidence).toBe("high");
  });

  it("lists unapproved areas only for area managers", async () => {
    await expect(listAdminAreas(readOnlyAdminUser)).rejects.toThrow(/area:manage/);
    await expect(listAdminAreas(devoteeUser)).rejects.toThrow(/area:manage/);

    const adminAreas = await listAdminAreas(areaAdminUser, { search: "Test Locality Alpha" });
    expect(adminAreas.some((area) => area.name === "Test Locality Alpha")).toBe(true);

    const superAdminAreas = await listAdminAreas(superAdminUser, { search: "Test Locality Alpha" });
    expect(superAdminAreas.some((area) => area.name === "Test Locality Alpha")).toBe(true);
  });

  it("requires area:manage for create, update and archive", async () => {
    await expect(
      createArea(devoteeUser, {
        name: "Devotee Area",
        type: "Locality",
      }),
    ).rejects.toThrow(/area:manage/);

    await expect(
      createArea(readOnlyAdminUser, {
        name: "Read Only Admin Area",
        type: "Locality",
      }),
    ).rejects.toThrow(/area:manage/);

    const owned = await createTestArea(superAdminUser, "Managed By Super Admin");
    await expect(
      updateArea(readOnlyAdminUser, owned.area._id, { name: "Hijacked Name" }),
    ).rejects.toThrow(/area:manage/);
    await expect(archiveArea(readOnlyAdminUser, owned.area._id)).rejects.toThrow(/area:manage/);

    const updated = await updateArea(areaAdminUser, owned.area._id, {
      name: "Managed By Area Admin",
      populationEstimate: 12345,
    });
    expect(updated.name).toBe("Managed By Area Admin");
    expect(updated.populationEstimate).toBe(12345);
  });

  it("archives an area as a soft delete", async () => {
    const { area } = await createTestArea(superAdminUser, "To Be Archived");

    const archived = await archiveArea(superAdminUser, area._id);
    expect(archived.status).toBe("archived");

    const publicAreas = await listApprovedAreas({ search: "To Be Archived" });
    expect(
      publicAreas.find((entry) => entry._id.toString() === area._id.toString()),
    ).toBeUndefined();

    const persisted = await Area.findById(area._id).lean();
    expect(persisted).not.toBeNull();
    expect(persisted.status).toBe("archived");
  });
});
