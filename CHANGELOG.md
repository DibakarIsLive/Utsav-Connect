# Changelog

All notable changes to Utsav-Connect are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `package.json`.

## [Unreleased]

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
