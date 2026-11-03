import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint flat configuration.
 *
 * `eslint-config-next/core-web-vitals` provides the Next.js, React, React Hooks,
 * and JSX accessibility rules. Project-specific rules are added below.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      // Server-only modules under api/ must never be imported by client components.
      // The boundary is enforced at build time by the `server-only` package; this
      // rule documents the intent and catches accidental relative imports.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../api/*", "../../api/*", "../../../api/*"],
              message:
                "Import server modules through the '@/api/...' alias so the boundary stays explicit.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
