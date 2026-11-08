# Architecture

Last updated: 2026-11-05. Describes what exists in the repository today; planned pieces are marked as such.

## 1. Shape of the system

One Next.js 16 application (App Router) serves both the user interface and the HTTP API. There is no separate Express or Vite project, one `package.json`, one lockfile, one build. MongoDB is the only external service today; Google Maps Platform will be added in Stage 3.

```text
browser ──HTTP──▶ Next.js (node runtime)
                   ├── app/            routes: pages (Server Components) + Route Handlers
                   ├── ui/             presentation components, client-safe helpers
                   └── api/            server-only domain code ──▶ MongoDB (Mongoose)
```

## 2. Layers and boundaries

| Directory  | Role                                                                                   | May import                                                       | Must not import                                                           |
| ---------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `app/`     | Routing only. Pages compose `ui/` components; `app/api/**/route.js` delegate to `api/` | `@/ui/*`, `@/api/*`                                              | —                                                                         |
| `ui/`      | React components, hooks, client-safe utilities, global styles                          | `@/ui/*`, `@/api/lib/app-info`                                   | server-only modules (`api/lib/env`, `api/lib/mongodb`, `api/lib/logging`) |
| `api/`     | Server-only logic: env, logging, database, HTTP helpers, later models and services     | `@/api/*`, npm packages                                          | `@/ui/*`, `@/app/*`                                                       |
| `scripts/` | Node CLIs run by npm/Makefile (not bundled by Next)                                    | `@/api/*` is **not** used — scripts load `.env.local` themselves |                                                                           |
| `tests/`   | Vitest suites, helpers, stubs                                                          | anything                                                         | —                                                                         |

Enforcement:

- Every module in `api/lib/env`, `api/lib/mongodb`, `api/lib/logging` starts with `import "server-only";` so Next.js refuses to bundle it into a Client Component.
- `api/lib/http/*`, `api/lib/mongodb/errors.js` and `api/lib/app-info.js` are deliberately dependency-free so unit tests and client code (`app-info`) can import them.
- ESLint `no-restricted-imports` forbids relative `../api/*` paths; the `@/api/...` alias keeps the boundary visible in every import.

Why not `src/`: Next.js requires `app/` to be at the project root (or under `src/`). The roadmap preference for `ui/` + `api/` naming is honoured at the root with `app/` kept as a thin routing layer. See ADR-001.

## 3. Request flow today

### Pages (`/`, `/about`, `/map`)

Static Server Components rendered at build time. `app/layout.jsx` wraps every page with the skip link, `SiteHeader` (contains the only Client Component, `MainNav`, for the mobile toggle), `main#main-content`, and `SiteFooter`. No page reads the database yet.

### `GET /api/health`

```text
app/api/health/route.js (force-dynamic)
  └─ api/lib/mongodb/health.js  checkDatabaseHealth()
       └─ api/lib/mongodb/connection.js  connectToDatabase()
            ├─ api/lib/env/env.js  getEnv().MONGODB_URI
            └─ mongoose.connect(uri, CONNECTION_OPTIONS)  → admin().ping()
  └─ api/lib/http/responses.js  jsonSuccess / jsonError  (Cache-Control: no-store)
```

- Success: `200 { success: true, data: { status: "ok", checks: { database: { status: "ok", latencyMs } }, version, timestamp } }`
- Failure: `503 { success: false, error: { code: "SERVICE_DEGRADED", message }, data: { status: "degraded", checks: … } }` — the per-check detail stays in `data` so monitoring can see which dependency failed, while the envelope remains `success: false`.

### HTTP envelope (used by all future Route Handlers)

- Success: `{ success: true, data }`
- Error: `{ success: false, error: { code, message, details? } }`
- `errorToResponse(error)` maps `ZodError → 400 VALIDATION_ERROR`, `AppError → its status`, `DatabaseUnavailableError → 503`, anything else `→ 500 INTERNAL_ERROR` with a generic message. Raw driver errors never reach clients.

## 4. Configuration

| File                | Purpose                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `next.config.mjs`   | `reactStrictMode`, `poweredByHeader: false`, Turbopack CSS rule for Tailwind, security headers |
| `jsconfig.json`     | `@/*` → repository root; gives editors and Next the same alias                                 |
| `eslint.config.mjs` | `eslint-config-next` core-web-vitals + import-boundary rule; ignores build output              |
| `.prettierrc.json`  | 100-column width, double quotes, trailing commas; Tailwind class sorting                       |
| `vitest.config.mjs` | Node environment, `@/` alias, `server-only` stub, `.env.local` loader                          |
| `.env.example`      | Documented variable names with safe placeholders                                               |

Environment variables are parsed lazily by `getEnv()` (Zod schema). This keeps `next build` working on machines without a database while still failing fast, with the variable name only, the first time server code needs a value.

## 5. Caching model

Next 16's Cache Components are **not** enabled (ADR-009). Routes use segment config: pages are static by default; `/api/health` declares `export const dynamic = "force-dynamic"` and sets `Cache-Control: no-store`.

## 6. Styling

Tailwind CSS 4 is wired through `@tailwindcss/turbopack` (the loader `create-next-app@16` emits) in `next.config.mjs`; `ui/styles/globals.css` imports Tailwind and defines design tokens in `@theme` (brand colour scale, font stacks). No PostCSS config is needed. Fonts are system stacks so builds do not require network access.

## 7. Planned extensions (not implemented)

- `api/models/*` Mongoose schemas with indexes (2dsphere for GeoJSON) — Stage 3/4.
- `api/lib/auth/*`, `api/models/*`, `api/services/*`, and `api/lib/auth/permissions.js` — Stage 2, proposed in [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md).
- `ui/components/maps/*` around Google Maps JavaScript API — Stage 3.
- `api/lib/http/handler.js` route wrapper (validation + error mapping + auth/permission gates) once the first validated POST route exists — Stage 2.
- `ui/components/admin/*` for the `/admin/devotees` application and devotee management dashboard — Stage 2.

## 8. Planned Stage 2 authentication and application shape

This section describes the **accepted design**; no auth or application module exists yet. The full contract is in [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md). Implementation is not authorized until Batch 0 is explicitly approved.

```text
browser
  │  HttpOnly session cookie (opaque token)
  ▼
app/api/auth/**/route.js ──▶ api/lib/http/handler.js
                               ├─ origin/CSRF check
                               ├─ Zod body validation
                               ├─ rate limit (MongoDB counters)
                               ├─ session lookup (hashed token)
                               ├─ account-state gate (active / approved / verified)
                               ├─ role / permission checks
                               └─ service call
                                    ├─ api/models/user.js
                                    ├─ api/models/devotee-application.js
                                    ├─ api/models/devotee-application-note.js
                                    ├─ api/models/session.js
                                    ├─ api/models/auth-token.js
                                    ├─ api/models/audit-log.js
                                    └─ api/lib/email/mailer.js
```

### 8.1 Application-first flow

```text
POST /api/auth/register
  └─ validate six fields (no date of birth)
       ├─ user: pending_verification, role devotee
       ├─ application: pending, immutable applicant snapshot
       ├─ email-verification token
       └─ 202 accepted (no session)

email verified ──▶ user: pending_approval
                 └─ limited application-scope session allowed
admin approves ──▶ application: approved + user: active (one transaction)
                 └─ all sessions revoked; fresh full login required
admin rejects  ──▶ application: rejected + user: rejected  (one transaction)
                 └─ generic notice; no devotee access
```

No public path grants devotee access. The full-access gate is `status === "active"` **and** `emailVerifiedAt` **and** an approved current application. A verified applicant whose application is pending or rejected may hold only an `application`-scope session, which can read `/application-status` and `GET /api/account/application`. The reserved `expired` state has no Stage 2 login eligibility. Pending-verification, invited, suspended, and deleted accounts receive no session.

Sessions use one effective TTL index on `expiresAt` (capped at `absoluteExpiresAt`); absolute expiry is enforced again during validation. `absoluteExpiresAt` is not TTL-indexed.

### 8.2 Roles and permissions

- Stored roles: `devotee`, `admin`, `super_admin`. `visitor` is the absence of a session. An applicant is not a stored role; it is an `application`-scope session.
- There is one stored `admin` role. "Moderator" is a responsibility/permission profile, not a second role.
- Administrators have an `adminPermissions` array drawn from a closed allow-list.
- Super Admin capabilities (administrator creation, permission changes, Super Admin privilege changes) are enforced by `requireSuperAdmin()`, not by assignable permission strings. They cannot be granted through an ordinary permission update.
- Critical security settings are deployment environment controls in Stage 2, not an in-app settings screen or an `adminPermissions` grant. They are changed only through the documented owner/operator procedure. If an in-app surface is required later, it needs a separate design and remains Super Admin-only.
- `api/lib/auth/permissions.js` owns the permission map; route handlers never hard-code `if (role === "admin")`.
- Every administrator action and every sensitive detail view is audited.

### 8.3 Dashboard boundaries

- `/admin` requires an active administrator.
- `/admin/devotees` requires `devotee:read:all` or `application:read:all`; each tab and action re-checks its specific permission, and the review queue requires `application:read:all`/`review:all`.
- `/admin/administrators` is Super Admin-only.
- `/admin/invitation-reports` requires `invitation-report:read:all`.
- Lists use cursor pagination (default 25, max 100), server-side search/filter/sort, and masked email/phone.
- Full applicant PII is returned only by an audited detail endpoint. It is never fetched into a shared cache or persisted in browser storage.

### 8.4 PII boundary

| Layer               | May see applicant PII?                                                                |
| ------------------- | ------------------------------------------------------------------------------------- |
| Public pages/APIs   | No                                                                                    |
| Applicant own view  | Own status/summary only (`/application-status`, `/api/account/application`)           |
| Devotee-other views | No                                                                                    |
| Devotee own account | Own summary only (`/api/account/application`), no internal notes or reviewer identity |
| Admin list          | Masked email/phone only                                                               |
| Admin detail        | Full PII only with the applicable permission; audited                                 |
| Audit/logging       | No PII; IDs and stable codes only                                                     |
| Aggregate analytics | No PII; no small-cell contributor breakdown without a privacy decision                |

### 8.5 Invitation-report boundary

The reporting feature is Stage 4, but Stage 2 fixes the boundary:

- `submittedByUserId` is stored separately from `participatingDevoteeCount`.
- No invitee names, phone numbers, or email addresses are collected by default.
- Administrators with `invitation-report:read:all` see all reports and contributor name/email.
- Devotees see only aggregates and their own reports; never another contributor's identity.
- Sensitive detail views and changes are audited.

### 8.6 Key boundaries

- `app/api/**/route.js` stays thin: parse, delegate, return the envelope.
- `api/lib/auth/session.js` owns cookie reading/writing and session validation.
- `api/lib/auth/application-state.js` owns allowed application transitions; services must not improvise them.
- `api/models/*` own schema/index definitions; `api/services/*` own multi-step workflows such as submission, approval, rejection, and administrator invitation.
- `ui/` receives safe projections only; it never sees password hashes, session hashes, applicant PII beyond the authorized view, or internal notes.
- `middleware.js`, if added, may only perform cookie-presence redirects. Server Components and Route Handlers remain the authorization boundary.

The design deliberately keeps MongoDB as the only stateful dependency in Stage 2. Email is an external adapter, not a source of truth; a failed email must not create a false success or a half-written application.
