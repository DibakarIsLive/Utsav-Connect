# Changelog

All notable changes to Utsav-Connect are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `package.json`.

## [Unreleased]

### Fixed

- Admin applications list React key warnings (2026-11-16): `AdminApplicationsClient` now reads the normalized `id` field returned by `GET /api/admin/applications` for both desktop `<tr>` and mobile `<li>` keys and detail links. A previous change had switched these to `application._id`, which is never present in the serialized JSON, leaving every key `undefined`. Added an integration assertion that the list payload exposes `id` and never `_id`. Verified in a real development browser at desktop and mobile viewports (0 key warnings, identical unique IDs in both layouts, working filter/search/pagination/detail navigation).

### Added

- Safe Super Admin prompt test workflow: `make test-superadmin-prompt` runs `tests/superadmin-prompt.mjs`, which reuses the actual `promptText`/`promptPassword` helpers from `scripts/create-super-admin.js` (no duplicate implementation), never connects to MongoDB, and never creates an account. Covers visible input, repeated characters, backspace, Enter, and the TTY requirement of `promptPassword`; TTY-required tests (hidden password, confirmation, Ctrl+C) run via `--pty` in a real terminal such as macOS Terminal.
- `make check-super-admin` runs `scripts/check-super-admin.js`: a read-only inspection of the pilot database that reports the active Super Admin count and whether `sa@utsav.test` exists (role/status only, no password hashes or PII, no database writes).
- `make createsuperuser` now prompts interactively for email, full name, password and password confirmation; direct `npm` execution with `--email`/`--name` arguments is no longer documented.
- Product structure and access control (2026-11-10): public website restricted to venue + About + Apply; devotee portal at `/dashboard`; admin workspace at `/admin` with granular permissions; Super Admin controls at `/admin/users` and `/admin/audit`.
- Official Mahotsav venue changed to Kulti Golf Ground, Kulti, using the verified Google Maps short link `https://maps.app.goo.gl/BcY87xSjA6iRtBY78`.
- Get Directions button opens Google Maps directions to Kulti Golf Ground with current location as origin; Open in Google Maps button uses the official short link directly.
- Satsang Ashram, Deoghar is no longer displayed as the Mahotsav venue; it is a separate sacred location and is never mixed with Kulti Golf Ground.
- Public navigation simplified to: Logo, About, Apply. No Home, Map, or separate Sign In items.
- Public homepage strictly public: hero, intro, Kulti Golf Ground venue, Get Directions, Apply, About link. Campaign geography sections removed.
- `/map` repurposed as public venue finder (physical locations only; no campaign geography).
- Campaign geography APIs protected server-side: `GET /api/areas` and `GET /api/analytics/coverage` require authentication.
- All admin APIs protected with granular permissions (`area:manage`, `proposal:review`, `invitation-report:read:all`, `audit:read:all`, etc.).
- Super Admin-only routes protected: `/admin/users`, `/admin/audit-logs`.
- Playwright browser journey suite (72 tests) verifying public visitor, applicant, devotee, admin, and Super Admin journeys at desktop/tablet/mobile breakpoints against a local `_test` MongoDB.
- Safe Super Admin prompt test workflow: `make test-superadmin-prompt` runs `tests/superadmin-prompt.mjs`, which reuses the actual `promptText`/`promptPassword`/`SHOW_PASSWORD` from `scripts/create-super-admin.js` (no duplicate implementation), never connects to MongoDB, and never creates an account. Automated checks run on genuinely piped stdin (via spawned child processes) and verify non-TTY rejection plus `SUPER_ADMIN_SHOW_PASSWORD` env wiring; TTY rendering tests (hidden/visible echo, backspace, Ctrl+C) are documented for macOS Terminal.
- `make check-super-admin` runs `scripts/check-super-admin.js`: read-only inspection of the pilot database reporting the active Super Admin count and whether `sa@utsav.test` exists (role/status only, no password hashes/PII, no writes).

### Changed

- `scripts/create-super-admin.js`: replaced readline-based `promptText` with a unified raw-mode `promptInput` used by both `promptText` and `promptPassword`, fixing a bug where the Email prompt did not advance after Enter in a real terminal. Both prompts now explicitly require a real TTY and fail safely with a clear error on piped input. Added `SUPER_ADMIN_SHOW_PASSWORD` env support (`true` echoes password characters while typing; unset/invalid defaults to hidden), applied to both password entry and confirmation. Argon2id hashing and password length/confirmation requirements are unchanged.

- Full rewrite of public pages (`app/page.jsx`, `app/about/page.jsx`, `app/map/page.jsx`), account pages (`app/apply/`, `app/login/`, `app/verify-email/`, `app/application-status/`), dashboard (`app/dashboard/`), and admin pages (`app/admin/**`) with server-side data fetching + client interactivity.
- Navigation model rewritten (`ui/lib/navigation.js` + `ui/lib/admin-navigation.js`): permission-filtered admin nav, Super Admin section separated.
- `eslint.config.mjs`: disabled `react-hooks/set-state-in-effect` for valid client-effect synchronisation patterns; `.local/` added to global ignores.
- New Playwright config (`playwright.config.mjs`) and browser journey spec (`tests/playwright/browser-journeys.spec.js`).
- New unit test `tests/unit/admin-navigation.test.js`; updated `tests/unit/navigation.test.js` to the Map/About/single-account model.

### Changed

- Rewrote the Stage 2 specification and decision report around application-first access: no public registration path grants devotee access, approval requires email verification, and verified applicants may hold only an `application`-scope session for their own status/summary.
- Synchronized README, architecture, security, database, testing, deployment, roadmap, product-requirements, project-status, and decision records with the accepted Stage 2 design. No Stage 2 code, model, dependency, collection, or active environment variable was added.
- Verified the documentation-only revision on 2026-11-05: `make check` passed (JS-only guard, ESLint, Prettier, 5 unit files / 47 tests); `git diff --check` passed; all 56 relative links across the 13 edited Markdown files resolved. No Stage 2 behaviour was tested because no Stage 2 code exists.
- Updated ADR-010 and ADR-014 rather than adding contradictory records; ADR-010 is **RESOLVED (design)** and ADR-014 is **ACCEPTED**.
- Initial Stage 2 documentation synchronization (2026-11-04). No authentication code, model, dependency, collection, or environment variable was added.
- Development and test databases moved to the MongoDB Atlas cluster `main` (ADR-012). `.env.example` now shows `mongodb+srv://` placeholders; the Makefile's `check-health` pings `MONGODB_URI` instead of probing local port 27017; docs and README describe the Atlas setup.

### Security

- Atlas database password rotated after the initial connection string was shared in a chat; incident and rules recorded in `docs/04-quality/security.md`.

### Documentation

- Recorded the earlier 2026-11-04 Stage 1 closure attempt: production build passed, but Atlas returned `bad auth` for both isolated database URIs, so `make ci` was not run.
- Closed Stage 1 on 2026-11-04 after Atlas credential alignment: `make check-db` and the full `make ci` pipeline passed (47 unit tests, 6 Atlas-backed integration tests, production build), and served-build smoke checks verified routes, health, security headers, and the 503 degraded path. No credentials were recorded.

### Final verification (2026-11-10)

- `npm run check:js-only` — PASSED (JavaScript-only, no TypeScript)
- `npm run lint` — PASSED (ESLint 9, zero errors)
- `npm run format:check` — PASSED (Prettier, all matched files)
- `npm run test:unit` — PASSED (69 tests, 7 files)
- `npm run test:integration` — PASSED (71 tests, 8 files, against real MongoDB Atlas `utsav_connect_test`)
- `npm run build` — PASSED (only expected optional `nodemailer` warning)
- Playwright browser journeys — PASSED (72/72, desktop + tablet + mobile, against served production build on local `_test` MongoDB)
- `npm run check` — PASSED (combined JS-only + lint + format + unit)

- CSRF origin checks, Mongo rate limiting, auth guards, append-only audit-log hooks, masked admin application lists, `PATCH /api/admin/users/[id]`, account-management modal, centralized venue data, registration-closed gating, and `area:manage` de-implicitification verified against the real test database.

### New features (2026-11-10)

- **Password reset**: `/api/auth/password-reset/request` and `/api/auth/password-reset/confirm` with rate limiting, generic responses (no enumeration), single-use 24-hour tokens, Argon2id password hashing, and session revocation on reset. UI at `/reset-password` with "Forgot password?" link on Sign In.
- **Administrator invitations**: `inviteAdministrator`, `acceptAdminInvitation`, `listAdminInvitations`, `revokeAdminInvitation` service functions. Single-use 7-day invitations, Super Admin-only creation/revocation. UI at `/accept-invitation` plus invitation management section in `AdminUsersClient`.
- **AuthToken model**: `userId` made optional (null at invitation time), added `email` field for invitee addresses.
- **Dev server fix**: `next.config.mjs` excludes `.local/**`, `node_modules/**`, `.next/**`, `.git/**` from Turbopack file watching, fixing the hot-reload loop. `make dev` works correctly at `http://localhost:3000`.

### New test suites (2026-11-10)

- `tests/integration/password-reset.test.js`: 7 tests for reset request, unknown email, valid/invalid/expired/reused tokens, session revocation, login after reset.
- `tests/integration/admin-invitation.test.js`: 9 tests for invitation creation, Super Admin-only enforcement, duplicate prevention, acceptance, invalid tokens, listing, revocation.

### Final verification (2026-11-10)

- `npm run check:js-only` — PASSED (JavaScript-only, no TypeScript)
- `npm run lint` — PASSED (ESLint 9, zero errors)
- `npm run format:check` — PASSED (Prettier, all matched files)
- `npm run test:unit` — PASSED (69 tests, 7 files)
- `npm run test:integration` — PASSED (87 tests, 10 files, against real MongoDB Atlas `utsav_connect_test`)
- `npm run build` — PASSED (only expected optional `nodemailer` warning)
- Playwright browser journeys — PASSED (72/72, desktop + tablet + mobile, against served production build on local `_test` MongoDB)
- `npm run check` — PASSED (combined JS-only + lint + format + unit)
- `make dev` — PASSED (development server starts cleanly, no hot-reload loop)

## [0.1.0] — 2026-11-03

Stage 1 foundation (roadmap Phases 0–3, partial).

### Added

- JavaScript-only Next.js 16 (App Router) project: `package.json`, `next.config.mjs`, `jsconfig.json` (`@/*` alias), ESLint 9 flat config, Prettier 3 with Tailwind plugin.
- Tailwind CSS 4 with initial design tokens in `ui/styles/globals.css`.
- Public shell: root layout with skip link, header, responsive primary navigation, footer; pages `/`, `/about`, `/map` (explicit "not available yet"), `not-found`, route error boundary, SVG icon.
- Server-only foundation under `api/lib/`: Zod-validated environment, JSON-line logger with secret redaction, MongoDB connection module with cached connection and bounded timeouts, database health check, HTTP response envelope and error mapping.
- `GET /api/health` returning 200 (`ok`) or 503 (`SERVICE_DEGRADED`), never cached.
- Scripts: `check-javascript-only.js` (TypeScript guard), `check-mongodb.js` (connectivity ping).
- Vitest 4 setup with 47 unit tests and 6 integration tests (gated on `MONGODB_URI_TEST`, `_test` database name enforced).
- Root `Makefile`, `.env.example`, documentation set under `docs/`, this changelog.

### Security

- Response headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; HSTS in production only; `X-Powered-By` removed.
- Database and internal error details are logged server-side only and never returned to clients.

## 2026-11-18 — Stabilization pass

- Anchored all `.local` runtime artifacts to the Utsav-Connect project root; migrated five misplaced dev email files with checksum verification.
- Disabled permanent account deletion in UI, API (410) and service pending formal retention-policy approval; suspension/reinstatement unchanged.
- Hardened audit privacy: write-time redaction, read-time allowlist, keyed `v1:` HMAC IP hashing, no raw user agents in responses.
- Enforced `application:note:write` through a dedicated endpoint and UI action; decisions no longer accept notes.
- Made invitation acceptance transactional, rate limited, and audited for list access.
- Replaced the last-Super-Admin guard with an explicit, unit-tested policy rule and added an Admin API route-guard registry test.

## 2026-11-18 — Local path and audit-view stabilization

- Validated the shared local-artifact path resolver against traversal and out-of-repository overrides; moved all test workspaces into `.local/test-runs/`.
- Anchored env loading, screenshots, Playwright outputs and Makefile inspection to the project root; added `make show-local-paths`.
- Fixed duplicate `admin.invitation.list_viewed` events by auditing only deliberate views and guarding the StrictMode double effect.

## 2026-11-19 — Test credential isolation

- Added run-specific `.local/test-runs/` workspaces for Playwright and Vitest; spawned servers inherit the isolated environment.
- Added strict cleanup containment and real-registry change detection; added unit, integration and browser regression tests.
