## Automated test credential isolation — 2026-11-19

| Command                                                   | Result                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run check` (19 unit files)                           | **210 passed, 0 failed**                                                  |
| `npm run build`                                           | passed                                                                    |
| `npm run test:integration`                                | 3 passed (credential isolation), 168 skipped — Atlas unavailable this run |
| Playwright isolation spec (manual server, DB unreachable) | 1 passed, 1 skipped (DB-dependent account creation)                       |
| Real registry before/after automated tests                | 250 files, SHA-256 set **identical**                                      |

New files: `tests/helpers/local-workspace.js` (hardened), `tests/setup/global-isolation.mjs`, `tests/unit/test-workspace-isolation.test.js`, `tests/integration/credential-isolation.test.js`, `tests/playwright/credential-isolation.spec.js`, `tests/playwright/global-setup.mjs`, `tests/playwright/global-teardown.mjs`. Updated: `playwright.config.mjs`, `vitest.config.mjs`, `scripts/serve-e2e.mjs`, `tests/unit/local-artifact-paths.test.js`.

## Local path and audit-view stabilization — 2026-11-18

| Command                                                              | Result                               |
| -------------------------------------------------------------------- | ------------------------------------ |
| `npm run check` (199 unit tests before, 204 after)                   | **204 passed, 0 failed**             |
| `npm run test:integration`                                           | **157 passed, 0 failed, 11 skipped** |
| `npm run build`                                                      | passed                               |
| `make test-e2e`                                                      | **195 passed, 0 failed, 12 skipped** |
| `make show-local-paths` from project root and from parent `Repo` cwd | identical, project-anchored paths    |

New/updated regression coverage: `tests/unit/local-artifact-paths.test.js` (traversal, invalid and external overrides, cross-cwd redirect attempt, `.env.local` loading from a foreign cwd) and in-repo isolated workspaces via `tests/helpers/local-workspace.js`. `tests/integration/invitation-reliability.test.js` now proves background invitation fetches are not audited while an explicit `?view=1` request is.

## Stabilization pass — 2026-11-18

| Command                                               | Result                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run check` (JS-only, ESLint, Prettier, 199 unit) | **199 passed, 0 failed, 0 skipped**                                                    |
| `npm run test:integration`                            | **157 passed, 0 failed, 11 skipped** (deletion suites skipped while policy unapproved) |
| `npm run build`                                       | passed                                                                                 |
| `make test-e2e`                                       | **195 passed, 0 failed, 12 skipped**                                                   |
| Path resolution from project root and parent `Repo`   | 4 unit tests passed (incl. child-process checks from both directories)                 |

New suites: `local-artifact-paths`, `ip-hash`, `super-admin-policy`, `admin-route-guard-registry`, `account-deletion-disabled`, `audit-privacy`, `application-note`, `invitation-reliability`, and a browser invitation flow that reads the dev `.eml` from `Utsav-Connect/.local/mail/`. Deletion tests are intentionally skipped while `ACCOUNT_DELETION_POLICY_APPROVED === false`.

# Testing

Last updated: 2026-11-17.

This page describes the test suites that exist today, the commands that actually run them, and what each suite does **not** prove. It is written against direct source inspection (2026-11-17) and the current working tree. A file existing or a command being present is not evidence that a feature works. See the [documentation index](../README.md) for the shared status vocabulary and evidence rules.

## Evidence and status vocabulary

| Label                                       | Meaning here                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Implemented and browser-verified**        | A real browser check with a named viewport, route and observed behaviour is recorded.                     |
| **Implemented and automated-test verified** | Unit or integration tests prove it; no browser evidence.                                                  |
| **Implemented but inadequately tested**     | Code exists, proof is weak or partial.                                                                    |
| **Skipped**                                 | The suite did not execute; this is **not** a pass. See [Skipped is not passing](#skipped-is-not-passing). |

Automated tests, process checks (build, HTTP probes) and browser verification are **reported separately**. A passing build or a present Playwright spec never implies browser coverage. See also [security](security.md) for defects that weaken what tests can prove.

## Unit tests — 167 tests in 11 files

Unit tests need no database. They are discovered by `vitest` via `include: ["tests/**/*.test.js"]` with a Node environment, the `@/*` alias, a `server-only` stub (`tests/stubs/server-only.js`), a `.env.local` loader (`tests/setup/load-env.js`) and `fileParallelism: false` (`vitest.config.mjs`).

| File (`tests/unit/`)            | Focus                                                         |
| ------------------------------- | ------------------------------------------------------------- |
| `admin-navigation.test.js`      | Admin nav visibility and permission filtering                 |
| `check-javascript-only.test.js` | The JavaScript-only repository guard                          |
| `credential-registry.test.js`   | Credential-registry config resolution and file writer/locking |
| `email.test.js`                 | Email adapter/transport selection and dev output              |
| `env.test.js`                   | Zod env parsing, defaults and error formatting                |
| `http.test.js`                  | JSON success/error response helpers                           |
| `logger.test.js`                | Log-level filtering and redaction                             |
| `navigation.test.js`            | Public navigation helpers                                     |
| `password.test.js`              | Argon2id hashing and verification helpers                     |
| `registration.test.js`          | Registration input/validation helpers                         |
| `venue.test.js`                 | Official venue link and directions helpers                    |

They cover helpers and pure logic only. They do not exercise real MongoDB, route handlers end-to-end, or a browser.

Run with `npm run test:unit` or `make test-unit`. They are also part of the quality gate `npm run check` / `make check`.

## Integration tests — 120 tests in 12 files

Integration tests exercise services and route handlers against a real MongoDB test database. The 12 files (all under `tests/integration/`) declare 120 tests in total:

| File (`tests/integration/`)    | Focus                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `admin-invitation.test.js`     | Admin invitation create/accept/revoke                        |
| `area-workflow.test.js`        | Area creation and admin review workflow                      |
| `database-consistency.test.js` | Cross-model consistency checks                               |
| `database-persistence.test.js` | Persistence of saved records                                 |
| `email-delivery.test.js`       | Email adapter output and token delivery                      |
| `health-route.test.js`         | `/api/health` response shape and status                      |
| `invitation-workflow.test.js`  | Invitation report submission and review                      |
| `mongodb-connection.test.js`   | Connection module behaviour and error handling               |
| `password-reset.test.js`       | Reset request and confirm flow                               |
| `permission-security.test.js`  | Granular permission checks                                   |
| `route-authorization.test.js`  | Role/scope gates on route handlers                           |
| `user-workflow.test.js`        | Registration, verification, login/logout, session validation |

Together they cover registration/application workflow, email verification, login/logout/session validation, password reset, admin invitations, user management, permission and route-authorization checks, area and invitation workflows, database persistence/consistency and the health route.

Run with `npm run test:integration` or `make test-integration`.

### Skip gate and the `_test` suffix guard

Each suite opens with `const gate = await databaseSuiteGate("<suite-name>")` and wraps its tests in `describe.skipIf(gate.skip)(...)` (for example `tests/integration/user-workflow.test.js`). The gate in `tests/helpers/database.js`:

- reads `MONGODB_URI_TEST` and calls `assertSafeTestUri`, which **refuses** to run unless the database name ends in `_test` (`/_test(\?|$)/`); if unset it throws.
- probes the database with a short timeout. If reachable, `{ skip: false }` — tests run.
- if unreachable, logs a notice and returns `{ skip: true }`, so the suite is skipped — **unless** `UTSAV_TEST_REQUIRE_DB=1`, in which case it throws and the run fails.

`make ci` sets `UTSAV_TEST_REQUIRE_DB=1` so CI cannot silently skip a suite. Locally, a skipped run still exits zero — read the output.

### Reading a Vitest run correctly

Vitest reports passed, failed and skipped counts separately. To record an integration result accurately:

- note the skipped count from the run output, not just the exit code;
- if every suite reports `{ skip: false }` and the passed count is 120, an integration pass can be claimed;
- if any suite skipped, report it as "N passed, M skipped" and mark the skipped coverage unverified;
- if `UTSAV_TEST_REQUIRE_DB=1` is set, an unreachable database is a failure rather than a skip, which is the mode used by `make ci`.

Do not copy a "120 passed" line from an earlier checkpoint into a current status report without confirming the current run's skip count. See [Skipped is not passing](#skipped-is-not-passing) and the [project status](../01-project/project-status.md).

## Browser tests — Playwright

Config: `playwright.config.mjs` — `testDir: ./tests/playwright`, `baseURL: process.env.PLAYWRIGHT_BASE_URL || http://localhost:3000`, `fullyParallel: true`, `forbidOnly` in CI, retries `2` in CI / `0` locally, `workers: 2` in CI, `reporter: "html"`, trace on first retry, screenshot/video on failure, and `webServer: undefined` (a server must already be running). The spec uses the same base URL variable.

Three projects: **desktop** (`Desktop Chrome`), **tablet** (`iPad Air`), **mobile** (`Pixel 7`).

Spec: `tests/playwright/browser-journeys.spec.js` contains **23 `test()` declarations** across **9 `describe` blocks**; a 3-size loop expands these to 31 logical tests. It covers:

- Public pages on each viewport: homepage heading/nav, `/map` venue text for Kulti Golf Ground, `/about`, and `/apply` default tab with its visible fields.
- Login flow for seeded accounts (devotee, applicant, admin, super admin, reviewer).
- One dashboard invitation-report submission (fields and success state).
- Admin page navigation headings and limited-admin link hiding.
- Super Admin page access for the seeded super-admin account.
- Venue buttons and a responsive drawer at narrow viewports.
- Application-review control presence and rejection-note validation.

It does **not** cover:

- real approve/reject mutations (the review interface is only inspected, not exercised to completion);
- area creation/update/archive CRUD;
- locality-proposal review mutations;
- password reset, email verification or invitation acceptance end-to-end;
- coverage/analytics map rendering in a browser;
- any assertion against the interactive campaign map — those UI components are orphaned (not imported by a page), so no test can reach them (see [architecture](../02-architecture/architecture.md)).

The suite therefore proves that pages render and some controls exist, not that the underlying operations succeed. A "green" browser run must not be read as verification of those mutations.

Run with `make test-e2e` (or `npm run test:e2e`). Playwright manages its own test-DB server on port 3100. See [E2E workflow](#e2e-workflow-reproducible-and-guarded).

### Committed E2E seed (D2 resolved)

The browser fixtures are now committed and reproducible:

- `scripts/seed-e2e.mjs` — idempotent seed; `scripts/lib/e2e-db-guard.js` — shared database guard; `scripts/serve-e2e.mjs` — starts the app against the test database.
- Every seeded document carries `e2eSeedTag: "e2e-acceptance-seed"`. Cleanup deletes **only** documents with that tag; no collection is cleared and no database is dropped.
- ObjectIds are deterministic (SHA-256 of tag + logical key) and inserts are upserts, so repeated seeding produces the same records.
- The spec assigns a distinct client IP per test so login rate-limit buckets do not saturate across the 93 test executions; this changes only the test client identifier, not application security.
- The old `.local/seed-test.mjs` remains a git-ignored, non-authoritative local convenience and is not required for E2E.

## Test database setup and seed management

- Integration tests use `MONGODB_URI_TEST` only; the suite name must end in `_test`. The database name is separate from the pilot database (`MONGODB_URI`) and the helper refuses any test URI without the `_test` suffix.
- Set both URIs in `.env.local` (created from `.env.example` via `make setup-env`, which never overwrites). Atlas credentials must never be printed or committed.
- Fixtures are created and cleaned inside each suite (`beforeAll`/`afterAll`), with unique generated emails; suites run serially to avoid races (`fileParallelism: false`).
- The browser seed is committed (`scripts/seed-e2e.mjs`) and guarded to `utsav_connect_test`. It deletes only its own tagged records. Use `make e2e-status` for a read-only count and `make clean-e2e` to remove only tagged fixtures.
- `make check-db`, `make check-pilot`, `make db-inspect` and `make check-super-admin` are read-only diagnostics that show names/counts only, never credentials.

## Commands that actually exist

### npm scripts (from `package.json`)

| Command                                           | Purpose                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `npm test`                                        | `vitest run` — all Vitest suites                                 |
| `npm run test:unit`                               | unit tests only                                                  |
| `npm run test:integration`                        | integration tests only                                           |
| `npm run test:superadmin-prompt`                  | Super Admin prompt input tests (no MongoDB, no account creation) |
| `npm run test:e2e`                                | Playwright browser journeys (server must be running)             |
| `npm run seed:e2e` / `npm run clean:e2e`          | Seed / clean tagged E2E fixtures in the test database            |
| `npm run serve:e2e`                               | Start the app against the test database (E2E_PORT, default 3100) |
| `npm run test:watch`                              | Vitest watch mode                                                |
| `npm run check`                                   | JS-only check + lint + format-check + unit tests                 |
| `npm run check:js-only`                           | fail if any TypeScript file/config exists                        |
| `npm run check:db`                                | ping MongoDB (never prints credentials)                          |
| `npm run lint` / `npm run lint:fix`               | ESLint                                                           |
| `npm run format` / `npm run format:check`         | Prettier                                                         |
| `npm run dev` / `npm run build` / `npm run start` | Next.js dev / build / serve                                      |
| `npm run auth:create-super-admin`                 | Super Admin bootstrap CLI                                        |
| `npm run db:sync-indexes -- --inspect`            | read-only index report (safe on any database)                    |
| `npm run db:sync-indexes -- --dry-run`            | read-only index report plus planned createIndex calls            |
| `npm run db:sync-indexes -- --apply`              | additive-only index creation; never drops indexes                |

### Make targets (from `Makefile`)

`help`, `doctor`, `install`, `setup-env`, `dev`, `build`, `start`, `lint`, `lint-fix`, `format`, `format-check`, `check-js-only`, `test-unit`, `test-integration`, `test-superadmin-prompt`, `seed-e2e`, `clean-e2e`, `e2e-status`, `dev-e2e`, `test-e2e`, `test`, `check`, `ci`, `check-db`, `check-pilot`, `check-super-admin`, `db-inspect`, `users`, `createsuperuser`, `recover-super-admin`, `check-email`, `show-mail`, `check-health`, `health`, `status`, `show-urls`, `open`, `stop`, `clean-cache`, `clean`.

Key gates:

- `make check` → `npm run check` (no DB needed).
- `make ci` → `npm run check`, then `UTSAV_TEST_REQUIRE_DB=1 npm run test:integration`, then `npm run build`.

### E2E workflow (reproducible and guarded)

Clean-checkout sequence:

1. `make setup-env` and fill `MONGODB_URI_TEST` (must point at `utsav_connect_test`). `MONGODB_URI` may point at the pilot; E2E never uses it.
2. `make build` — produce `.next` for the managed production-mode server.
3. `make test-e2e` — seeds tagged fixtures, then Playwright **starts and stops its own server** on port 3100 via `webServer` in `playwright.config.mjs`, using `scripts/serve-e2e.mjs --production` with `MONGODB_URI` overridden to the test value. It never touches an existing `make dev` on port 3000 and shuts down only the process it started.
4. `make e2e-status` / `make clean-e2e` — inspect or remove only seed-owned records.

For an explicitly running server, set `PLAYWRIGHT_BASE_URL`; in that case Playwright does not start a webServer.

Guard proof (no writes, no network required):

- `node scripts/seed-e2e.mjs --check` → `ACCEPTED (utsav_connect_test)`.
- With `MONGODB_URI_TEST` set to a pilot URI → exits 1 with `... is the real pilot database`.
- With any other database name → exits 1 with `... is not the permitted test database`.

Limitations: (1) the managed server runs in production mode, so React dev-only warnings are not part of E2E; (2) the build prerequisite is explicit — run `make build` before `make test-e2e`; (3) `make dev-e2e` remains available for an interactive dev-mode server but cannot run alongside `make dev` in the same directory.

## Environment prerequisites

A minimal reproducible local setup is:

1. `make doctor` — confirm Node/npm versions and `.env.local` presence.
2. `make install` — install from the committed lockfile.
3. `make setup-env` — create `.env.local` from `.env.example`, then set both database URIs (test URI ending in `_test`).
4. `make check` — JS-only, lint, format and unit tests; no database required.
5. `make test-integration` — needs a reachable test database; confirm the skip count.
6. `make build` then `make test-e2e` — Playwright manages the isolated test-DB server.
7. `make ci` — the full non-skipping gate used before a release claim.

- Node `>=20.12.0` and npm `>=10.0.0` (`make doctor` checks these); `mongosh` is optional.
- Dependencies installed from `package-lock.json` (`make install`).
- `.env.local` present with `MONGODB_URI` and `MONGODB_URI_TEST` (`make setup-env`); the test URI must end in `_test`.
- A reachable MongoDB test database for integration tests; locally unreachable databases cause skips, and `UTSAV_TEST_REQUIRE_DB=1` turns that into a failure.
- `make build` before the first E2E run; Playwright then manages its own test-DB server on port 3100.
- `@playwright/test` and `playwright` are dev/runtime dependencies; browser binaries must be installed separately by the operator.

## Skipped is not passing

`describe.skipIf(gate.skip)` causes Vitest to report skipped tests with a notice. When MongoDB is unreachable, `databaseSuiteGate` also prints an explicit message: the suite name, the reason, and "Suite skipped (set UTSAV_TEST_REQUIRE_DB=1 to fail instead)." A run in which suites were skipped may still exit with status 0 — **do not record it as 120 passing integration tests**. To claim an integration pass, confirm `skip: false` for every suite (or run `UTSAV_TEST_REQUIRE_DB=1`/`make ci`) and read the test counts from the runner output. Never convert a skipped run into a "PASS" in status reports or checkpoints.

## Known limitations

- `D1`, `D2`, `D3` and `D5` were fixed and regression-tested in Stage 0 (see [Project status](../01-project/project-status.md)); historical failure artifacts under `test-results/` predate those fixes.
- Password-reset delivery failures still use the dev file transport; no real email is sent, so real-provider delivery remains untested.
- Integration suites share one database and clean their own fixtures; `fileParallelism: false` avoids races but limits speed.
- No email is sent by the dev provider (`.local/mail/*.eml` only); real delivery is untested.
- Browser tests do not cover mutations (approve/reject, area CRUD, proposal review), password reset, verification, invitation acceptance or map rendering.
- No coverage tool is configured. `make test-e2e` manages its own server but requires a prior `make build`.
- Orphaned interactive-map components are not reachable from any page, so no browser test can assert them.
- The HTML reporter writes `playwright-report/`; failure artefacts land in `test-results/`, which has committed history and must be reviewed before citing browser results.
- `AUTH_SECRET` is required by env validation but unused in code, so unit/env tests cannot claim it contributes to security.
- Index management is additive and read-only by default; no automated regression suite asserts index state, so run `--inspect` after model changes.
- Integration suites clean their own tagged/unique fixtures; the committed E2E seed cleans only records carrying its own tag.

## Claimed results — 2026-11-16 (not re-verified here)

The 2026-11-16 checkpoint **claimed**: `npm run check` passed with 167 unit tests; integration tests passed with 120 tests; the production build passed; and a dev-server browser check at desktop and mobile viewports produced 0 React key warnings. These are **reported claims from that checkpoint**, not results re-run or re-verified during this documentation task. Treat them as historical claims until reproduced; in particular, reconcile them with the committed browser failure artifact and the skip-gate behaviour described above before repeating them as current truth.

## Stage 0 results — 2026-11-17

Executed during Stage 0 stabilization against `utsav_connect_test` (Atlas reachable):

| Group                                   | Command                                                          | Result                           |
| --------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Password-reset regressions (mocked)     | `npx vitest run tests/unit/password-reset-logger.test.js`        | 5 passed, 0 failed               |
| Password-reset integration              | `npx vitest run tests/integration/password-reset.test.js`        | 8 passed, 0 failed               |
| Credential-registry sync regressions    | `npx vitest run tests/unit/account-route-registry-sync.test.js`  | 6 passed, 0 failed               |
| Existing credential-registry unit suite | `npx vitest run tests/unit/credential-registry.test.js`          | 33 passed, 0 failed              |
| E2E guard unit suite                    | `npx vitest run tests/unit/e2e-db-guard.test.js`                 | 6 passed, 0 failed               |
| Browser journeys                        | `make test-e2e` (production E2E server on port 3100)             | 93 passed, 0 failed              |
| Index inspection                        | `npm run db:sync-indexes -- --inspect` (test + pilot, read-only) | 0 missing, 0 conflicting on both |

The E2E run used a production build because Next.js forbids a second dev server in the same working directory while `make dev` occupies port 3000. React dev-only warnings are therefore not exercised by that run.

## Phase A results — 2026-11-17

| Group                                                              | Command                                  | Result                                            |
| ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------- |
| Full quality gate                                                  | `npm run check`                          | 184 unit tests passed, 0 failed, 0 skipped        |
| Integration                                                        | `npm run test:integration`               | 121 passed, 0 failed, 0 skipped (Atlas reachable) |
| Browser journeys (incl. 10 new devotee-portal tests × 3 viewports) | `make test-e2e` (managed test-DB server) | **123 passed, 0 failed, 0 skipped**               |
| Production build                                                   | `npm run build`                          | passed                                            |

A pre-existing flaky concurrency test in `credential-registry.test.js` was stabilised by giving each spawned child a unique temporary module filename.

## Phase B results — 2026-11-17

| Group                                                               | Command                    | Result                                            |
| ------------------------------------------------------------------- | -------------------------- | ------------------------------------------------- |
| Full quality gate                                                   | `npm run check`            | 184 unit tests passed, 0 failed, 0 skipped        |
| Integration                                                         | `npm run test:integration` | 121 passed, 0 failed, 0 skipped (Atlas reachable) |
| Browser journeys (incl. 10 new admin-workspace tests × 3 viewports) | `make test-e2e`            | **150 passed, 0 failed, 0 skipped**               |
| Production build                                                    | `npm run build`            | passed                                            |

New browser coverage: admin login/dashboard, portal navigation, devotee directory search/detail, suspend/reinstate on an isolated test account, invitation review and audit, area access, population validation/update, proposal review access, analytics, audit history, ordinary-admin denials, direct API 403s, mobile drawer and logout. Lifecycle tests are idempotent across repeated runs.

## Administrator security audit — 2026-11-18

| Command                    | Result                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run check`            | 184 unit tests passed, 0 failed, 0 skipped                                                               |
| `npm run test:integration` | **148 passed** (incl. new 14-test `admin-security-audit.test.js`)                                        |
| `npm run build`            | passed                                                                                                   |
| `make test-e2e`            | **198 passed, 0 failed, 0 skipped** (incl. new 3-test `admin-security-audit.spec.js` across 3 viewports) |

The new integration suite uses an explicit `_test` DB-name guard and covers creation/invitation authorization, Super Admin escalation refusal, permission allowlisting and de-duplication, single-use 7-day invitation tokens (invalid/expired/revoked/used/wrong-type), route-level enforcement of the granular permissions, account protection, database-backed dashboard counts and audit-metadata authorization. The browser suite proves ordinary admins cannot open protected sections by direct navigation, that the create form offers no Super Admin role, and that invalid invitation tokens show an error.

## Full account lifecycle verification — 2026-11-18

| Command                    | Result                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run check`            | 184 unit tests passed, 0 failed, 0 skipped                                                     |
| `npm run test:integration` | **134 passed** (incl. new 6-test `account-lifecycle-verification.test.js`)                     |
| `npm run build`            | passed                                                                                         |
| `make test-e2e`            | **189 passed, 0 failed, 0 skipped** (incl. status-dependent detail actions across 3 viewports) |

The new integration suite creates a disposable `lifecycle-*` devotee in `utsav_connect_test` behind an explicit `_test` guard, exercises create → inspect → suspend → session/registry/audit checks → reinstate → session/registry/audit checks → delete → DB/registry cleanup, and verifies self/Super Admin protection plus the equivalent ordinary-Admin lifecycle. The browser test confirms active accounts show "Suspend devotee" (no reinstate) and suspended accounts show "Reinstate devotee" (no suspend), with deletion available to the Super Admin in both states. Direct guarded DB inspection confirmed zero `lifecycle-*` users remained and no pilot connection was made.

## Devotee delete permission regression — 2026-11-18

| Command                    | Result                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run check`            | 184 unit tests passed, 0 failed, 0 skipped                                                 |
| `npm run test:integration` | 128 passed (status-only admin cannot delete; delete-permission admin can)                  |
| `make test-e2e`            | **186 passed, 0 failed, 0 skipped** (status-only admin can suspend but gets 403 on delete) |

## Account lifecycle regression — 2026-11-18

| Command                    | Result                                                                 |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run test:integration` | 126 passed (incl. 5 deletion tests with strict `_test` guard)          |
| `make test-e2e`            | **183 passed, 0 failed, 0 skipped** (incl. 12 lifecycle browser tests) |

Browser tests cover admin/devotee deletion with confirmation and cancellation, API refusal of unauthorized/self/Super Admin deletion, and mandatory reason validation.

## Focus-management regression — 2026-11-17

`tests/playwright/focus-management.spec.js` covers the shared `Modal` lifecycle and shared form inputs: Create Account modal initial focus, typing character-by-character, Backspace, multiple fields, password Show/Generate, keyboard select navigation, Escape/Cancel focus restore, Area creation and Invitation review modals, public registration inputs, mobile viewport, and validation-error focus targets.

| Command                    | Result                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm run check`            | 184 unit tests passed, 0 failed, 0 skipped                                  |
| `npm run test:integration` | 121 passed, 0 failed, 0 skipped                                             |
| `make test-e2e`            | **171 passed, 0 failed, 0 skipped** (includes 17 focus tests × 3 viewports) |
| `npm run build`            | passed                                                                      |

Manual browser verification: the original bug was reproduced (focus moved to "Close dialog" after one character); after the fix, focus stayed on `#fullName` through six characters and Backspace, phone input preserved typed digits, and focus returned to the trigger on close. Browser console had zero errors/warnings.

## Verification-evidence policy

1. Automated tests (unit/integration), process checks (build, HTTP probes) and browser verification are **reported separately** — never merged into one "all green" statement.
2. A skipped integration suite is not a passing suite; state skip counts explicitly.
3. A browser claim names the viewport, route and observed behaviour; a Playwright file existing is not browser evidence.
4. Known defects stay listed until fixed, even when unrelated tests pass; a passing `make check` does not clear `D1`–`D3` or `D5`.
5. No credentials, hosts, URIs or passwords appear in test output that is committed or pasted into issues/chats; see the rotation rule in [security](security.md).

## Related documents

- [Security](security.md) — open defects (D1, D2, D3, D5), controls and the rotation rule.
- [Project status](../01-project/project-status.md) — the latest verified/unverified checkpoint.
- [Architecture](../02-architecture/architecture.md) and [database](../02-architecture/database.md) — layers and models the tests exercise.
- [Decisions](../02-architecture/decisions.md) — ADRs relevant to tooling and test setup.
- [Roadmap](../roadmap.md) — planned reproducible seed and browser-test work.
- [Product requirements](../01-project/product-requirements.md) — intended capabilities not yet covered by tests.
- [Stage 2 authentication spec](../06-history/stage-2-authentication-spec.md) — original auth test/design context (historical).
