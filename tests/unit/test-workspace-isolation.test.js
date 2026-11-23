import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TEST_RUNS_ROOT,
  createIsolatedLocalDir,
  ensureIsolatedWorkspace,
  isInsideTestRuns,
  removeIsolatedLocalDir,
  withIsolatedWorkspace,
} from "../helpers/local-workspace.js";

describe("test workspace isolation", () => {
  it("creates unique workspaces inside .local/test-runs/", () => {
    const a = createIsolatedLocalDir("unit-a");
    const b = createIsolatedLocalDir("unit-b");
    try {
      expect(a).not.toBe(b);
      expect(isInsideTestRuns(a)).toBe(true);
      expect(isInsideTestRuns(b)).toBe(true);
      expect(a.startsWith(TEST_RUNS_ROOT)).toBe(true);
      expect(existsSync(a)).toBe(true);
      expect(existsSync(b)).toBe(true);
    } finally {
      removeIsolatedLocalDir(a);
      removeIsolatedLocalDir(b);
    }
  });

  it("refuses to treat the real registry, repository root or external paths as workspaces", () => {
    const projectRoot = join(TEST_RUNS_ROOT, "..", "..");
    const candidates = [
      projectRoot,
      join(projectRoot, ".local", "test-users"),
      join(projectRoot, ".local"),
      TEST_RUNS_ROOT,
      join(TEST_RUNS_ROOT, "..", "Repo"),
      "/tmp/utsav-test",
      join(TEST_RUNS_ROOT, "one", "..", "..", "test-users"),
    ];
    for (const candidate of candidates) expect(isInsideTestRuns(candidate)).toBe(false);
  });

  it("refuses cleanup outside .local/test-runs/ without deleting anything", () => {
    const realRegistry = join(TEST_RUNS_ROOT, "..", "test-users");
    expect(() => removeIsolatedLocalDir(realRegistry)).toThrow(/outside .local\/test-runs/);
    expect(() => removeIsolatedLocalDir(TEST_RUNS_ROOT)).toThrow(/outside .local\/test-runs/);
    expect(() => removeIsolatedLocalDir("/tmp")).toThrow(/outside .local\/test-runs/);
  });

  it("does not let one run delete another run's workspace", () => {
    const a = createIsolatedLocalDir("parallel-a");
    const b = createIsolatedLocalDir("parallel-b");
    try {
      removeIsolatedLocalDir(a);
      expect(existsSync(a)).toBe(false);
      expect(existsSync(b)).toBe(true);
      expect(readdirSync(TEST_RUNS_ROOT).some((name) => name.startsWith("parallel-b-"))).toBe(true);
    } finally {
      if (existsSync(b)) removeIsolatedLocalDir(b);
    }
  });

  it("reuses only approved workspaces and creates a fresh one otherwise", () => {
    const approved = createIsolatedLocalDir("reuse");
    try {
      expect(ensureIsolatedWorkspace(approved, "fallback")).toBe(approved);
      const fallback = ensureIsolatedWorkspace(
        join(TEST_RUNS_ROOT, "..", "test-users"),
        "fallback",
      );
      try {
        expect(fallback).not.toBe(join(TEST_RUNS_ROOT, "..", "test-users"));
        expect(isInsideTestRuns(fallback)).toBe(true);
      } finally {
        removeIsolatedLocalDir(fallback);
      }
    } finally {
      removeIsolatedLocalDir(approved);
    }
  });

  it("cleans up even when the test body throws", async () => {
    let path;
    await expect(
      withIsolatedWorkspace("failure", async (workspace) => {
        path = workspace;
        expect(existsSync(workspace)).toBe(true);
        throw new Error("simulated test failure");
      }),
    ).rejects.toThrow(/simulated test failure/);
    expect(existsSync(path)).toBe(false);
  });
});
