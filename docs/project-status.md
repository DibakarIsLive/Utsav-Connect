# Project status

Last updated: 2026-11-04 · Branch `main` · Source of scope: [`Roadmap.md`](Roadmap.md)

Status vocabulary: **IMPLEMENTED** (code + tests + verified), **PARTIAL**, **UNVERIFIED** (exists, not proven), **PLANNED**, **BLOCKED**.

## Stage 1 closure status — CLOSED (2026-11-04)

Stage 1 is formally closed. After the Atlas database user's password was reset and both local connection strings were updated, `make check-db` reached Atlas, the complete `make ci` pipeline passed (including the six Atlas-backed integration tests with `UTSAV_TEST_REQUIRE_DB=1`), and the production build was served and checked over HTTP. No check was skipped or weakened.

The product-requirements baseline remains PARTIAL (Phase 0 open decisions are recorded in `product-requirements.md` and ADR-010), but that is not a Stage 1 release-gate failure. **Stage 2 has not been started** and requires explicit authorization.

## Stage 1 — Foundation

| Roadmap item                                           | Status      | Evidence                                                                                                             |
| ------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| 0.1–0.12 Product specification                         | PARTIAL     | `product-requirements.md` covers goals, roles, pages, collections, statistics, open items                            |
| 2.1–2.4 Next.js App Router, JavaScript only            | IMPLEMENTED | `npm run check:js-only` passes; build creates no `tsconfig`/`next-env.d.ts`                                          |
| 2.5 Tailwind CSS                                       | IMPLEMENTED | Tailwind 4 via `@tailwindcss/turbopack`; `.bg-brand-600` present in built CSS                                        |
| 2.6 Folder structure                                   | IMPLEMENTED | `app/` (routes) · `ui/` (presentation) · `api/` (server-only) — see `architecture.md`                                |
| 2.7–2.8 Environment handling + `.env.example`          | IMPLEMENTED | `api/lib/env/env.js` (Zod, lazy); `.env.example` without secrets                                                     |
| 2.9 ESLint + Prettier                                  | IMPLEMENTED | `eslint.config.mjs`, `.prettierrc.json`; `npm run lint` and `format:check` pass                                      |
| 2.10 Git + `.gitignore`                                | IMPLEMENTED | `.env*.local`, `.next/`, `node_modules/`, `/.local/` ignored                                                         |
| 2.11 Automated checks                                  | IMPLEMENTED | `npm run check` = JS-only + lint + format + unit tests; `make ci` adds integration+build                             |
| 2.13 Documented install/dev/build                      | IMPLEMENTED | `README.md` + `Makefile` (targets verified)                                                                          |
| 2.14 Clean build                                       | IMPLEMENTED | `npm run build` → routes `/`, `/about`, `/map`, `/api/health`, `/_not-found`, `/icon.svg`                            |
| 3.2 Reusable MongoDB connection module                 | IMPLEMENTED | `api/lib/mongodb/connection.js`; 4 integration tests                                                                 |
| 3.13 DB connection failure/recovery behaviour          | IMPLEMENTED | `DatabaseUnavailableError`; `/api/health` 503 verified live and in tests                                             |
| 3.14 Backup/restore procedure                          | PARTIAL     | Documented in `database.md`; not yet rehearsed against real data                                                     |
| 1.3–1.5 Desktop/mobile navigation, page layout         | IMPLEMENTED | `SiteHeader`, `MainNav` (mobile panel), `SiteFooter`; browser-verified (desktop width)                               |
| 1.6 Loading/empty/error states                         | PARTIAL     | `StatusNotice`, `not-found.jsx`, `error.jsx`; no loading skeletons yet (no async pages)                              |
| Basic pages: Home, About, Map placeholder              | IMPLEMENTED | Static routes; `/map` states explicitly that the map is not available                                                |
| Health endpoint                                        | IMPLEMENTED | `GET /api/health` 200/503 envelope, `Cache-Control: no-store`                                                        |
| Initial testing setup                                  | IMPLEMENTED | Vitest 4: 47 unit tests and 6 Atlas-backed integration tests pass; full `make ci` passed                             |
| 3.1 MongoDB deployment choice (hosted vs self-managed) | IMPLEMENTED | Atlas cluster `main` configured (ADR-012); live authentication verified 2026-11-04 via `make check-db` and `make ci` |
| 3.3–3.12 Schemas, indexes, migrations, seed data       | PLANNED     | Intentionally no collections before their first real use (roadmap Phase 3 note)                                      |
| 1.1–1.2 Visual identity                                | PARTIAL     | Minimal `@theme` tokens (brand scale, system fonts); full design system not done                                     |

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

The Atlas rows above were re-run successfully on 2026-11-04 after the database-user password was aligned; see the closure record below. The earlier `bad auth` result is superseded.

## Stage 1 closure verification (2026-11-04)

An earlier attempt on the same day failed with `MongoServerError: bad auth : authentication failed`. That failed attempt is superseded by the successful run below; the history remains in Git.

| Check                                                                         | Actual result                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make check-db`                                                               | **PASSED** — `MongoDB reachable: host=ac-6usgas3-shard-00-01.hvpic6x.mongodb.net database=utsav_connect latency=621ms`; no URI or credential printed                                                                             |
| `make ci`                                                                     | **PASSED** — JS-only guard, ESLint, Prettier, 47 unit tests, 6 integration tests (2 files; 8.54 s on the closure run, 7.65 s on the final post-documentation rerun) with `UTSAV_TEST_REQUIRE_DB=1`, and the production build     |
| Integration database isolation                                                | `MONGODB_URI_TEST` targets `utsav_connect_test`; the `_test` suffix guard was active; the suite only connects and pings                                                                                                          |
| `make build`                                                                  | **PASSED** — Next.js 16.4.4 compiled successfully; 6 routes: `/`, `/_not-found`, `/about`, `/api/health`, `/icon.svg`, `/map`                                                                                                    |
| Production smoke test (`next start`, port 3100)                               | `/` `/about` `/map` → 200; `/api/health` → 200 `{"status":"ok"}` with database latency 41 ms; unknown path → 404                                                                                                                 |
| Production headers                                                            | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS (`max-age=31536000; includeSubDomains`), `Cache-Control: no-store`; no `X-Powered-By` |
| Degraded database path (`MONGODB_URI` → `mongodb://127.0.0.1:1/…`, port 3101) | Page `/` still 200; `/api/health` → 503 `SERVICE_DEGRADED` after a bounded 5 025 ms; no driver error text in the response                                                                                                        |

**Not verified in this closure run:** a new real-browser check, mobile-width menu toggling (only the markup/ARIA wiring was inspected earlier), and rendering in Arc (Raycast's browser extension could not connect earlier). The prior desktop-browser record stands; accessibility tooling (axe/Lighthouse) has still not been run.

## Known limitations

- `eslint@9.39.x` prints a "no longer supported" deprecation; ESLint 10 is blocked by `eslint-config-next@16.4.4` plugin peer ranges (ADR-006).
- Unreachable-database tests take ~5 s each because `serverSelectionTimeoutMS` is 5 000 ms by design.
- Every connection to Atlas costs ≈ 600 ms from the developer's location; the health endpoint's first call and the integration suite are correspondingly slower than against a local server.
- The Atlas free tier has no automatic backups; only the manual `mongodump` procedure in `database.md` exists and it has not been rehearsed.
- Atlas authentication is verified, but the database user's exact role grants and the Network Access allow-list have not been independently audited from inside the application.
- No `AGENTS.md` was generated by `next dev` in this environment; the project's own one is hand-written.
- No sub-agent / parallel-agent tooling was available in the session that produced this milestone; all work was done by a single agent and self-reviewed.

## Next batch

Stage 1 is closed; no implementation work is in progress. Stage 2 authentication requires explicit owner authorization and decisions on the open questions in ADR-010 (registration policy, email verification, password versus magic-link/OAuth). Until those decisions are made, no authentication code should be written.
