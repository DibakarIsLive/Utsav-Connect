# Project status

Last updated: 2026-11-05 · Branch `main` · Source of scope: [`Roadmap.md`](Roadmap.md)

Status vocabulary: **IMPLEMENTED** (code + tests + verified), **PARTIAL**, **UNVERIFIED** (exists, not proven), **PLANNED**, **BLOCKED**.

## Stage 1 closure status — CLOSED (2026-11-04)

Stage 1 is formally closed. After the Atlas database user's password was reset and both local connection strings were updated, `make check-db` reached Atlas, the complete `make ci` pipeline passed (including the six Atlas-backed integration tests with `UTSAV_TEST_REQUIRE_DB=1`), and the production build was served and checked over HTTP. No check was skipped or weakened.

The product-requirements baseline remains PARTIAL (Phase 0 open decisions are recorded in `product-requirements.md` and ADR-010), but that is not a Stage 1 release-gate failure. **Stage 2 implementation has not been started** and requires explicit authorization.

## Stage 2 preparation — ACCEPTED DESIGN (2026-11-05, documentation only)

Stage 2 design was revised to require a **devotee application and approval workflow**, a limited applicant session for own status/summary, one stored `admin` role with granular permissions, a `/admin/devotees` management dashboard, stricter applicant-PII rules, no DOB, and invitation-report privacy. The owner accepted D-01, D-08, D-17, D-18, D-19, D-20, D-21, D-22, D-24, D-25, and D-26. **No Stage 2 code is present on `main` or in repository history**, and nothing in this revision authorizes implementation.

| Artifact                                                           | Status            | Contents                                                                                                                                                                   |
| ------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`stage-2-decision-report.md`](stage-2-decision-report.md)         | DECISIONS LOCKED  | D-01–D-27 register, accepted decisions, deferred policy items, and Batch 0 checklist                                                                                       |
| [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md) | ACCEPTED DESIGN   | Application-first workflow, limited applicant session, roles/permissions, seven models and indexes, one session TTL, dashboard, API contracts, privacy, tests, and batches |
| [`decisions.md`](decisions.md) ADR-010 / ADR-014                   | RESOLVED/ACCEPTED | ADR-010 resolved (design); ADR-014 accepted as the design baseline; implementation still unauthorized                                                                      |
| [`architecture.md`](architecture.md) §8                            | UPDATED           | Accepted application-first flow, limited session, role hierarchy, dashboard boundaries, PII and invitation-report boundaries                                               |
| [`database.md`](database.md) Stage 2 collections                   | UPDATED           | Seven proposed auth/application collections, one session TTL index, no retention job, and report privacy shape                                                             |
| [`security.md`](security.md) Stage 2 design                        | UPDATED           | Accepted controls, applicant privacy rules, privilege-escalation defences, and invitation-report privacy                                                                   |
| [`testing.md`](testing.md) Stage 2 plan                            | UPDATED           | Planned unit/integration/E2E/security matrix for applications, limited sessions, approval, roles, PII, and reports                                                         |
| [`deployment.md`](deployment.md) Stage 2 configuration             | UPDATED           | Accepted email, application-mode, index, Super Admin bootstrap/recovery, and rollback requirements; no retention job                                                       |
| [`Roadmap.md`](Roadmap.md) Phase 4 / Stage 2                       | UPDATED           | Application workflow, limited applicant session, roles, dashboard, privacy rules, acceptance criteria, and revised batches                                                 |
| [`product-requirements.md`](product-requirements.md)               | UPDATED           | Roles, pages, six application fields, report privacy, and resolved/deferred decisions                                                                                      |
| `README.md`, `CHANGELOG.md`                                        | UPDATED           | Status, accepted auth/application scope, roadmap, docs index, and change record                                                                                            |

**Accepted:** D-01, D-08, D-17, D-18, D-19, D-20, D-21, D-22, D-24, D-25, D-26. **DOB is removed completely**; the six fields are full name, email, password, phone, gender (Male/Female), and optional custom message. **Deferred:** D-10 audit retention, D-19 applicant-PII retention periods, D-07 account deletion, and D-16 Stage 3–7 platform choices. No automatic purge/expiry job runs in Stage 2.

**D-25 accepted:** Option A is approved. A verified applicant whose application is `pending_approval` or `rejected` may hold an `application`-scope session for `/application-status` and `GET /api/account/application` only. The reserved `expired` state cannot log in or hold any session. Batch 0 still requires explicit implementation approval.

**Preparation verification (2026-11-05):** this was a documentation-only change; no authentication code, model, dependency, collection, or environment variable was added. `make check` passed after the final edits (JavaScript-only guard, ESLint, Prettier, 5 unit files / 47 tests). `git diff --check` passed, and every relative link in the 13 edited Markdown files resolved (56 links). No Stage 2 integration, build, or browser check can exist because no Stage 2 feature or code changed.

| Command      | Result                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `make check` | **PASSED** — JS-only guard, ESLint, Prettier, 5 unit files / 47 tests; no Stage 2 test exists yet |

This confirms the documentation change does not introduce TypeScript or break the static/unit gate. It does **not** verify any Stage 2 behaviour. No new browser check was run because no UI changed; the prior Stage 1 browser record remains the latest browser evidence.

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

| Stage | Scope (roadmap)                                                   | Status                                                            |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| 2     | Devotee applications, approval, roles, protected routes (Phase 4) | ACCEPTED DESIGN — docs complete; Batch 0 awaits explicit approval |
| 3     | Geographic hierarchy, Google Maps, boundaries, proposals          | PLANNED                                                           |
| 4     | Population records, invitation reports, coverage                  | PLANNED                                                           |
| 5     | Dashboards, administration, analytics                             | PLANNED                                                           |
| 6     | Notifications, leaderboard, exports                               | PLANNED                                                           |
| 7     | Deployment, monitoring, backups, launch                           | PLANNED                                                           |

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

Stage 1 is closed and Stage 2 **implementation has not started**. The design decisions are accepted (ADR-010 resolved, ADR-014 accepted, D-25 accepted), but Batch 0 requires explicit owner approval.

**Exact next implementation batch (only after approval): Stage 2 Batch 0 — foundation.**

- Implement the already-recorded decisions in `docs/decisions.md`; do not reopen them.
- Add auth/application/email environment variables to `.env.example` and `api/lib/env/env.js`. No retention or purge variables.
- Add seven Mongoose models with indexes and safe projections: `user`, `session`, `auth-token`, `rate-limit`, `audit-log`, `devotee-application`, and `devotee-application-note`.
- Add password, token, session-cookie (with scope), permission, application-state, CSRF, rate-limit, validation, and audit primitives with unit tests.
- Add `scripts/create-super-admin.js` (including documented recovery) and `scripts/sync-indexes.js`. Do **not** add a `create-user` or `create-admin` script; either would bypass the mandatory application/invitation workflow.
- Add integration tests for model constraints/indexes, application-state transitions, permission grants, the limited applicant session, and the Super Admin bootstrap/recovery.
- Do **not** add login UI, application UI, administrator UI, or public auth Route Handlers in Batch 0.
- Gate: `make check`, `make ci` (Atlas `_test` database, no skips), production build, documentation update.

The final decision checklist is in `stage-2-decision-report.md` §8. Until the owner explicitly approves it, no authentication code, model, dependency, collection, environment variable, or database bootstrap should be added. D-10, D-19 retention, D-07 deletion, and D-16 remain deferred and must not be implemented by assumption.
