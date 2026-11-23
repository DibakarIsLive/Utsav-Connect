# Product requirements

Last updated: 2026-11-17 · Source of truth: direct source inspection (2026-11-17), see [maintenance policy](../MAINTENANCE.md) · Status of this document: **current, consolidated**.

This document describes what Utsav-Connect is intended to be and, for every module, what actually exists today. It replaces the older Stage 2 working draft whose wording ("design accepted, implementation not authorized") is now obsolete. Where an older document conflicts with this one, **this document and direct source inspection win**. See the [feature verification matrix](../03-features/feature-status.md) for evidence per feature and the [corrections log](../03-features/feature-status.md#a-statuses-corrected-from-earlier-docs) for claims that were wrong.

## Status legend

Every module below carries a **Current status** column using exactly these labels:

| Label                                 | Meaning                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Implemented & browser-verified        | Real browser evidence exists (live DOM/text read, not just a passing curl). |
| Implemented & automated-test verified | Unit/integration proof only; no adequate browser evidence claimed.          |
| Implemented but inadequately tested   | Code exists, but no adequate automated or browser proof.                    |
| Partially implemented                 | Incomplete, unreachable, or missing key parts.                              |
| Designed but not implemented          | Accepted design exists; no code.                                            |
| Planned                               | Future intention; not yet designed to implementation detail.                |
| Deprecated                            | Historical or superseded; retained only for the record.                     |

Do not upgrade a label without the corresponding evidence. The rules are in [feature-status.md](../03-features/feature-status.md#c-rules-for-claiming-verification).

## 1. Product vision — one unified platform, two public purposes

Utsav-Connect is **one unified web platform** for a Mahotsav outreach campaign. It is not several products and not a public campaign-geography browser. It serves two primary public purposes:

1. **Help visitors find the Mahotsav venue.** A public, login-free physical venue and directions page.
2. **Let people apply to become devotees and, after approval, access campaign features.** A closed application-and-approval pipeline gates all campaign functionality.

The campaign features themselves (areas, invitations, proposals, statistics) are **internal**: they are available only to approved, active devotees and to administrators. The public website must never expose private campaign geography, contributor identities, or any admin functionality.

- Official venue: **Kulti Golf Ground, Kulti, West Bengal, India**.
- Official Map short link: `https://maps.app.goo.gl/BcY87xSjA6iRtBY78` (destination not independently resolved; coordinates and Place ID were not invented).
- "Get Directions" uses a name-based Google Maps directions URL. No server-side Places/Geocoding integration exists.
- Satsang Ashram, Deoghar is a separate sacred location and is **never** presented as the Mahotsav venue.

The internal modules form one chain: identity and account management admits approved devotees; the devotee portal is where they submit campaign data; the admin workspace reviews that data and maintains geography; the Super Admin tier governs the administrators themselves. Shared capabilities (§3.6) cross-cut all four. No module is a separate deployable or a separate product.

Architecture, layers, and runtime context: [architecture.md](../02-architecture/architecture.md). Scope history: [roadmap.md](../roadmap.md). Security controls: [security.md](../04-quality/security.md).

## 2. Roles

| Role                                   | Summary                                                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor                                | No session. May use only the public website. Cannot see campaign geography, contributor data, or admin surfaces.                                      |
| Applicant                              | **Not a stored role.** A user holding an `application`-scope session after email verification; may view only their own status/summary.                |
| Devotee                                | Stored `role: devotee`, `status: active`. Full devotee portal access after approval.                                                                  |
| Administrator                          | Stored `role: admin`. Admin workspace access gated by the nine granular permissions; cannot create admins or change Super Admin privileges.           |
| Super Admin                            | Stored `role: super_admin`. Full authority, including all administrator-account operations. Cannot self-demote or remove the last active Super Admin. |
| Coordinator (future / not implemented) | Envisioned area-scoped assignments; no `coordinator` role, no `areaAssignments` collection. Tracked as a planned capability only.                     |

Roles are enforced on the server (`requireUser({full})`, `requireAdmin(permission)`, `requireSuperAdmin`); the UI only hides controls. "Moderator" is a responsibility/permission profile, not a separate role. `MODERATOR_PERMISSIONS` and `canManageUser()` are declared but unused.

## 3. Modules

The platform is organized into six modules. Four are product modules (public website, identity and account management, devotee portal, admin workspace), one is a control tier (Super Admin), and one is the set of intended shared platform capabilities. Every module's function table carries a **Current status** column using the legend above.

| Module                               | Overall current status                      | Primary surface                                   |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------- |
| Public website (§3.1)                | Implemented & browser-verified              | `/`, `/about`, `/map`, `/apply`, auth entry pages |
| Identity & account management (§3.2) | Partially implemented                       | auth APIs, `/application-status`, admin review    |
| Devotee portal (§3.3)                | Partially implemented                       | `/dashboard`                                      |
| Admin workspace (§3.4)               | Implemented but inadequately tested         | `/admin/**` (eight areas)                         |
| Super Admin control (§3.5)           | Implemented but inadequately tested         | `/admin/users`, `/api/admin/users/**`             |
| Shared platform capabilities (§3.6)  | Designed but not implemented (except audit) | cross-cutting                                     |

An overall label is a summary, not a blanket claim: read each function row for the precise status and evidence.

### 3.1 Public website

Overall status: **Implemented & browser-verified** (the public pages and venue buttons have real browser evidence; the end-to-end e2e seed is not reproducible — see defect D2).

| Function                                      | Current status                      | Notes                                                                                                                           |
| --------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Homepage (`/`) — hero, intro, venue, CTA      | Implemented & browser-verified      | Kulti Golf Ground venue, Get Directions, Apply to Join, About link. Covered by Playwright public-page checks.                   |
| About (`/about`)                              | Implemented & browser-verified      | Purpose, photographs, image credits.                                                                                            |
| Public physical venue and directions (`/map`) | Implemented & browser-verified      | **Static venue page only** — Kulti Golf Ground + directions. NOT an interactive campaign map. Venue buttons covered in browser. |
| Apply (`/apply`) — six-field application      | Implemented & browser-verified      | Apply / Sign In tabs, optional message, "Forgot password?". Application submission itself covered by integration tests.         |
| Registration and sign-in entry points         | Implemented & browser-verified      | `/apply` tabs; `/login` redirects to `/apply?mode=login`.                                                                       |
| Verify email (`/verify-email`)                | Implemented but inadequately tested | Page and token flow exist; real verification delivery/flow not browser-verified. Email provider is dev-only.                    |
| Password reset (`/reset-password`)            | Implemented but inadequately tested | Request/confirm APIs and page exist; no browser proof of full reset. Multiple reset tokens remain valid (open defect).          |
| Accept invitation (`/accept-invitation`)      | Implemented but inadequately tested | Admin invitation acceptance page exists; not browser-verified end to end.                                                       |
| Application status (`/application-status`)    | Implemented but inadequately tested | Applicant-only status view; control presence checked, full flow not browser-verified.                                           |

Privacy boundary (hard requirement): the public website **must not** expose private campaign geography, contributor information (identities or private reports), or admin functionality. `/map` satisfies this by showing only the physical venue. The interactive map, area-details panels, and live campaign statistics components are **orphaned** — wired code with no page importing it — and are therefore unreachable from the public site. See the [orphaned components finding](../03-features/feature-status.md#orphaned-map-components-finding).

### 3.2 Identity and account management

Overall status: **Partially implemented** — the core pipeline is built and largely integration-tested; retention/deletion and several lifecycle details are not implemented, and some transitions are weak.

| Function                                 | Current status                        | Notes                                                                                                                                    |
| ---------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Registration (application submission)    | Implemented & automated-test verified | Six fields; integration suite covers the flow (suite is gated on a reachable `_test` DB).                                                |
| Email verification                       | Implemented & automated-test verified | Single-use token, 24 h, resend invalidates old. Delivery is **dev-only** (`.local/mail/*.eml`); no real provider configured.             |
| Authentication (login)                   | Implemented & browser-verified        | Argon2id, timing-equalised, opaque MongoDB sessions; Playwright login check (seed reproducibility defect D2 applies).                    |
| Application review (list/detail)         | Implemented but inadequately tested   | Admin review screens exist; Playwright checks control presence and rejection-note validation, not real approve/reject.                   |
| Approval / rejection                     | Implemented but inadequately tested   | Review mutations are not browser-verified; approval requires verified email; rejection sends a generic notice.                           |
| Activation (status transition to active) | Implemented & automated-test verified | Driven by approval; no browser approve/reject proof.                                                                                     |
| Suspension / reinstatement               | Partially implemented                 | `PATCH /api/admin/users/[id]` deletes all sessions on suspend, but defect D5 leaves the credential-registry status out of sync.          |
| Recovery (password reset)                | Implemented but inadequately tested   | Request/confirm implemented; no browser proof; no rate limit on confirm; multiple reset tokens remain valid.                             |
| History (application audit trail)        | Implemented & automated-test verified | `DevoteeApplication.isCurrent`, `reviewedBy`, `reviewedAt`, `reviewNote`; append-only `AuditLog` for sensitive actions (app-level only). |
| Retention / deletion                     | Designed but not implemented          | No automatic purge, no TTL on PII, and no `archived`/`deleted`/`eligible_inactive` state. Explicit policy approval required.             |
| Reapplication after rejection            | Designed but not implemented          | No self-service reapplication; only an audited Super Admin reopen path is intended. Not exposed as a capability.                         |

#### Application status vs account status (must not be conflated)

These are two different fields on two different models:

| Application status — `DevoteeApplication.status` | Meaning                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `pending`                                        | Submitted, awaiting review; `isCurrent: true` marks the active one.   |
| `approved`                                       | Review approved; used to activate the account.                        |
| `rejected`                                       | Review rejected; generic notice only; internal notes never disclosed. |

| Account status — `User.status` | Meaning                                                               |
| ------------------------------ | --------------------------------------------------------------------- |
| `pending_verification`         | Registered, email not yet verified; no session.                       |
| `pending_approval`             | Verified, awaiting application review; limited `application` session. |
| `active`                       | Approved devotee with full-scope session.                             |
| `rejected`                     | Application rejected.                                                 |
| `suspended`                    | Access revoked; sessions deleted. No `suspendedAt`/reason field.      |
| `invited`                      | Administrator invitation issued, account setup pending.               |

There is **no** `expired`, `archived`, `deleted`, or `eligible_inactive` stored state; these are design-only or reserved concepts and must not be presented as working capabilities. Application status is not authorization: only `active` + full scope grants devotee features.

### 3.3 Devotee portal

Overall status: **Partially implemented** — the dashboard and report submission work; several intended surfaces rely on orphaned components or do not exist as pages.

| Function                                   | Current status                      | Notes                                                                                                                                         |
| ------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard (`/dashboard`)                   | Implemented & browser-verified      | Server loads reports, areas, proposals, coverage analytics; one report submission is browser-covered. Coverage rendering not browser-checked. |
| Area details                               | Partially implemented               | `AreaDetailsDrawer`/`AreaDetailsPanel` are wired but orphaned (no page import); no reachable devotee area-details view.                       |
| Campaign statistics                        | Partially implemented               | `getCoverageAnalytics` and `CampaignPulse` exist; live statistics component is orphaned/unreachable.                                          |
| Submit invitations                         | Implemented & browser-verified      | `/api/invitations` POST; one dashboard report submission covered in Playwright.                                                               |
| My invitation reports                      | Implemented but inadequately tested | `listReports` on the dashboard; no dedicated browser check.                                                                                   |
| My contributions                           | Designed but not implemented        | No dedicated view/route; contribution data would derive from invitation reports.                                                              |
| My profile                                 | Designed but not implemented        | No dedicated profile page/route.                                                                                                              |
| Authorized communication and notifications | Designed but not implemented        | No `notifications` collection and no in-app messaging; outbound email exists only for auth flows and is dev-only.                             |

The devotee portal must not reveal another contributor's identity or private report. Anonymous users are redirected to `/apply?mode=login`, admins to `/admin`, and non-active users to `/application-status`.

### 3.4 Admin workspace

Overall status: **Implemented but inadequately tested** — all eight areas have routes and a server-side gate; mutation flows lack browser proof and some lack transactional guarantees.

| Area                                                   | Current status                        | Notes                                                                                           |
| ------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1. Admin dashboard / overview (`/admin`)               | Implemented & browser-verified        | Navigation headings covered in Playwright.                                                      |
| 2. Application review (`/admin/applications`, `/[id]`) | Implemented but inadequately tested   | Real approve/reject not browser-verified; only control presence + rejection-note validation.    |
| 3. Area & boundary management (`/admin/areas`)         | Implemented & automated-test verified | `area:manage`; no browser evidence for CRUD mutations.                                          |
| 4. Locality proposal review (`/admin/proposals`)       | Implemented but inadequately tested   | `proposal:review`; approval is not transactional; no browser review mutation.                   |
| 5. Invitation report management (`/admin/invitations`) | Implemented & automated-test verified | `invitation-report:read:all`; contributor identities visible only here and to authorized staff. |
| 6. Campaign analytics / statistics                     | Implemented but inadequately tested   | Overview stats on `/admin`; live/public statistics component is orphaned.                       |
| 7. Audit history (`/admin/audit`)                      | Implemented & automated-test verified | `audit:read:all`; append-only application-level log.                                            |
| 8. Account management (`/admin/users`)                 | Implemented but inadequately tested   | Super Admin only; see defect D5 and dead permissions.                                           |

Nine permissions are declared: `application:read:all`, `application:review:all`, `application:note:write`, `devotee:read:all`, `devotee:status:update`, `invitation-report:read:all`, `audit:read:all`, `area:manage`, `proposal:review`. Three are **dead constants** (never enforced): `application:note:write`, `devotee:read:all`, `devotee:status:update`. `area:manage` is not an implicit grant for reports or proposals; each permission is enforced separately.

### 3.5 Super Admin control

Overall status: **Implemented but inadequately tested** — account operations exist and are gated, but the credential-registry sync defect and permission gaps remain.

| Capability                         | Current status                        | Notes                                                                                                                               |
| ---------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Administrator invitations          | Implemented & automated-test verified | Single-use, 7-day token; invitee sets own password; delivery dev-only.                                                              |
| Administrator management           | Implemented but inadequately tested   | Create/list/mutate admin accounts; defect D5 affects status sync.                                                                   |
| Permission assignment              | Implemented but inadequately tested   | `adminPermissions` is `[String]` with no schema enum; three declared permissions are unenforced.                                    |
| Administrator suspension           | Implemented but inadequately tested   | Deletes sessions; self-suspension and last-active-Super-Admin demotion/suspension blocked; D5 applies.                              |
| Platform-level management (in-app) | Designed but not implemented          | Critical settings are deployment-level (env vars/operator procedures); there is no in-app settings screen or assignable permission. |
| Super Admin-only operations        | Implemented & automated-test verified | All `/api/admin/users/**` routes are Super Admin-only; `hasPermission` returns true for `super_admin`.                              |

### 3.6 Shared platform capabilities (intended)

These are part of the intended unified platform. **Only audit exists today**; the rest are missing and are described here as intended/planned, never as implemented.

| Capability                       | Current status                        | Notes                                                                                                                                       |
| -------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Account directory                | Designed but not implemented          | No shared directory of accounts/responsibility assignment; no `areaAssignments` collection.                                                 |
| Conversations (in-app messaging) | Planned                               | No model, route, or UI.                                                                                                                     |
| Announcements                    | Planned                               | No model, route, or UI.                                                                                                                     |
| Notification centre              | Designed but not implemented          | No `notifications` collection; only auth-related transactional email exists (dev-only).                                                     |
| Activity history                 | Partially implemented                 | `AuditLog` covers sensitive admin actions only; no general per-user activity history.                                                       |
| Session management               | Implemented & automated-test verified | Server-side: hashed opaque sessions, 7-day idle / 30-day absolute, scope recomputed from DB, suspended sessions deleted. No user-facing UI. |
| Audit                            | Implemented & automated-test verified | `AuditLog`, application-level append-only hooks; deleted on direct DB access; hooks bypassed under `NODE_ENV=test`.                         |

## 4. Privacy rules

- **No date of birth.** DOB is not collected, not stored, and no age-eligibility check exists. This is a closed decision, not an open item.
- **Applicant PII is private.** Email, phone, gender, and the optional message are private. They never appear in public APIs, public pages, other users' profiles, or aggregate analytics. One email maps to one account; one current application per user.
- **Internal review notes are admin-only**, append-only, and never included in a rejection notice. Rejection notices are generic. Applicants may read only their own summary, never reviewer-only data.
- **Contributor privacy.** Invitation reports contain no invitee names, phone numbers, or emails, and no participant-count field. Devotees see only aggregate statistics and their own reports. Authorized administrators (and moderator-profile staff) may see all private reports and contributor identities, and such reads are intended to be auditable. Distinct, labelled numbers are used: estimated population, reported invitations, registered devotees, active contributors, total reports. Coverage above 100% is flagged, not capped.
- **Secrets.** Credentials and URIs exist only in `.env.local` and are never logged, committed, or shown in screenshots/issues. Never point tests at a database whose name does not end in `_test`; never start/stop a database.

## 5. Non-functional requirements

- **JavaScript only.** No `.ts`/`.tsx`, no `tsconfig*.json`, no `next-env.d.ts`; `npm run check:js-only` must pass.
- **Layer discipline.** `app/` routing only, `ui/` presentation, `api/` server-only (`import "server-only"`). Import via `@/ui/...` and `@/api/...`.
- **Stack.** Next.js 16.4.6 App Router, React 19.3.0, Mongoose 9.11.4 / MongoDB Atlas, Zod 4.6.7, Tailwind CSS 4, Argon2id, Vitest + Playwright. No Express, separate API package, queues, microservices, or Redis.
- **Security.** Server-side enforcement for every page and API; `assertTrustedOrigin` CSRF checks on mutation routes; SameSite=Lax cookies; hashed single-use tokens; rate limits on auth endpoints; baseline security headers; no CSP today. IP headers are spoofable without a trusted proxy; cookie hardening has known gaps.
- **Usability.** Mobile-usable panels/lists, accessible dialogs, and a non-map list view for anyone who cannot use a map. Interactive map components are not reachable today.
- **Testability.** Every feature should ship with data-flow, permission, failure-state, and validation tests. Browser checks must be reported separately from curl/tests.
- **Recoverability.** Backups, tested restore, rollback, and documented operations are required before production; database safety rules are mandatory.
- **Email readiness.** Registration must remain closed until a real provider, a verified sender, and tested delivery exist. The current provider is **not real** (dev mode writes `.eml` files; no SMTP transport in code; Resend configured via REST but no API key/sender configured).

## 6. Open decisions (current status)

| #   | Question                                              | Current status                                                                                                     |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Production MongoDB tier, region, and backup plan      | **STILL OPEN** — deferred to production preparation. Atlas chosen for development only.                            |
| 2   | Hosting platform for Next.js                          | **STILL OPEN** — deferred; affects deployment docs and env handling.                                               |
| 3   | Which Google Maps APIs are enabled and billing limits | **STILL OPEN** — no server-side Places/Geocoding; short link not independently resolved; no API key configured.    |
| 4   | Leaderboard privacy (public names vs opt-in)          | **STILL OPEN** — only aggregated counts exposed today; privacy policy undecided.                                   |
| 5   | Applicant/contributor PII retention periods           | **STILL OPEN** — no automatic purge; explicit policy approval required.                                            |
| 6   | Audit-log retention                                   | **STILL OPEN** — timestamp-only log, no TTL/purge; DB-level immutability unavailable on shared tiers.              |
| 7   | Account deletion / archived state                     | **STILL OPEN** — no such state implemented; design deferred.                                                       |
| 8   | Real transactional email provider and verified sender | **NOT REAL** — dev provider writes `.eml`; no SMTP transport; Resend needs key + sender. Keep registration closed. |
| 9   | Population estimate sources and update cadence        | STILL OPEN — coverage accuracy depends on it.                                                                      |
| 10  | License intent (MIT in `LICENSE` vs proprietary)      | Accepted as MIT unless changed (historical ADR).                                                                   |
| 11  | Admin/Moderator role modeling                         | Accepted — one stored `admin` role, "Moderator" is a permission profile.                                           |
| 12  | Administrator invitation and password setup           | Accepted — single-use 7-day invitation, invitee sets own password.                                                 |
| 13  | Reapplication after rejection                         | Accepted — no self-service; audited Super Admin reopen only (not yet exposed as a capability).                     |
| 14  | Phone format and SMS verification                     | Accepted — E.164 storage, no SMS verification.                                                                     |
| 15  | Date of birth / minimum age                           | Resolved — DOB removed entirely; no age check.                                                                     |
| 16  | Super Admin recovery and multiple Super Admins        | Accepted — CLI recovery documented/tested; additional Super Admins deferred.                                       |

Historical rationale for decisions above: [stage-2-decision-report.md](../06-history/stage-2-decision-report.md) (archived) and the consolidated decisions in `../02-architecture/decisions.md`. Current verification evidence: [feature-status.md](../03-features/feature-status.md).

## 7. Data shape (what actually exists)

There are nine Mongoose models. None uses an explicit collection name, `strict: "throw"`, a soft-delete plugin, or hooks other than `AuditLog`; all use the `mongoose.models.X || mongoose.model(...)` pattern. There is no migrations directory.

| Collection / model   | Purpose                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `User`               | Identity, role, account status, `adminPermissions`, verification, `lastLoginAt`. `passwordHash` is `select:false`. |
| `Session`            | Opaque hashed sessions, `application`/`full` scope, idle/absolute expiry, `ipHash`, `userAgent`; TTL on expiry.    |
| `AuthToken`          | Single-use verification / password-reset / admin-invitation tokens with TTL.                                       |
| `RateLimit`          | Per-key counters with 60 s TTL for auth rate limiting.                                                             |
| `DevoteeApplication` | Application fields, `isCurrent`, review fields, embedded `reviewNote` string.                                      |
| `Area`               | Approved geography: hierarchy, point/boundary (2dsphere sparse), place data, `populationEstimate`.                 |
| `LocalityProposal`   | Proposed geography with lifecycle statuses; boundary lacks a 2dsphere index.                                       |
| `InvitationReport`   | `invitationCount` (min 1), `reportDate`, `status`, admin notes; no invitee PII, no participant count.              |
| `AuditLog`           | Append-only event record: event type, actor/target, metadata, `ipHash`, `createdAt`.                               |

Collections that appear in older designs but **do not exist** in code: `devoteeApplicationNotes`, `populationRecords`, `areaAssignments`, `notifications`, `systemSettings`. Their features must be described as designed/planned, never as implemented.

## Related documents

- [Architecture](../02-architecture/architecture.md) · [Roadmap](../roadmap.md) · [Feature status & verification matrix](../03-features/feature-status.md)
- [Security](../04-quality/security.md) · [Stage 2 decision report (historical)](../06-history/stage-2-decision-report.md)
