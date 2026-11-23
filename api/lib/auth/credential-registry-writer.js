import "server-only";
import {
  mkdirSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
  openSync,
  closeSync,
  renameSync,
  readFileSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { getCredentialRegistryDir } from "../paths/local-artifacts.js";

/**
 * Local Development Test Credential Registry - file writer.
 *
 * Writes JSON credential records to .local/test-users/<Role>/ with sequential
 * filenames (001-name.json, 002-name.json, ...). Never overwrites existing
 * files. Handles concurrent writes safely using a lock file.
 *
 * Records contain only non-sensitive metadata plus optional plaintext password
 * (when explicitly enabled by configuration). Never stores password hashes,
 * session tokens, verification tokens, reset tokens, or invitation tokens.
 *
 * This module is server-only.
 */

function getRoleDir(role) {
  const base = getBaseDir();
  switch (role) {
    case "super_admin":
      return join(base, "SuperAdmin");
    case "admin":
      return join(base, "Admin");
    case "devotee":
      return join(base, "Devotee");
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

function getLockFile() {
  return join(getBaseDir(), ".registry-write-lock");
}

const ROLE_LABELS = {
  super_admin: "SuperAdmin",
  admin: "Admin",
  devotee: "Devotee",
};

// Filesystem permissions: directories are 0700 (owner only), JSON files are
// 0600 (owner read/write only). Applied on every write and to pre-existing
// files via fixExistingPermissions().
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

/**
 * Ensure the role directory exists. Safe to call repeatedly.
 *
 * @param {string} role - One of "super_admin", "admin", "devotee"
 * @returns {string} The absolute role directory path
 */
function ensureRoleDir(role) {
  const dir = getRoleDir(role);
  try {
    mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  } catch {
    // Directory may already exist; ensure permissions are correct anyway.
  }
  // Ensure the directory itself has the right permissions even if it already
  // existed with a more permissive umask.
  try {
    chmodSync(dir, DIR_MODE);
  } catch {}
  return dir;
}

/**
 * Fix filesystem permissions on all pre-existing credential registry files
 * and directories so they match DIR_MODE (0700) / FILE_MODE (0600). Safe to
 * call repeatedly; missing paths are skipped silently.
 *
 * This ensures files created before this permission hardening (or created
 * with a permissive umask) are also protected, not just newly written files.
 */
function fixExistingPermissions() {
  const baseDir = getBaseDir();
  try {
    chmodSync(baseDir, DIR_MODE);
  } catch {}
  for (const role of Object.keys(ROLE_LABELS)) {
    const dir = getRoleDir(role);
    if (!existsSync(dir)) {
      continue;
    }
    try {
      chmodSync(dir, DIR_MODE);
    } catch {}
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) {
          continue;
        }
        try {
          chmodSync(join(dir, file), FILE_MODE);
        } catch {}
      }
    } catch {}
  }
  try {
    chmodSync(getLockFile(), FILE_MODE);
  } catch {}
}

/**
 * Acquire an exclusive file lock for the duration of a write operation.
 * Uses a simple lock file with a polling retry loop.
 *
 * The lock file contains the PID of the holding process. Before treating an
 * existing lock as stale, this implementation verifies that the holding
 * process is still alive (signal 0 existence check). A lock held by a live
 * process is never removed, regardless of its age. A lock from a dead
 * process is NOT automatically removed — doing so from multiple concurrent
 * processes is fundamentally racy (there is no atomic
 * "compare-and-unlink" primitive in POSIX). Instead, acquisition times out
 * with a clear error message instructing the operator to manually remove the
 * lock file if no writer is active.
 *
 * Concurrent recovery attempts are safe: no process ever unlinks another
 * process's lock. At most one process can win each openSync("wx").
 *
 * @param {number} timeoutMs - Maximum time to wait for the lock (ms)
 * @returns {Function} Release function — only removes the lock if the caller still owns it
 */
function acquireLock(timeoutMs = 5000) {
  const lockFile = getLockFile();
  const start = Date.now();
  const myPid = process.pid;
  while (true) {
    try {
      // O_EXCL | O_CREAT equivalent: fail if file already exists
      const fd = openSync(lockFile, "wx");
      // Record our PID so other processes can verify ownership
      writeFileSync(fd, String(myPid), { encoding: "utf8" });
      closeSync(fd);
      try {
        chmodSync(lockFile, FILE_MODE);
      } catch {}
      return () => {
        try {
          // Only remove the lock if we still own it (prevents a process that
          // is waiting on a stale lock from removing a lock acquired by another
          // process in the meantime)
          try {
            const existing = readFileSync(lockFile, "utf8").trim();
            if (existing === String(myPid)) {
              unlinkSync(lockFile);
            }
          } catch {}
        } catch {}
      };
    } catch {
      // Lock exists — determine whether the holder is alive before waiting
      if (existsSync(lockFile)) {
        const holderPidStr = readFileSync(lockFile, "utf8").trim();
        const holderPid = parseInt(holderPidStr, 10);
        if (!isNaN(holderPid) && holderPid > 0) {
          // Signal 0 checks process existence without sending a signal.
          // ESRCH: process does not exist (stale).
          // EPERM: process exists but we cannot signal it (alive — never reclaim).
          let holderAlive = false;
          try {
            process.kill(holderPid, 0);
            holderAlive = true;
          } catch (err) {
            holderAlive = err.code !== "ESRCH";
          }
          if (!holderAlive) {
            // Stale lock (dead holder). Do NOT auto-remove — concurrent
            // reclaimers could delete each other's locks. There is no
            // atomic "compare-and-unlink" primitive in POSIX, so any
            // automatic removal is fundamentally racy. Timeout with a
            // clear manual-recovery message instead.
            throw new Error(
              "Stale credential registry lock held by dead process " +
                holderPid +
                ". If no writer is active, manually remove " +
                lockFile +
                " and try again.",
            );
          }
          // holderAlive — do not remove the lock
        }
        // Lock file exists but does not contain a valid PID — do not
        // auto-recover (could be a foreign file); wait and retry.
      }
    }
    if (Date.now() - start >= timeoutMs) {
      throw new Error(
        "Could not acquire credential registry lock within timeout. " +
          "If no other process is writing to the registry, manually remove " +
          lockFile +
          " and try again.",
      );
    }
    // Small sleep before retry
    const now = Date.now();
    while (Date.now() - now < 10) {
      // busy wait
    }
  }
}
/**
 * Compute the next sequential filename for a role directory.
 * Scans existing files matching NNN-name.json pattern and returns the next
 * available number, zero-padded to 3 digits.
 *
 * @param {string} dir - Role directory path
 * @param {string} name - Human-readable name for the filename
 * @returns {string} Full file path
 */
function computeNextFilePath(dir, name) {
  let existing = [];
  try {
    existing = readdirSync(dir);
  } catch {
    existing = [];
  }

  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  let maxNum = 0;
  const numRe = /^(\d{3})-[^/]+\.json$/;
  for (const file of existing) {
    const match = file.match(numRe);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return join(dir, `${padded}-${safeName}.json`);
}

/**
 * Write a credential registry record.
 *
 * @param {Object} params
 * @param {string} params.role - One of "super_admin", "admin", "devotee"
 * @param {string} params.fullName
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} params.gender
 * @param {string} params.status - Account status
 * @param {string} params.creationSource - e.g. "bootstrap", "registration", "invitation", "admin-api"
 * @param {string} params.mongoId - MongoDB ObjectId
 * @param {string} [params.password] - Plaintext password, ONLY stored when explicitly enabled
 * @param {boolean} params.allowPassword - Pre-computed flag from isPlaintextPasswordStorageEnabled
 * @returns {Object} { written: boolean, filePath: string|null, reason: string|null }
 */
export function writeCredentialRecord(params) {
  const {
    role,
    fullName,
    email,
    phone,
    gender,
    status,
    creationSource,
    mongoId,
    password,
    allowPassword = false,
  } = params;

  const dir = ensureRoleDir(role);
  const releaseLock = acquireLock();

  try {
    const filePath = computeNextFilePath(dir, fullName);

    const record = {
      fullName,
      email,
      phone,
      gender,
      role,
      status,
      createdAt: new Date().toISOString(),
      creationSource,
      mongoId,
    };

    // Only include plaintext password when explicitly enabled by all conditions.
    // The caller checks isPlaintextPasswordStorageEnabled before passing a
    // password; allowPassword is that pre-computed flag.
    if (password && allowPassword) {
      record.password = password;
    }

    // Write atomically: write to temp file, then rename
    const tempPath = filePath + ".tmp";
    writeFileSync(tempPath, JSON.stringify(record, null, 2) + "\n", {
      encoding: "utf8",
      mode: FILE_MODE,
      flag: "wx", // Fail if file exists (extra safety against overwrite)
    });
    // Rename is atomic on POSIX and preserves the temp file's mode.
    renameSync(tempPath, filePath);
    // Explicitly enforce file permissions on the final path.
    try {
      chmodSync(filePath, FILE_MODE);
    } catch {}
    // Protect any pre-existing files in the directory, not just this new one.
    fixExistingPermissions();

    return { written: true, filePath, reason: null };
  } catch (error) {
    return { written: false, filePath: null, reason: error.message };
  } finally {
    releaseLock();
  }
}

/**
 * Remove a credential registry file for a given MongoDB ObjectId.
 * Scans all role directories for a file whose mongoId matches.
 *
 * @param {string} mongoId - MongoDB ObjectId
 * @returns {number} Number of files removed (0 or 1)
 */
export function removeCredentialRecord(mongoId) {
  let removed = 0;
  for (const role of Object.keys(ROLE_LABELS)) {
    const dir = getRoleDir(role);
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = join(dir, file);
      try {
        const content = readFileSync(filePath, "utf8");
        const record = JSON.parse(content);
        if (record.mongoId === mongoId) {
          unlinkSync(filePath);
          removed += 1;
        }
      } catch {
        // Skip malformed files
      }
    }
  }
  return removed;
}

/**
 * List all credential registry records (without passwords).
 * Used by the `make users` command.
 *
 * @returns {Array<Object>} Array of record summaries (no password field)
 */
export function listCredentialRecords() {
  const records = [];
  for (const role of Object.keys(ROLE_LABELS)) {
    const dir = getRoleDir(role);
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = join(dir, file);
      try {
        const content = readFileSync(filePath, "utf8");
        const record = JSON.parse(content);
        // Never include password in listing
        const { password, ...safeRecord } = record;
        records.push(safeRecord);
      } catch {
        // Skip malformed files
      }
    }
  }
  // Sort by createdAt descending (newest first)
  records.sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  return records;
}

/**
 * Get the count of records by role.
 *
 * @returns {Object} Counts per role
 */
export function getCredentialRecordCounts() {
  const counts = { super_admin: 0, admin: 0, devotee: 0 };
  for (const role of Object.keys(ROLE_LABELS)) {
    const dir = getRoleDir(role);
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir);
    counts[role] = files.filter((f) => f.endsWith(".json")).length;
  }
  return counts;
}

/**
 * Update the status field of an existing credential registry record.
 * Used when an account is approved, rejected, suspended, or reactivated.
 *
 * @param {string} mongoId - MongoDB ObjectId
 * @param {string} newStatus - New status value
 * @returns {boolean} True if a record was found and updated
 */
export function updateCredentialRecordStatus(mongoId, newStatus) {
  let updated = false;

  // Use the same exclusive lock and temp-file + rename pattern as
  // writeCredentialRecord(): concurrent status updates must not interleave,
  // and a partial write must never leave a valid-looking JSON file truncated.
  let releaseLock;
  try {
    releaseLock = acquireLock();
  } catch {
    // Registry unavailable (e.g. lock held by another process). Callers treat
    // this as best-effort and keep the MongoDB update authoritative.
    return false;
  }

  try {
    for (const role of Object.keys(ROLE_LABELS)) {
      const dir = getRoleDir(role);
      if (!existsSync(dir)) {
        continue;
      }
      let files;
      try {
        files = readdirSync(dir);
      } catch {
        continue;
      }
      for (const file of files) {
        if (!file.endsWith(".json")) {
          continue;
        }
        const filePath = join(dir, file);
        const tempPath = `${filePath}.tmp`;
        try {
          const content = readFileSync(filePath, "utf8");
          const record = JSON.parse(content);
          if (record.mongoId !== mongoId) {
            continue;
          }
          record.status = newStatus;
          writeFileSync(tempPath, JSON.stringify(record, null, 2) + "\n", {
            encoding: "utf8",
            mode: FILE_MODE,
            flag: "wx",
          });
          // Atomic replacement; preserves the temp file's 0600 mode.
          renameSync(tempPath, filePath);
          try {
            chmodSync(filePath, FILE_MODE);
          } catch {}
          updated = true;
        } catch {
          // Skip malformed/unwritable records. Never log file contents: they
          // may contain applicant PII or (in dev) a plaintext password.
          try {
            if (existsSync(tempPath)) unlinkSync(tempPath);
          } catch {}
        }
      }
    }
  } finally {
    if (releaseLock) releaseLock();
  }

  return updated;
}

/**
 * Find a credential registry record by MongoDB ObjectId (without password).
 * @param {string} mongoId - MongoDB ObjectId
 * @returns {Object|null} Record without password, or null if not found
 */
export function findCredentialRecord(mongoId) {
  for (const role of Object.keys(ROLE_LABELS)) {
    const dir = getRoleDir(role);
    if (!existsSync(dir)) {
      continue;
    }
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = join(dir, file);
      try {
        const content = readFileSync(filePath, "utf8");
        const record = JSON.parse(content);
        if (record.mongoId === mongoId) {
          const { password, ...safeRecord } = record;
          return safeRecord;
        }
      } catch {
        // Skip malformed files
      }
    }
  }
  return null;
}

/**
 * Get the base directory path (for diagnostics).
 * @returns {string}
 */
export function getBaseDir() {
  return getCredentialRegistryDir();
}

/**
 * Fix filesystem permissions on all pre-existing credential registry files
 * and directories so they match DIR_MODE (0700) / FILE_MODE (0600).
 * Safe to call repeatedly; missing paths are skipped silently.
 *
 * Exported for use by scripts/tests that may need to harden permissions on
 * files created before this hardening was introduced.
 */
export function fixRegistryPermissions() {
  fixExistingPermissions();
}

/**
 * Acquire an exclusive file lock for the duration of a write operation.
 * Exported for testing stale-lock recovery and lock ownership behavior.
 *
 * @param {number} timeoutMs - Maximum time to wait for the lock (ms)
 * @returns {Function} Release function
 */
export { acquireLock };
