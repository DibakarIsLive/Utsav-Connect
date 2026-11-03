import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Load `.env.local` (or another file) into process.env for scripts and tests.
 *
 * Next.js loads env files itself, so application code never calls this.
 * Uses Node's built-in `process.loadEnvFile` (Node >= 20.12) to avoid a
 * dotenv dependency. Existing variables take precedence and are not
 * overwritten. Missing files are ignored silently.
 *
 * @param {string} [fileName]
 * @returns {boolean} whether a file was loaded
 */
export function loadLocalEnvFile(fileName = ".env.local") {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return false;
  }
  process.loadEnvFile(filePath);
  return true;
}
