# Product requirements (working document)

Last updated: 2026-11-05. Condensed from `Roadmap.md` §1–§2 and Phases 0–4 into one reference. Items marked **OPEN** need an owner decision before implementation.

## Purpose

A web platform for a Mahotsav outreach campaign: show which localities have been covered by invitations, let devotees record their invitations, and let administrators manage the official geography and data — across an expandable region with no one-town or fixed-radius assumption. The venue is a single point of interest, separate from the campaign areas.

## Roles

| Role                                      | Can                                                                                                                                                                                               | Cannot                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Visitor                                   | Browse approved areas, public aggregate statistics, About; submit a devotee application                                                                                                           | Use devotee features; see applicant/devotee PII                                                                               |
| Applicant (verified, pending or rejected) | Submit the six-field application; verify email; sign in to a limited `application` session that shows only their own status/summary                                                               | Use devotee features; read internal notes or reviewer-only information; access another applicant's data                       |
| Registered devotee                        | Submit invitation reports; view own reports/profile/application summary; view aggregate campaign statistics; view proposal history; submit, edit and withdraw **own** eligible locality proposals | Create official areas; touch others' proposals/reports; see other contributors' identities                                    |
| Administrator                             | Review devotee applications; manage devotees (permission-granted); access private invitation reports (permission-granted); manage areas, population, reports, settings as granted                 | Create administrators; change critical security settings; change Super Admin privileges; see applicant PII without permission |
| Super Admin                               | Full platform authority; create/manage/suspend/revoke administrative accounts; assign granular permissions                                                                                        | Self-demote; remove the last Super Admin; change deployment-level security settings through the app                           |
| Coordinator (future)                      | Optional area-scoped assignments via `areaAssignments`                                                                                                                                            | OPEN                                                                                                                          |

Permissions are enforced on the server; the UI only hides controls. There is one stored `admin` role with granular grants; "Moderator" is a responsibility/permission profile, not a separate role. "Super Admin" is the owner tier, and its capabilities cannot be granted through an ordinary permission update. Critical security settings are deployment-level controls in Stage 2 (environment variables and operator procedures), not an in-app settings screen or an assignable permission; an in-app surface would need a separate design.

## Pages (roadmap Phase 1)

Public: Home, About, Interactive Map, Area Details, Login, **Devotee Application**, Application Status (limited applicant view), Verification, Password Recovery.
Devotee: Dashboard, Add Invitations, My Reports, Locality Proposals, Account, Own Application Summary.
Administrator: Dashboard, Area Management, Population Management, Invitation Report Management, Analytics, **Devotee Management** at `/admin/devotees`, Audit History, **Administrator Management** (Super Admin only). Security settings are deployment-level in Stage 2, not a page.

Implemented today: Home, About, Map (placeholder state). Everything else: planned.

## Core data (roadmap Phase 3)

`users`, `devoteeApplications`, `devoteeApplicationNotes`, `areas`, `localityProposals`, `invitationReports`, `populationRecords`, `auditLogs`, `areaAssignments`, `notifications`, `systemSettings` — each created only when first used.

### Application data

- The devotee application collects only: full name, email, password, phone, gender (Male/Female), and optional custom message. **Date of birth is not collected and no age eligibility check exists.**
- Every application starts `pending`; no public registration path grants devotee access. Applications and activation are separate.
- A verified applicant whose application is `pending_approval` or `rejected` may sign in to a limited `application` session to view only `/application-status` and their own summary. The reserved `expired` state cannot log in or hold any session. This is not devotee access.
- Approval requires verified email; rejection sends a generic notice and never exposes internal notes or reviewer-only information.
- Gender, phone, email, and the custom message are private applicant data. They are never exposed in public APIs, devotee-other profiles, public pages, or aggregate analytics.
- Internal notes are administrator-only, append-only, and never included in a rejection notice.
- One email maps to one account; one current application per user.
- No automatic purge/expiry job runs in Stage 2. Retention/deletion remain deferred (D-19/D-10); reapplication is Super Admin-only and audited (D-20); phone is E.164 without SMS verification (D-21). DOB is removed (D-22).

### Geography

- Areas form a configurable hierarchy (parent/child), with types not hardcoded to one administrative system. Cycles are rejected.
- An area may have a GeoJSON boundary, a point only, or neither (name-only) — all must render sensibly.
- Proposed areas live in `localityProposals`, never in `areas`, until an administrator approves them.
- Proposal lifecycle: `Pending → Needs Correction → Pending → Approved`; alternatives `Rejected`, `Withdrawn`, `Duplicate`. History is preserved, never overwritten.

### Invitations and statistics (roadmap Rule 4, Phase 5)

- A report belongs to exactly one reporting area; region totals aggregate descendants and count each report once.
- Coverage % = eligible reported invitations ÷ population estimate × 100; values above 100 % are flagged, not capped.
- Distinct, labelled numbers: estimated population, reported invitations, registered devotees, active contributors, total reports. (Verified unique people invited: future.)
- Store the report submitter separately from the number of participating devotees.
- Administrators/authorized moderators see all private invitation reports and contributor identities.
- Devotees see only approved aggregate statistics and their own reports; never another contributor's identity.
- Do not collect individual invitee names, phone numbers, or email addresses by default.
- Sensitive administrative access and modifications are auditable.

## Non-functional

- JavaScript-only Next.js + MongoDB (see `architecture.md`).
- Mobile-usable map panels and lists; accessible dialogs and navigation; a non-map list view for anyone who cannot use the map.
- Recoverable production: backups, tested restore, rollback, documented operations (Stage 7).
- Every feature ships with tests for data flow, permissions, failure states and validation (Rule 6).
- Applicant PII is private by default; access is permission-gated, masked in lists, and audited in detail.

## Open decisions

| #   | Question                                                                                | Impact                        | Status                                                                                                                               |
| --- | --------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Authentication library and session model                                                | Stage 2 design                | ACCEPTED — first-party opaque MongoDB sessions (D-01, ADR-014); implementation not authorized                                        |
| 2   | Public application mode, email verification, and email provider                         | Stage 2 workflow              | ACCEPTED — applications/closed modes; provider-agnostic adapter; registration stays closed until delivery is tested (D-02/D-03/D-08) |
| 3   | Production MongoDB tier, region and backup plan (Atlas chosen for development, ADR-012) | Backups, cost                 | DEFERRED to Stage 7                                                                                                                  |
| 4   | Hosting platform for Next.js                                                            | Deployment docs, env handling | DEFERRED to Stage 7                                                                                                                  |
| 5   | Which Google Maps APIs are enabled and billing limits                                   | Stage 3 scope and cost        | DEFERRED to Stage 3                                                                                                                  |
| 6   | Population estimate sources and update cadence                                          | Coverage accuracy             | DEFERRED to Stage 4                                                                                                                  |
| 7   | Leaderboard privacy (public names vs opt-in)                                            | Privacy policy                | DEFERRED to Stages 5–6; Stage 2 exposes aggregated counts only                                                                       |
| 8   | License intent: MIT (current `LICENSE`) vs proprietary                                  | Legal                         | ACCEPTED as MIT unless changed (ADR-011)                                                                                             |
| 9   | Admin/Moderator role modeling (one role + grants vs separate roles)                     | Permission matrix             | ACCEPTED — one stored `admin` role; Moderator is a permission profile (D-17)                                                         |
| 10  | Administrator invitation/password setup                                                 | Admin creation flow           | ACCEPTED — single-use 7-day invitation; invitee sets own password (D-18)                                                             |
| 11  | Application/PII retention periods                                                       | Privacy/legal                 | DEFERRED — no automatic purge; explicit future approval required (D-19/D-10)                                                         |
| 12  | Reapplication after rejection                                                           | Review policy                 | ACCEPTED — no automatic reapplication; audited Super Admin reopen only (D-20)                                                        |
| 13  | Phone format and SMS verification                                                       | Validation/privacy            | ACCEPTED — E.164 storage; no SMS verification initially (D-21)                                                                       |
| 14  | Minimum age and guardian consent for DOB                                                | Privacy/legal/safeguarding    | RESOLVED — DOB removed entirely; no age check (D-22)                                                                                 |
| 15  | Super Admin recovery and multiple Super Admins                                          | Operational resilience        | ACCEPTED — one Super Admin initially; documented and tested CLI recovery (D-24)                                                      |
| 16  | Whether applicants may read their own private application fields                        | Privacy/UX                    | ACCEPTED — own summary via limited applicant session; never internal notes/reviewer data (D-26)                                      |

## Stage 2 preparation (2026-11-05)

The authentication, application, and administration design is **accepted but not implemented**. Two documents carry the detail:

- [`stage-2-decision-report.md`](stage-2-decision-report.md) — the accepted decision register, deferred policy items, and Batch 0 checklist.
- [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md) — roles, models, application workflow, API contracts, dashboard, security/privacy controls, tests, and acceptance criteria.

The accepted Stage 2 baseline is: first-party authentication with opaque MongoDB sessions; email + password; Argon2id; mandatory devotee application and approval; email verification before approval; a limited applicant session for verified pending or rejected applicants; one stored `admin` role with granular permissions and a Moderator permission profile; `/admin/devotees` application review and devotee management; generic rejection notices; private applicant PII with no DOB; invitation-report privacy; suspension/reactivation; one effective session TTL; append-only audit logs. None of this is active until the owner explicitly approves Batch 0.
