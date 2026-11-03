import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: [
      // `server-only` throws outside a React Server Components bundle; tests
      // replace it with an empty module so server modules can be imported.
      { find: "server-only", replacement: path.resolve(root, "tests/stubs/server-only.js") },
      // Mirror the `@/*` alias from jsconfig.json.
      { find: /^@\/(.*)$/, replacement: path.resolve(root, "$1") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup/load-env.js"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
