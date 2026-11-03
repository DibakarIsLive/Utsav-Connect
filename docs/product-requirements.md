# Product requirements (working document)

Last updated: 2026-11-03. Condensed from `Roadmap.md` §1–§2 and Phases 0–4 into one reference. Items marked **OPEN** need an owner decision before implementation.

## Purpose

A web platform for a Mahotsav outreach campaign: show which localities have been covered by invitations, let devotees record their invitations, and let administrators manage the official geography and data — across an expandable region with no one-town or fixed-radius assumption. The venue is a single point of interest, separate from the campaign areas.

## Roles

| Role                 | Can                                                                                                                                                      | Cannot                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Visitor              | Browse approved areas, public statistics, About                                                                                                          | Submit reports; see proposal history                   |
| Registered devotee   | Submit invitation reports; view own reports/profile; view proposal history; submit, edit and withdraw **own** eligible locality proposals                | Create official areas; touch others' proposals/reports |
| Administrator        | Create/edit official areas and hierarchy; review proposals (approve, reject, request correction); manage population records, reports, accounts, settings | —                                                      |
| Coordinator (future) | Optional area-scoped assignments via `areaAssignments`                                                                                                   | OPEN                                                   |

Permissions are enforced on the server; the UI only hides controls.

## Pages (roadmap Phase 1)

Public: Home, About, Interactive Map, Area Details, Login, Registration.
Devotee: Dashboard, Add Invitations, My Reports, Locality Proposals.
Administrator: Dashboard, Area Management, Population Management, Invitation Report Management, Analytics, Devotee Management, Audit History.

Implemented today: Home, About, Map (placeholder state). Everything else: planned.

## Core data (roadmap Phase 3)

`users`, `areas`, `localityProposals`, `invitationReports`, `populationRecords`, `auditLogs`, `areaAssignments`, `notifications`, `systemSettings` — each created only when first used.

### Geography

- Areas form a configurable hierarchy (parent/child), with types not hardcoded to one administrative system. Cycles are rejected.
- An area may have a GeoJSON boundary, a point only, or neither (name-only) — all must render sensibly.
- Proposed areas live in `localityProposals`, never in `areas`, until an administrator approves them.
- Proposal lifecycle: `Pending → Needs Correction → Pending → Approved`; alternatives `Rejected`, `Withdrawn`, `Duplicate`. History is preserved, never overwritten.

### Invitations and statistics (roadmap Rule 4, Phase 5)

- A report belongs to exactly one reporting area; region totals aggregate descendants and count each report once.
- Coverage % = eligible reported invitations ÷ population estimate × 100; values above 100 % are flagged, not capped.
- Distinct, labelled numbers: estimated population, reported invitations, registered devotees, active contributors, total reports. (Verified unique people invited: future.)

## Non-functional

- JavaScript-only Next.js + MongoDB (see `architecture.md`).
- Mobile-usable map panels and lists; accessible dialogs and navigation; a non-map list view for anyone who cannot use the map.
- Recoverable production: backups, tested restore, rollback, documented operations (Stage 7).
- Every feature ships with tests for data flow, permissions, failure states and validation (Rule 6).

## Open decisions

| #   | Question                                                                                | Impact                        | Status                                   |
| --- | --------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| 1   | Authentication library and session model                                                | Stage 2 design                | OPEN (ADR-010)                           |
| 2   | Registration policy: open sign-up vs invitation; email verification required?           | Needs email provider if yes   | OPEN                                     |
| 3   | Production MongoDB tier, region and backup plan (Atlas chosen for development, ADR-012) | Backups, cost                 | PARTLY DECIDED                           |
| 4   | Hosting platform for Next.js                                                            | Deployment docs, env handling | OPEN                                     |
| 5   | Which Google Maps APIs are enabled and billing limits                                   | Stage 3 scope and cost        | OPEN                                     |
| 6   | Population estimate sources and update cadence                                          | Coverage accuracy             | OPEN                                     |
| 7   | Leaderboard privacy (public names vs opt-in)                                            | Privacy policy                | OPEN                                     |
| 8   | License intent: MIT (current `LICENSE`) vs proprietary                                  | Legal                         | ACCEPTED as MIT unless changed (ADR-011) |
