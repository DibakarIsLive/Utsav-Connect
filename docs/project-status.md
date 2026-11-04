# Project status

Last updated: 2026-11-04 · Branch `main` · Source of scope: [`Roadmap.md`](Roadmap.md)

Status vocabulary: **IMPLEMENTED** (code + tests + verified), **PARTIAL**, **UNVERIFIED** (exists, not proven), **PLANNED**, **BLOCKED**.

## Stage 1 closure status — BLOCKED (2026-11-04)

The foundation implementation and production build are complete, but Stage 1 is **not formally closed**. `make check-db` reaches Atlas but receives `MongoServerError: bad auth : authentication failed` for both configured databases. Therefore, `make ci` was not run: it requires the Atlas-backed integration suite to succeed and must not be bypassed.

Required external action: in Atlas, make the password for the configured database user match the current ignored `.env.local` value, then rerun `make check-db` followed by `make ci`. No Stage 2 work is authorized or started.

## Stage 1 — Foundation

| Roadmap item                                           | Status      | Evidence                                                                                                         |
| ------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| 0.1–0.12 Product specification                         | PARTIAL     | `product-requirements.md` covers goals, roles, pages, collections, statistics, open items                        |
| 2.1–2.4 Next.js App Router, JavaScript only            | IMPLEMENTED | `npm run check:js-only` passes; build creates no `tsconfig`/`next-env.d.ts`                                      |
| 2.5 Tailwind CSS                                       | IMPLEMENTED | Tailwind 4 via `@tailwindcss/turbopack`; `.bg-brand-600` present in built CSS                                    |
| 2.6 Folder structure                                   | IMPLEMENTED | `app/` (routes) · `ui/` (presentation) · `api/` (server-only) — see `architecture.md`                            |
| 2.7–2.8 Environment handling + `.env.example`          | IMPLEMENTED | `api/lib/env/env.js` (Zod, lazy); `.env.example` without secrets                                                 |
| 2.9 ESLint + Prettier                                  | IMPLEMENTED | `eslint.config.mjs`, `.prettierrc.json`; `npm run lint` and `format:check` pass                                  |
| 2.10 Git + `.gitignore`                                | IMPLEMENTED | `.env*.local`, `.next/`, `node_modules/`, `/.local/` ignored                                                     |
| 2.11 Automated checks                                  | IMPLEMENTED | `npm run check` = JS-only + lint + format + unit tests; `make ci` adds integration+build                         |
| 2.13 Documented install/dev/build                      | IMPLEMENTED | `README.md` + `Makefile` (targets verified)                                                                      |
| 2.14 Clean build                                       | IMPLEMENTED | `npm run build` → routes `/`, `/about`, `/map`, `/api/health`, `/_not-found`, `/icon.svg`                        |
| 3.2 Reusable MongoDB connection module                 | IMPLEMENTED | `api/lib/mongodb/connection.js`; 4 integration tests                                                             |
| 3.13 DB connection failure/recovery behaviour          | IMPLEMENTED | `DatabaseUnavailableError`; `/api/health` 503 verified live and in tests                                         |
| 3.14 Backup/restore procedure                          | PARTIAL     | Documented in `database.md`; not yet rehearsed against real data                                                 |
| 1.3–1.5 Desktop/mobile navigation, page layout         | IMPLEMENTED | `SiteHeader`, `MainNav` (mobile panel), `SiteFooter`; browser-verified (desktop width)                           |
| 1.6 Loading/empty/error states                         | PARTIAL     | `StatusNotice`, `not-found.jsx`, `error.jsx`; no loading skeletons yet (no async pages)                          |
| Basic pages: Home, About, Map placeholder              | IMPLEMENTED | Static routes; `/map` states explicitly that the map is not available                                            |
| Health endpoint                                        | IMPLEMENTED | `GET /api/health` 200/503 envelope, `Cache-Control: no-store`                                                    |
| Initial testing setup                                  | PARTIAL     | Vitest 4: 47 current unit tests pass; 6 integration tests remain blocked on current Atlas authentication         |
| 3.1 MongoDB deployment choice (hosted vs self-managed) | BLOCKED     | Atlas cluster `main` configured (ADR-012), but current credentials are rejected before verification can complete |
| 3.3–3.12 Schemas, indexes, migrations, seed data       | PLANNED     | Intentionally no collections before their first real use (roadmap Phase 3 note)                                  |
| 1.1–1.2 Visual identity                                | PARTIAL     | Minimal `@theme` tokens (brand scale, system fonts); full design system not done                                 |

## Stages 2–7

| Stage | Scope (roadmap)                                          | Status                                                                    |
| ----- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| 2     | Authentication, roles, protected routes (Phase 4)        | PLANNED — separate checkpoint; open decisions in `decisions.md` (ADR-010) |
| 3     | Geographic hierarchy, Google Maps, boundaries, proposals | PLANNED                                                                   |
| 4     | Population records, invitation reports, coverage         | PLANNED                                                                   |
| 5     | Dashboards, administration, analytics                    | PLANNED                                                                   |
| 6     | Notifications, leaderboard, exports                      | PLANNED                                                                   |
| 7     | Deployment, monitoring, backups, launch                  | PLANNED                                                                   |

## Verification record (2026-11-03)

All commands run from the repository root on macOS (Apple Silicon), Node v25.2.1, npm 11.6.2. The first run (morning) used a local MongoDB 8.3.1; the database-dependent rows were re-run the same day against the Atlas cluster `main` after the switch (ADR-012) — both results are shown.

| Command                                     | Result                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check:js-only`                     | passed                                                                                                                                                |
| `npm run lint`                              | 0 problems                                                                                                                                            |
| `npm run format:check`                      | all files formatted                                                                                                                                   |
| `npm run test:unit`                         | 5 files, 47 tests passed                                                                                                                              |
| `npm run check:db`                          | local: `host=127.0.0.1 … latency=17ms`; Atlas: `host=ac-6usgas3-shard-00-01.hvpic6x.mongodb.net database=utsav_connect latency=607ms`                 |
| `npm run test:integration`                  | local: 2 files, 6 passed; Atlas (`UTSAV_TEST_REQUIRE_DB=1`): 2 files, 6 passed in ≈13 s (two ~5 s unreachable-path cases + ≈600 ms per Atlas connect) |
| `npm run build`                             | compiled; 6 routes; JS-only check still passes afterwards                                                                                             |
| `make ci`                                   | check + integration (DB required) + build — passed                                                                                                    |
| `next start` + curl                         | `/` `/about` `/map` 200; `/api/health` 200 JSON; unknown path 404                                                                                     |
| Security headers (production)               | nosniff, DENY, strict-origin-when-cross-origin, Permissions-Policy, HSTS; no `X-Powered-By`                                                           |
| `next start` with unreachable `MONGODB_URI` | `/api/health` → 503 `SERVICE_DEGRADED` after bounded 5 s; pages still 200                                                                             |
| `next dev` + curl                           | same routes 200/404; HSTS correctly absent in development                                                                                             |
| Browser (Safari, live DOM)                  | `/` full DOM: header, `nav[aria-label=Primary]`, `aria-current=page`, main, footer, stylesheet; `/map` text shows the unavailable notice              |

**After the password rotation on 2026-11-03** the Atlas rows above must be re-run once the new password is set in Atlas (`make check-db`, `make ci`); until then `check:db` reports `bad auth`, which is expected.

## Stage 1 closure re-verification (2026-11-04)

| Check                                     | Actual result                                                                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make check-db`                           | **FAILED** — `MongoServerError: bad auth : authentication failed` (no URI or credential printed)                                                                                                    |
| `MONGODB_URI_TEST` probe                  | **FAILED** with the same authentication error; host is `main.hvpic6x.mongodb.net`, database is `utsav_connect_test`, and the `_test` isolation guard is valid                                       |
| Connection configuration review           | `MONGODB_URI` targets `utsav_connect`; `MONGODB_URI_TEST` targets `utsav_connect_test`; Mongoose uses a shared pool (`maxPoolSize: 10`) and 5 s connect/selection timeouts; errors are sanitized    |
| DNS/TCP/TLS diagnosis (preceding attempt) | Atlas SRV/TXT resolution and TCP port 27017 succeeded; current `bad auth` is returned after reaching Atlas, so it is an authentication problem rather than the previous IP/TLS reachability problem |
| `make ci`                                 | **NOT RUN** — correctly blocked by the failed database prerequisite; integration tests were not skipped or altered                                                                                  |
| `make build`                              | **PASSED** — Next.js 16.4.4 production build compiled successfully; 6 routes: `/`, `/_not-found`, `/about`, `/api/health`, `/icon.svg`, `/map`                                                      |

The most likely cause is that the Atlas user's stored password does not match the current value in `.env.local`. Roles cannot be verified until authentication succeeds. The generated password is alphanumeric, so URI escaping is not a factor.

**Not verified:** mobile-width menu toggling in a real browser (only the markup/aria wiring was inspected); rendering in Arc (Raycast's browser extension could not connect); accessibility audit tooling (axe/Lighthouse) not run.

## Known limitations

- `eslint@9.39.x` prints a "no longer supported" deprecation; ESLint 10 is blocked by `eslint-config-next@16.4.4` plugin peer ranges (ADR-006).
- Unreachable-database tests take ~5 s each because `serverSelectionTimeoutMS` is 5 000 ms by design.
- Every connection to Atlas costs ≈ 600 ms from the developer's location; the health endpoint's first call and the integration suite are correspondingly slower than against a local server.
- The Atlas free tier has no automatic backups; only the manual `mongodump` procedure in `database.md` exists and it has not been rehearsed.
- Atlas authentication currently fails (`bad auth`), so test-database connectivity, integration tests, and the final `make ci` closure gate are blocked.
- No `AGENTS.md` was generated by `next dev` in this environment; the project's own one is hand-written.
- No sub-agent / parallel-agent tooling was available in the session that produced this milestone; all work was done by a single agent and self-reviewed.

## Next batch (proposed)

Complete the Atlas password alignment and rerun `make check-db` then `make ci`. Only after that successful closure—and separate authorization—may Stage 2 authentication begin.
