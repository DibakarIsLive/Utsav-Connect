# Architecture decision records

Status vocabulary: **ACCEPTED · IMPLEMENTED · PROPOSED · SUPERSEDED · OPEN · RESOLVED (design)**.

This file preserves every historical decision (ADR-001–ADR-017), reorganized into a consistent format without silently changing an approved decision. Where a recorded claim is now factually outdated, the original decision text is left untouched and a dated **Implementation note (correction, 2026-11-17)** records the correction. ADR-018 onward are **PROPOSED** only and require owner approval; they are not approved.

Related documents: [architecture.md](architecture.md) · [database.md](database.md) · [roadmap](../roadmap.md) · [Stage 2 authentication spec](../06-history/stage-2-authentication-spec.md) · [Stage 2 decision report](../06-history/stage-2-decision-report.md) · [original roadmap](../06-history/original-roadmap.md).

## Topic index

| ADR                 | Topic(s)                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ADR-001](#adr-001) | JS/JSX-only; `app/` + `ui/` + `api/` layering                                                                                                                                  |
| [ADR-002](#adr-002) | MongoDB sessions; geographic hierarchy; population/coverage (Mongoose/GeoJSON)                                                                                                 |
| [ADR-003](#adr-003) | Build tooling (Tailwind CSS 4)                                                                                                                                                 |
| [ADR-004](#adr-004) | Environment configuration                                                                                                                                                      |
| [ADR-005](#adr-005) | Audit logging (logger foundation)                                                                                                                                              |
| [ADR-006](#adr-006) | JS/JSX-only (pinned tool versions)                                                                                                                                             |
| [ADR-007](#adr-007) | Health endpoint contract                                                                                                                                                       |
| [ADR-008](#adr-008) | Test/pilot DB separation; testing stack                                                                                                                                        |
| [ADR-009](#adr-009) | Caching model                                                                                                                                                                  |
| [ADR-010](#adr-010) | Argon2id/auth; email delivery                                                                                                                                                  |
| [ADR-011](#adr-011) | License                                                                                                                                                                        |
| [ADR-012](#adr-012) | Test/pilot DB separation; MongoDB Atlas                                                                                                                                        |
| [ADR-013](#adr-013) | Stage gate discipline                                                                                                                                                          |
| [ADR-014](#adr-014) | Argon2id/auth; MongoDB sessions; role/permission architecture; application-scoped sessions; Super Admin bootstrap/recovery; contributor privacy; audit logging; email delivery |
| [ADR-015](#adr-015) | Email delivery; audit logging                                                                                                                                                  |
| [ADR-016](#adr-016) | Admin invitation lifecycle; email delivery                                                                                                                                     |
| [ADR-017](#adr-017) | Client identifier contract                                                                                                                                                     |
| [ADR-018](#adr-018) | PROPOSED — account lifecycle states and transitions                                                                                                                            |
| [ADR-019](#adr-019) | PROPOSED — suspension/reinstatement semantics                                                                                                                                  |
| [ADR-020](#adr-020) | PROPOSED — in-app messaging privacy and scope                                                                                                                                  |
| [ADR-021](#adr-021) | PROPOSED — announcements                                                                                                                                                       |
| [ADR-022](#adr-022) | PROPOSED — notification centre and deduplication                                                                                                                               |
| [ADR-023](#adr-023) | PROPOSED — shared account directory and responsibility assignment                                                                                                              |
| [ADR-024](#adr-024) | PROPOSED — data retention and deletion policy                                                                                                                                  |

---

## Historical decisions (ADR-001–ADR-017)

<a id="adr-001"></a>

## ADR-001 — Single Next.js app with `app/` + `ui/` + `api/` at the root

**Decision ID:** ADR-001 · **Title:** Single Next.js app with `app/` + `ui/` + `api/` at the root · **Status:** IMPLEMENTED · **Date:** 2026-11-03 · **Related decisions:** ADR-006

**Context.** The roadmap mandates Next.js App Router for frontend and backend and JavaScript only; the project owner prefers `ui/` and `api/` folders but asked not to break framework correctness or create a second runnable app.

**Decision.** One package. `app/` contains routing only (pages and `app/api/**/route.js`), `ui/` contains presentation, `api/` contains server-only code guarded by `server-only`. `jsconfig.json` maps `@/*` to the root so imports read `@/ui/...` and `@/api/...`.

**Alternatives considered.** Rejected: (a) separate `api/` package with its own `package.json` — duplicate lockfiles, two processes, breaks Route Handlers; (b) `src/` layout — hides the `ui`/`api` split the owner wanted; (c) everything under `app/` — mixes routing with domain code.

**Consequences.** Clear import rules (see [architecture.md](architecture.md) §2). An ESLint rule forbids relative `../api/*` imports.

<a id="adr-002"></a>

## ADR-002 — Mongoose for persistence, Zod for input validation

**Decision ID:** ADR-002 · **Title:** Mongoose for persistence, Zod for input validation · **Status:** IMPLEMENTED (connection layer); models originally recorded as PLANNED · **Date:** 2026-11-03 · **Related decisions:** ADR-008, ADR-012

**Context.** Roadmap requires MongoDB, GeoJSON, geospatial indexes, schema validation and migrations; Zod is the chosen input validator.

**Decision.** Mongoose 9 for schemas, indexes (incl. `2dsphere`) and connection pooling; Zod 4 for environment and HTTP request validation. Mongoose validation is the database-side guard; Zod is the API-side contract.

**Alternatives considered.** Rejected: raw `mongodb` driver with `$jsonSchema` validators — more hand-written plumbing for hierarchy/geo features.

**Consequences.** Not recorded beyond the decision above. Model field detail is maintained in [database.md](database.md).

**Implementation note (correction, 2026-11-17).** The "models PLANNED" portion of the status is outdated. Nine Mongoose models now exist: `User`, `Session`, `AuthToken`, `RateLimit`, `DevoteeApplication`, `Area`, `LocalityProposal`, `InvitationReport`, `AuditLog`. `Area` carries the geographic hierarchy (`parentId`, `ancestorIds`) and `populationEstimate` referenced by the topic index; `LocalityProposal` mirrors proposals. This does not change the decision to use Mongoose and Zod. Design-only collections remain absent (`populationRecords`, `areaAssignments`, `notifications`, `systemSettings`, `devoteeApplicationNotes`), and no migrations directory exists.

<a id="adr-003"></a>

## ADR-003 — Tailwind CSS 4 through the Turbopack loader

**Decision ID:** ADR-003 · **Title:** Tailwind CSS 4 through the Turbopack loader · **Status:** IMPLEMENTED · **Date:** 2026-11-03 · **Related decisions:** Not recorded

**Context.** Not recorded.

**Decision.** Use `@tailwindcss/turbopack` with the `turbopack.rules["*.css"]` entry in `next.config.mjs` — exactly what `create-next-app@16.4.4 --tailwind` emits — instead of `@tailwindcss/postcss` + `postcss.config.mjs`.

**Alternatives considered.** Fallback: switch to the PostCSS plugin if the loader breaks on a future Next release.

**Consequences.** Verification: the production CSS chunk contains the custom `--color-brand-600` token and `.bg-brand-600` utilities.

<a id="adr-004"></a>

## ADR-004 — Lazy, Zod-validated environment; no `dotenv`

**Decision ID:** ADR-004 · **Title:** Lazy, Zod-validated environment; no `dotenv` · **Status:** IMPLEMENTED · **Date:** 2026-11-03 · **Related decisions:** Not recorded

**Context.** Not recorded.

**Decision.** `api/lib/env/env.js` parses `process.env` on first use and memoises the result; `next build` therefore does not need a database. Scripts and tests load `.env.local` with Node's built-in `process.loadEnvFile`.

**Alternatives considered.** Rejected: `dotenv` (title decision: no `dotenv` dependency).

**Consequences.** A misconfigured variable fails with its name on first server use; values are never printed.

<a id="adr-005"></a>

## ADR-005 — Console-based JSON-line logger with redaction

**Decision ID:** ADR-005 · **Title:** Console-based JSON-line logger with redaction · **Status:** IMPLEMENTED · **Date:** 2026-11-03 · **Related decisions:** ADR-014, ADR-015

**Context.** Not recorded.

**Decision.** `api/lib/logging/logger.js` writes one JSON object per line via `console.*`, honours `LOG_LEVEL`, redacts keys such as `password`, `token`, `secret`, `authorization`, `cookie`, `mongodb_uri`, and omits stack traces in production.

**Alternatives considered.** Rejected for now: `pino`/`winston` — unnecessary dependency at this size; the interface (`logger.info(message, context)`) allows swapping later.

**Consequences.** Not recorded beyond the decision above.

<a id="adr-006"></a>

## ADR-006 — ESLint 9 (not 10) and Vitest 4 (not 5)

**Decision ID:** ADR-006 · **Title:** ESLint 9 (not 10) and Vitest 4 (not 5) · **Status:** ACCEPTED · **Date:** 2026-11-03 · **Related decisions:** ADR-001, ADR-008

**Context.** `eslint-config-next@16.4.4` declares `eslint >= 9`, but its bundled `eslint-plugin-import` / `jsx-a11y` / `react` only accept `^9`, producing invalid peer markers under ESLint 10. `vitest@5.1.0` requires Node `^22.12 || ^24 || >=26`, excluding the Node 25 used for development.

**Decision.** Pin `eslint ^9.39.0` and `vitest ^4.1.12`. Revisit when `eslint-config-next` updates its plugins and when Vitest supports Node 25 or the team moves to Node 24 LTS.

**Alternatives considered.** Rejected for now: ESLint 10 (peer-marker conflict); Vitest 5 (Node version exclusion).

**Consequences.** Known item: ESLint 9.39 prints an end-of-support deprecation warning on install.

<a id="adr-007"></a>

## ADR-007 — Health endpoint contract

**Decision ID:** ADR-007 · **Title:** Health endpoint contract · **Status:** IMPLEMENTED · **Date:** 2026-11-03 · **Related decisions:** ADR-012

**Context.** Not recorded.

**Decision.** `GET /api/health` is `force-dynamic`, sends `Cache-Control: no-store`, returns 200 with `{ status: "ok" }` or 503 with `error.code = "SERVICE_DEGRADED"` plus per-check detail. Database timeouts are bounded (5 s). Pages never depend on it.

**Alternatives considered.** Not recorded.

**Consequences.** Not recorded beyond the decision above.

<a id="adr-008"></a>

## ADR-008 — Testing stack: Vitest, unit + integration, real MongoDB gated by database name

**Decision ID:** ADR-008 · **Title:** Testing stack: Vitest, unit + integration, real MongoDB gated by database name · **Status:** IMPLEMENTED · **Date:** 2026-11-03 · **Related decisions:** ADR-006, ADR-012

**Context.** Not recorded.

**Decision.** Vitest 4 in Node environment. Integration suites run against `MONGODB_URI_TEST`, whose database name must end in `_test` (enforced by `tests/helpers/database.js`), and skip with a notice if the server is unreachable unless `UTSAV_TEST_REQUIRE_DB=1` (used by `make ci`). Unreachable-path tests target `mongodb://127.0.0.1:1/...`.

**Alternatives considered.** Rejected for now: `mongodb-memory-server` (downloads a binary; the owner runs a local `mongod`); Playwright (no interactive features yet — revisit in Stage 2). _See correction below._

**Consequences.** Not recorded beyond the decision above.

**Implementation note (correction, 2026-11-17).** The "rejected for now: Playwright" rationale is factually outdated: Playwright 1.65 is now present (`playwright.config.mjs` and journey specs, projects for desktop/tablet/mobile). Its use is limited — no committed seed (the seed lives in git-ignored `.local/seed-test.mjs`), no `test:e2e` script and no `make test-e2e` target, despite documentation references. The `mongodb-memory-server` rejection still stands; the `_test` name gate remains in force.

<a id="adr-009"></a>

## ADR-009 — Next.js Cache Components not enabled yet

**Decision ID:** ADR-009 · **Title:** Next.js Cache Components not enabled yet · **Status:** ACCEPTED · **Date:** 2026-11-03 · **Related decisions:** Not recorded

**Context.** Next 16 ships `cacheComponents` as opt-in and documents that it becomes default in the next major.

**Decision.** Keep the classic caching model (segment config such as `dynamic = "force-dynamic"`). Adopt Cache Components deliberately, with a migration pass over every route, before upgrading to Next 17.

**Alternatives considered.** Deferred: enabling `cacheComponents` now (explicitly not chosen yet).

**Consequences.** Not recorded beyond the decision above.

<a id="adr-010"></a>

## ADR-010 — Authentication approach

**Decision ID:** ADR-010 · **Title:** Authentication approach · **Status:** RESOLVED (design) — the owner accepted the ADR-014 baseline. Implementation was not authorized until Batch 0 was explicitly approved. Applicant/audit retention periods and account deletion remain deferred policy decisions. · **Date:** 2026-11-03 · Updated: 2026-11-05 · **Related decisions:** ADR-014

**Context.** Not recorded beyond the options and decision below.

**Decision.** First-party authentication with opaque MongoDB-backed sessions, email + password, and server-side authorization. Public registration is a **devotee application**, never immediate account access. Email delivery is a hard dependency for verification, decisions, recovery, and administrator invitations; public applications remain disabled until a provider and verified sender domain are configured. The detailed baseline is ADR-014.

**Alternatives considered.** Options considered: (a) Auth.js v5 (`next-auth@5` beta, App Router native, MongoDB adapter available; beta status is a risk); (b) `next-auth@4` (stable but Pages-Router-era API); (c) first-party session cookies with a `users` collection, Argon2id hashing, and CSRF handling (full control, more code to secure).

**Consequences.** Deferred policy: applicant-PII and audit-log retention periods, automatic deletion/purge, and account deletion. No automatic purge job runs in Stage 2. These are not approved by this ADR. Change note (2026-11-05): the original three questions (registration policy, email verification, credential method) are resolved by the application-first design in ADR-014.

**Implementation note (correction, 2026-11-17).** The design is now largely implemented: first-party auth, Argon2id (`@node-rs/argon2`), MongoDB-backed `Session` tokens, application-first registration and server-side guards all exist. The status clause "implementation is not authorized until Batch 0 is explicitly approved" is therefore outdated as a statement of current state. The deferred policy items remain genuinely open — applicant/audit retention periods, automatic purge and account deletion are still not approved (PROPOSED ADR-024).

<a id="adr-011"></a>

## ADR-011 — License

**Decision ID:** ADR-011 · **Title:** License · **Status:** ACCEPTED · **Date:** 2026-11-03 · **Related decisions:** Not recorded

**Context.** `LICENSE` contains MIT (2026, Dibakar Is Live); an earlier README draft called the project proprietary.

**Decision.** Keep MIT as the committed license and state it in the README. If the owner intends the project to be proprietary, the `LICENSE` file must change explicitly — not silently via README text.

**Alternatives considered.** Rejected unless explicitly chosen: proprietary licensing.

**Consequences.** Not recorded beyond the decision above.

<a id="adr-012"></a>

## ADR-012 — MongoDB Atlas is the project database for development and tests

**Decision ID:** ADR-012 · **Title:** MongoDB Atlas is the project database for development and tests · **Status:** IMPLEMENTED (development + tests, live authentication verified 2026-11-04); production tier/backup plan OPEN · **Date:** 2026-11-03 · **Related decisions:** ADR-007, ADR-008

**Context.** Stage 1 was verified against a developer-started local `mongod`. A hosted cluster was needed so that every contributor and future deployment use the same database service, and so transactions (replica-set only) are available before Stage 3.

**Decision.** Use the MongoDB Atlas cluster `main` (`mongodb+srv://`). Development uses database `utsav_connect`, integration tests use `utsav_connect_test` on the same cluster. Connection strings always carry the database name and `retryWrites=true&w=majority`. Credentials live in `.env.local` only; `.env.example` ships Atlas-shaped placeholders. The Makefile no longer probes a local port — `check-db`/`check-health` ping whatever `MONGODB_URI` points at and never start or stop a server.

**Alternatives considered.** Rejected as the default: developer-started local `mongod` (still usable offline via a local `mongodb://` URI).

**Consequences.** No local MongoDB process is required (a local `mongodb://` URI still works offline); each connection costs ≈ 600 ms from India, so health checks and integration tests are slower; the free tier has no automatic backups, so a manual `mongodump` procedure is documented until a production tier is chosen; Atlas Network Access must be restricted to known IPs. Follow-ups: decide the production tier, region and backup schedule (Stage 7); scope the database user to `readWrite` on the two project databases.

**Implementation note (correction, 2026-11-17).** The currently configured development database is `utsav_connect_pilot` (`MONGODB_URI`), while integration tests use `utsav_connect_test` (`MONGODB_URI_TEST`); the names still differ and the test name ends in `_test`, so the separation intent of this ADR and ADR-008 holds. The open production tier/backup-plan item is unchanged. Credentials and URIs remain in `.env.local` and are never recorded here.

<a id="adr-013"></a>

## ADR-013 — Stage 1 closes only on the full gate, with no bypass

**Decision ID:** ADR-013 · **Title:** Stage 1 closes only on the full gate, with no bypass · **Status:** IMPLEMENTED · **Date:** 2026-11-04 · **Related decisions:** ADR-010, ADR-014

**Context.** Stage 1 was blocked when Atlas rejected the configured credentials. The fix was an external credential reset in Atlas plus updated ignored local URIs, not a code or test change.

**Decision.** Close Stage 1 only after `make check-db` succeeds, `make ci` runs the database-required integration suite and production build without skipping, and the built app is served for route/health/header checks. Record exact results in `project-status.md`, `testing.md`, `deployment.md`, and the changelog.

**Alternatives considered.** Not recorded.

**Consequences.** Stage 1 is closed as of 2026-11-04. The product-requirements baseline remains PARTIAL; ADR-010 is resolved (design) and ADR-014 is accepted, but Stage 2 implementation is not authorized or started. Future credential incidents use the same rule: rotate first, then re-run the full gate.

**Implementation note (correction, 2026-11-17).** The "Stage 2 implementation is not authorized or started" clause describes 2026-11-04 and is now outdated; Stage 2 functionality was subsequently built (see ADR-010/ADR-014 notes). Stage 1 closure and the rotate-first credential rule are unchanged.

<a id="adr-014"></a>

## ADR-014 — Stage 2 authentication, devotee application, and administration baseline

**Decision ID:** ADR-014 · **Title:** Stage 2 authentication, devotee application, and administration baseline · **Status:** ACCEPTED — design decision accepted by the owner. Implementation was not authorized until Batch 0 was explicitly approved. · **Date:** 2026-11-04 · Revised: 2026-11-05 · **Related decisions:** ADR-010, ADR-015, ADR-016, ADR-018, ADR-019, ADR-023

**Context.** ADR-010 left the authentication approach and product questions open. Stage 2 needs a concrete design that fits the JavaScript-only Next.js App Router application, MongoDB Atlas, server-side authorization, immediate session revocation, and the existing HTTP envelope. The owner requires mandatory devotee application approval, a `/admin/devotees` management dashboard, a Super Admin/Admin hierarchy, stricter applicant-PII rules, and invitation-report privacy. Full record: [Stage 2 decision report](../06-history/stage-2-decision-report.md); security/privacy test matrix: [Stage 2 authentication spec](../06-history/stage-2-authentication-spec.md).

**Decision.** Use a small first-party authentication layer with opaque database-backed sessions rather than Auth.js v5 beta or `next-auth@4`. Use email + password, Argon2id hashing, hashed single-use tokens, a `__Host-` secure cookie in production, MongoDB-backed rate limiting, and append-only audit logs.

_Devotee application:_ the form contains only full name, email, password, phone, gender (Male/Female), and an optional custom message. **Date of birth is not collected and no age eligibility check is performed (D-22 resolved).** Every application starts `pending`; the account is created as `pending_verification` and receives no devotee access until email verification and administrator approval. Rejection is allowed for unverified applications; approval requires a verified email. Rejections send a generic notice and never expose internal notes or reviewer-only information.

_Applicant access:_ a verified applicant whose application is `pending_approval` or `rejected` may authenticate to a **limited applicant session** that can view only `/application-status` and their own application summary. It cannot access the dashboard, reports, proposals, account profile editing, or any devotee/admin API. The reserved `expired` state has no Stage 2 login eligibility. Approval revokes the limited session and the user logs in fresh with full devotee access. D-25 is **ACCEPTED** (Option A); D-26 keeps application access separate from activation.

_Roles and permissions:_ stored roles are `devotee`, `admin`, and `super_admin`; `visitor` is anonymous. There is **one** administrative role, with granular `adminPermissions`. "Moderator" is a responsibility/permission profile, not a stored role. Administrator creation, permission changes, and Super Admin privilege changes are Super Admin-only. Critical security settings are deployment environment controls in Stage 2, not an in-app permission. Super Admin capabilities are not assignable through ordinary permission updates. One Super Admin exists initially, with a documented and tested CLI recovery procedure.

_Sessions:_ opaque 32-byte tokens, hashed at rest; 7-day idle and 30-day absolute lifetimes. Use **one effective TTL index** on `expiresAt`, capped at `absoluteExpiresAt`; enforce the absolute limit again in session validation. Do not create independent TTL indexes on both timestamps.

_Email:_ provider-agnostic transactional adapter. Public applications remain disabled until a provider and verified sender domain are configured and verification, password recovery, and administrator-invitation delivery have been tested.

_Privacy:_ phone, gender, email, and custom messages are private applicant data; they are never exposed in public APIs, public pages, other devotees' profiles, aggregate analytics, logs, or audit metadata. DOB is not collected at all. Invitation reports store the submitter separately from the participant count, contain no invitee PII by default, and expose contributor identities only to authorized administrators. Ordinary devotees cannot see another contributor's identity.

_Retention:_ no automatic applicant-PII deletion or purge job runs in Stage 2. Applicant/audit retention periods remain deferred until explicitly approved. The `expired` state is reserved and is not set by an automatic job in Stage 2. Account deletion remains deferred.

**Alternatives considered.** Rejected for now: (a) Auth.js v5 beta — beta dependency, and the Credentials provider still requires custom user/password/session logic for database-session revocation; (b) `next-auth@4` — Pages-Router-era API and migration risk; (c) JWT-only sessions — revocation and suspension would be delayed or require a denylist; (d) OAuth/magic-link at launch — adds provider dependencies before the core account model is proven; (e) open registration with immediate devotee access — violates the mandatory approval workflow; (f) a separate Admin and Moderator role pair — one admin role with granular grants is simpler and avoids contradictory permission checks; (g) independent TTL indexes on both idle and absolute expiry — one effective TTL plus validation is safer and avoids competing deletion rules; (h) collecting DOB without a documented purpose — removed by owner decision.

**Consequences.** The application owns CSRF, rate limiting, token handling, session revocation, application-state transitions, PII access checks, and privilege-escalation defences, so the security/privacy test matrix in the [Stage 2 authentication spec](../06-history/stage-2-authentication-spec.md) is mandatory. Native Argon2 support must be verified on the deployment target; Node `crypto.scrypt` is the documented fallback. Email delivery is a hard Stage 2 dependency. No code, collection, dependency, or environment variable has been added by this ADR.

**Implementation note (correction, 2026-11-17).** The design is now largely implemented: the three stored roles and `adminPermissions` grants, Argon2id hashing, opaque MongoDB-backed `Session` documents, the application-first flow, scoped applicant access, hashed `AuthToken` types, rate limiting, audit logs and the CLI Super Admin bootstrap/recovery path all exist. Corrections (original text above unchanged): the `__Host-` prefix is **not** implemented — the cookie is `session=<token>; Path=/; HttpOnly; SameSite=Lax`, `Secure` only in production, no `__Host-` and no explicit `Max-Age`; no `expired` status exists in the `User` schema (implemented: `pending_verification`, `pending_approval`, `active`, `rejected`, `suspended`, `invited`), so `expired` remains aspirational; several declared permissions are unenforced (`application:note:write`, `devotee:read:all`, `devotee:status:update`) and `MODERATOR_PERMISSIONS` / `canManageUser()` are unused; the "implementation is not authorized" clause is outdated as a current-state statement, while retention and account deletion remain genuinely open (ADR-024).

<a id="adr-015"></a>

## ADR-015 — Final verification and production-readiness decisions

**Decision ID:** ADR-015 · **Title:** Final verification and production-readiness decisions · **Status:** ACCEPTED · **Date:** 2026-11-10 · **Related decisions:** ADR-005, ADR-014, ADR-016

**Context.** The final verification phase confirmed all checks pass (JS-only, lint, format, 69 unit tests, 71 integration tests against the real MongoDB Atlas `_test` database, production build, and 72/72 Playwright browser journeys). Several honest limitations remain and are recorded here rather than claimed as complete.

**Decision.** Registration stays `REGISTRATION_MODE=closed`. It is NOT opened to the public until a real email provider (Resend or SMTP) is configured with a verified sender domain and delivery has been tested end to end. · `EMAIL_PROVIDER=dev` writes to `.local/mail/` and never sends real email. Resend and SMTP transports are implemented but NOT configured (no `EMAIL_API_KEY`, no `SMTP_URL`, nodemailer not installed). · Audit-log immutability is enforced at the application level (append-only Mongoose hooks, bypassed only in `NODE_ENV=test`). True database-level immutability requires Atlas custom roles / infrastructure that shared Atlas tiers cannot express; it is reported honestly as NOT implemented at the DB layer. · Google Maps: the official short link `https://maps.app.goo.gl/BcY87xSjA6iRtBY78` is preserved as the working fallback; no coordinates or Place ID are invented; directions use the venue name/locality. The short link destination was not independently resolved (network timeout). · Administrator invitation lifecycle and password reset are NOT implemented; reported as BLOCKED / NOT IMPLEMENTED. · `area:manage` is NOT an implicit grant for invitation-report (`invitation-report:read:all`) or proposal (`proposal:review`) access; each permission is enforced separately. · Administrators with `audit:read:all` may view audit logs; audit access is not restricted to Super Admin only.

**Alternatives considered.** Not recorded.

**Consequences.** The application is verified and production-buildable, but real-user launch requires the configuration items listed in the final readiness assessment (AI.md).

**Implementation note (correction, 2026-11-17).** Two claims in the original Decision are factually wrong today (original text preserved above): (1) **Email transport** — there is no SMTP transport in the code. The only transports are `EMAIL_PROVIDER=dev` (writes `.eml` to `.local/mail/`) and `Resend` (REST via `EMAIL_API_KEY`), in `api/lib/email/{adapter,transport}.js`. "SMTP transports are implemented" is incorrect; SMTP remains unimplemented, and `AUTH_SECRET` is required by env but unused in code. (2) **Password reset and administrator invitations** are now implemented (ADR-016), so "NOT implemented / BLOCKED" is outdated. The Context figures were the 2026-11-10 checkpoint and are not current (now 167 unit, 120 integration tests). The append-only audit-log statement remains accurate at the application layer only; there is no DB-level immutability.

<a id="adr-016"></a>

## ADR-016 — Password reset, administrator invitations, and dev server fixes

**Decision ID:** ADR-016 · **Title:** Password reset, administrator invitations, and dev server fixes · **Status:** ACCEPTED · **Date:** 2026-11-10 · **Related decisions:** ADR-014, ADR-015

**Context.** Password recovery and administrator invitation lifecycle were missing from the Stage 2 baseline. The Next.js development server also suffered a continuous hot-reload loop caused by watching the local MongoDB data directory under `.local/`.

**Decision.** _Password reset:_ Added `/api/auth/password-reset/request` (rate-limited, generic response to prevent enumeration) and `/api/auth/password-reset/confirm` (single-use token, Argon2id password hash, revokes all existing sessions). Token hashes stored in `AuthToken` with `password_reset` type; 24-hour expiry. UI pages at `/reset-password` with "Forgot password?" link on the Sign In form. _Administrator invitations:_ Added `inviteAdministrator`, `acceptAdminInvitation`, `listAdminInvitations`, `revokeAdminInvitation` service functions. `AuthToken` model now supports optional `userId` (null at invitation time) and `email` field for invitee address. Invitations are single-use, 7-day expiry, Super Admin-only creation/revocation. UI at `/accept-invitation` plus invitation management in `AdminUsersClient`. _Dev server fix:_ `next.config.mjs` excludes `.local/**`, `node_modules/**`, `.next/**`, `.git/**` from Turbopack file watching, eliminating the hot-reload loop caused by constantly-changing WiredTiger files in `.local/mongodb-data/`. `make dev` works correctly at `http://localhost:3000`.

**Alternatives considered.** Not recorded.

**Consequences.** The application is feature-complete for the Stage 2 baseline. Real email delivery and public registration remain gated on provider configuration.

**Implementation note (correction, 2026-11-17).** The HMR claim in the third Decision bullet is **not present in the current `next.config.mjs`**: the file contains `reactStrictMode`, `poweredByHeader: false`, a Turbopack Tailwind rule, baseline security headers and no-referrer/no-store rules for `/reset-password`, `/accept-invitation`, `/verify-email` — but no watch exclusion. That portion is historical/unverified against the current tree. The password-reset and administrator-invitation features themselves are implemented as described. One open gap: confirming a password reset does not invalidate older, still-valid reset tokens.

<a id="adr-017"></a>

## ADR-017 — Serialized `id` is the client-side identifier contract

**Decision ID:** ADR-017 · **Title:** Serialized `id` is the client-side identifier contract · **Status:** ACCEPTED · **Date:** 2026-11-16 · **Related decisions:** Not recorded

**Context.** React key warnings persisted in `AdminApplicationsClient` after an earlier change replaced `application.id` with `application._id`. Tracing the data flow showed `listApplications()` returns lean Mongoose documents (server-only `_id` ObjectId), while `GET /api/admin/applications` serializes each record with `id: a._id.toString()` and deliberately omits `_id`. Client components therefore only ever receive `id`. `_id` is correct in the server component `app/admin/page.jsx`, which consumes lean documents directly — the two layers must not use the same field name.

**Decision.** React-rendered list data keeps the normalized string `id` as its identifier contract. Client components (`ui/components/admin/AdminApplicationsClient.jsx`) use `application.id` for keys and detail links; server components that read lean documents (`app/admin/page.jsx`) keep `_id`. No array indexes or random keys are used. An integration test asserts the list payload contains `id` and no `_id`.

**Alternatives considered.** Rejected: exposing `_id` in the API payload (leaks a server/storage detail and would duplicate the already-stable `id`); using array indexes or generated keys (unstable across filtering/pagination); suppressing the React warning.

**Consequences.** Identifier semantics stay explicit per layer. Browser verification must run against a **development** build — React strips key warnings from production builds, so a passing `next start` check alone would be a false negative.

---

## Proposed decisions (ADR-018–ADR-024)

> All ADRs below are **PROPOSED**. They are design proposals for owner review and are **not approved**; **owner approval is required** before any becomes ACCEPTED or implementation is authorized. They address the new-capabilities workstream of the [roadmap](../roadmap.md) and shared capabilities that are currently missing (audit is the only one present today).

<a id="adr-018"></a>

## ADR-018 — Account lifecycle states and transitions (PROPOSED)

**Decision ID:** ADR-018 · **Title:** Account lifecycle states and transitions · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-010, ADR-014, ADR-019, ADR-023, ADR-024

**Context.** The current `User.status` enum is `pending_verification`, `pending_approval`, `active`, `rejected`, `suspended`, `invited`. ADR-014 reserved an `expired` state that was never implemented, and the product vision calls for a coherent account lifecycle (workstream N1). There is no documented transition table, no `archived`/`deleted`/`eligible_inactive` state and no timestamp fields such as `suspendedAt`/`reason`. Any lifecycle change must preserve the application-first approval gate and must not weaken access checks.

**Decision (proposed).** Adopt a single documented state machine for `User.status` with an explicit transition table, permitted actors and side effects for every edge. Retain the six implemented states as the starting vocabulary; decide explicitly whether to add `expired`, `archived` or `eligible_inactive` rather than leaving them reserved-but-absent. Define which transitions revoke sessions, which require administrator or Super Admin action, and which are self-service. **Owner approval is required; not approved.**

**Alternatives considered (under evaluation).** Keep the current enum with no formal transition table (low effort, but leaves drift and unreachable states); add all reserved states now (richer model, higher migration/test burden); generalize to a separate lifecycle sub-document (flexible, but diverges from ADR-002's simple-model approach and needs new indexes).

**Consequences.** If approved: a canonical transition table reduces ambiguous states, enables reliable reporting and gives session/notification logic a single source of truth; requires model, guard, admin-UI, test and [database.md](database.md) updates plus a migration/backfill plan. If rejected: the existing enum remains, with the documented drift.

<a id="adr-019"></a>

## ADR-019 — Suspension and reinstatement semantics (PROPOSED)

**Decision ID:** ADR-019 · **Title:** Suspension and reinstatement semantics · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-014, ADR-018, ADR-023

**Context.** Suspension currently means: a Super Admin-only status update on `PATCH /api/admin/users/[id]` that deletes all sessions; `validateSession` also rejects and deletes suspended sessions. Self-edit and last-active-Super-Admin demotion/suspension are blocked. There is no `suspendedAt`, no reason field, no reinstatement procedure and no in-app notification (ADR-015 notes no email on suspend/reinstate). The credential-registry status guard is known to be faulty (D5).

**Decision (proposed).** Define suspension as a distinct, observable state with recorded reason, actor and timestamp; specify that it immediately invalidates all sessions and blocks authentication, and that reinstatement restores access without silently re-granting revoked privileges. Clarify who may suspend/reinstate each role, the treatment of open applications and audit visibility, and whether reinstatement is automatic or explicit. Define the user-facing message and a safe notification path. **Owner approval is required; not approved.**

**Alternatives considered (under evaluation).** Current behaviour (session deletion only, no reason/notification) — simplest but opaque and unauditable; time-boxed suspension with automatic reinstatement — convenient but needs a scheduler and careful edge cases; permanent deactivation distinct from suspension — clearer semantics but a new state (ADR-018).

**Consequences.** If approved: consistent, auditable suspension/reinstatement, fixable credential-registry sync and clearer admin UX; requires model fields, guard changes, a tested CLI/UI procedure, audit events and regression tests. Must coordinate with ADR-018 states and ADR-023 responsibility assignment.

<a id="adr-020"></a>

## ADR-020 — In-app messaging privacy and scope (PROPOSED)

**Decision ID:** ADR-020 · **Title:** In-app messaging privacy and scope · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-014, ADR-023, ADR-024

**Context.** In-app conversations are a listed shared capability (workstream N4), but no messaging model, route or UI exists. ADR-014 sets a strict applicant/contributor privacy baseline: phone, gender, email and messages are private, contributor identities are visible only to authorized administrators, and ordinary devotees cannot see another contributor's identity. Messaging must not become a side channel that leaks this data.

**Decision (proposed).** Propose scoped, purpose-bound conversations between defined participant sets (e.g. applicant↔reviewer, admin↔devotee), with server-side authorization on every read/write, no invitee PII by default and retention aligned with ADR-024. Decide whether messaging is one-to-one only, supports threads, and whether administrators can read all threads. **Owner approval is required; not approved.**

**Alternatives considered (under evaluation).** No in-app messaging; keep communication out of band (preserves privacy but leaves the capability missing); open direct messaging between all users (simple, but conflicts with ADR-014 privacy rules); scoped, role-aware threads with audit events (recommended for evaluation; higher build and moderation cost).

**Consequences.** If approved: a new model and API with strict access control, notification hooks (ADR-022) and moderation/audit considerations. If rejected: no private in-app channel exists and the privacy baseline is unaffected. Any design must be reviewed against the applicant-PII rules before implementation.

<a id="adr-021"></a>

## ADR-021 — Announcements (PROPOSED)

**Decision ID:** ADR-021 · **Title:** Announcements · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-022, ADR-023

**Context.** Announcements are a listed shared capability (workstream N5) but do not exist. No `systemSettings` or notification collection exists. Announcements must respect role/audience boundaries (public, devotees, admins) and must not expose private applicant or contributor data.

**Decision (proposed).** Propose a first-class announcement entity with author, audience scope, publication state (draft/published/archived), optional scheduling and an audit trail. Define who may create and publish (likely Super Admin / authorized admins), how announcements surface in the UI, and how they interact with the notification centre without duplicating delivery. **Owner approval is required; not approved.**

**Alternatives considered (under evaluation).** Static content edited in code (no new model, but not administrable); reuse in-app messaging for broadcasts (no separate model, but poor audience control and auditability); a dedicated announcement entity with audience targeting (clearer, more work) — under evaluation.

**Consequences.** If approved: new model, admin UI and delivery rules plus audit events; must coordinate with ADR-022 to avoid duplicate notifications. Requires deciding archive/retention behaviour (ADR-024).

<a id="adr-022"></a>

## ADR-022 — Notification centre and deduplication (PROPOSED)

**Decision ID:** ADR-022 · **Title:** Notification centre and deduplication · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-014, ADR-020, ADR-021, ADR-024

**Context.** A notification centre is a listed shared capability (workstream N5); no `notifications` collection exists, and ADR-015 notes that no email is sent for several events (direct user creation, suspend/reinstate, proposal/report review). A single domain event can otherwise trigger multiple channels (in-app, email), producing duplicates and privacy leaks.

**Decision (proposed).** Propose a notification model keyed by recipient with a stable event/entity key so repeated events dedupe, read/unread state, and a single dispatch layer that decides in-app vs email delivery. Define which domain events emit notifications, channel preferences (if any) and that notification content must not include private PII beyond what the recipient is authorized to see. **Owner approval is required; not approved.**

**Alternatives considered (under evaluation).** Email-only notifications (no in-app model, but no centre and no dedupe); in-app notifications without dedupe (simpler, but duplicate-prone); event-sourced dispatch with dedupe keys (recommended for evaluation; needs careful key design and retention rules).

**Consequences.** If approved: new collection, dispatch service, tests and UI; must integrate with ADR-020/ADR-021 without double-sending and with ADR-024 for retention. Requires an explicit privacy review of notification payloads.

<a id="adr-023"></a>

## ADR-023 — Shared account directory and responsibility assignment (PROPOSED)

**Decision ID:** ADR-023 · **Title:** Shared account directory and responsibility assignment · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-014, ADR-018, ADR-019, ADR-021

**Context.** A shared account directory and responsibility assignment are listed shared capabilities (workstream N3). ADR-014 fixed the role model (one admin role with granular `adminPermissions`; "Moderator" is a responsibility profile, not a stored role). There is no `areaAssignments` collection, no directory view that composes safely with contributor privacy, and several declared permissions are unused.

**Decision (proposed).** Propose a read-controlled directory of accounts with role/permission visibility rules, plus an explicit responsibility-assignment mechanism (e.g. which admin or "moderator" is responsible for which area or applicant). Define how assignments interact with existing permission checks, that directory exposure must not reveal private applicant/contributor data, and how assignments are created, changed and audited. **Owner approval is required; not approved.**

**Alternatives considered (under evaluation).** No shared directory (status quo; admins use per-module screens); derive a directory from existing `User` documents with no assignments (cheap, but no responsibility model); add a directory plus an assignment collection with permission-aware visibility (recommended for evaluation; needs a privacy and escalation review).

**Consequences.** If approved: new queries/UI and an assignment model, permission-gating tests, audit events and a migration plan for any backfill. Must not silently create a new stored "moderator" role, per ADR-014. Coordinates with ADR-019 (who may suspend) and ADR-021 (announcement audience).

<a id="adr-024"></a>

## ADR-024 — Data retention and deletion policy (PROPOSED)

**Decision ID:** ADR-024 · **Title:** Data retention and deletion policy · **Status:** PROPOSED — **owner approval required; not approved** · **Date:** 2026-11-17 · **Related decisions:** ADR-010, ADR-014, ADR-015, ADR-018, ADR-020, ADR-022

**Context.** ADR-010 and ADR-014 explicitly deferred applicant-PII and audit-log retention periods, automatic purge and account deletion. No automatic purge job runs, no soft-delete plugin exists, and `AuditLog` is append-only at the application level. The product vision lists data retention/long-term management (workstream N7), which depends on an approved policy and Phase E. This is a security, privacy and potentially legal decision — it requires explicit owner approval and must not be invented.

**Decision (proposed).** Propose an owner-approved retention and deletion policy covering: retention periods for applicant PII, sessions/tokens, invitation reports, audit logs and messages; account deletion and anonymization semantics; legal hold or exception handling; and whether any automatic purge job is ever introduced. Each category needs a named owner, a stated purpose and a deletion/anonymization procedure. **Owner approval is required; not approved.** No purge or deletion behaviour is authorized by this proposal.

**Alternatives considered (under evaluation).** Keep data indefinitely with no deletion path (simplest, but unmanaged risk and does not meet the stated need); delete on request only, no scheduled purge (predictable, but relies on a manual process); defined retention windows with an explicit, audited deletion/anonymization job (recommended for evaluation; needs policy approval and safeguards).

**Consequences.** If approved: a written policy, model/field changes (e.g. deletion markers), operational procedures and tests; must align with ADR-018 lifecycle states and the audit-log design. If rejected: current deferred/no-purge behaviour continues, with the open items in ADR-010/ADR-014 still unresolved. This proposal must not be implemented before its prerequisites (Workstream A phases and an approved policy) are satisfied.

---

## Implementation note — Phase B permission reuse (2026-11-17)

**Not a new ADR.** Phase B needed granular controls for viewing devotee accounts, changing devotee status, updating population and reading campaign analytics. Rather than adding new permission strings, the implementation enforces the already-declared `devotee:read:all` and `devotee:status:update` constants; population updates reuse `area:manage`; analytics uses `area:manage` OR `invitation-report:read:all`.

**Rationale.** `hasPermission` is pure array membership over stored `adminPermissions`. Introducing a new string would instantly lock out every existing admin whose stored grant predates it. Reusing declared constants preserves existing behaviour and avoids a data migration. Super Admin continues to hold every capability by role.

**Consequences.** `application:note:write` remains unenforced; there is still no distinct analytics or population permission. A future owner-approved ADR should decide whether those capabilities need separate strings and how existing grants would be backfilled. Area responsibility assignment remains PROPOSED (ADR-023): assigning an area must never itself grant management permission.

---

## Implementation note — Next.js 16.4.6 security patch (2026-11-17)

**Not a new ADR.** Next.js 16.4.4 was within the published November 2026 advisory ranges (fixed in 16.4.5); npm audit reported `next` 16.3.0–16.4.4 with fix 16.4.6. The project now pins `next` and `eslint-config-next` at **16.4.6**. React and React DOM remain 19.3.0 (compatible with Next 16.4.6's `^19.0.0` peer range; npm audit reports no React advisory).

The interactive dev-server upgrade menu came from Next's advisory assessment in `next dev`, not from this project. Choosing "Upgrade now" intentionally stopped the dev worker before delegating to `next upgrade --agent=security`, whose harness detection scanned `PATH` for `claude`/`codex`. All future upgrades use the deliberate [dependency workflow](../05-operations/dependency-upgrades.md). `experimental.agentUpgrade: false` was deliberately **not** set: the patched version removes the advisory condition and the check target keeps security information inspectable.

---

## ADR-025 — Permanent account deletion with anonymized retention (ACCEPTED)

**Decision ID:** ADR-025 · **Title:** Permanent account deletion with anonymized retention · **Status:** ACCEPTED (owner-directed 2026-11-18) · **Related decisions:** ADR-018, ADR-024, ADR-023

**Context.** Temporary development, testing and acceptance accounts accumulate between phases. Suspension is not deletion and leaves usable credentials and private data behind. The owner explicitly authorized permanent deletion for temporary Administrator and Devotee accounts while protecting real pilot accounts and Super Admin accounts.

**Decision.** Provide `DELETE /api/admin/accounts/:id` with a mandatory reason and explicit confirmation. Delete the User, sessions and auth tokens; anonymize applicant/proposal snapshots; retain audit history and invitation report aggregates; remove local credential files only after the database transaction commits. Reuse `devotee:status:update` for devotee deletion and the Super Admin role for privileged targets rather than adding a blanket permission string. Never delete a Super Admin account.

**Alternatives considered.** Soft-delete flag (simpler but leaves authenticatable or still-present credentials and complicates unique email); delete everything including audit and reports (erases history and breaks analytics); indefinite retention (no clean-up path). Chosen: hard delete of the identity with anonymized retention of historical records.

**Consequences.** Deletion is irreversible; no undelete path exists. Historical records cannot be re-linked. Strict test guards are required because the operation is destructive. Full policy and matrix: [Account lifecycle](../03-features/account-lifecycle.md).

---

## ADR-026 — Permanent deletion is separate from status management (ACCEPTED)

**Decision ID:** ADR-026 · **Title:** Permanent deletion is separate from status management · **Status:** ACCEPTED (owner-directed 2026-11-18) · **Related decisions:** ADR-025, ADR-023

**Context.** The first deletion implementation reused `devotee:status:update` for permanent deletion. The owner rejected that coupling: an administrator permitted to suspend/reinstate a devotee must not implicitly gain irreversible deletion authority.

**Decision.** Introduce `devotee:delete` as a distinct, opt-in granular permission enforced in `api/services/account-deletion-service.js`. Do not add it to default or moderator bundles and do not backfill existing grants. Super Admin retains deletion of devotees and administrators by role; ordinary administrators remain unable to delete administrators or Super Admins. Suspension/reinstatement continues to use `devotee:status:update` unchanged.

**Alternatives considered.** Reusing the status permission (rejected: privilege coupling); adding a blanket `account:delete` permission (rejected: would bypass the granular model and allow privileged targets); UI-only restriction (rejected: not an authorization boundary).

**Consequences.** Existing admins with status rights need an explicit new grant to delete devotees. Tests assert both that suspension still works with only `devotee:status:update` and that deletion is refused (403) for that same actor.

---

## ADR-027 — Super Admin is not a creatable or assignable role (ACCEPTED)

**Decision ID:** ADR-027 · **Title:** Super Admin is not a creatable or assignable role · **Status:** ACCEPTED (owner-directed 2026-11-18) · **Related decisions:** ADR-026, D-24

**Context.** The "Create account" path accepted `role: "super_admin"` behind a UI confirmation, and `PATCH /api/admin/users/:id` allowed promoting an administrator to Super Admin. This contradicts the documented owner-controlled bootstrap/recovery model (D-24) and the task requirement that administrator creation cannot grant Super Admin privileges.

**Decision.** `POST /api/admin/users` accepts only `devotee` and `admin`. `PATCH /api/admin/users/:id` refuses any transition into the Super Admin role. The UI no longer offers Super Admin as a creatable or assignable role, though existing Super Admins remain viewable and manageable. Super Admin creation/recovery stays in the CLI bootstrap procedure.

**Alternatives considered.** Keeping the UI confirmation (rejected: a web endpoint is not an owner-controlled recovery operation); allowing promotion via PATCH (rejected: privilege escalation); removing Super Admin from the role enum entirely (rejected: breaks management of existing Super Admins).

**Consequences.** Additional Super Admins must be created via the documented CLI procedure. Regression tests assert the API refusal and the absence of the role in the create form. Administrator invitations always create an ordinary `admin` account.

---

## ADR-028 — Permanent deletion disabled pending retention approval (ACCEPTED)

**Decision ID:** ADR-028 · **Title:** Permanent deletion disabled pending retention approval · **Status:** ACCEPTED (owner-directed 2026-11-18) · **Related decisions:** ADR-025, ADR-026

**Context.** A prior implementation exposed permanent deletion in the UI and API, although the owner's approved product decision was to defer it until the data-retention policy is formally approved.

**Decision.** Introduce `ACCOUNT_DELETION_POLICY_APPROVED = false` as the single source of truth. With it false, the UI exposes no delete actions, `DELETE /api/admin/accounts/:id` returns 410, and `deleteAccount()` refuses before any database, registry or audit mutation. The dormant implementation and its tests are retained for a future approval. Suspension/reinstatement and existing audit history are unchanged.

**Consequences.** No account deletion, anonymization or migration can occur until explicit owner approval and a reviewed rollout. Deletion-specific tests are skipped while disabled.

---

## ADR-029 — Audit privacy and project-root anchored artifacts (ACCEPTED)

**Decision ID:** ADR-029 · **Title:** Audit privacy and project-root anchored artifacts · **Status:** ACCEPTED (owner-directed 2026-11-18)

**Context.** Development mail was written to a parent `.local/mail` when commands ran outside the project root; audit responses exposed invitee emails, free-text reasons, unsalted IP hashes and raw user agents.

**Decision.** Discover the project root from a `package.json` name marker; never derive it from `process.cwd()`. Redact PII at audit write time and sanitize on read through a response allowlist that omits `ipHash` and `userAgent`. New IP hashes use keyed, versioned HMAC-SHA256 (`v1:`) with `AUTH_SECRET`; historical records are not rewritten. Separate note writing from reviewing under `application:note:write`. Make invitation acceptance transactional with rate limits. Enforce the last-active-Super-Admin rule through a pure, tested policy function.

**Consequences.** `AUTH_SECRET` is now consumed for IP hashing. Operators must keep it server-only and stable to preserve hash continuity. Existing audit records keep legacy hashes but are redacted in responses.

---

## ADR-030 — Project-local artifact paths and deliberate view auditing (ACCEPTED)

**Decision ID:** ADR-030 · **Title:** Project-local artifact paths and deliberate view auditing · **Status:** ACCEPTED (owner-directed 2026-11-18)

**Context.** A fixed-depth module path walk and cwd-relative tooling could write development mail outside the repository. Two `admin.invitation.list_viewed` audit events appeared for one visible page view because React StrictMode double-invoked the mount effect while every background GET was audited.

**Decision.** All local artifacts resolve through a marker-based project-root resolver with validated overrides and segments; test workspaces live inside `.local/test-runs/`. Playwright, screenshots and env loading are anchored to the project. Invitation-list auditing requires an explicit `?view=1` request and a one-shot client guard, so it represents a deliberate view rather than every fetch.

**Consequences.** No application-generated file can be redirected outside the repository by cwd or configuration. Audit events for invitation views are no longer duplicated by development effects or background refetches; genuine separate navigations still produce separate events.

---

## ADR-031 — Automated tests use run-specific local-data workspaces (ACCEPTED)

**Decision ID:** ADR-031 · **Title:** Automated tests use run-specific local-data workspaces · **Status:** ACCEPTED (owner-directed 2026-11-19)

**Context.** `scripts/serve-e2e.mjs` pointed the app at the test database but did not set `UTSAV_LOCAL_DIR`, so Playwright account creation wrote credential files into the real `.local/test-users/` registry.

**Decision.** Playwright creates a unique `.local/test-runs/playwright-<run>` workspace and exports it to the managed server; standalone e2e servers reuse only validated workspaces. Vitest uses one run-wide workspace with guaranteed global teardown. Cleanup helpers refuse any path outside `.local/test-runs/`. Global setup snapshots the real registry and teardown fails the run if it changed.

**Consequences.** Automated tests can no longer pollute the real credential registry or dev mail directory. Existing 250 credential files are preserved; no cleanup of them was performed.
