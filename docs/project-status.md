# Project status

Last updated: 2026-11-10 · Branch `main` · Source of scope: [`Roadmap.md`](Roadmap.md)

Status vocabulary: **IMPLEMENTED** (code + tests + verified), **PARTIAL**, **UNVERIFIED** (exists, not proven), **PLANNED**, **BLOCKED**.

## Overall status — PRODUCT STRUCTURE & ACCESS CONTROL COMPLETE (2026-11-10)

The product structure and access control for Utsav-Connect have been redesigned and implemented. The public website is strictly public (venue + About + Apply), while campaign geography and devotee/admin features require authentication.

The application runs via `make dev` at `http://localhost:3000`.

### Verified result
- `npm run check:js-only` — **PASSED** (JavaScript-only, no TypeScript)
- `npm run lint` — **PASSED** (ESLint 9 flat config, zero errors)
- `npm run test:unit` — **PASSED** (7 test files, 68 tests)
- `npm run build` — **PASSED** (production build, all routes render)
- Playwright browser journeys — **72/72 PASSED** across desktop, tablet, and mobile breakpoints against a live local `_test` MongoDB instance seeded with real fixture data

---

## Public website (strictly public, no login required)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Homepage | `/` | IMPLEMENTED | Hero, intro, Kulti Golf Ground venue, Get Directions, Apply to Join, About link |
| About | `/about` | IMPLEMENTED | Platform explanation, purpose, photographs, image credits |
| Venue finder | `/map` | IMPLEMENTED | Public venue finder showing Kulti Golf Ground only; no campaign geography |
| Apply/Sign In | `/apply` | IMPLEMENTED | Apply to Join / Sign In tabs, six registration fields |
| Login redirect | `/login` | IMPLEMENTED | Redirects to `/apply?mode=login` |
| Verify email | `/verify-email` | IMPLEMENTED | One-time token verification |
| Application status | `/application-status` | IMPLEMENTED | Applicant-only view, timeline |

### Public nav (verified)
- Logo → `/`
- About → `/about`
- Apply → `/apply`
- No Home, Map, or separate Sign In items

---

## Devotee portal (authentication required)

| Page | Route | Status | Access |
|------|-------|--------|--------|
| Dashboard | `/dashboard` | IMPLEMENTED | Active devotees only |
| Application status | `/application-status` | IMPLEMENTED | Applicants (pending/rejected) |

Devotees see only their own reports and contributions. Approved aggregate campaign statistics are visible. No other contributors' private information.

---

## Admin workspace (authentication + permissions required)

| Page | Route | Status | Required permission |
|------|-------|--------|---------------------|
| Admin Dashboard | `/admin` | IMPLEMENTED | Any admin role |
| Devotee Management | `/admin/applications` | IMPLEMENTED | `application:read:all` |
| Application Review | `/admin/applications/[id]` | IMPLEMENTED | `application:review:all` |
| Invitation Management | `/admin/invitations` | IMPLEMENTED | `invitation-report:read:all` or `area:manage` |
| Area & Boundary Management | `/admin/areas` | IMPLEMENTED | `area:manage` |
| Proposal Review | `/admin/proposals` | IMPLEMENTED | `proposal:review` or `area:manage` |
| Campaign Analytics | `/admin` (overview stats) | IMPLEMENTED | Any admin role |
| Audit History | `/admin/audit` | IMPLEMENTED | `audit:read:all` |

---

## Super Admin (all Admin capabilities PLUS)

| Page | Route | Status | Access |
|------|-------|--------|--------|
| Administrator Management | `/admin/users` | IMPLEMENTED | Super Admin only |
| Permission Assignment | `/admin/users` | IMPLEMENTED | Super Admin only |
| Administrator Suspension | `/admin/users` | IMPLEMENTED | Super Admin only |
| Platform-level Management | `/admin/audit` | IMPLEMENTED | Super Admin only |

Only Super Admin can manage administrator accounts and assign administrative permissions.

---

## API protection (server-side enforcement)

| API | Route | Method | Protection |
|-----|-------|--------|------------|
| Approved areas | `/api/areas` | GET | Auth required (any authenticated user) |
| Coverage analytics | `/api/analytics/coverage` | GET | Auth required (any authenticated user) |
| Area proposals | `/api/areas/proposals` | GET/POST | Auth required (active devotee for POST) |
| Invitation reports | `/api/invitations` | GET/POST | Auth required (scope-limited) |
| Admin areas | `/api/admin/areas` | GET/POST | `area:manage` or `super_admin` |
| Admin invitations | `/admin/admin/invitations` | GET | `invitation-report:read:all` or `area:manage` or `super_admin` |
| Admin applications | `/api/admin/applications` | GET | Any admin role |
| Admin stats | `/api/admin/stats` | GET | Any admin role |
| Admin users | `/api/admin/users` | GET/POST | Super Admin only |
| Admin audit log | `/api/admin/audit-logs` | GET | Super Admin only |

Do not simply hide links in the frontend — all pages and APIs are protected on the server.

---

## Venue location — Kulti Golf Ground

The official Mahotsav venue is **Kulti Golf Ground, Kulti**, accessed via the official Google Maps short link:

`https://maps.app.goo.gl/BcY87xSjA6iRtBY78`

### Venue buttons (public, no login)

**Get Directions** → `https://www.google.com/maps/dir/?api=1&destination=Kulti+Golf+Ground`
- Opens Google Maps directions to Kulti Golf Ground
- Uses visitor's current location as origin when supported

**Open in Google Maps** → `https://maps.app.goo.gl/BcY87xSjA6iRtBY78`
- Opens the official short link directly

Both buttons appear on:
- Homepage (`/`) — Venue section
- Venue finder (`/map`) — Venue card

### Satsang Ashram, Deoghar

Satsang Ashram in Deoghar is a **separate, sacred location** — the residence of Shree Shree Thakur Anukulchandra. It is NOT displayed as the Mahotsav venue. It may be referenced on the About page with its own context, but is never mixed with Kulti Golf Ground.

---

## Known issues and remaining blockers

1. MongoDB Atlas unreachable from current IP (IP whitelist). Browser journeys use local `_test` MongoDB at `mongodb://127.0.0.1:27019/utsav_connect_test`.
2. No Google Maps API key configured. Native Google Maps cannot be browser-verified. The directions URL uses the destination name "Kulti Golf Ground" which Google Maps resolves.
3. Short link `https://maps.app.goo.gl/BcY87xSjA6iRtBY78` could not be followed (network timeout). The original link is preserved as the working fallback. Destination coordinates/Place ID not independently verified.
4. Registration remains `REGISTRATION_MODE=closed` in `.env.local`; local testing used `REGISTRATION_MODE=open` as a process env override only.
5. Email delivery not implemented; dev provider returns the verification token in development only.

---

## Check commands (last run 2026-11-10)

| Command | Result |
|---------|--------|
| `npm run check:js-only` | PASSED |
| `npm run lint` | PASSED (0 errors) |
| `npm run test:unit` | PASSED (68 tests, 7 files) |
| `npm run build` | PASSED (all routes) |
| Playwright browser journeys | PASSED (72/72, desktop + tablet + mobile) |

Screenshots captured under `.local/browser-screenshots/` for every major journey at all three breakpoints.
