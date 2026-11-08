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

- Date: 2026-11-03 · Updated: 2026-11-05 · Status: **RESOLVED (design)** — the owner accepted the ADR-014 baseline. Implementation is **not** authorized until Batch 0 is explicitly approved. Applicant/audit retention periods and account deletion remain deferred policy decisions.
- Options considered: (a) Auth.js v5 (`next-auth@5` beta, App Router native, MongoDB adapter available; beta status is a risk); (b) `next-auth@4` (stable but Pages-Router-era API); (c) first-party session cookies with a `users` collection, Argon2id hashing, and CSRF handling (full control, more code to secure).
- Decision: first-party authentication with opaque MongoDB-backed sessions, email + password, and server-side authorization. Public registration is a **devotee application**, never immediate account access. Email delivery is a hard dependency for verification, decisions, recovery, and administrator invitations; public applications remain disabled until a provider and verified sender domain are configured. The detailed baseline is ADR-014.
- Deferred policy: applicant-PII and audit-log retention periods, automatic deletion/purge, and account deletion. No automatic purge job runs in Stage 2. These are not approved by this ADR.
- Change note (2026-11-05): the original three questions (registration policy, email verification, credential method) are resolved by the application-first design in ADR-014.

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
- Consequences: Stage 1 is closed as of 2026-11-04. The product-requirements baseline remains PARTIAL; ADR-010 is resolved (design) and ADR-014 is accepted, but Stage 2 implementation is not authorized or started. Future credential incidents use the same rule: rotate first, then re-run the full gate.

## ADR-014 — Stage 2 authentication, devotee application, and administration baseline

- Date: 2026-11-04 · Revised: 2026-11-05 · Status: **ACCEPTED** — design decision accepted by the owner. Implementation is **not authorized** until Batch 0 is explicitly approved.
- Context: ADR-010 left the authentication approach and product questions open. Stage 2 needs a concrete design that fits the JavaScript-only Next.js App Router application, MongoDB Atlas, server-side authorization, immediate session revocation, and the existing HTTP envelope. The owner requires mandatory devotee application approval, a `/admin/devotees` management dashboard, a Super Admin/Admin hierarchy, stricter applicant-PII rules, and invitation-report privacy. The full decision record is in `stage-2-decision-report.md`.
- Decision: use a small first-party authentication layer with opaque database-backed sessions rather than Auth.js v5 beta or `next-auth@4`. Use email + password, Argon2id hashing, hashed single-use tokens, a `__Host-` secure cookie in production, MongoDB-backed rate limiting, and append-only audit logs.
- Devotee application: the form contains only full name, email, password, phone, gender (Male/Female), and an optional custom message. **Date of birth is not collected and no age eligibility check is performed (D-22 resolved).** Every application starts `pending`; the account is created as `pending_verification` and receives no devotee access until email verification and administrator approval. Rejection is allowed for unverified applications; approval requires a verified email. Rejections send a generic notice and never expose internal notes or reviewer-only information.
- Applicant access: a verified applicant whose application is `pending_approval` or `rejected` may authenticate to a **limited applicant session** that can view only `/application-status` and their own application summary. It cannot access the dashboard, reports, proposals, account profile editing, or any devotee/admin API. The reserved `expired` state has no Stage 2 login eligibility. Approval revokes the limited session and the user logs in fresh with full devotee access. D-25 is **ACCEPTED** (Option A); D-26 keeps application access separate from activation.
- Roles and permissions: stored roles are `devotee`, `admin`, and `super_admin`; `visitor` is anonymous. There is **one** administrative role, with granular `adminPermissions`. "Moderator" is a responsibility/permission profile, not a stored role. Administrator creation, permission changes, and Super Admin privilege changes are Super Admin-only. Critical security settings are deployment environment controls in Stage 2, not an in-app permission. Super Admin capabilities are not assignable through ordinary permission updates. One Super Admin exists initially, with a documented and tested CLI recovery procedure.
- Sessions: opaque 32-byte tokens, hashed at rest; 7-day idle and 30-day absolute lifetimes. Use **one effective TTL index** on `expiresAt`, capped at `absoluteExpiresAt`; enforce the absolute limit again in session validation. Do not create independent TTL indexes on both timestamps.
- Email: provider-agnostic transactional adapter. Public applications remain disabled until a provider and verified sender domain are configured and verification, password recovery, and administrator-invitation delivery have been tested.
- Privacy: phone, gender, email, and custom messages are private applicant data; they are never exposed in public APIs, public pages, other devotees' profiles, aggregate analytics, logs, or audit metadata. DOB is not collected at all. Invitation reports store the submitter separately from the participant count, contain no invitee PII by default, and expose contributor identities only to authorized administrators. Ordinary devotees cannot see another contributor's identity.
- Retention: no automatic applicant-PII deletion or purge job runs in Stage 2. Applicant/audit retention periods remain deferred until explicitly approved. The `expired` state is reserved and is not set by an automatic job in Stage 2. Account deletion remains deferred.
- Rejected for now: (a) Auth.js v5 beta — beta dependency, and the Credentials provider still requires custom user/password/session logic for database-session revocation; (b) `next-auth@4` — Pages-Router-era API and migration risk; (c) JWT-only sessions — revocation and suspension would be delayed or require a denylist; (d) OAuth/magic-link at launch — adds provider dependencies before the core account model is proven; (e) open registration with immediate devotee access — violates the mandatory approval workflow; (f) a separate Admin and Moderator role pair — one admin role with granular grants is simpler and avoids contradictory permission checks; (g) independent TTL indexes on both idle and absolute expiry — one effective TTL plus validation is safer and avoids competing deletion rules; (h) collecting DOB without a documented purpose — removed by owner decision.
- Consequences: the application owns CSRF, rate limiting, token handling, session revocation, application-state transitions, PII access checks, and privilege-escalation defences, so the security and privacy test matrix in `stage-2-authentication-spec.md` is mandatory. Native Argon2 support must be verified on the deployment target; Node `crypto.scrypt` is the documented fallback. Email delivery is a hard Stage 2 dependency. No code, collection, dependency, or environment variable has been added by this ADR.
