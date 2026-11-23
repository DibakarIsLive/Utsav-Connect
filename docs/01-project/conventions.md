# Conventions

Last updated: 2026-11-17. Derived from the project naming guide and the (archived) [original roadmap](../06-history/original-roadmap.md); framework requirements win when they conflict. See the [documentation index](../README.md) for the current document layout.

## Language

- JavaScript and JSX only. React components use `.jsx`; everything else uses `.js`. Config files that must be ES modules use `.mjs` (`next.config.mjs`, `eslint.config.mjs`, `vitest.config.mjs`, `playwright.config.mjs`).
- `package.json` has `"type": "module"`, so every `.js` file is an ES module (`import`/`export`).
- Forbidden: `.ts`, `.tsx`, `.mts`, `.cts`, `tsconfig*.json`, `next-env.d.ts`. `npm run check:js-only` enforces this and runs inside `npm run check`.

## Naming

| Thing                           | Style                                                          | Example                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folders and non-component files | kebab-case                                                     | `api/lib/mongodb/connection.js`                                                                                                                                               |
| React components                | PascalCase file and export                                     | `ui/components/layout/SiteHeader.jsx`                                                                                                                                         |
| Hooks                           | `useX.js`                                                      | `ui/hooks/useViewport.js` (none yet)                                                                                                                                          |
| Variables, functions            | camelCase                                                      | `connectToDatabase`, `latencyMs`                                                                                                                                              |
| True constants                  | UPPER_SNAKE_CASE                                               | `CONNECTION_OPTIONS`, `PRIMARY_NAV_ITEMS`                                                                                                                                     |
| Next.js special files           | as required by Next                                            | `page.jsx`, `layout.jsx`, `route.js`, `not-found.jsx`, `error.jsx`                                                                                                            |
| Docs                            | kebab-case `.md` in numbered topic folders                     | `docs/01-project/conventions.md`; exceptions `README.md`, `CHANGELOG.md`, `LICENSE`. Active plan: `docs/roadmap.md`; archived original: `docs/06-history/original-roadmap.md` |
| Environment variables           | UPPER_SNAKE_CASE; browser-exposed ones prefixed `NEXT_PUBLIC_` | `MONGODB_URI`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`                                                                                                                              |
| Log event names                 | `area.action` dotted lowercase                                 | `mongodb.connected`, `health.database_unavailable`                                                                                                                            |
| API error codes                 | UPPER_SNAKE_CASE strings                                       | `VALIDATION_ERROR`, `SERVICE_DEGRADED`                                                                                                                                        |

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
- Server Components by default; add `"use client"` only where state, effects or browser APIs are needed. Many admin, account, map and UI components now qualify (roughly 40 client components across `ui/components/`). Check the file header before assuming a component is server-rendered.
- Every Route Handler returns the JSON envelope from `api/lib/http/responses.js`.
- Every user-visible number must say what it counts (roadmap Rule 4); avoid vague labels like "total".

## Documentation structure

- `docs/README.md` is the index; `docs/MAINTENANCE.md` defines when each document must be updated.
- Numbered folders are stable: `01-project`, `02-architecture`, `03-features`, `04-quality`, `05-operations`, `06-history`.
- The active roadmap is `docs/roadmap.md` (lowercase). The original long-form plan is archived as `docs/06-history/original-roadmap.md`. Do not recreate a root-level `Roadmap.md`.
- Historical documents carry a banner explaining their date and why they were archived; never delete useful historical information silently.
