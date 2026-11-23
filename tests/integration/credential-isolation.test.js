import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getCredentialRegistryDir, getDevMailDir } from "@/api/lib/paths/local-artifacts.js";
import { writeCredentialRecord } from "@/api/lib/auth/credential-registry-writer.js";
import {
  isInsideTestRuns,
  registryDifference,
  snapshotRealRegistry,
  withIsolatedWorkspace,
} from "../helpers/local-workspace.js";

describe("automated-test credential isolation", () => {
  it("runs with an isolated local-data workspace by default", () => {
    expect(process.env.UTSAV_LOCAL_DIR).toBeTruthy();
    expect(isInsideTestRuns(process.env.UTSAV_LOCAL_DIR)).toBe(true);
    expect(isInsideTestRuns(getCredentialRegistryDir())).toBe(true);
    expect(isInsideTestRuns(getDevMailDir())).toBe(true);
    expect(getCredentialRegistryDir()).not.toBe(join(process.cwd(), ".local", "test-users"));
  });

  it("keeps the real registry unchanged while writing test credentials", async () => {
    const before = snapshotRealRegistry();
    await withIsolatedWorkspace("integration-write", async (workspace) => {
      const result = writeCredentialRecord({
        role: "devotee",
        fullName: "Isolation Check Devotee",
        email: "isolation-check@example.com",
        phone: "+919876543999",
        gender: "male",
        status: "active",
        creationSource: "test-isolation-check",
        mongoId: `507f1f77bcf86cd79999${Date.now().toString().slice(-4)}`,
        allowPassword: false,
      });
      expect(result.written).toBe(true);
      expect(existsSync(result.filePath)).toBe(true);
      expect(result.filePath.startsWith(workspace)).toBe(true);
      expect(getCredentialRegistryDir().startsWith(workspace)).toBe(true);
    });
    expect(registryDifference(before, snapshotRealRegistry())).toBeNull();
  });

  it("keeps parallel workspaces independent", async () => {
    const before = snapshotRealRegistry();
    const ids = [];
    await Promise.all([
      withIsolatedWorkspace("parallel-write-a", async (workspace) => {
        const result = writeCredentialRecord({
          role: "admin",
          fullName: "Parallel A",
          email: "parallel-a@example.com",
          phone: "+919876543991",
          gender: "male",
          status: "active",
          creationSource: "test-isolation-check",
          mongoId: "507f1f77bcf86cd79999111",
          allowPassword: false,
        });
        ids.push({ workspace, file: result.filePath });
      }),
      withIsolatedWorkspace("parallel-write-b", async (workspace) => {
        const result = writeCredentialRecord({
          role: "admin",
          fullName: "Parallel B",
          email: "parallel-b@example.com",
          phone: "+919876543992",
          gender: "male",
          status: "active",
          creationSource: "test-isolation-check",
          mongoId: "507f1f77bcf86cd79999222",
          allowPassword: false,
        });
        ids.push({ workspace, file: result.filePath });
      }),
    ]);
    expect(ids).toHaveLength(2);
    expect(ids[0].workspace).not.toBe(ids[1].workspace);
    expect(ids[0].file.startsWith(ids[0].workspace)).toBe(true);
    expect(ids[1].file.startsWith(ids[1].workspace)).toBe(true);
    expect(ids[0].file.startsWith(ids[1].workspace)).toBe(false);
    expect(registryDifference(before, snapshotRealRegistry())).toBeNull();
  });
});
