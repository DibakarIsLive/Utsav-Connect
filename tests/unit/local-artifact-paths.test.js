import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resetEnvCache } from "@/api/lib/env/env";
import {
  findProjectRoot,
  getCredentialRegistryDir,
  getDevMailDir,
  getLocalPath,
  getProjectRoot,
} from "@/api/lib/paths/local-artifacts.js";
import { createTransport } from "@/api/lib/email/transport.js";
import { resetTransport } from "@/api/lib/email/adapter.js";
import { createIsolatedLocalDir, removeIsolatedLocalDir } from "../helpers/local-workspace.js";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PARENT_REPO = dirname(PROJECT_ROOT);
const ORIGINAL_CWD = process.cwd();

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  delete process.env.UTSAV_LOCAL_DIR;
  resetEnvCache();
  resetTransport();
});

describe("project-root anchored local artifacts", () => {
  it("resolves the project root independently of process.cwd()", () => {
    expect(getProjectRoot()).toBe(PROJECT_ROOT);
    expect(findProjectRoot(PARENT_REPO)).toBe(PROJECT_ROOT);
    expect(findProjectRoot(PROJECT_ROOT)).toBe(PROJECT_ROOT);
    expect(findProjectRoot(resolve(PROJECT_ROOT, "app", "api"))).toBe(PROJECT_ROOT);
  });

  it("returns the same paths from the project root and the parent Repo directory", () => {
    delete process.env.UTSAV_LOCAL_DIR;
    const script = `
      import { getProjectRoot, getDevMailDir, getCredentialRegistryDir } from ${JSON.stringify(
        resolve(PROJECT_ROOT, "api/lib/paths/local-artifacts.js"),
      )};
      console.log(JSON.stringify({
        root: getProjectRoot(),
        mail: getDevMailDir(),
        registry: getCredentialRegistryDir(),
      }));
    `;
    const read = (cwd) =>
      JSON.parse(
        execFileSync(process.execPath, ["--input-type=module", "-e", script], {
          cwd,
          encoding: "utf8",
        }).trim(),
      );

    expect(read(PROJECT_ROOT)).toEqual({
      root: PROJECT_ROOT,
      mail: join(PROJECT_ROOT, ".local", "mail"),
      registry: join(PROJECT_ROOT, ".local", "test-users"),
    });
    expect(read(PARENT_REPO)).toEqual(read(PROJECT_ROOT));
  });

  it("writes development mail into an isolated workspace even when launched from the parent", async () => {
    const workspace = createIsolatedLocalDir("path-mail");
    process.env.UTSAV_LOCAL_DIR = workspace;
    process.env.EMAIL_PROVIDER = "dev";
    resetEnvCache();
    resetTransport();

    const mailDir = getDevMailDir();
    expect(mailDir).toBe(join(workspace, ".local", "mail"));
    const parentMail = join(PARENT_REPO, ".local", "mail");
    const parentBefore = existsSync(parentMail) ? readdirSync(parentMail) : [];

    process.chdir(PARENT_REPO);
    const transport = await createTransport();
    const result = await transport.send({
      to: "path-regression@example.com",
      subject: "Path regression",
      text: "Anchored to the isolated test workspace",
    });
    expect(result.accepted).toBe(true);

    const written = readdirSync(mailDir);
    expect(written).toHaveLength(1);
    const content = readFileSync(join(mailDir, written[0]), "utf8");
    expect(content).toContain("To: path-regression@example.com");

    const parentAfter = existsSync(parentMail) ? readdirSync(parentMail) : [];
    expect(parentAfter).toEqual(parentBefore);
    removeIsolatedLocalDir(workspace);
  });

  it("keeps all local artifacts inside the git-ignored project .local directory", () => {
    delete process.env.UTSAV_LOCAL_DIR;
    expect(getLocalPath("mail")).toBe(join(PROJECT_ROOT, ".local", "mail"));
    expect(getCredentialRegistryDir()).toBe(join(PROJECT_ROOT, ".local", "test-users"));
    expect(getProjectRoot()).not.toBe(PARENT_REPO);
  });

  it("rejects traversal segments and absolute path segments", () => {
    expect(() => getLocalPath("..", "outside")).toThrow(
      /outside the approved directory|invalid local-data path segment/i,
    );
    expect(() => getLocalPath("/etc")).toThrow(/invalid local-data path segment/i);
    expect(() => getLocalPath("mail/../../Repo")).toThrow(/invalid local-data path segment/i);
    expect(() => getLocalPath("..\\Repo")).toThrow(/invalid local-data path segment/i);
  });

  it("rejects a UTSAV_LOCAL_DIR override outside the repository", () => {
    for (const outside of [PARENT_REPO, join(PARENT_REPO, "other-project"), "/tmp/utsav-evil"]) {
      process.env.UTSAV_LOCAL_DIR = outside;
      expect(() => getDevMailDir()).toThrow(/outside the Utsav-Connect repository/i);
      expect(() => getCredentialRegistryDir()).toThrow(/outside the Utsav-Connect repository/i);
    }
    delete process.env.UTSAV_LOCAL_DIR;
  });

  it("cannot redirect writes outside the repository from a different working directory", () => {
    const outsideMail = join(PARENT_REPO, ".local", "mail");
    const before = existsSync(outsideMail) ? readdirSync(outsideMail) : [];
    const script = `
      process.env.UTSAV_LOCAL_DIR = ${JSON.stringify(PARENT_REPO)};
      try {
        const { getDevMailDir } = await import(${JSON.stringify(
          resolve(PROJECT_ROOT, "api/lib/paths/local-artifacts.js"),
        )});
        getDevMailDir();
        console.log("NO_ERROR");
      } catch (error) {
        console.log("REFUSED");
      }
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: PARENT_REPO,
      encoding: "utf8",
    }).trim();
    expect(output).toBe("REFUSED");
    const after = existsSync(outsideMail) ? readdirSync(outsideMail) : [];
    expect(after).toEqual(before);
  });

  it("loads .env.local from the project root even when launched from another directory", () => {
    const script = `
      import { loadLocalEnvFile } from ${JSON.stringify(
        resolve(PROJECT_ROOT, "scripts/lib/load-env-file.js"),
      )};
      console.log(loadLocalEnvFile() ? "LOADED" : "MISSING");
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: PARENT_REPO,
      encoding: "utf8",
    }).trim();
    expect(output).toBe("LOADED");
  });

  it("accepts an override inside the repository for isolated test workspaces", () => {
    const workspace = join(PROJECT_ROOT, ".local", "test-runs", "resolver-check");
    process.env.UTSAV_LOCAL_DIR = workspace;
    expect(getDevMailDir()).toBe(join(workspace, ".local", "mail"));
    expect(getCredentialRegistryDir()).toBe(join(workspace, ".local", "test-users"));
  });
});
