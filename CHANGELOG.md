# Changelog

All notable changes to Utsav-Connect are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `package.json`.

## [Unreleased]

### Added

- Accepted Stage 2 design (2026-11-05): mandatory devotee application and approval workflow; one stored `admin` role with granular permissions and "Moderator" as a permission profile; `/admin/devotees` management dashboard; limited applicant session for own status/summary; applicant-PII restrictions; invitation-report privacy; one effective session TTL. Documentation-only; implementation not authorized.
- Stage 2 decision records D-01–D-27, with D-01, D-08, D-17, D-18, D-19, D-20, D-21, D-22, D-24, and D-26 accepted; D-10, D-19 retention periods, D-07 deletion, and D-16 remain deferred.
- **D-22:** removed date of birth completely from the application design. Final fields are full name, email, password, phone, gender (Male/Female), and optional custom message; no age eligibility check, model field, schema, payload, UI field, or test fixture.
- Initial Stage 2 preparation documents (2026-11-04): `docs/stage-2-decision-report.md` and `docs/stage-2-authentication-spec.md`.
- ADR-014 for a first-party authentication layer with opaque MongoDB sessions, Argon2id, email + password, and email verification; status **ACCEPTED** as the design baseline, not implemented.

### Changed

- Rewrote the Stage 2 specification and decision report around application-first access: no public registration path grants devotee access, approval requires email verification, and verified applicants may hold only an `application`-scope session for their own status/summary.
- Synchronized README, architecture, security, database, testing, deployment, roadmap, product-requirements, project-status, and decision records with the accepted Stage 2 design. No Stage 2 code, model, dependency, collection, or active environment variable was added.
- Verified the documentation-only revision on 2026-11-05: `make check` passed (JS-only guard, ESLint, Prettier, 5 unit files / 47 tests); `git diff --check` passed; all 56 relative links across the 13 edited Markdown files resolved. No Stage 2 behaviour was tested because no Stage 2 code exists.
- Updated ADR-010 and ADR-014 rather than adding contradictory records; ADR-010 is **RESOLVED (design)** and ADR-014 is **ACCEPTED**.
- Initial Stage 2 documentation synchronization (2026-11-04). No authentication code, model, dependency, collection, or environment variable was added.
- Development and test databases moved to the MongoDB Atlas cluster `main` (ADR-012). `.env.example` now shows `mongodb+srv://` placeholders; the Makefile's `check-health` pings `MONGODB_URI` instead of probing local port 27017; docs and README describe the Atlas setup.

### Security

- Atlas database password rotated after the initial connection string was shared in a chat; incident and rules recorded in `docs/security.md`.

### Documentation

- Recorded the earlier 2026-11-04 Stage 1 closure attempt: production build passed, but Atlas returned `bad auth` for both isolated database URIs, so `make ci` was not run.
- Closed Stage 1 on 2026-11-04 after Atlas credential alignment: `make check-db` and the full `make ci` pipeline passed (47 unit tests, 6 Atlas-backed integration tests, production build), and served-build smoke checks verified routes, health, security headers, and the 503 degraded path. No credentials were recorded.

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
