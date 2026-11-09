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
    ".local/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      // The app fetches live data in client effects and resets modal drafts when
      // an editor opens. Those are valid synchronisation patterns; this newer
      // rule flags them all as cascading renders, so it is disabled deliberately
      // rather than suppressed file by file.
      "react-hooks/set-state-in-effect": "off",
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
