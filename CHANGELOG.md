# Changelog

All notable changes to Utsav-Connect are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `package.json`.

## [Unreleased]

### Added

- Complete frontend redesign of Utsav-Connect (2026-11-10): homepage, About, map, Apply/Sign In, verify-email, application-status, devotee dashboard, full admin workspace (overview, applications, areas, proposals, invitation reports, accounts & roles, audit log), admin shell, navigation model, forms, modals, tables, empty/loading/error states, responsive design, animations, and authentic imagery. Connected to existing real APIs end-to-end.
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

### Changed

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
