# Architecture decision records

Status vocabulary: **ACCEPTED** · **IMPLEMENTED** · **PROPOSED** · **SUPERSEDED** · **OPEN**. Newest records are appended at the end.

---

## ADR-001 — Single Next.js app with `app/` + `ui/` + `api/` at the root

- Date: 2026-11-03 · Status: IMPLEMENTED
- Context: The roadmap mandates Next.js App Router for frontend and backend and JavaScript only; the project owner prefers `ui/` and `api/` folders but asked not to break framework correctness or create a second runnable app.
- Decision: One package. `app/` contains routing only (pages and `app/api/**/route.js`), `ui/` contains presentation, `api/` contains server-only code guarded by `server-only`. `jsconfig.json` maps `@/*` to the root so imports read `@/ui/...` and `@/api/...`.
- Rejected: (a) separate `api/` package with its own `package.json` — duplicate lockfiles, two processes, breaks Route Handlers; (b) `src/` layout — hides the `ui`/`api` split the owner wanted; (c) everything under `app/` — mixes routing with domain code.
- Consequences: Clear import rules (see `architecture.md` §2). An ESLint rule forbids relative `../api/*` imports.

## ADR-002 — Mongoose for persistence, Zod for input validation

- Date: 2026-11-03 · Status: IMPLEMENTED (connection layer); models PLANNED
- Context: Roadmap requires MongoDB, GeoJSON, geospatial indexes, schema validation and migrations; Zod is the chosen input validator.
- Decision: Mongoose 9 for schemas, indexes (incl. `2dsphere`) and connection pooling; Zod 4 for environment and HTTP request validation. Mongoose validation is the database-side guard; Zod is the API-side contract.
- Rejected: raw `mongodb` driver with `$jsonSchema` validators — more hand-written plumbing for hierarchy/geo features.

## ADR-003 — Tailwind CSS 4 through the Turbopack loader

- Date: 2026-11-03 · Status: IMPLEMENTED
- Decision: Use `@tailwindcss/turbopack` with the `turbopack.rules["*.css"]` entry in `next.config.mjs` — exactly what `create-next-app@16.4.4 --tailwind` emits — instead of `@tailwindcss/postcss` + `postcss.config.mjs`.
- Verification: the production CSS chunk contains the custom `--color-brand-600` token and `.bg-brand-600` utilities.
- Fallback: switch to the PostCSS plugin if the loader breaks on a future Next release.

## ADR-004 — Lazy, Zod-validated environment; no `dotenv`

- Date: 2026-11-03 · Status: IMPLEMENTED
- Decision: `api/lib/env/env.js` parses `process.env` on first use and memoises the result; `next build` therefore does not need a database. Scripts and tests load `.env.local` with Node's built-in `process.loadEnvFile`.
- Consequences: a misconfigured variable fails with its name on first server use; values are never printed.

## ADR-005 — Console-based JSON-line logger with redaction

- Date: 2026-11-03 · Status: IMPLEMENTED
- Decision: `api/lib/logging/logger.js` writes one JSON object per line via `console.*`, honours `LOG_LEVEL`, redacts keys such as `password`, `token`, `secret`, `authorization`, `cookie`, `mongodb_uri`, and omits stack traces in production.
- Rejected for now: `pino`/`winston` — unnecessary dependency at this size; the interface (`logger.info(message, context)`) allows swapping later.

## ADR-006 — ESLint 9 (not 10) and Vitest 4 (not 5)

- Date: 2026-11-03 · Status: ACCEPTED
- Context: `eslint-config-next@16.4.4` declares `eslint >= 9`, but its bundled `eslint-plugin-import` / `jsx-a11y` / `react` only accept `^9`, producing invalid peer markers under ESLint 10. `vitest@5.1.0` requires Node `^22.12 || ^24 || >=26`, excluding the Node 25 used for development.
- Decision: pin `eslint ^9.39.0` and `vitest ^4.1.12`. Revisit when `eslint-config-next` updates its plugins and when Vitest supports Node 25 or the team moves to Node 24 LTS.
- Known item: ESLint 9.39 prints an end-of-support deprecation warning on install.

## ADR-007 — Health endpoint contract

- Date: 2026-11-03 · Status: IMPLEMENTED
- Decision: `GET /api/health` is `force-dynamic`, sends `Cache-Control: no-store`, returns 200 with `{ status: "ok" }` or 503 with `error.code = "SERVICE_DEGRADED"` plus per-check detail. Database timeouts are bounded (5 s). Pages never depend on it.

## ADR-008 — Testing stack: Vitest, unit + integration, real MongoDB gated by database name

- Date: 2026-11-03 · Status: IMPLEMENTED
- Decision: Vitest 4 in Node environment. Integration suites run against `MONGODB_URI_TEST`, whose database name must end in `_test` (enforced by `tests/helpers/database.js`), and skip with a notice if the server is unreachable unless `UTSAV_TEST_REQUIRE_DB=1` (used by `make ci`). Unreachable-path tests target `mongodb://127.0.0.1:1/...`.
- Rejected for now: `mongodb-memory-server` (downloads a binary; the owner runs a local `mongod`), Playwright (no interactive features yet — revisit in Stage 2).

## ADR-009 — Next.js Cache Components not enabled yet

- Date: 2026-11-03 · Status: ACCEPTED
- Context: Next 16 ships `cacheComponents` as opt-in and documents that it becomes default in the next major.
- Decision: keep the classic caching model (segment config such as `dynamic = "force-dynamic"`). Adopt Cache Components deliberately, with a migration pass over every route, before upgrading to Next 17.

## ADR-010 — Authentication approach

- Date: 2026-11-03 · Status: OPEN (blocks Stage 2)
- Options: (a) Auth.js v5 (`next-auth@5` beta, App Router native, MongoDB adapter available; beta status is a risk); (b) `next-auth@4` (stable but Pages-Router-era API); (c) hand-rolled session cookies with `users` collection, Argon2/bcrypt hashing, and CSRF handling (full control, more code to secure).
- Needs from the owner: registration policy (open vs invite), whether email verification is required at launch (needs an email provider), password-based vs magic-link/OAuth.
- Decision: deferred until the owner answers; no auth code exists in the repository.

## ADR-011 — License

- Date: 2026-11-03 · Status: ACCEPTED
- Context: `LICENSE` contains MIT (2026, Dibakar Is Live); an earlier README draft called the project proprietary.
- Decision: keep MIT as the committed license and state it in the README. If the owner intends the project to be proprietary, the `LICENSE` file must change explicitly — not silently via README text.

## ADR-012 — MongoDB Atlas is the project database for development and tests

- Date: 2026-11-03 · Status: IMPLEMENTED (development + tests, live authentication verified 2026-11-04); production tier/backup plan OPEN
- Context: Stage 1 was verified against a developer-started local `mongod`. A hosted cluster was needed so that every contributor and future deployment use the same database service, and so transactions (replica-set only) are available before Stage 3.
- Decision: use the MongoDB Atlas cluster `main` (`mongodb+srv://`). Development uses database `utsav_connect`, integration tests use `utsav_connect_test` on the same cluster. Connection strings always carry the database name and `retryWrites=true&w=majority`. Credentials live in `.env.local` only; `.env.example` ships Atlas-shaped placeholders. The Makefile no longer probes a local port — `check-db`/`check-health` ping whatever `MONGODB_URI` points at and never start or stop a server.
- Consequences: no local MongoDB process is required (a local `mongodb://` URI still works offline); each connection costs ≈ 600 ms from India, so health checks and integration tests are slower; the free tier has no automatic backups, so a manual `mongodump` procedure is documented until a production tier is chosen; Atlas Network Access must be restricted to known IPs.
- Follow-ups: decide the production tier, region and backup schedule (Stage 7); scope the database user to `readWrite` on the two project databases.

## ADR-013 — Stage 1 closes only on the full gate, with no bypass

- Date: 2026-11-04 · Status: IMPLEMENTED
- Context: Stage 1 was blocked when Atlas rejected the configured credentials. The fix was an external credential reset in Atlas plus updated ignored local URIs, not a code or test change.
- Decision: close Stage 1 only after `make check-db` succeeds, `make ci` runs the database-required integration suite and production build without skipping, and the built app is served for route/health/header checks. Record exact results in `project-status.md`, `testing.md`, `deployment.md`, and the changelog.
- Consequences: Stage 1 is closed as of 2026-11-04. The product-requirements baseline remains PARTIAL and ADR-010 decisions remain open; Stage 2 is not authorized or started. Future credential incidents use the same rule: rotate first, then re-run the full gate.
