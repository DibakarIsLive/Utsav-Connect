/**
 * Resolve application-local runtime artifacts (.local/) against the actual
 * Utsav-Connect project root, never against process.cwd().
 *
 * process.cwd() depends on how a command was launched. Running the dev server
 * or a script from a parent directory previously caused development mail to be
 * written to <parent>/.local/mail instead of <project>/.local/mail.
 *
 * The project root is discovered by walking upwards from both this module's
 * location and process.cwd(), looking for a package.json whose name is
 * "utsav-connect". Using this module's location as the primary candidate also
 * works when Next.js bundles server code into .next/server/chunks, because
 * walking up from that directory still reaches the project's package.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_NAME = "utsav-connect";
const MAX_PARENT_HOPS = 16;
let cachedRoot = null;

/** @param {string} directory */
function isProjectRoot(directory) {
  const manifest = resolve(directory, "package.json");
  if (!existsSync(manifest)) return false;
  try {
    return JSON.parse(readFileSync(manifest, "utf8")).name === PROJECT_NAME;
  } catch {
    return false;
  }
}

/** @param {string} start */
function walkUp(start) {
  let current = resolve(start);
  for (let hop = 0; hop < MAX_PARENT_HOPS; hop += 1) {
    if (isProjectRoot(current)) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/** @param {string} [startDir] - Override the starting directory (tests). */
export function findProjectRoot(startDir) {
  const candidates = [];
  if (startDir) candidates.push(startDir);
  try {
    candidates.push(dirname(fileURLToPath(import.meta.url)));
  } catch {
    // import.meta.url is unavailable in some bundlers; fall back to cwd.
  }
  candidates.push(process.cwd());

  for (const candidate of candidates) {
    const root = walkUp(candidate);
    if (root) return root;
  }
  throw new Error(
    "Unable to locate the Utsav-Connect project root. Expected a package.json with " +
      `"name": "${PROJECT_NAME}" above the calling module or process.cwd().`,
  );
}

/** @returns {string} The cached, absolute project root. */
export function getProjectRoot() {
  if (!cachedRoot) cachedRoot = findProjectRoot();
  return cachedRoot;
}

/**
 * True when `candidate` is `root` itself or lives underneath it.
 * Uses path.relative so prefix tricks such as `/repo-evil` cannot pass.
 */
function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * @param {...string} segments - Path segments below the approved .local root.
 *
 * UTSAV_LOCAL_DIR is an explicit, opt-in override for isolated test runs. It is
 * NOT derived from process.cwd(), and it is validated to stay inside the
 * discovered project root. Any override or segment that would resolve outside
 * the repository is rejected before any filesystem operation can use it.
 */
export function getLocalPath(...segments) {
  const root = getProjectRoot();
  const override = process.env.UTSAV_LOCAL_DIR;
  const base = override && override.trim() ? resolve(override) : root;

  if (!isWithin(root, base)) {
    throw new Error(
      `Refusing local-data path outside the Utsav-Connect repository: ${base}. ` +
        "UTSAV_LOCAL_DIR must resolve inside the project root.",
    );
  }

  for (const segment of segments) {
    if (
      typeof segment !== "string" ||
      !segment ||
      isAbsolute(segment) ||
      segment.includes("..") ||
      segment.includes("/") ||
      segment.includes("\\")
    ) {
      throw new Error(`Invalid local-data path segment: ${String(segment)}`);
    }
  }

  const localRoot = resolve(base, ".local");
  const target = resolve(localRoot, ...segments);
  if (!isWithin(root, target) || !isWithin(localRoot, target)) {
    throw new Error(`Refusing local-data path outside the approved directory: ${target}`);
  }
  return target;
}

/** @returns {string} Development mail output directory. */
export function getDevMailDir() {
  return getLocalPath("mail");
}

/** @returns {string} Development credential registry directory. */
export function getCredentialRegistryDir() {
  return getLocalPath("test-users");
}
