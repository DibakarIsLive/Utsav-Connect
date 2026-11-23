# Phase B — Admin Workspace browser acceptance checklist

Status: **Phase B implemented and browser-verified** (2026-11-17). Use a real Super Admin or an Admin with the listed permission. Use a safe isolated test Admin for lifecycle-changing manual steps; the pilot accounts must not be modified.

Shared gate: `app/admin/layout.jsx` requires an authenticated admin session. Each page re-checks its own permission; every API re-checks independently.

## 1. Admin Dashboard

- **Route / nav:** `/admin` · "Overview" in Admin sections.
- **Permissions:** any admin; cards and sections appear only when the matching permission is held.
- **Browser actions:** sign in; read stat cards; confirm "Workspace sections" links; confirm "Recent activity" when `audit:read:all` is held; reload on mobile.
- **Visible result:** real pending applications, active/suspended devotees, approved areas, active invitations, pending proposals, coverage-ready area count; unavailable values never shown as zero.
- **Backend effect:** read only.
- **Negative tests:** a devotee is redirected away; an admin with no permissions sees a warning, not fabricated numbers.
- **Mobile:** responsive cards and drawer navigation.

## 2. Devotee Management

- **Route / nav:** `/admin/devotees` · "Devotee management" (requires `devotee:read:all`); detail `/admin/devotees/[id]`.
- **Browser actions:** search by name/email; filter by status; paginate; open a detail page; inspect masked list contact data and full permitted detail; confirm no password/token fields; use the status form only with `devotee:status:update`.
- **Visible result:** shared directory of every devotee, application status, registration date, report and proposal counts; suspended accounts clearly marked.
- **Backend effect:** status changes write `admin.devotee.status_updated` with reason; suspension deletes sessions; reinstatement requires verified email + approved application.
- **Negative tests:** an admin without `devotee:read:all` gets `AdminDenied` and `GET /api/admin/accounts` → 403; an admin without `devotee:status:update` sees read-only state and `PATCH .../status` → 403.
- **Mobile:** card list and detail layout.

## 3. Invitation Management

- **Route / nav:** `/admin/invitations` · "Invitation reports" (`invitation-report:read:all`).
- **Browser actions:** filter by status/area/date; open a report; flag or invalidate with a written reason; refresh; confirm updated status and audit event.
- **Visible result:** accurate active/flagged/invalid totals; contributor identity only to authorised admins; no invitee PII.
- **Backend effect:** review writes audit; invalid reports drop out of coverage; flagged reports are excluded from aggregates.
- **Negative tests:** report APIs deny application-scope and unauthorised admins.
- **Mobile:** card layout with review controls.

## 4. Area & Boundary Management

- **Route / nav:** `/admin/areas` · "Areas" (`area:manage`).
- **Browser actions:** search/filter; open create/edit; inspect parent hierarchy, point and GeoJSON boundary; confirm duplicate warnings; archive/restore using existing controls.
- **Visible result:** only official areas; pending proposals never listed as areas; no auto-merge.
- **Backend effect:** create/update/archive write `area.created`/`area.updated`; boundaries are stored GeoJSON; no Google key means schematic fallback.
- **Negative tests:** admins without `area:manage` are denied; no admin-only editing controls shown to devotees.
- **Mobile:** table alternative cards.

## 5. Population Management

- **Route / nav:** `/admin/population` · "Population" (`area:manage`).
- **Browser actions:** search approved area; click Edit; enter a non-negative integer; Save; confirm success; try an invalid value and see validation; confirm "Unavailable" where no estimate exists.
- **Visible result:** population shown per approved area; missing values never rendered as 0%; changes reflected in coverage.
- **Backend effect:** PATCH area writes `area.updated` audit; no population history model exists — only current value plus audit metadata.
- **Negative tests:** unauthorised admins denied; negative/fractional input rejected server-side by the area schema.
- **Mobile:** stacked edit cards.

## 6. Proposal Review

- **Route / nav:** `/admin/proposals` · "Proposals" (`proposal:review`).
- **Browser actions:** filter by status; inspect name, hierarchy, geometry, proposer and duplicate warnings; open review modal; approve / request correction / mark duplicate / decline with a reason.
- **Visible result:** clear proposal status; approved proposals produce an official area; pending proposals never appear in areas or statistics.
- **Backend effect:** review writes audit; rejection preserves history; no merge/delete.
- **Negative tests:** admins without `proposal:review` denied.
- **Mobile:** card list, review modal.

## 7. Campaign Analytics

- **Route / nav:** `/admin/analytics` · "Campaign analytics" (requires `area:manage` OR `invitation-report:read:all`).
- **Browser actions:** read summary cards and coverage list; confirm no-population areas read "Unavailable"; confirm >100% is flagged and not capped; confirm contributor counts only.
- **Visible result:** approved aggregates; no unique-people claim; no personal identities.
- **Backend effect:** read only.
- **Negative tests:** an admin with neither permission is denied.
- **Mobile:** stacked coverage rows.

## 8. Audit History

- **Route / nav:** `/admin/audit` · "Audit log" (`audit:read:all`).
- **Browser actions:** filter by action, actor, target and date; load larger windows; confirm no secrets or note bodies appear.
- **Visible result:** timestamp, actor, action, target and safe metadata; clear note that the loaded window is not the full lifetime history.
- **Backend effect:** read only; append-only in application code (no DB-level immutability claim).
- **Negative tests:** admins without `audit:read:all` denied.
- **Mobile:** stacked event rows.

## Manual-only items

- Live Google Maps key behaviour (no key configured in this environment; schematic fallback verified).
- Visual polish review on tablet.
- Cross-operator permission assignment by a real Super Admin.
- Area responsibility assignment: **not implemented** — minimum future design is recorded in ADR-023 (assignment model, permission requirement, audit events, visibility rules; assignment alone must never grant management permission).

Automated browser evidence: `make test-e2e` — **150 passed, 0 failed, 0 skipped**, including all eight sections, negative authorization, direct API failures, lifecycle changes on isolated accounts, and mobile layouts.
