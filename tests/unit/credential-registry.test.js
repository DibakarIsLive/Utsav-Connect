import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isolatedLocalDir } from "../helpers/local-workspace.js";
import { resetEnvCache } from "@/api/lib/env/env";
import {
  isCredentialStorageEnabled,
  isCredentialStorageEnabledForRole,
  isPlaintextPasswordStorageEnabled,
  resolveCredentialStorageConfig,
} from "@/api/lib/auth/credential-registry-config";
import {
  writeCredentialRecord,
  removeCredentialRecord,
  listCredentialRecords,
  getCredentialRecordCounts,
  getBaseDir,
  findCredentialRecord,
  updateCredentialRecordStatus,
  fixRegistryPermissions,
  acquireLock,
} from "@/api/lib/auth/credential-registry-writer";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  statSync,
  utimesSync,
  unlinkSync,
  existsSync,
} from "node:fs";

const ORIGINAL_ENV = { ...process.env };
const TEST_DIR = isolatedLocalDir("credential-registry");

describe("Credential registry configuration resolver", () => {
  beforeEach(() => {
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
    // Remove all credential registry settings to test defaults
    delete process.env.STORE_CREDENTIALS_FOR_ALL_USERS;
    delete process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS;
    delete process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS;
    delete process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES;
    delete process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetEnvCache();
  });

  it("defaults to disabled when all settings are missing", () => {
    expect(isCredentialStorageEnabled()).toBe(false);
    expect(isCredentialStorageEnabledForRole("super_admin")).toBe(false);
    expect(isCredentialStorageEnabledForRole("admin")).toBe(false);
    expect(isCredentialStorageEnabledForRole("devotee")).toBe(false);
  });

  it("master switch false disables all roles", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "false";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES = "true";

    expect(isCredentialStorageEnabled()).toBe(false);
    expect(isCredentialStorageEnabledForRole("super_admin")).toBe(false);
    expect(isCredentialStorageEnabledForRole("admin")).toBe(false);
    expect(isCredentialStorageEnabledForRole("devotee")).toBe(false);
  });

  it("master switch true evaluates role-specific settings", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS = "false";
    process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES = "true";

    expect(isCredentialStorageEnabled()).toBe(true);
    expect(isCredentialStorageEnabledForRole("super_admin")).toBe(true);
    expect(isCredentialStorageEnabledForRole("admin")).toBe(false);
    expect(isCredentialStorageEnabledForRole("devotee")).toBe(true);
  });

  it("invalid master value defaults to false", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "yes";
    expect(isCredentialStorageEnabled()).toBe(false);
  });

  it("empty master value defaults to false", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "";
    expect(isCredentialStorageEnabled()).toBe(false);
  });

  it("case-insensitive true is accepted", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "TRUE";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "True";
    expect(isCredentialStorageEnabled()).toBe(true);
    expect(isCredentialStorageEnabledForRole("super_admin")).toBe(true);
  });

  it("whitespace around true is trimmed", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "  true  ";
    expect(isCredentialStorageEnabled()).toBe(true);
  });

  it("plaintext password storage requires NODE_ENV=development", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";

    process.env.NODE_ENV = "development";
    expect(isPlaintextPasswordStorageEnabled("super_admin")).toBe(true);

    process.env.NODE_ENV = "production";
    expect(isPlaintextPasswordStorageEnabled("super_admin")).toBe(false);

    process.env.NODE_ENV = "test";
    expect(isPlaintextPasswordStorageEnabled("super_admin")).toBe(false);
  });

  it("resolveCredentialStorageConfig returns correct structure", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS = "false";
    process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES = "true";
    process.env.NODE_ENV = "development";

    const config = resolveCredentialStorageConfig();
    expect(config.master).toBe(true);
    expect(config.roles.super_admin).toBe(true);
    expect(config.roles.admin).toBe(false);
    expect(config.roles.devotee).toBe(true);
    expect(config.plaintextPasswordEnabled.super_admin).toBe(true);
    expect(config.plaintextPasswordEnabled.admin).toBe(false);
    expect(config.plaintextPasswordEnabled.devotee).toBe(true);
  });
});

describe("Credential registry writer (isolated directory)", () => {
  let originalBaseDir;

  beforeEach(() => {
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = "development";
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES = "true";

    // Create isolated test directory and override base dir
    originalBaseDir = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.UTSAV_LOCAL_DIR = TEST_DIR;
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalBaseDir);
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
  });

  it("writes a credential record with sequential filename", () => {
    const result1 = writeCredentialRecord({
      role: "super_admin",
      fullName: "Alice Admin",
      email: "alice@example.com",
      phone: "+1234567890",
      gender: "female",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439011",
      allowPassword: false,
    });
    expect(result1.written).toBe(true);

    const result2 = writeCredentialRecord({
      role: "super_admin",
      fullName: "Bob Admin",
      email: "bob@example.com",
      phone: "+1234567891",
      gender: "male",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439012",
      allowPassword: false,
    });
    expect(result2.written).toBe(true);

    // Check sequential numbering
    const files = require("node:fs").readdirSync(getBaseDir() + "/SuperAdmin");
    expect(files.length).toBe(2);
    expect(files[0]).toMatch(/^001-/);
    expect(files[1]).toMatch(/^002-/);
  });

  it("never overwrites existing files (creates new file with next sequence)", () => {
    const result1 = writeCredentialRecord({
      role: "devotee",
      fullName: "Charlie Devotee",
      email: "charlie@example.com",
      phone: "+1234567892",
      gender: "male",
      status: "active",
      creationSource: "registration",
      mongoId: "507f1f77bcf86cd799439013",
      allowPassword: false,
    });
    expect(result1.written).toBe(true);

    const result2 = writeCredentialRecord({
      role: "devotee",
      fullName: "Charlie Devotee",
      email: "charlie@example.com",
      phone: "+1234567892",
      gender: "male",
      status: "active",
      creationSource: "registration",
      mongoId: "507f1f77bcf86cd799439013",
      allowPassword: false,
    });
    // Second write creates a new file with incremented sequence, never overwrites
    expect(result2.written).toBe(true);
    expect(result2.filePath).not.toBe(result1.filePath);

    const files = require("node:fs")
      .readdirSync(getBaseDir() + "/Devotee")
      .filter((f) => f.includes("charlie-devotee"));
    expect(files.length).toBe(2);
    expect(files[0]).toMatch(/^001-/);
    expect(files[1]).toMatch(/^002-/);
  });

  it("stores plaintext password only when explicitly enabled", () => {
    // With all switches true and NODE_ENV=development
    const result = writeCredentialRecord({
      role: "super_admin",
      fullName: "Visible Password User",
      email: "visible@example.com",
      phone: "+1234567893",
      gender: "female",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439014",
      password: "VisiblePassword123!",
      allowPassword: true,
    });
    expect(result.written).toBe(true);

    // Read the raw file to verify password is stored
    const files = require("node:fs").readdirSync(getBaseDir() + "/SuperAdmin");
    const matchingFile = files.find((f) => f.includes("visible-password-user"));
    expect(matchingFile).toBeDefined();
    const filePath = getBaseDir() + "/SuperAdmin/" + matchingFile;
    const content = readFileSync(filePath, "utf8");
    const record = JSON.parse(content);
    expect(record.password).toBe("VisiblePassword123!");

    // But listCredentialRecords should NOT include the password
    const records = listCredentialRecords();
    const saRecord = records.find((r) => r.email === "visible@example.com");
    expect(saRecord.password).toBeUndefined();
  });

  it("does not store plaintext password when disabled", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "false";

    const result = writeCredentialRecord({
      role: "devotee",
      fullName: "Hidden Password User",
      email: "hidden@example.com",
      phone: "+1234567894",
      gender: "male",
      status: "pending_verification",
      creationSource: "registration",
      mongoId: "507f1f77bcf86cd799439015",
      password: "HiddenPassword123!",
      allowPassword: false,
    });
    expect(result.written).toBe(true);

    const records = listCredentialRecords();
    const rec = records.find((r) => r.email === "hidden@example.com");
    expect(rec.password).toBeUndefined();
  });

  it("does not store password hashes or tokens in JSON", () => {
    const result = writeCredentialRecord({
      role: "admin",
      fullName: "No Secrets User",
      email: "nosecrets@example.com",
      phone: "+1234567895",
      gender: "female",
      status: "active",
      creationSource: "invitation",
      mongoId: "507f1f77bcf86cd799439016",
      allowPassword: false,
    });
    expect(result.written).toBe(true);

    const records = listCredentialRecords();
    const rec = records.find((r) => r.email === "nosecrets@example.com");
    expect(rec.passwordHash).toBeUndefined();
    expect(rec.sessionToken).toBeUndefined();
    expect(rec.resetToken).toBeUndefined();
    expect(rec.verificationToken).toBeUndefined();
    expect(rec.invitationToken).toBeUndefined();
  });

  it("lists all records without passwords", () => {
    writeCredentialRecord({
      role: "super_admin",
      fullName: "List User One",
      email: "list1@example.com",
      phone: "+1234567896",
      gender: "male",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439017",
      allowPassword: false,
    });
    writeCredentialRecord({
      role: "admin",
      fullName: "List User Two",
      email: "list2@example.com",
      phone: "+1234567897",
      gender: "female",
      status: "active",
      creationSource: "invitation",
      mongoId: "507f1f77bcf86cd799439018",
      allowPassword: false,
    });

    const records = listCredentialRecords();
    expect(records.length).toBeGreaterThanOrEqual(2);
    for (const r of records) {
      expect(r.password).toBeUndefined();
      expect(r.email).toBeDefined();
      expect(r.role).toBeDefined();
      expect(r.status).toBeDefined();
      expect(r.createdAt).toBeDefined();
      expect(r.mongoId).toBeDefined();
    }
  });

  it("removes a credential record by mongoId", () => {
    const result = writeCredentialRecord({
      role: "devotee",
      fullName: "To Be Removed",
      email: "remove@example.com",
      phone: "+1234567898",
      gender: "male",
      status: "pending",
      creationSource: "registration",
      mongoId: "507f1f77bcf86cd799439019",
      allowPassword: false,
    });
    expect(result.written).toBe(true);

    const removed = removeCredentialRecord("507f1f77bcf86cd799439019");
    expect(removed).toBe(1);

    const records = listCredentialRecords();
    expect(records.find((r) => r.email === "remove@example.com")).toBeUndefined();
  });

  it("returns correct counts by role", () => {
    const counts = getCredentialRecordCounts();
    expect(counts.super_admin).toBeGreaterThanOrEqual(0);
    expect(counts.admin).toBeGreaterThanOrEqual(0);
    expect(counts.devotee).toBeGreaterThanOrEqual(0);
  });

  it("updates credential record status", () => {
    const result = writeCredentialRecord({
      role: "devotee",
      fullName: "Status Change User",
      email: "statuschange@example.com",
      phone: "+1234567899",
      gender: "male",
      status: "pending_verification",
      creationSource: "registration",
      mongoId: "507f1f77bcf86cd799439020",
      allowPassword: false,
    });
    expect(result.written).toBe(true);

    const updated = updateCredentialRecordStatus("507f1f77bcf86cd799439020", "active");
    expect(updated).toBe(true);

    const records = listCredentialRecords();
    const rec = records.find((r) => r.email === "statuschange@example.com");
    expect(rec.status).toBe("active");
  });

  it("finds credential record by mongoId without password", () => {
    writeCredentialRecord({
      role: "super_admin",
      fullName: "Find Me User",
      email: "findme@example.com",
      phone: "+1234567900",
      gender: "female",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439021",
      allowPassword: false,
    });

    const found = findCredentialRecord("507f1f77bcf86cd799439021");
    expect(found).not.toBeNull();
    expect(found.email).toBe("findme@example.com");
    expect(found.password).toBeUndefined();
  });
});

describe("Credential registry filesystem permissions", () => {
  let originalBaseDir;

  beforeEach(() => {
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = "development";
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES = "true";

    originalBaseDir = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.UTSAV_LOCAL_DIR = TEST_DIR;
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalBaseDir);
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
  });

  it("creates role directories with 0700 permissions", () => {
    writeCredentialRecord({
      role: "super_admin",
      fullName: "Perm User",
      email: "perm@example.com",
      phone: "+1234567901",
      gender: "female",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439022",
      allowPassword: false,
    });

    const dir = getBaseDir() + "/SuperAdmin";
    const mode = statSync(dir).mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it("creates JSON files with 0600 permissions", () => {
    const result = writeCredentialRecord({
      role: "devotee",
      fullName: "File Perm User",
      email: "fileperm@example.com",
      phone: "+1234567902",
      gender: "male",
      status: "active",
      creationSource: "registration",
      mongoId: "507f1f77bcf86cd799439023",
      allowPassword: false,
    });
    expect(result.written).toBe(true);

    const mode = statSync(result.filePath).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("fixes permissions on pre-existing files with wrong modes", () => {
    const dir = getBaseDir() + "/Devotee";
    mkdirSync(dir, { recursive: true, mode: 0o755 });

    // Create a pre-existing file with overly permissive mode (0644)
    const preExisting = join(dir, "099-pre-existing.json");
    writeFileSync(
      preExisting,
      JSON.stringify({
        fullName: "Pre Existing",
        email: "pre@example.com",
        phone: "+1234567903",
        gender: "female",
        role: "devotee",
        status: "active",
        createdAt: new Date().toISOString(),
        creationSource: "bootstrap",
        mongoId: "507f1f77bcf86cd799439024",
      }),
      { encoding: "utf8", mode: 0o644 },
    );
    expect(statSync(preExisting).mode & 0o777).toBe(0o644);

    // Trigger a write in the same directory; fixExistingPermissions should
    // have corrected the pre-existing file's mode.
    writeCredentialRecord({
      role: "devotee",
      fullName: "New User After Preexisting",
      email: "newafter@example.com",
      phone: "+1234567905",
      gender: "male",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439025",
      allowPassword: false,
    });

    expect(statSync(preExisting).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it("fixRegistryPermissions hardens pre-existing files and directories", () => {
    const dir = getBaseDir() + "/Admin";
    mkdirSync(dir, { recursive: true, mode: 0o755 });

    const preExisting = join(dir, "001-old.json");
    writeFileSync(
      preExisting,
      JSON.stringify({
        fullName: "Old",
        email: "old@example.com",
        phone: "+1234567906",
        gender: "male",
        role: "admin",
        status: "active",
        createdAt: new Date().toISOString(),
        creationSource: "bootstrap",
        mongoId: "507f1f77bcf86cd799439026",
      }),
      { encoding: "utf8", mode: 0o644 },
    );

    expect(statSync(dir).mode & 0o777).toBe(0o755);
    expect(statSync(preExisting).mode & 0o777).toBe(0o644);

    fixRegistryPermissions();

    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(preExisting).mode & 0o777).toBe(0o600);
  });
});

describe("Credential registry concurrency and lock recovery", () => {
  let originalBaseDir;

  beforeEach(() => {
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = "development";
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_ADMINS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_DEVOTEES = "true";

    originalBaseDir = process.cwd();
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.UTSAV_LOCAL_DIR = TEST_DIR;
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalBaseDir);
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
  });

  it("times out on a stale lock left by a dead process (no auto-removal)", () => {
    const lockFile = join(getBaseDir(), ".registry-write-lock");
    mkdirSync(getBaseDir(), { recursive: true });

    // Write a PID that is almost certainly not alive on this machine
    const deadPid = String(999999999);
    writeFileSync(lockFile, deadPid, { encoding: "utf8" });
    expect(existsSync(lockFile)).toBe(true);

    // A write should TIME OUT because we do NOT auto-remove stale locks.
    // Concurrent reclaimers cannot safely delete each other's locks, so the
    // operator must manually remove the lock file.
    let error = null;
    try {
      writeCredentialRecord({
        role: "super_admin",
        fullName: "Should Time Out",
        email: "timeout@example.com",
        phone: "+1234567907",
        gender: "female",
        status: "active",
        creationSource: "bootstrap",
        mongoId: "507f1f77bcf86cd799439027",
        allowPassword: false,
      });
    } catch (err) {
      error = err;
    }
    expect(error).not.toBeNull();
    expect(error.message).toContain("Stale credential registry lock");

    // The lock file must still exist — we never auto-remove it
    expect(existsSync(lockFile)).toBe(true);
    expect(readFileSync(lockFile, "utf8").trim()).toBe(deadPid);
  });

  it("does not remove a lock held by a live process even if the lock is old", () => {
    const lockFile = join(getBaseDir(), ".registry-write-lock");
    mkdirSync(getBaseDir(), { recursive: true });

    // Write our own PID into the lock file with an old mtime
    writeFileSync(lockFile, String(process.pid), { encoding: "utf8" });
    const oldTimeSec = (Date.now() - 60000) / 1000; // 60 seconds old
    utimesSync(lockFile, oldTimeSec, oldTimeSec);
    expect(existsSync(lockFile)).toBe(true);

    // Acquiring the lock should time out because our own process is alive
    let error = null;
    try {
      acquireLock(100); // 100ms timeout
    } catch (err) {
      error = err;
    }
    expect(error).not.toBeNull();
    expect(error.message).toContain("Could not acquire credential registry lock");

    // The lock file should still exist and still contain our PID
    expect(existsSync(lockFile)).toBe(true);
    expect(readFileSync(lockFile, "utf8").trim()).toBe(String(process.pid));
  });

  it("does not auto-recover a lock file with an invalid PID", () => {
    const lockFile = join(getBaseDir(), ".registry-write-lock");
    mkdirSync(getBaseDir(), { recursive: true });

    // Write non-PID content into the lock file
    writeFileSync(lockFile, "not-a-pid", { encoding: "utf8" });
    expect(existsSync(lockFile)).toBe(true);

    // Acquiring the lock should time out — we do not auto-recover unknown PID files
    let error = null;
    try {
      acquireLock(100);
    } catch (err) {
      error = err;
    }
    expect(error).not.toBeNull();
    expect(existsSync(lockFile)).toBe(true);
  });

  it("produces sequential filenames without duplicates across repeated writes", () => {
    const names = ["Alpha User", "Beta User", "Gamma User", "Delta User"];
    const filePaths = [];
    for (const name of names) {
      const result = writeCredentialRecord({
        role: "devotee",
        fullName: name,
        email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        phone: "+1234567908",
        gender: "female",
        status: "active",
        creationSource: "registration",
        mongoId: "507f1f77bcf86cd79943902" + filePaths.length,
        allowPassword: false,
      });
      expect(result.written).toBe(true);
      filePaths.push(result.filePath);
    }

    // All file paths must be unique
    const uniquePaths = new Set(filePaths);
    expect(uniquePaths.size).toBe(names.length);

    // Filenames must be sequential (001, 002, 003, 004)
    const dir = getBaseDir() + "/Devotee";
    const files = require("node:fs")
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    expect(files.length).toBe(names.length);
    expect(files).toEqual([
      "001-alpha-user.json",
      "002-beta-user.json",
      "003-gamma-user.json",
      "004-delta-user.json",
    ]);
  });

  it("cleans up the lock file after a successful write", () => {
    const lockFile = join(getBaseDir(), ".registry-write-lock");

    writeCredentialRecord({
      role: "super_admin",
      fullName: "Lock Cleanup User",
      email: "lockcleanup@example.com",
      phone: "+1234567909",
      gender: "male",
      status: "active",
      creationSource: "bootstrap",
      mongoId: "507f1f77bcf86cd799439028",
      allowPassword: false,
    });

    expect(existsSync(lockFile)).toBe(false);
  });

  it("does not delete another process's lock during concurrent stale recovery", async () => {
    // Deterministic test for the dangerous interleaving:
    //   1. Process A reads a lock containing a dead PID.
    //   2. Process B reads the same dead PID.
    //   3. Process A unlinks the stale lock and creates a new lock (PID A).
    //   4. Process B must NOT unlink Process A's newly created lock.
    //
    // The fix: NO process auto-removes any lock. Both processes time out on a
    // stale lock. The lock file is left untouched. The operator must manually
    // remove it. This is 100% safe — no process can ever delete another
    // process's lock because no process ever unlinks a lock it didn't create.

    const lockFile = join(getBaseDir(), ".registry-write-lock");
    mkdirSync(getBaseDir(), { recursive: true });

    // Seed a stale lock with a PID that is almost certainly not alive
    const deadPid = "999999999";
    writeFileSync(lockFile, deadPid, { encoding: "utf8" });
    expect(existsSync(lockFile)).toBe(true);
    expect(readFileSync(lockFile, "utf8").trim()).toBe(deadPid);

    // Helper script: child process tries acquireLock with a short timeout,
    // expecting to time out (no auto-removal of stale locks)
    const helperScript = join(TEST_DIR, "lock-race-helper.mjs");
    const writerPath = join(originalBaseDir, "api", "lib", "auth", "credential-registry-writer.js");
    writeFileSync(
      helperScript,
      `import { readFileSync } from "node:fs";\n` +
        `import { join } from "node:path";\n` +
        `const writerPath = process.argv[2];\n` +
        `const source = readFileSync(writerPath, "utf8");\n` +
        `const stripped = source.replace(/^import "server-only";\\n/m, "");\n` +
        `const artifacts = ${JSON.stringify(`from "file://${join(originalBaseDir, "api", "lib", "paths", "local-artifacts.js")}"`)};\n` +
        `const stripped2 = stripped.replace("from \\"../paths/local-artifacts.js\\"", artifacts);\n` +
        `const tempPath = join(process.cwd(), "_lock_helper.mjs");\n` +
        `import { writeFileSync } from "node:fs";\n` +
        `writeFileSync(tempPath, stripped2, { encoding: "utf8" });\n` +
        `const { acquireLock } = await import("file://" + tempPath);\n` +
        `let result = { acquired: false, error: null, pid: process.pid };\n` +
        `try {\n` +
        `  acquireLock(500);\n` +
        `  result.acquired = true;\n` +
        `} catch (err) {\n` +
        `  result.error = err.message;\n` +
        `}\n` +
        `console.log(JSON.stringify(result));\n`,
    );

    // Spawn two children simultaneously — both see the same stale lock
    const results = await Promise.all([
      new Promise((resolve) => {
        const child = spawn("node", [helperScript, writerPath], { cwd: TEST_DIR });
        let stdout = "";
        child.stdout.on("data", (d) => {
          stdout += d.toString();
        });
        child.on("close", () => resolve(JSON.parse(stdout.trim())));
      }),
      new Promise((resolve) => {
        const child = spawn("node", [helperScript, writerPath], { cwd: TEST_DIR });
        let stdout = "";
        child.stdout.on("data", (d) => {
          stdout += d.toString();
        });
        child.on("close", () => resolve(JSON.parse(stdout.trim())));
      }),
    ]);

    // Neither child should have acquired the lock — both time out on stale lock
    const acquiredCount = results.filter((r) => r.acquired).length;
    expect(acquiredCount).toBe(0);

    // Both children should have gotten the stale-lock error
    for (const r of results) {
      expect(r.acquired).toBe(false);
      expect(r.error).toContain("Stale credential registry lock");
    }

    // The lock file must still exist with the dead PID — no process removed it
    expect(existsSync(lockFile)).toBe(true);
    expect(readFileSync(lockFile, "utf8").trim()).toBe(deadPid);
  });

  it("handles concurrent writes without duplicates, overwrites, or temp files", async () => {
    // spawn is imported at the top of this file

    const writerPath = join(originalBaseDir, "api", "lib", "auth", "credential-registry-writer.js");

    // Helper script: each child process reads the writer, strips the
    // `import "server-only"` line (which throws outside RSC), imports the
    // stripped module, and writes one credential record.
    const helperScript = join(TEST_DIR, "write-helper.mjs");
    writeFileSync(
      helperScript,
      `import { readFileSync, writeFileSync } from "node:fs";\n` +
        `import { join } from "node:path";\n` +
        `const writerPath = process.argv[2];\n` +
        `const record = JSON.parse(process.argv[3]);\n` +
        `const source = readFileSync(writerPath, "utf8");\n` +
        `const stripped = source.replace(/^import "server-only";\\n/m, "");\n` +
        `const artifacts = ${JSON.stringify(`from "file://${join(originalBaseDir, "api", "lib", "paths", "local-artifacts.js")}"`)};\n` +
        `const stripped2 = stripped.replace("from \\"../paths/local-artifacts.js\\"", artifacts);\n` +
        `const tempPath = join(process.cwd(), "_writer_stripped_" + process.pid + ".mjs");\n` +
        `writeFileSync(tempPath, stripped2, { encoding: "utf8" });\n` +
        `const { writeCredentialRecord } = await import("file://" + tempPath);\n` +
        `const result = writeCredentialRecord({\n` +
        `  ...record, allowPassword: false\n` +
        `});\n` +
        `console.log(JSON.stringify({ written: result.written, filePath: result.filePath, reason: result.reason }));\n`,
    );

    const numWrites = 8;
    const promises = [];
    for (let i = 0; i < numWrites; i++) {
      const mongoId = "507f1f77bcf86cd79943903" + String(i).padStart(2, "0");
      const record = {
        role: "devotee",
        fullName: `Concurrent User ${i}`,
        email: `concurrent${i}@example.com`,
        phone: `+123456791${i}`,
        gender: "female",
        status: "active",
        creationSource: "registration",
        mongoId,
      };
      promises.push(
        new Promise((resolve, reject) => {
          const child = spawn("node", [helperScript, writerPath, JSON.stringify(record)], {
            cwd: TEST_DIR,
          });
          let stdout = "";
          child.stdout.on("data", (data) => {
            stdout += data.toString();
          });
          child.stderr.on("data", () => {}); // ignore stderr
          child.on("close", (code) => {
            if (code === 0) {
              try {
                resolve(JSON.parse(stdout.trim()));
              } catch (err) {
                reject(new Error(`Invalid JSON output: ${stdout}`));
              }
            } else {
              reject(new Error(`Child process exited with code ${code}`));
            }
          });
        }),
      );
    }

    const results = await Promise.all(promises);

    // All writes must succeed
    for (const r of results) {
      expect(r.written).toBe(true);
      expect(r.reason).toBeNull();
    }

    // All file paths must be unique
    const filePaths = results.map((r) => r.filePath);
    expect(new Set(filePaths).size).toBe(numWrites);

    // No .tmp files should be left behind
    const dir = getBaseDir() + "/Devotee";
    const allFiles = require("node:fs").readdirSync(dir);
    const tmpFiles = allFiles.filter((f) => f.endsWith(".tmp"));
    expect(tmpFiles.length).toBe(0);

    // All JSON files must be valid and parseable
    const jsonFiles = allFiles.filter((f) => f.endsWith(".json"));
    expect(jsonFiles.length).toBe(numWrites);
    for (const f of jsonFiles) {
      const content = readFileSync(join(dir, f), "utf8");
      const record = JSON.parse(content);
      expect(record.role).toBe("devotee");
      expect(record.status).toBe("active");
      expect(record.mongoId).toBeDefined();
      expect(record.createdAt).toBeDefined();
    }

    // Sequential numbering must be unique and contiguous (001..008)
    const sorted = jsonFiles.sort();
    expect(sorted.length).toBe(numWrites);
    for (let i = 0; i < numWrites; i++) {
      expect(sorted[i]).toMatch(new RegExp(`^${String(i + 1).padStart(3, "0")}-`));
    }

    // Lock file must be cleaned up after all writes complete
    const lockFile = join(getBaseDir(), ".registry-write-lock");
    expect(existsSync(lockFile)).toBe(false);
  });
});

describe("Credential registry production rejection", () => {
  beforeEach(() => {
    resetEnvCache();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    resetEnvCache();
  });

  it("rejects plaintext password storage in production", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.NODE_ENV = "production";

    expect(isPlaintextPasswordStorageEnabled("super_admin")).toBe(false);
  });

  it("rejects plaintext password storage when master is false", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "false";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "true";
    process.env.NODE_ENV = "development";

    expect(isPlaintextPasswordStorageEnabled("super_admin")).toBe(false);
  });

  it("rejects plaintext password storage when role-specific is false", () => {
    process.env.STORE_CREDENTIALS_FOR_ALL_USERS = "true";
    process.env.STORE_CREDENTIALS_FOR_ALL_SUPER_ADMINS = "false";
    process.env.NODE_ENV = "development";

    expect(isPlaintextPasswordStorageEnabled("super_admin")).toBe(false);
  });
});
