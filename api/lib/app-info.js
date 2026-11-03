import packageJson from "@/package.json" with { type: "json" };

/**
 * Static application identity, read from package.json at build time.
 * Safe to import anywhere (no secrets, no server-only dependencies).
 */
export const APP_NAME = "Utsav-Connect";
export const APP_VERSION = packageJson.version;
