# Phase A — Devotee portal browser acceptance checklist

Status: **Phase A implemented and browser-verified** (2026-11-17). This checklist records what is reachable, what the automated browser suite proves, and what still needs a human reviewer.

Use the E2E test database and committed seed (`make build`, `make test-e2e`). The pilot accounts (`mr.dib@gmail.com`, `devotee@gmail.com`) are never used.

## Shared portal structure

- Authenticated layout: `app/dashboard/layout.jsx` → `requireActiveDevoteePage()` → redirects anonymous to `/apply?mode=login`, admins to `/admin`, non-active accounts to `/application-status`.
- Navigation: `ui/components/dashboard/PortalNav.jsx` (`nav[aria-label="Devotee portal"]`) with seven links, available on every `/dashboard/*` page.
- The public website is unchanged: `/map` remains venue-only, and no campaign geography or devotee-only link is public.

## 1. Devotee Dashboard

| Item                  | Detail                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route / navigation    | `/dashboard` · portal nav "Dashboard" · header "My Dashboard"                                                                                                                                          |
| Role / status         | Authenticated active devotee                                                                                                                                                                           |
| Components / APIs     | `DashboardClient`; server `listReports`, `listApprovedAreas`, `listProposals`, `getCoverageAnalytics`; refresh via `/api/invitations`, `/api/areas`, `/api/areas/proposals`, `/api/analytics/coverage` |
| Status                | Implemented and browser-verified                                                                                                                                                                       |
| Browser actions (E2E) | Sign in as `devotee@utsav.test`; assert `/dashboard`, greeting, portal nav, and the four labelled stat cards; refresh; mobile viewport check                                                           |
| Expected result       | Own reports/proposals only; label "Invitations you recorded" (corrected from the misleading "public totals"); "—" when data is unavailable                                                             |
| Backend effect        | Read only                                                                                                                                                                                              |
| Negative tests        | Applicant session cannot reach `/dashboard`; admin redirected to `/admin`                                                                                                                              |
| Still manual          | Visual review of charts/empty states at tablet width                                                                                                                                                   |

## 2. Area Details

| Item                  | Detail                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route / navigation    | `/dashboard/areas` · portal nav "Area Details"                                                                                                                                                                                                                     |
| Role / status         | Authenticated active devotee                                                                                                                                                                                                                                       |
| Components / APIs     | Reuses production-ready `MapWorkspace` (with `SvgAtlas` fallback, `GoogleMapCanvas` when a key exists, `AreaDetailsPanel`, `ProposeAreaModal`). Data from `listApprovedAreas()` + `getCoverageAnalytics()`; refresh via `/api/areas` and `/api/analytics/coverage` |
| Status                | Implemented and browser-verified (key-less fallback path)                                                                                                                                                                                                          |
| Browser actions (E2E) | Assert page heading, open "Directory" tab, confirm approved area "Baidyanath Dham", confirm no admin "Manage Areas" link                                                                                                                                           |
| Expected result       | Only approved areas; hierarchy and coverage shown; no admin controls; schematic atlas when no Google Maps key                                                                                                                                                      |
| Backend effect        | Read only                                                                                                                                                                                                                                                          |
| Negative tests        | Pending proposals are not passed as areas (`listApprovedAreas` filters `status:"approved"`); anonymous → sign-in                                                                                                                                                   |
| Still manual          | Live Google Maps rendering requires a configured `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — not available, reported as a limitation, not claimed working                                                                                                                  |

Note: `InteractiveMapClient` (broken props/callbacks), `AreaDetailsDrawer` (renders internal notes), `AreaListView` and `MapFallbackViewer` (misleading legacy copy) were inspected and deliberately **not** mounted.

## 3. Campaign Statistics

| Item                  | Detail                                                                                                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / navigation    | `/dashboard/statistics` · portal nav "Campaign Statistics"                                                                                                                                                                 |
| Role / status         | Authenticated active devotee                                                                                                                                                                                               |
| Components / APIs     | Reuses `CampaignPulse` (self-fetching, `directInvitationCount`) and `CoverageBar` (missing/zero population → "No estimate"; >100% flagged, never capped). Data from `/api/analytics/coverage` via `getCoverageAnalytics()` |
| Status                | Implemented and browser-verified                                                                                                                                                                                           |
| Browser actions (E2E) | Assert heading, "Coverage by approved area", the explanatory definition text, and a "No estimate" badge for the zero-population seeded area                                                                                |
| Expected result       | Approved aggregates only; contributor count is a count, never identities; values above 100% remain visible and flagged                                                                                                     |
| Backend effect        | Read only                                                                                                                                                                                                                  |
| Negative tests        | Application-scope session receives 403 from `/api/analytics/coverage`                                                                                                                                                      |
| Still manual          | Confirm exact >100% badge rendering with a seeded high-count report (integration test already asserts the backend value)                                                                                                   |

## 4. Submit Invitations

| Item                  | Detail                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Route / navigation    | `/dashboard/invitations/new` · portal nav "Submit Invitations" · dashboard and reports buttons                                         |
| Role / status         | Full-scope active devotee; API additionally enforces `role==="devotee"` and `status==="active"`                                        |
| Components / APIs     | Existing `SubmitReportModal` mounted by `NewReportView`; `POST /api/invitations` → `submitReport` → audit `invitation.reported`        |
| Status                | Implemented and browser-verified                                                                                                       |
| Browser actions (E2E) | Select Baidyanath Dham, enter 4242, submit, assert "Report recorded" and the count text, then assert the report appears in own history |
| Expected result       | Success only after server confirmation; no invitee PII; validation errors for missing/invalid fields                                   |
| Backend effect        | One `invitationreports` document (`contributorId` = signed-in user, `status:"active"`) and one audit event                             |
| Negative tests        | Duplicate submissions create separate records (no client-side blocking); API rejects non-devotees and application-scope sessions       |
| Still manual          | Visual check of validation error copy at mobile width                                                                                  |

## 5. My Invitation Reports

| Item                  | Detail                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / navigation    | `/dashboard/reports` · portal nav "My Invitation Reports"                                                                                                  |
| Role / status         | Authenticated active devotee                                                                                                                               |
| Components / APIs     | `ReportHistoryTable` (desktop table + mobile cards); `listReports(user)` scopes `contributorId` server-side and strips contributor identity for non-admins |
| Status                | Implemented and browser-verified                                                                                                                           |
| Browser actions (E2E) | Assert "private to you", personal totals, absence of another account's email; mobile layout                                                                |
| Expected result       | Only own reports with status badges; no admin review notes                                                                                                 |
| Backend effect        | Read only                                                                                                                                                  |
| Negative tests        | A devotee's direct request cannot alter another user's report; `/api/admin/users` returns 403                                                              |
| Still manual          | Cross-account visual comparison with a second active devotee (not in the minimal seed)                                                                     |

## 6. My Contributions

| Item                  | Detail                                                                                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route / navigation    | `/dashboard/contributions` · portal nav "My Contributions"                                                                                                                    |
| Role / status         | Authenticated active devotee                                                                                                                                                  |
| Data                  | Real own data only: `listReports(user)` → invitations recorded, distinct localities reached; `listProposals(user)` → proposal history with review status and correction notes |
| Status                | Implemented and browser-verified — no invented contribution system                                                                                                            |
| Browser actions (E2E) | Assert "Invitations you recorded", "Localities reached", "Proposals shared" and the proposals list                                                                            |
| Expected result       | Personal figures from actual reports/proposals; no leaderboard framing                                                                                                        |
| Backend effect        | Read only                                                                                                                                                                     |
| Negative tests        | Devotees see only their own proposals (service-level `proposedBy` filter)                                                                                                     |
| Still manual          | Confirm correction-note presentation after an admin marks a proposal `needs_correction`                                                                                       |

## 7. My Profile

| Item                  | Detail                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Route / navigation    | `/dashboard/profile` · portal nav "My Profile"                                                                          |
| Role / status         | Authenticated active devotee (self only)                                                                                |
| Data                  | `requireActiveDevoteePage()` safe session projection; no new profile API                                                |
| Status                | Implemented and browser-verified as **read-only** — no unapproved editing workflow was added                            |
| Browser actions (E2E) | Assert own email/name/status, "Read-only profile" notice, then sign out and confirm `/api/auth/me` returns `user: null` |
| Expected result       | No password hash, token, internal field or reviewer note; account status clear                                          |
| Backend effect        | Sign-out deletes the session document                                                                                   |
| Negative tests        | Application-scope account redirected to `/application-status`                                                           |
| Still manual          | None for read-only display; editing remains a future lifecycle decision (N1/N6)                                         |

## Browser evidence

`make test-e2e` (Playwright, 3 projects) — **123 passed, 0 failed, 0 skipped**. Ten devotee-portal tests cover login, dashboard loading, portal navigation, Area Details, Campaign Statistics, invitation submission, report history, contributions, profile/logout, applicant restrictions, admin-API restrictions and mobile layout.

Manual acceptance still required: live Google Maps rendering with a real key, cross-devotee privacy comparison, and visual polish review on tablet. These are recorded as manual, not assumed.
