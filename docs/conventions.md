# Conventions

Last updated: 2026-11-03. Derived from the project naming guide and the roadmap; framework requirements win when they conflict.

## Language

- JavaScript and JSX only. React components use `.jsx`; everything else uses `.js`. Config files that must be ES modules use `.mjs` (`next.config.mjs`, `eslint.config.mjs`, `vitest.config.mjs`).
- `package.json` has `"type": "module"`, so every `.js` file is an ES module (`import`/`export`).
- Forbidden: `.ts`, `.tsx`, `.mts`, `.cts`, `tsconfig*.json`, `next-env.d.ts`. `npm run check:js-only` enforces this and runs inside `npm run check`.

## Naming

| Thing                           | Style                                                          | Example                                                                                                             |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Folders and non-component files | kebab-case                                                     | `api/lib/mongodb/connection.js`                                                                                     |
| React components                | PascalCase file and export                                     | `ui/components/layout/SiteHeader.jsx`                                                                               |
| Hooks                           | `useX.js`                                                      | `ui/hooks/useViewport.js` (none yet)                                                                                |
| Variables, functions            | camelCase                                                      | `connectToDatabase`, `latencyMs`                                                                                    |
| True constants                  | UPPER_SNAKE_CASE                                               | `CONNECTION_OPTIONS`, `PRIMARY_NAV_ITEMS`                                                                           |
| Next.js special files           | as required by Next                                            | `page.jsx`, `layout.jsx`, `route.js`, `not-found.jsx`, `error.jsx`                                                  |
| Docs                            | kebab-case `.md`                                               | `docs/project-status.md`; exceptions `README.md`, `CHANGELOG.md`, `LICENSE`, and the pre-existing `docs/Roadmap.md` |
| Environment variables           | UPPER_SNAKE_CASE; browser-exposed ones prefixed `NEXT_PUBLIC_` | `MONGODB_URI`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`                                                                    |
| Log event names                 | `area.action` dotted lowercase                                 | `mongodb.connected`, `health.database_unavailable`                                                                  |
| API error codes                 | UPPER_SNAKE_CASE strings                                       | `VALIDATION_ERROR`, `SERVICE_DEGRADED`                                                                              |

## Imports

- Use the `@/` alias for anything outside the current folder: `@/ui/components/ui/Container`, `@/api/lib/http/responses`.
- Relative `../api/*` paths are rejected by ESLint.
- Server-only modules begin with `import "server-only";`.

## Git

- Branches: `type/kebab-case` — `feat/area-hierarchy`, `fix/health-timeout`, `docs/testing-guide`.
- Commits: `type: imperative description` — `feat: add mongodb connection module`, `test: cover health route degraded path`. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `style`, `perf`.
- Commit only after `make check` passes; never commit generated output, `.env.local`, or `.local/`.
- Do not rewrite shared history; do not push or deploy without explicit agreement.

## Code style

- Prettier is the formatter (`npm run format`); ESLint covers correctness (`npm run lint`). Both are part of `make check`.
- Server Components by default; add `"use client"` only where state, effects, or browser APIs are needed (currently only `MainNav.jsx` and `app/error.jsx`).
- Every Route Handler returns the JSON envelope from `api/lib/http/responses.js`.
- Every user-visible number must say what it counts (roadmap Rule 4); avoid vague labels like "total".
