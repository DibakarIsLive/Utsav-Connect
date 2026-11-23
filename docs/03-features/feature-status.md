# Feature status & verification matrix

Last updated: 2026-11-17 · Source of truth: direct source inspection (2026-11-17), see [maintenance policy](../MAINTENANCE.md) · Companion: [product requirements](../01-project/product-requirements.md).

This document is the **verification matrix** for Utsav-Connect. It records, feature by feature, what exists and what evidence backs the claim. It is not a wish list: a label may be upgraded only when the matching evidence exists (see [rules for claiming verification](#c-rules-for-claiming-verification)). Where an earlier document overstated or understated a status, the correction is in [section A](#a-statuses-corrected-from-earlier-docs).

## Account lifecycle update (2026-11-18)

Permanent deletion is implemented and browser-verified for devotees and administrators (Super Admin accounts cannot be deleted). `DELETE /api/admin/accounts/:id` requires a reason, re-checks permissions server-side, revokes sessions/tokens, anonymizes applicant and proposal snapshots, retains reports and audit history, and removes local credential files only after the database commit. See [Account lifecycle](account-lifecycle.md).

## Phase B update (2026-11-17)

All eight Admin Workspace sections are now integrated and browser-verified: `/admin`, `/admin/devotees` (+ detail), `/admin/invitations`, `/admin/areas`, `/admin/population`, `/admin/proposals`, `/admin/analytics`, `/admin/audit`. New APIs: `GET /api/admin/accounts`, `GET /api/admin/accounts/:id`, `PATCH /api/admin/accounts/:id/status`; audit and report APIs gained server-side filters. Revived declared permissions `devotee:read:all` and `devotee:status:update` are now enforced. No new permission strings, models or migrations were added. See the [Phase B checklist](phase-b-acceptance-checklist.md).

## Status legend

| Label                                 | Meaning                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Implemented & browser-verified        | Real browser evidence exists (live DOM/text read, not just a passing curl). |
| Implemented & automated-test verified | Unit/integration proof only; no adequate browser evidence claimed.          |
| Implemented but inadequately tested   | Code exists, but no adequate automated or browser proof.                    |
| Partially implemented                 | Incomplete, unreachable, or missing key parts.                              |
| Designed but not implemented          | Accepted design exists; no code.                                            |
| Planned                               | Future intention; not yet designed to implementation detail.                |
| Deprecated                            | Historical or superseded; retained only for the record.                     |

Evidence types used below: **Browser** (live page/DOM read), **Integration** (Vitest against real MongoDB `utsav_connect_test`), **Unit** (Vitest, no network), **Process** (build/CLI/curl checks), **Source** (direct code inspection only), **None** (design/intent, no proof).

### Module roll-up

This is a summary of the detailed matrices below. An overall label never replaces the per-feature row.

| Module                        | Overall status                                      | Strongest evidence                                                     |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Public website                | Implemented & browser-verified                      | Playwright public pages + venue buttons; 2026-11-16 Chromium run.      |
| Identity & account management | Partially implemented                               | Integration suites; review/mutation flows lack browser proof.          |
| Devotee portal                | Partially implemented                               | Dashboard + one report submission in Playwright; other views orphaned. |
| Admin workspace (8 areas)     | Implemented but inadequately tested                 | Admin headings in Playwright; mutations not browser-verified.          |
| Super Admin control           | Implemented but inadequately tested                 | Route authorization integration tests; defect D5 open.                 |
| Campaign system               | Implemented but inadequately tested                 | Model/integration coverage; proposal approval non-transactional.       |
| Audit                         | Implemented & automated-test verified               | Integration tests; application-level immutability only.                |
| Proposed shared capabilities  | Designed but not implemented (except audit/session) | No models/routes for directory, conversations, announcements, notices. |

## Verification matrix

### Public website

| Feature                                    | Status                              | Evidence type | Evidence / link                                                                                                             |
| ------------------------------------------ | ----------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Homepage (`/`)                             | Implemented & browser-verified      | Browser       | Playwright public-page checks; 2026-11-16 Chromium desktop+mobile run in [project status](../01-project/project-status.md). |
| About (`/about`)                           | Implemented & browser-verified      | Browser       | Playwright public-page checks.                                                                                              |
| Physical venue & directions (`/map`)       | Implemented & browser-verified      | Browser       | Playwright venue-button checks; static Kulti Golf Ground venue only.                                                        |
| Apply (`/apply`) + sign-in entry points    | Implemented & browser-verified      | Browser       | Playwright public pages/login; `/login` redirects to `/apply?mode=login`.                                                   |
| Verify email page (`/verify-email`)        | Implemented but inadequately tested | Source        | Tokens integration-tested; full browser flow not verified; dev-only email.                                                  |
| Password reset page (`/reset-password`)    | Implemented but inadequately tested | Integration   | Request/confirm APIs tested; no browser reset; multiple reset tokens remain valid.                                          |
| Accept invitation (`/accept-invitation`)   | Implemented but inadequately tested | Integration   | Admin invitation APIs tested; acceptance not browser-verified.                                                              |
| Application status (`/application-status`) | Implemented but inadequately tested | Browser       | Only control presence/rejection-note validation covered.                                                                    |
| No public campaign geography / PII / admin | Implemented & browser-verified      | Source        | `/map` static; all geography/report/admin routes authenticated; privacy boundary holds.                                     |

### Identity and account management

| Feature                                   | Status                                | Evidence type | Evidence / link                                                                                                       |
| ----------------------------------------- | ------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Application submission (six fields)       | Implemented & automated-test verified | Integration   | Gated integration suite (`_test` DB only); last checkpoint reported 120 passing.                                      |
| Email verification                        | Implemented & automated-test verified | Integration   | Single-use 24 h tokens; dev provider writes `.eml`; not real delivery.                                                |
| Login / authentication                    | Implemented & browser-verified        | Browser       | Playwright login check; Argon2id, opaque sessions. Seed reproducibility defect D2 applies.                            |
| Application review screens                | Implemented but inadequately tested   | Browser       | Control presence + rejection-note validation only; no real approve/reject.                                            |
| Approval / rejection / activation         | Implemented but inadequately tested   | Integration   | Mutation flows exist; not browser-verified.                                                                           |
| Suspension / reinstatement                | Partially implemented                 | Integration   | Sessions deleted on suspend; credential-registry status never syncs (defect D5).                                      |
| Password recovery                         | Implemented but inadequately tested   | Integration   | No browser proof; no rate limit on confirm; multiple valid reset tokens.                                              |
| Application history (`isCurrent`, review) | Implemented & automated-test verified | Integration   | `DevoteeApplication` fields and `AuditLog` events.                                                                    |
| Retention / deletion                      | Designed but not implemented          | None          | No purge, TTL, or archived/deleted state; policy approval required.                                                   |
| Application status vs account status      | Implemented & automated-test verified | Source        | Two distinct fields/models; see [PRD §3.2](../01-project/product-requirements.md#32-identity-and-account-management). |

### Devotee portal

| Feature                                    | Status                              | Evidence type | Evidence / link                                                                      |
| ------------------------------------------ | ----------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| Dashboard (`/dashboard`)                   | Implemented & browser-verified      | Browser       | One report submission covered in Playwright; coverage rendering not browser-checked. |
| Area details                               | Partially implemented               | Source        | `AreaDetailsDrawer` / `AreaDetailsPanel` orphaned (no page import); unreachable.     |
| Campaign statistics                        | Partially implemented               | Source        | `getCoverageAnalytics` + orphaned `CampaignPulse`; no reachable live view.           |
| Submit invitations                         | Implemented & browser-verified      | Browser       | One dashboard report submission in Playwright.                                       |
| My invitation reports                      | Implemented but inadequately tested | Integration   | `listReports` on dashboard; no dedicated browser check.                              |
| My contributions                           | Designed but not implemented        | None          | No dedicated view/route.                                                             |
| My profile                                 | Designed but not implemented        | None          | No dedicated page/route.                                                             |
| Authorized communication and notifications | Designed but not implemented        | None          | No `notifications` collection; only dev-only auth email.                             |

### Admin workspace (eight areas)

| Feature                                                | Status                                | Evidence type | Evidence / link                                                           |
| ------------------------------------------------------ | ------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| 1. Dashboard / overview (`/admin`)                     | Implemented & browser-verified        | Browser       | Playwright admin page navigation headings.                                |
| 2. Application review (`/admin/applications`, `/[id]`) | Implemented but inadequately tested   | Browser       | Real approve/reject not browser-verified; note validation only.           |
| 3. Area & boundary management (`/admin/areas`)         | Implemented & automated-test verified | Integration   | `area:manage`; no browser CRUD evidence.                                  |
| 4. Locality proposal review (`/admin/proposals`)       | Implemented but inadequately tested   | Source        | `proposal:review`; approval not transactional; no browser review.         |
| 5. Invitation report management (`/admin/invitations`) | Implemented & automated-test verified | Integration   | `invitation-report:read:all`; contributor identities gated here.          |
| 6. Campaign analytics / statistics                     | Implemented but inadequately tested   | Source        | Overview stats on `/admin`; live statistics component orphaned.           |
| 7. Audit history (`/admin/audit`)                      | Implemented & automated-test verified | Integration   | `audit:read:all`; application-level append-only log.                      |
| 8. Account management (`/admin/users`)                 | Implemented but inadequately tested   | Source        | Super Admin only; defect D5; `application:note:write` remains unenforced. |

### Super Admin control

| Feature                            | Status                                | Evidence type | Evidence / link                                                                  |
| ---------------------------------- | ------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| Administrator invitations          | Implemented & automated-test verified | Integration   | Single-use 7-day token; 9 integration tests reported historically.               |
| Administrator management           | Implemented but inadequately tested   | Source        | Create/list/mutate admin accounts; defect D5.                                    |
| Permission assignment              | Implemented but inadequately tested   | Source        | `adminPermissions` is untyped `[String]`; three declared permissions unenforced. |
| Administrator suspension           | Implemented but inadequately tested   | Source        | Self / last-Super-Admin protections; sessions deleted; D5 applies.               |
| Platform-level management (in-app) | Designed but not implemented          | None          | Settings are deployment-level only; no in-app screen.                            |
| Super Admin-only operations        | Implemented & automated-test verified | Integration   | All `/api/admin/users/**` gated; `hasPermission` true for `super_admin`.         |

### Campaign system

| Feature                                   | Status                                | Evidence type | Evidence / link                                                                                      |
| ----------------------------------------- | ------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| Areas (hierarchy, boundaries, place data) | Implemented & automated-test verified | Integration   | `Area` model, 2dsphere sparse indexes, compound indexes.                                             |
| Locality proposals & lifecycle            | Implemented but inadequately tested   | Integration   | Statuses + duplicates; boundary lacks 2dsphere; approval not transactional.                          |
| Invitation reports                        | Implemented & automated-test verified | Integration   | `InvitationReport` model, min 1 count, 3 compound indexes; no invitee PII.                           |
| Coverage analytics                        | Implemented but inadequately tested   | Source        | `getCoverageAnalytics` exists; rendering orphaned; >100% flagging defined.                           |
| Interactive map                           | Partially implemented                 | Source        | Components wired but orphaned/unreachable; see [orphaned finding](#orphaned-map-components-finding). |
| Population management                     | Designed but not implemented          | None          | No `populationRecords` collection; `populationEstimate` default 0 on areas.                          |
| Leaderboard                               | Planned                               | None          | Privacy decision still open; aggregated counts only.                                                 |

### Audit

| Feature                   | Status                                | Evidence type | Evidence / link                                                         |
| ------------------------- | ------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| Audit log (`AuditLog`)    | Implemented & automated-test verified | Integration   | `createdAt`-only, append-only hooks, `ipHash`/`userAgent`.              |
| Audited app actions       | Implemented & automated-test verified | Integration   | Sensitive admin actions recorded; hooks bypassed under `NODE_ENV=test`. |
| DB-level immutability     | Designed but not implemented          | None          | Application-level only; direct DB access can modify/delete.             |
| Audit-log retention / TTL | Designed but not implemented          | None          | No TTL or purge; policy deferred.                                       |

### Proposed shared capabilities

| Capability                 | Status                                | Evidence type | Evidence / link                                                       |
| -------------------------- | ------------------------------------- | ------------- | --------------------------------------------------------------------- |
| Account directory          | Designed but not implemented          | None          | No shared directory; no `areaAssignments` collection.                 |
| Conversations              | Planned                               | None          | No model, route, or UI.                                               |
| Announcements              | Planned                               | None          | No model, route, or UI.                                               |
| Notification centre        | Designed but not implemented          | None          | No `notifications` collection; auth email only (dev).                 |
| Activity history (general) | Partially implemented                 | Source        | Only admin-action audit exists; no per-user history.                  |
| Session management         | Implemented & automated-test verified | Integration   | Hashed sessions, 7/30-day expiry, scope recompute; no user-facing UI. |
| Audit                      | Implemented & automated-test verified | Integration   | See [Audit](#audit).                                                  |

## (A) Statuses corrected from earlier docs

These claims appeared in older documents and were wrong or are no longer true. Each correction is based on direct source inspection performed on 2026-11-17.

| Earlier claim                                                       | Corrected status / fact                                                                                                                                           | Basis                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| "Interactive Map" is a public roadmap page                          | `/map` is a **static venue page only**; interactive map/area-details/statistics components are **orphaned**.                                                      | Route + orphaned component inspection.                            |
| "Real email providers: Resend + SMTP transports ready"              | No SMTP transport in code; dev writes `.eml`; Resend via REST needs a key. **Email is not real.**                                                                 | `api/lib/email/{adapter,transport}.js`. ADR-015 claim is wrong.   |
| "Dev server hot reload fixed: `next.config.mjs` excludes `.local/`" | **No watch exclusion exists** in the working tree. ADR-016's HMR claim is historical/unverified.                                                                  | `next.config.mjs` inspection.                                     |
| "Playwright 72/72 passed"                                           | Spec has **23 `test()` declarations** (31 logical after a 3-size loop); no committed seed, no `make test-e2e`; committed failure artifact for `super@utsav.test`. | `playwright.config.mjs`, spec, `.local/seed-test.mjs`. Defect D2. |
| "Stage 2 design accepted but not implemented"                       | **Implemented** — auth, applications, admin, Super Admin all have code and routes (statuses vary by evidence).                                                    | Current source inspection; older wording is stale.                |
| "`scripts/sync-indexes.js` is safe / non-destructive"               | Uses `syncIndexes()` which **drops indexes**, and covers only **7 of 9** models (omits `RateLimit`, `InvitationReport`).                                          | `scripts/sync-indexes.js`. Defect D3.                             |
| "devotee@gmail.com is devotee / pending_approval"                   | Pilot snapshot 2026-11-17: **devotee / active / verified**. (`mr.dib@gmail.com` super_admin / active.)                                                            | Read-only pilot snapshot.                                         |
| "Devotee management / account management implemented & tested"      | Routes and APIs exist, with partial browser verification; D5 and the unenforced `application:note:write` apply.                                                   | Playwright coverage inspection; defect D5.                        |
| "Active Super Admins: 0 / `sa@utsav.test` not found" (2026-11-11)   | Snapshot only; a later checkpoint reports `mr.dib@gmail.com` as super_admin/active. Treat counts as point-in-time.                                                | Read-only checks on different dates.                              |

## (B) Known defects and unresolved questions

**Stage 0 update (2026-11-17):** D1, D2, D3 and D5 below were fixed and regression-tested during Stage 0. Their original descriptions are retained as history; see [Project status](../01-project/project-status.md) and [Testing](../04-quality/testing.md) for current evidence.

Open defects (must not be presented as working):

- **D1 (P0) — FIXED in Stage 0** — `api/services/auth-service.js` calls `logger.warn/info/error` (~lines 226/233/241) without importing `logger` → HTTP 500 and account enumeration when email is unavailable or sending fails.
- **D2 (P0) — FIXED in Stage 0** — Playwright spec hard-codes seeded accounts/password, but the seed lives in git-ignored `.local/seed-test.mjs`; no committed seed, no `make test-e2e`, and a committed failure artifact for `super@utsav.test`. E2E is not reproducible.
- **D3 (P0) — FIXED in Stage 0** — `scripts/sync-indexes.js` covers 7/9 models and uses destructive `syncIndexes()`; older docs mislabelled it safe.
- **D5 — FIXED in Stage 0** — `app/api/admin/users/[id]/route.js:107` guard is always false because status was reassigned earlier → credential-registry status never syncs.
- Others: unenforced `application:note:write` and unused `MODERATOR_PERMISSIONS` export (the `devotee:*` permissions and `canManageUser()` are enforced); registration enumeration (409); multiple valid password-reset tokens; non-transactional proposal approval; cookie hardening gaps; spoofable IP headers; application-level-only audit immutability; plaintext credential registry in dev under flags; proposal boundary lacks 2dsphere; public health endpoint exposes version; documentation drift.

Unresolved questions: retention periods, hosting, Maps scope/billing, leaderboard privacy, email provider, population sources — all still open in [PRD §6](../01-project/product-requirements.md#6-open-decisions-current-status).

## Orphaned map components finding

Several components are **fully wired in code but imported by no page**, so their features are unreachable:

`InteractiveMapClient`, `MapWorkspace`, `GoogleMapCanvas`, `SvgAtlas`, `AreaDetailsDrawer`, `AreaDetailsPanel`, `AreaListView`, `MapFallbackViewer`, `CampaignPulse`, `MapTeaser`.

Consequences: the interactive campaign map, area-details panels, the non-map area list view, and public live campaign statistics are **implemented in code but not reachable**. `/map` shows only Kulti Golf Ground venue + directions. `GoogleMapCanvas`/`MapWorkspace` read `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; no server-side Places/Geocoding integration exists (`GOOGLE_MAPS_SERVER_API_KEY` is declared only in `.env.example`). The official short link destination was not independently resolved; no coordinates/Place ID were invented.

## (C) Rules for claiming verification

1. **Three evidence kinds are kept separate** and never conflated: (i) automated tests — unit/integration; (ii) process checks — build, CLI, `curl` for status/headers/JSON; (iii) browser verification — page opened in a real browser and live DOM/text read. See [testing.md](../04-quality/testing.md).
2. **UI features require browser verification** for "Implemented & browser-verified." A passing `curl` or unit test is not browser evidence. If browser tooling is unavailable, report the check as **unverified**, not assumed.
3. **Do not claim integration tests passed when they were skipped.** Integration suites are `describe.skipIf(gate.skip)`; they skip when the `_test` DB is unreachable unless `UTSAV_TEST_REQUIRE_DB=1`. A console "passed" with skipped suites is not proof.
4. **Never point tests at a non-`_test` database** and never stop/start a database for a test. The guard throws unless the DB name ends in `_test`.
5. **Report browser checks separately from curl/tests** in every status update; mark anything not directly witnessed as unverified.
6. **Code existence is not verification.** Orphaned/unreachable components and unenforced permissions are "Partially implemented" or "Designed but not implemented," never "Implemented & browser-verified."
7. **No secrets in evidence.** Do not log or publish URIs, tokens, passwords, or `.env.local`; Atlas credentials appearing anywhere require rotation.
8. **Status labels use the legend verbatim.** Do not invent labels; do not upgrade a label without the corresponding evidence artifact.

## Evidence index

Where to look when asked to substantiate a row above (paths relative to the repository root):

- **Routes/pages** — `app/` (19 `page.jsx` files, 2 layouts; `/map` is the static venue page).
- **Orphaned UI** — `ui/components/maps/*`, `ui/components/home/CampaignPulse.jsx`, `MapTeaser.jsx`; no page imports them.
- **Auth & permissions** — `api/lib/auth/*`, `api/lib/security/*`, `api/services/auth-service.js`, `api/services/admin-service.js`.
- **Models** — `api/models/` (9 models; no migrations directory).
- **Email** — `api/lib/email/{adapter,transport}.js` (dev `.eml` writer, Resend REST; no SMTP).
- **Maps** — `ui/lib/venue.js` (official short link + name-based directions); no server-side Places/Geocoding.
- **Unit/integration tests** — `tests/unit/`, `tests/integration/` (integration gated on `_test` suffix).
- **Browser tests** — `tests/playwright/browser-journeys.spec.js`, `playwright.config.mjs` (no `webServer`; server must be running).
- **Process checks** — `Makefile` (no `test-e2e` target), `npm run check`, `npm run build`.

A matrix row's "Evidence / link" column points to the document that records the witness; this index points to the underlying artifacts. Neither substitutes for the rules in [section C](#c-rules-for-claiming-verification).

## Related documents

- [Product requirements](../01-project/product-requirements.md) · [Project status](../01-project/project-status.md) · [Roadmap](../roadmap.md)
- [Architecture](../02-architecture/architecture.md) · [Security](../04-quality/security.md) · [Testing](../04-quality/testing.md)
- [Stage 2 decision report (historical)](../06-history/stage-2-decision-report.md)
