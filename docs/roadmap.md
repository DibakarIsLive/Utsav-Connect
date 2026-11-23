# Utsav-Connect development roadmap

Active plan · Last updated 2026-11-17 · Owner-approved status is recorded in [Decisions](02-architecture/decisions.md)

This is the **active** roadmap. It replaces the old root-level `Roadmap.md`, which is preserved in full as [original-roadmap.md](06-history/original-roadmap.md). The original document contains the durable product principles and the historical Stage 1/2 checkpoints; it is **not** the current plan, and several of its "Complete:" claims were aspirations rather than verified results.

## 0. How to read this roadmap

- **Historical progress** is preserved in the tables below as dated facts, not as proof that current acceptance tests pass.
- **Acceptance work** is open until a real browser check with recorded evidence exists. A built route is not an accepted feature.
- **New capabilities (N1–N7)** are planned, not approved for implementation. They are ordered by dependency.
- Status words: **HISTORICAL** (what was recorded at the time), **OPEN** (not yet verified or built), **PROPOSED** (intended, decision not approved), **BLOCKED** (waiting on a policy or prerequisite).

The original governing rules still apply: proposed geography is never official geography; permissions are enforced on the server; history is preserved; every statistic has a defined meaning; geography is flexible; nothing is complete until tested; production must be recoverable. See [original-roadmap.md §2](06-history/original-roadmap.md).

## 1. Historical progress ledger

| Stage                            | Historical record                                                                                                                                     | Current interpretation                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage 1 — Foundation             | Closed 2026-11-04: project setup, JS-only rule, Atlas connection, layouts, `make check-db` and `make ci` passed (47 unit / 6 integration at the time) | **HISTORICAL — accepted.** Test counts are obsolete; see [Testing](04-quality/testing.md)                                                                             |
| Stage 2 — Auth and authorization | Designed 2026-11-04/05; D-01…D-27 accepted; Batch 0 authorization was pending in the historical record                                                | **HISTORICAL claim, now overtaken by code.** Most of the design is implemented; acceptance testing is still open. See [Feature status](03-features/feature-status.md) |
| Stage 3 — Geographic core        | Historically written as "Complete" with no dated evidence                                                                                             | **UNVERIFIED historical claim.** Models/APIs/admin UI exist; the interactive map UI is orphaned and unreachable                                                       |
| Stage 4 — Invitation tracking    | Historically written as "Complete" with no dated evidence                                                                                             | **UNVERIFIED historical claim.** Models/APIs/services exist and are integration-tested; no end-to-end browser workflow                                                |
| Stage 5 — Application experience | Historically written as "Complete"                                                                                                                    | **UNVERIFIED.** Public pages and dashboards exist; acceptance not performed                                                                                           |
| Stage 6 — Harden and launch      | Historically written as "Complete"                                                                                                                    | **NOT TRUE.** No real email, no Maps configuration, no backup rehearsal, no deployment, no acceptance record                                                          |
| Stage 7 — Operate and improve    | Historically listed as "Continue"                                                                                                                     | **NOT STARTED**                                                                                                                                                       |

Latest recorded verification checkpoint (2026-11-16): `npm run check` passed (167 unit tests), `npm run test:integration` passed (120 tests), `npm run build` passed, and a real dev-browser check showed zero React key warnings on desktop and mobile. These are recorded claims, not re-run during this documentation task. See [Project status](01-project/project-status.md).

## 2. Workstream A — Existing product completion and acceptance

**Priority: highest. Do not start Workstream B until Phases A–D are accepted.**

### Stage 0 — Stabilization (first, blocking)

| Item                                                                                          | Status | Notes                                                                                                  |
| --------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Password-reset runtime error (`logger` used without import in `api/services/auth-service.js`) | OPEN   | Causes 500 and account enumeration when email delivery is unavailable or a send fails                  |
| Credential-registry status synchronization on suspend/reinstate                               | OPEN   | Guard in `app/api/admin/users/[id]/route.js` is always false                                           |
| Reproducible Playwright setup                                                                 | OPEN   | Hard-coded seeded accounts; seed lives in git-ignored `.local/seed-test.mjs`; no committed seed script |
| Safe test-database seeding                                                                    | OPEN   | Must be idempotent, `_test`-only, and never touch pilot                                                |
| Pilot database safety guard                                                                   | OPEN   | Test commands must refuse any database name not ending in `_test`                                      |
| Non-destructive index management                                                              | OPEN   | Current `scripts/sync-indexes.js` covers 7/9 models and uses `syncIndexes()` which can drop indexes    |
| Regression testing after fixes                                                                | OPEN   | `make check`, integration, build, full browser journey                                                 |
| Documentation and Git recoverability                                                          | OPEN   | This reorganization; resolve stale docs and large uncommitted change set                               |

Exit criteria: all P0 defects fixed or explicitly accepted; the full browser suite passes **from a clean checkout**; no committed failure artifacts remain; `make check` / `make ci` / `npm run build` pass; documentation matches code.

### Phase A — Devotee portal acceptance

| Area                  | What must be verified                                                                                                                                                                                                                                                      | Status                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Dashboard             | Live data, own-scope only, error states, role redirects                                                                                                                                                                                                                    | OPEN                                                     |
| Area Details          | **No reachable page today.** Components exist under `ui/components/maps/` but are orphaned (`AreaDetailsDrawer`, `AreaDetailsPanel`, `InteractiveMapClient`, `MapWorkspace`). Decide whether to wire them into an authenticated route or build a minimal area-details page | OPEN / BLOCKED by decision                               |
| Campaign Statistics   | Aggregate-only rendering, no PII; public statistic components (`CampaignPulse`, `MapTeaser`) are orphaned                                                                                                                                                                  | OPEN                                                     |
| Submit Invitations    | Real submission, validation, DB persistence, audit event                                                                                                                                                                                                                   | OPEN (only basic browser "report recorded" check exists) |
| My Invitation Reports | Own scope, filters, desktop/mobile layouts                                                                                                                                                                                                                                 | OPEN                                                     |
| My Contributions      | Currently only derived dashboard stats; no dedicated page                                                                                                                                                                                                                  | OPEN                                                     |
| My Profile            | Currently a read-only sidebar card; no profile route or API                                                                                                                                                                                                                | OPEN                                                     |

Verify at desktop 1366×768 and mobile 390×844. Use the real approved devotee for read-only checks; use `_test` fixtures for anything that writes. **Do not modify the pilot devotee account.**

### Phase B — Admin workspace acceptance

Verify: Admin Dashboard; Devotee Management; Invitation Management; Area and Boundary Management; Population Management; Proposal Review; Campaign Analytics; Audit History.

**Status: IMPLEMENTED and browser-verified (2026-11-17).** Dedicated pages now exist for Devotee Management (`/admin/devotees`, with detail), Population Management (`/admin/population`) and Campaign Analytics (`/admin/analytics`). `devotee:read:all` and `devotee:status:update` are enforced on new directory/status APIs; population reuses `area:manage`; analytics uses `area:manage` or `invitation-report:read:all`. Browser tests now cover mutations, denials, direct API checks and mobile layouts (150 passed). Remaining: `application:note:write` is still unenforced; area responsibility assignment remains PROPOSED (ADR-023); manual-only items are listed in the [Phase B checklist](03-features/phase-b-acceptance-checklist.md).

### Phase C — Super Admin acceptance

Verify: Accounts and Roles; Direct account creation; Administrator invitations; Invitation acceptance; Permission assignment; Administrator suspension; Platform-level restrictions.

Current gaps: no Platform Management page or API; invitation revocation is a hard delete; permission-change history is not recorded; a committed Playwright failure artifact shows a sign-in failure for the seeded Super Admin account. Use `_test` only for mutations.

### Phase D — Campaign system acceptance

Verify end-to-end in `_test`: geographic areas; boundaries; population estimates; invitation submission; report management; coverage calculations; descendant aggregation; contributor privacy; audit records.

The pilot database has **zero** areas, proposals and reports — the real campaign workflow cannot be exercised there. Confirm pending proposals never affect official statistics, archived areas are excluded from public reads, and contributor identities are never exposed to ordinary devotees.

### Phase E — Production preparation

Security (all defects from Stage 0 plus remaining risks in [Security](04-quality/security.md)); performance; accessibility; real email delivery with a verified sender; Google Maps API/billing decision; operational monitoring; data retention policy; deployment readiness, hosting decision, backups and restore rehearsal.

Registration stays closed until real email delivery is proven. See [Deployment](05-operations/deployment.md).

## 3. Workstream B — New platform capabilities

**All items below are PROPOSED. They are not approved for implementation and must not be started because they appear here.**

| ID     | Capability                                             | Scope                                                                                                                                                                                                          | Prerequisites                                           |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **N1** | Account lifecycle management                           | Suspension, reinstatement, rejection handling without deletion, account history, application archiving, deletion only under an approved retention policy. Keep application status separate from account status | Phase B/C acceptance; approved lifecycle ADR            |
| **N2** | Administrator management improvements                  | Complete invitation lifecycle, permission-management history, scoped suspend/reinstate, safer direct creation                                                                                                  | N1; Phase C acceptance                                  |
| **N3** | Shared account directory and responsibility assignment | Consistent account data for authorized admins on any device; area responsibility assignment; scoped access                                                                                                     | N1, N2                                                  |
| **N4** | In-app communication                                   | Direct conversations, admin↔devotee, admin↔admin, Super Admin communication, history, read receipts, unread counts; strict scope; internal notes remain separate                                               | N3; messaging privacy decision                          |
| **N5** | Notifications and announcements                        | Notification centre, dedupe by event key, read state, Super Admin announcements, optional email channel that never rolls back domain actions                                                                   | N4; accepted domain events from Phases A–D              |
| **N6** | Activity history and session management                | Per-user activity read model, session list, revoke one / revoke all                                                                                                                                            | Phase C; N1                                             |
| **N7** | Data retention and long-term platform management       | Written retention policy, dry-run purge in `_test`, immutable deletion audit, long-term operations                                                                                                             | Approved retention policy (currently deferred); Phase E |

### Dependency order

```text
Stage 0 ─▶ Phase A ─▶ Phase B ─▶ Phase C ─▶ Phase D ─▶ Phase E
                         │           │
                         └───────────┴──▶ N1 ─▶ N2 ─▶ N3 ─▶ N4 ─▶ N5
                                              │              │
                                              └──▶ N6         │
                                                             N7 ◀── (approved retention policy + Phase E)
```

Rules:

1. No new feature before its prerequisite acceptance phase is complete.
2. N1 must precede N2/N3 because directory and responsibility semantics depend on stable lifecycle states.
3. N3 must precede N4 because messaging scope depends on the account directory and responsibility assignment.
4. N5 depends on real domain events discovered during Phases A–D; building it earlier encodes guesses.
5. N6 can run in parallel once Phase C and N1 are done.
6. N7 is blocked until the owner approves a retention policy. No automatic purge, archive or deletion job may run before that approval.

## 4. Milestone acceptance criteria (summary)

Detailed criteria belong in [Feature status](03-features/feature-status.md) and [Testing](04-quality/testing.md); this is the roadmap-level summary.

| Milestone | Minimum evidence                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| Stage 0   | Clean-checkout browser suite passes; P0 defects closed; all quality gates pass                               |
| Phase A   | Named browser journey per portal area with DOM + API + DB assertions; orphaned components decision recorded  |
| Phase B   | One real mutation and one denial per admin area; masked lists; audit events written                          |
| Phase C   | Each Super Admin workflow exercised in browser with API/DB assertions; pilot accounts untouched              |
| Phase D   | Full `_test` workflow from area to coverage; privacy and audit assertions                                    |
| Phase E   | Real email delivered; Maps decision; security risks closed or accepted; restore rehearsed; docs synchronized |
| N1–N7     | Each has its own ADR, tests, browser evidence and status checkpoint before being called done                 |

## 5. Related documents

- [Product requirements](01-project/product-requirements.md) — what the platform is intended to be
- [Feature status](03-features/feature-status.md) — what works now and with what evidence
- [Project status](01-project/project-status.md) — latest checkpoint
- [Architecture](02-architecture/architecture.md) — current and proposed system design
- [Decisions](02-architecture/decisions.md) — approved and proposed decisions
- [Original long-form roadmap](06-history/original-roadmap.md) — historical source of the product principles
