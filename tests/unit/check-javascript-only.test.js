import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findForbiddenFiles, isForbiddenFile } from "../../scripts/check-javascript-only.js";

describe("isForbiddenFile", () => {
  it.each([
    "a.ts",
    "b.tsx",
    "c.mts",
    "d.cts",
    "types.d.ts",
    "next-env.d.ts",
    "tsconfig.json",
    "tsconfig.build.json",
  ])("flags %s", (name) => {
    expect(isForbiddenFile(name)).toBe(true);
  });

  it.each(["a.js", "b.jsx", "c.mjs", "d.cjs", "jsconfig.json", "notes.md", "styles.css"])(
    "allows %s",
    (name) => {
      expect(isForbiddenFile(name)).toBe(false);
    },
  );
});

describe("findForbiddenFiles", () => {
  // Scratch space lives inside the repository (.local/ is git-ignored).
  const scratchRoot = path.resolve(process.cwd(), ".local", "test-scratch");
  let fixture;

  beforeEach(() => {
    mkdirSync(scratchRoot, { recursive: true });
    fixture = mkdtempSync(path.join(scratchRoot, "js-only-"));
  });

  afterEach(() => {
    rmSync(fixture, { recursive: true, force: true });
  });

  it("returns an empty list for a JavaScript-only tree", () => {
    mkdirSync(path.join(fixture, "app"));
    writeFileSync(path.join(fixture, "app", "page.jsx"), "export default () => null;\n");
    writeFileSync(path.join(fixture, "jsconfig.json"), "{}\n");
    expect(findForbiddenFiles(fixture)).toEqual([]);
  });

  it("reports TypeScript files and configuration with relative paths", () => {
    mkdirSync(path.join(fixture, "lib"), { recursive: true });
    writeFileSync(path.join(fixture, "lib", "util.ts"), "");
    writeFileSync(path.join(fixture, "tsconfig.json"), "{}");
    writeFileSync(path.join(fixture, "next-env.d.ts"), "");
    expect(findForbiddenFiles(fixture)).toEqual(["lib/util.ts", "next-env.d.ts", "tsconfig.json"]);
  });

  it("ignores node_modules and build output", () => {
    mkdirSync(path.join(fixture, "node_modules", "pkg"), { recursive: true });
    writeFileSync(path.join(fixture, "node_modules", "pkg", "index.d.ts"), "");
    mkdirSync(path.join(fixture, ".next"), { recursive: true });
    writeFileSync(path.join(fixture, ".next", "types.ts"), "");
    expect(findForbiddenFiles(fixture)).toEqual([]);
  });
});
