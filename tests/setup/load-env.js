import { loadLocalEnvFile } from "../../scripts/lib/load-env-file.js";

// Make `.env.local` available to tests without a dotenv dependency.
// Variables already present in the process environment win.
loadLocalEnvFile(".env.local");
