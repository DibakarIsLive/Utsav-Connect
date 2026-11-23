import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isolatedLocalDir } from "../helpers/local-workspace.js";
import { join } from "node:path";
import { mkdirSync, rmSync, chmodSync } from "node:fs";

/**
 * Regression tests for D5: the account update route must synchronize the local
 * credential registry on a genuine status change, must not fail the already
 * committed MongoDB update when the registry write fails, and must never write
 * secrets to logs. MongoDB is mocked; the registry uses an isolated temp dir.
 */
const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  countDocuments: vi.fn().mockResolvedValue(2),
  sessionDeleteMany: vi.fn(),
  auditCreate: vi.fn(),
  connect: vi.fn(),
  requireSuperAdmin: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  warn: vi.fn(),
}));

const actor = { _id: { toString: () => "actor-id" }, role: "super_admin" };
const MONGO_ID = "507f1f77bcf86cd799439099";
const TEST_DIR = isolatedLocalDir("registry-sync");
const ORIGINAL_CWD = process.cwd();

vi.mock("@/api/models/user.js", () => ({
  User: { findById: mocks.findById, countDocuments: mocks.countDocuments },
}));
vi.mock("@/api/models/session.js", () => ({ Session: { deleteMany: mocks.sessionDeleteMany } }));
vi.mock("@/api/models/audit-log.js", () => ({ AuditLog: { create: mocks.auditCreate } }));
vi.mock("@/api/lib/mongodb/connection.js", () => ({
  connectToDatabase: mocks.connect,
  disconnectFromDatabase: vi.fn(),
}));
vi.mock("@/api/lib/auth/guards.js", () => ({ requireSuperAdmin: mocks.requireSuperAdmin }));
vi.mock("@/api/lib/http/origin.js", () => ({ assertTrustedOrigin: mocks.assertTrustedOrigin }));
vi.mock("@/api/lib/logging/logger.js", () => ({
  logger: { warn: mocks.warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { PATCH } from "@/app/api/admin/users/[id]/route.js";
import {
  writeCredentialRecord,
  findCredentialRecord,
} from "@/api/lib/auth/credential-registry-writer.js";

function makeTarget(status = "active") {
  return {
    _id: { toString: () => MONGO_ID },
    email: "fixture@example.com",
    role: "devotee",
    status,
    adminPermissions: undefined,
    emailVerified: true,
    save: vi.fn().mockResolvedValue(undefined),
    toObject() {
      return {
        _id: this._id,
        email: this.email,
        role: this.role,
        status: this.status,
        emailVerified: this.emailVerified,
      };
    },
  };
}

function seedRegistry(status) {
  return writeCredentialRecord({
    role: "devotee",
    fullName: "Registry Fixture",
    email: "fixture@example.com",
    phone: "+919876543299",
    gender: "male",
    status,
    creationSource: "test-fixture",
    mongoId: MONGO_ID,
    password: undefined,
    allowPassword: false,
  });
}

function makeRequest(status) {
  const body =
    status === undefined
      ? { role: "devotee" }
      : { status, reason: "Registry sync test status change" };
  return new Request(`http://localhost:3000/api/admin/users/${MONGO_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin account update synchronizes credential registry status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue(undefined);
    mocks.requireSuperAdmin.mockResolvedValue(actor);
    mocks.assertTrustedOrigin.mockReturnValue(undefined);
    mocks.sessionDeleteMany.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
    try {
      chmodSync(join(TEST_DIR, ".local", "test-users"), 0o700);
    } catch {}
    process.chdir(ORIGINAL_CWD);
    delete process.env.UTSAV_LOCAL_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.UTSAV_LOCAL_DIR = TEST_DIR;
    process.chdir(TEST_DIR);
  });

  afterAll(() => {
    process.chdir(ORIGINAL_CWD);
    delete process.env.UTSAV_LOCAL_DIR;
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("synchronizes a genuine active -> suspended status change", async () => {
    expect(seedRegistry("active").written).toBe(true);
    const target = makeTarget("active");
    mocks.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(target) });

    const response = await PATCH(makeRequest("suspended"), {
      params: Promise.resolve({ id: MONGO_ID }),
    });

    expect(response.status).toBe(200);
    expect(target.save).toHaveBeenCalledTimes(1);
    expect(target.status).toBe("suspended");
    expect(findCredentialRecord(MONGO_ID).status).toBe("suspended");
    expect(mocks.sessionDeleteMany).toHaveBeenCalledWith({ userId: target._id });
  });

  it("does not rewrite the registry when the status is unchanged", async () => {
    expect(seedRegistry("suspended").written).toBe(true);
    const target = makeTarget("suspended");
    mocks.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(target) });

    const response = await PATCH(makeRequest("suspended"), {
      params: Promise.resolve({ id: MONGO_ID }),
    });

    expect(response.status).toBe(200);
    expect(findCredentialRecord(MONGO_ID).status).toBe("suspended");
    const body = await response.json();
    expect(body.data.user.status).toBe("suspended");
  });

  it("succeeds when the registry file is missing (MongoDB remains authoritative)", async () => {
    const target = makeTarget("active");
    mocks.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(target) });

    const response = await PATCH(makeRequest("suspended"), {
      params: Promise.resolve({ id: MONGO_ID }),
    });

    expect(response.status).toBe(200);
    expect(findCredentialRecord(MONGO_ID)).toBeNull();
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });

  it("does not roll back MongoDB when the registry write fails", async () => {
    expect(seedRegistry("active").written).toBe(true);
    const registryDir = join(TEST_DIR, ".local", "test-users");
    chmodSync(registryDir, 0o500);
    const target = makeTarget("active");
    mocks.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(target) });

    try {
      const response = await PATCH(makeRequest("suspended"), {
        params: Promise.resolve({ id: MONGO_ID }),
      });
      expect(response.status).toBe(200);
      expect(target.save).toHaveBeenCalledTimes(1);
      expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
    } finally {
      chmodSync(registryDir, 0o700);
    }
  });

  it("does not touch the registry when the MongoDB update fails", async () => {
    expect(seedRegistry("active").written).toBe(true);
    const target = makeTarget("active");
    target.save.mockRejectedValue(new Error("simulated mongo failure"));
    mocks.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(target) });

    const response = await PATCH(makeRequest("suspended"), {
      params: Promise.resolve({ id: MONGO_ID }),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(findCredentialRecord(MONGO_ID).status).toBe("active");
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.sessionDeleteMany).not.toHaveBeenCalled();
  });

  it("never writes passwords or secrets to logger calls", async () => {
    expect(seedRegistry("active").written).toBe(true);
    const target = makeTarget("active");
    mocks.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(target) });

    await PATCH(makeRequest("suspended"), { params: Promise.resolve({ id: MONGO_ID }) });

    const logged = JSON.stringify(mocks.warn.mock.calls);
    expect(logged).not.toMatch(/password|token|secret/i);
  });
});
