# Security

Last updated: 2026-11-17.

This page lists the security controls that exist in the code **today**, the open defects that weaken them, and the protections that are only designed or proposed. It is written against direct source inspection (2026-11-17) and the current working tree. **Nothing here claims protection that is not implemented.** Where a control is partial, the gap is stated alongside it.

No credentials, hosts, connection strings, API keys, tokens, or passwords appear in this document. See [Historical credential incident and rotation rule](#historical-credential-incident-and-rotation-rule). For the status labels used below (**Implemented**, **Partially implemented**, **Designed but not implemented**, **Planned**, **Deprecated / superseded**), see the shared vocabulary in the [documentation index](../README.md) and the [project status](../01-project/project-status.md).

## Scope and architecture references

Security is enforced mostly in the server-only `api/` layer; `app/` route handlers call guards and services, and `ui/` never imports server-only modules. See [architecture](../02-architecture/architecture.md) and [database](../02-architecture/database.md) for the model and layer map. Accepted security decisions are recorded in [decisions](../02-architecture/decisions.md) and the original design in [stage 2 authentication spec](../06-history/stage-2-authentication-spec.md).

## Trust boundaries and threat model

The following boundaries define where checks are expected to apply. Each is only as strong as the controls described below.

- **Visitor → application:** public pages and the application form are unauthenticated. A visitor who applies receives an `application`-scope session, not a role; that scope must never reach devotee or campaign data.
- **Applicant → devotee portal:** `/dashboard` and `/api/account/**` require a verified, approved account with `full` scope. Anonymous visitors are redirected to `/apply?mode=login`; non-active accounts to `/application-status`.
- **Devotee/Admin → admin workspace:** `app/admin/layout.jsx` is a server-side gate, and every `/api/admin/**` handler re-checks role and permission. A page-level gate alone is not sufficient; the API guards are the enforcement point.
- **Admin → Super Admin surfaces:** `/api/admin/users/**` and invitation revocation are Super Admin-only; ordinary administrators must not be able to escalate themselves.
- **Application → database:** only the `api/` layer connects to MongoDB, using a single connection module and server-only imports. Direct database access bypasses every application-layer control, including audit append-only hooks.
- **Application → email/provider:** the dev provider writes files under git-ignored `.local/mail/` and sends nothing; the Resend provider uses an API key from `.env.local`. No secret is logged or committed.

An actor who controls a browser can supply arbitrary headers, form bodies and cookies; the guards never trust a client-supplied user id or role. An actor with direct database access is outside the application trust boundary — see the audit-immutability gap below.

## Implemented controls

| Area                     | Control (current state)                                                                                                                       | Primary file reference                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Password storage         | Argon2id via `@node-rs/argon2`, 19 MiB memory / t=2 / p=1; hashes never selected by default                                                   | `api/lib/auth/password.js`, `api/models/user.js`                             |
| Authentication           | Timing-equalised login with a dummy Argon2 hash; verified-email, suspended and status-allowlist checks                                        | `api/services/auth-service.js`, `app/api/auth/login/route.js`                |
| Session tokens           | 32 random bytes, base64url; only SHA-256 hash stored; 7-day idle / 30-day absolute expiry                                                     | `api/lib/auth/session.js`, `api/lib/auth/tokens.js`, `api/models/session.js` |
| Session cookie           | `session=<token>; Path=/; HttpOnly; SameSite=Lax`; `Secure` added in production                                                               | `api/lib/auth/session.js`                                                    |
| Session validation       | Rejects expired and suspended sessions, deletes suspended sessions, recomputes scope from fresh DB user, slides idle window                   | `api/services/auth-service.js`                                               |
| Role / permission guards | `requireUser({full})`, `requireAdmin(permission)`, `requireSuperAdmin`; user id never trusted from the client                                 | `api/lib/auth/guards.js`                                                     |
| Permission model         | 9 granular `ADMIN_PERMISSIONS`; `hasPermission` grants all to `super_admin`, array membership to `admin`                                      | `api/lib/auth/permissions.js`                                                |
| Application scope        | `application` scope sessions cannot reach full-scope devotee/campaign data; `requireUser({full:true})` enforces this on every protected route | `api/lib/auth/guards.js`, `api/services/auth-service.js`                     |
| Revocation               | Suspend deletes all sessions; password-reset confirm deletes all sessions; last active Super Admin cannot be demoted or suspended             | `app/api/admin/users/[id]/route.js`, `api/services/auth-service.js`          |
| Single-use tokens        | Verification/reset/invitation tokens stored as SHA-256 hashes with `usedAt`, TTL indexes                                                      | `api/models/auth-token.js`, `api/lib/auth/tokens.js`                         |
| CSRF                     | `assertTrustedOrigin` on mutation routes (Sec-Fetch-Site + Origin vs `APP_BASE_URL`); no-Origin requests allowed by design                    | `api/lib/http/origin.js`                                                     |
| Rate limiting            | MongoDB fixed-window `RateLimit` buckets on login, register, reset request, verification, resend and review routes                            | `api/lib/security/rate-limit.js`, `api/models/rate-limit.js`                 |
| Audit events             | Append-only `AuditLog` with `createdAt` only, no PII in metadata; Mongoose hooks block edits/deletes outside `NODE_ENV=test`                  | `api/models/audit-log.js`                                                    |
| Sensitive data handling  | Admin list masking and privacy helpers; password hashes `select:false`; token-bearing pages send `no-referrer` + `no-store`                   | `api/lib/privacy/mask.js`, `api/models/user.js`, `next.config.mjs`           |
| HTTP security headers    | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, production HSTS; `poweredByHeader:false`                         | `next.config.mjs`                                                            |
| Database access boundary | `server-only` on env, connection, logging, all models/services; connection is the single DB entry point                                       | `api/lib/env/env.js`, `api/lib/mongodb/connection.js`                        |
| DB / test separation     | `MONGODB_URI` vs `MONGODB_URI_TEST`; integration helper refuses any URI whose database name does not end in `_test`                           | `tests/helpers/database.js`, `api/lib/env/env.js`                            |
| Email isolation          | Dev provider writes `.local/mail/*.eml` and never sends; no SMTP transport in code                                                            | `api/lib/email/adapter.js`, `api/lib/email/transport.js`                     |

Read this table as a map of where each control lives, not as a certification. A row describes the code that exists; the sections below explain the conditions under which it applies and the gaps that remain. File references are to the current working tree and are the first place to look when re-verifying a claim. Several rows are weakened by the open defects below; in particular, authentication, permissions, CSRF and rate limiting all have documented gaps that a reader must weigh before relying on them.

### Evidence level of key controls

Code presence is not evidence of behaviour. The table below records the strongest evidence currently available for representative controls; "none" means no dedicated automated or browser proof.

| Control                      | Evidence level                          | Caveat                                                                                                      |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Password hashing (Argon2id)  | Implemented and automated-test verified | Unit tests cover hashing/verification helpers only                                                          |
| Login and session validation | Implemented and automated-test verified | Integration suites cover workflows; browser sign-in has a committed failure artifact for one seeded account |
| Role/permission guards       | Implemented and automated-test verified | One declared permission (`application:note:write`) is not enforced by any guard                             |
| Application-scope boundary   | Implemented but inadequately tested     | Integration checks exist; no browser evidence for scope separation                                          |
| CSRF origin check            | Implemented but inadequately tested     | No dedicated browser or integration test of cross-site rejection                                            |
| Rate limiting                | Implemented but inadequately tested     | IP source is spoofable; two endpoints are unlimited                                                         |
| Audit append-only hooks      | Implemented and automated-test verified | Application-level only; bypassed under `NODE_ENV=test`                                                      |
| DB/test separation           | Implemented and automated-test verified | `_test` suffix guard is exercised by the integration gate                                                   |
| Security headers             | Implemented but inadequately tested     | Config present; no automated assertion of every header                                                      |
| Messaging privacy            | Not implemented                         | No model, route or transport exists                                                                         |

## Authentication and password storage

**Implemented.** Login (`app/api/auth/login/route.js`, `api/services/auth-service.js`) verifies email, account status and suspension, and uses a dummy Argon2 hash to equalise timing between existing and unknown accounts. Passwords are hashed with Argon2id at 19 MiB / t=2 / p=1 (`api/lib/auth/password.js`) and `passwordHash` is `select:false` on the `User` model, so it is not returned by normal queries. `AUTH_SECRET` is required by env validation (`api/lib/env/env.js`) but is **not consumed by any authentication code** — do not treat it as a protection.

**Defect impact:** because of D1 below, an unavailable email provider or a failed send on the password-reset path raises a `ReferenceError` instead of a clean response, producing a 500 and an account-enumeration signal.

## Session security

**Implemented.** Sessions are opaque, database-backed tokens: 32 random bytes encoded base64url, with only their SHA-256 hash persisted (`api/lib/auth/session.js`, `api/lib/auth/tokens.js`, `api/models/session.js`). The cookie is HttpOnly and SameSite=Lax, with `Secure` only in production. Validation checks `expiresAt` (7-day idle) and `absoluteExpiresAt` (30-day), recomputes scope from the live user, deletes sessions for suspended accounts, and slides the idle window.

**Gaps:** the cookie has no `__Host-` prefix and no explicit `Max-Age`; `Secure` is absent outside production; there is no server-side CSRF token (defence relies on SameSite + origin checks); and `AUTH_SECRET` is unused for signing because tokens are random and hashed, not signed. Session records have no `revokedAt` field — revocation is implemented by deleting records.

## Role and permission enforcement

**Implemented.** `api/lib/auth/guards.js` resolves the user only from the signed-in cookie (`getRequestUser`) and never from a client-supplied id. `requireUser({full:true})` requires approved scope; `requireAdmin(permission)` adds role and granular-permission checks; `requireSuperAdmin` restricts all `/api/admin/users/**` routes (`app/api/admin/users/[id]/route.js`, `app/api/admin/users/route.js`, `app/api/admin/users/invitations/**`). `hasPermission` grants everything to `super_admin` and array membership to `admin` (`api/lib/auth/permissions.js`). Self-edit and demotion/suspension of the last active Super Admin are blocked.

**Defect impact:** `devotee:read:all`, `devotee:status:update` and `devotee:delete` are enforced in route handlers and services; `canManageUser()` is used by the devotee directory service. `application:note:write` is the only declared permission with no enforcement site (note writes are authorized by `application:review:all`). `MODERATOR_PERMISSIONS` is an unused export. Do not assume `application:note:write` protects anything.

## Application-scoped sessions

**Implemented.** Visitors have no session; approved devotees/admins hold `full` scope; pending/rejected applicants receive an `application` scope session (D-25 design, `api/lib/auth/session.js`). `requireUser(request, { full: true })` is the enforcement point that prevents application-scope sessions from reaching campaign/devotee data. This is enforced in code and covered by integration permission/route-authorization suites, but there is **no browser evidence** for the scope boundary.

## Token storage and expiry

**Implemented.** Verification tokens expire in 24h (resend invalidates older ones), password-reset tokens in 24h, and admin invitations in 7 days. All are stored as SHA-256 hashes in `AuthToken` with a `usedAt` field and a MongoDB TTL index (`api/models/auth-token.js`). Token-bearing pages send `no-referrer` and `no-store` headers (`next.config.mjs`).

**Gaps:** confirming a password reset does **not** invalidate older outstanding reset tokens (D4-class issue), so multiple reset tokens can coexist until they expire.

## CSRF and rate limiting

**Implemented (partial).** `assertTrustedOrigin` (`api/lib/http/origin.js`) is called per mutation route: it blocks `cross-site` fetches and rejects an `Origin` that does not match `APP_BASE_URL` or the request origin. It deliberately allows requests with no `Origin` (curl, health probes); protection then relies on the HttpOnly cookie plus the route guard.

Fixed-window, MongoDB-backed limits (`api/lib/security/rate-limit.js`) exist for: login by account (10/15m) and by IP (50/15m), register by IP (5/h), password-reset request by IP (5/h) and email (3/h), verification by IP (20/15m), resend by IP/email (3/5m), and application review by IP (20/5m).

**Gaps:** there is no limit on password-reset **confirm** or admin-invitation **accept**; there is no global/middleware rate limiter; and the client IP is read from `x-forwarded-for`/`x-real-ip` without a trusted-proxy allowlist, so it is spoofable unless a trusted proxy strips those headers.

## Sensitive information handling

**Implemented.** `api/lib/privacy/mask.js` provides masking helpers used by admin list views; password hashes are excluded by `select:false`; `AuditLog.metadata` is documented as IDs/codes only; `.env.local`, dumps and `.local/` are git-ignored; health output exposes only status, checks, app version and timestamp (`app/api/health/route.js`) and never a URI or credential. The dev email provider writes `.local/mail/*.eml` rather than sending real mail.

**Gaps / risks:** a local development credential registry can write **plaintext passwords** under explicit env flags (`STORE_CREDENTIALS_FOR_ALL_USERS` plus role switches, and `NODE_ENV=development`) — see `api/lib/auth/credential-registry-config.js` and `api/lib/auth/credential-registry-writer.js`. Files are restricted to 0700/0600 and live under git-ignored `.local/test-users/`, and passwords are omitted from `make users` listings, but this is still plaintext-at-rest in development and must never be enabled with real data or in production. Public health exposes the app version (minor information disclosure). No DOB is collected; no invitee PII is stored on `InvitationReport`.

## Administrative audit events

**Implemented (application-level).** `api/models/audit-log.js` is append-only: `createdAt` only, no `updatedAt`, and Mongoose hooks reject `save`/`update*`/`delete*` outside `NODE_ENV=test`. Events carry `eventType`, `actorId`, `actorRole`, `targetId`, `targetType`, `metadata`, `ipHash` and `userAgent`. Login, logout, application submit/review, password reset, user updates and other admin actions create records.

**Gap:** immutability is enforced at the **application layer only**. It is not a database role that denies update/delete at the storage layer, and Atlas shared tiers cannot express per-collection deny rules. An actor with direct database write access can alter or remove records; the hooks are also bypassed under `NODE_ENV=test` by design so integration suites can clean up fixtures.

## Database access boundaries

**Implemented.** All env, logging, connection, model and service modules import `server-only` (for example `api/lib/env/env.js`, `api/lib/mongodb/connection.js`, `api/models/*.js`, `api/services/*.js`). ESLint forbids relative `../api/*` imports, and `jsconfig.json` maps `@/*` to the repo root so server code is reached only through `@/api/...`. The single connection module is the DB entry point; `ui/` must not import server-only modules. See [architecture](../02-architecture/architecture.md).

**Operational risk:** `scripts/sync-indexes.js` (D3) covers only 7 of 9 models and calls `syncIndexes()`, which can **drop** indexes not declared in the schema — treat it as potentially destructive, not a safe idempotent sync.

## Account lifecycle security

**Current (implemented).** Registration creates a `pending_verification` user plus an application; email verification, application review, `active`/`rejected`/`suspended`/`invited` statuses, admin invitation acceptance and password reset exist. Suspend deletes all sessions; reinstatement is an admin action; the last active Super Admin cannot be demoted or suspended.

**Defect:** D5 means the credential-registry status sync never runs, so registry records can disagree with account status.

**Proposed (not implemented).** There is no `archived`, `deleted` or `eligible_inactive` state, no `suspendedAt`/reason, no retention/deletion pipeline and no self-service profile/session management. These belong to the account-lifecycle and data-retention workstreams in the [roadmap](../roadmap.md); see also [product requirements](../01-project/product-requirements.md).

## Messaging privacy requirements (proposed)

In-app conversations are part of the intended shared capabilities but are **not implemented** — no message model, no conversation route, no transport. Any future messaging feature must meet requirements that are currently only planned: participant-only visibility, no message content in `AuditLog.metadata` (IDs only, never PII), encryption/transport guarantees appropriate to the deployment, retention limits, and an approved moderation/legal policy. Do not treat messaging as private or compliant today. This is a product/legal decision that requires explicit sign-off per the [product requirements](../01-project/product-requirements.md).

## Account deletion permissions (2026-11-18)

`DELETE /api/admin/accounts/:id` requires `assertTrustedOrigin` plus an authenticated admin session; the service then enforces: devotees require the distinct `devotee:delete` permission, administrators and Super Admins require the Super Admin role, Super Admin targets are always refused, and self-deletion is refused. Permanent deletion is disabled pending retention-policy approval: the UI has no delete actions, the API returns 410, and the service refuses before any database operation. `application:note:write` is now enforced by a dedicated note endpoint. Audit responses use a field allowlist; new IP hashes use keyed HMAC-SHA256 (`v1:`) with `AUTH_SECRET`. Sessions and tokens are deleted, audit `admin.account.deleted` records the reason, and local credential files are removed only after the database commit. See [Account lifecycle](../03-features/account-lifecycle.md).

## Phase B permission enforcement

**Implemented (2026-11-17).** The Admin Workspace enforces permissions on the server for every protected page and mutation:

- `devotee:read:all` — `GET /api/admin/accounts`, `GET /api/admin/accounts/:id`, `/admin/devotees`; list contact data is masked, detail is safe and never includes password hashes or tokens.
- `devotee:status:update` — `PATCH /api/admin/accounts/:id/status`; only devotee targets are accepted, a written reason of at least 5 characters is required, suspension deletes sessions, reinstatement requires verified email plus an approved current application, and `admin.devotee.status_updated` is written to the append-only audit log with `{ from, to, reason }`.
- `area:manage` — areas, boundaries and population updates; population deltas are not yet recorded separately in audit metadata.
- `invitation-report:read:all` — report list, review (with a mandatory reason for flag/invalidate), and report-based analytics.
- `audit:read:all` — audit log plus recent activity on the dashboard; filters for event, actor, target and date are server-side.
- `area:manage` OR `invitation-report:read:all` — Campaign Analytics page.

Super Admin-only capabilities (administrator invitations/management, permission assignment, administrator suspension, platform management) remain behind `requireSuperAdmin` and the `superAdminOnly` nav group. No new permission strings were introduced; see the [implementation note](../02-architecture/decisions.md). Area responsibility assignment does not exist — assigning an area must never itself grant management permission (PROPOSED ADR-023).

## Pilot and test database separation

**Implemented.** `MONGODB_URI` points at the pilot database and `MONGODB_URI_TEST` at the separate test database; the names differ and the test name ends in `_test`. `tests/helpers/database.js` hard-refuses any test URI whose database name does not end in `_test`, and all integration suites run against `MONGODB_URI_TEST`. The Makefile never starts, stops or mutates MongoDB; `check-db`/`check-pilot` only ping and show database names, never credentials. See [database](../02-architecture/database.md).

**Pilot snapshot (read-only, 2026-11-17):** 2 users (one active Super Admin, one active verified devotee), 1 approved application, 33 audit logs, 3 auth tokens, 1 session, and zero areas, proposals or invitation reports. Values are counts only — no identifiers or secrets are reproduced here.

## Known defects and risks

Only D1–D3 carry an explicit **P0** in the verified brief. Other severities below are assessment labels for triage, not verified severity ratings. These remain open until fixed, even when unrelated tests pass.

Severity scale used below: **P0** blocks safe operation and should be fixed before further product work; **high** is a serious correctness/assurance gap; **medium** is a meaningful weakness with a partial workaround; **low** is a minor disclosure or hardening gap; **informational** is documentation drift with no direct runtime impact. The IDs D1, D2, D3 and D5 match the stabilization work in the [roadmap](../roadmap.md); the numbering is intentionally not contiguous.

Defects are not cleared by passing tests. For example, `npm run check` passing says nothing about D1 (a missing import on the reset path), D3 (destructive index sync) or D5 (the never-firing registry sync guard). Each item below stays listed until the code change is verified by a test, a build and — where applicable — a real browser check, reported separately.

| ID / severity                        | Defect or risk                                                                                                                                           | Impact                                                                                                                  | Reference                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| D1 — **P0**                          | `logger` used but never imported in `api/services/auth-service.js` (~lines 226/233/241)                                                                  | Password-reset path throws a 500 and leaks account existence when email is unavailable or send fails                    | `api/services/auth-service.js`                                                                  |
| D2 — **P0**                          | Playwright spec hard-codes seeded accounts/password, but the seed lives in git-ignored `.local/seed-test.mjs`; no committed seed and no `make test-e2e`  | Browser tests are not reproducible on a fresh clone; a committed failure artifact exists for `super@utsav.test` sign-in | `tests/playwright/browser-journeys.spec.js`, `.local/seed-test.mjs`, `test-results/`            |
| D3 — **P0**                          | `scripts/sync-indexes.js` covers 7/9 models (omits `RateLimit`, `InvitationReport`) and uses `syncIndexes()`, which drops undeclared indexes             | Running it can silently remove indexes; docs previously called it safe/non-destructive                                  | `scripts/sync-indexes.js`                                                                       |
| D5 — high (assessed)                 | Guard at `app/api/admin/users/[id]/route.js:107` is always false because `target.status` was already assigned from `update.status`                       | Credential-registry status never syncs with account status                                                              | `app/api/admin/users/[id]/route.js`                                                             |
| Dead permission — medium             | `application:note:write` declared but never enforced; `MODERATOR_PERMISSIONS` export unused. `devotee:*` permissions and `canManageUser()` ARE enforced. | Operators may believe note-write authority is separately controlled                                                     | `api/lib/auth/permissions.js`                                                                   |
| IP spoofing — medium                 | `clientAddress()` trusts `x-forwarded-for`/`x-real-ip` with no trusted-proxy allowlist                                                                   | Rate limits can be bypassed by spoofing headers                                                                         | `api/lib/http/origin.js`, `api/lib/security/rate-limit.js`                                      |
| Missing rate limits — medium         | No limit on password-reset confirm or admin-invitation accept                                                                                            | Unlimited token-guessing / invite abuse on those endpoints                                                              | `app/api/auth/password-reset/confirm/route.js`, `app/api/auth/admin-invitation/accept/route.js` |
| Registration enumeration — medium    | Duplicate registration returns a distinguishing 409 response                                                                                             | Account existence can be enumerated                                                                                     | `app/api/auth/register/route.js`                                                                |
| Multiple reset tokens — medium       | Reset confirmation does not invalidate older reset tokens                                                                                                | Several valid reset tokens can coexist                                                                                  | `api/services/auth-service.js`, `api/models/auth-token.js`                                      |
| Cookie hardening gaps — medium       | No `__Host-` prefix, no explicit `Max-Age`, `Secure` only in production                                                                                  | Weaker cookie isolation/transport guarantees                                                                            | `api/lib/auth/session.js`                                                                       |
| Audit immutability — medium          | Append-only enforced only by Mongoose hooks; bypassed under `NODE_ENV=test` and by direct DB writes                                                      | Audit records are not tamper-proof at the storage layer                                                                 | `api/models/audit-log.js`                                                                       |
| Proposal approval atomicity — medium | Proposal approval is not transactional                                                                                                                   | Partial state possible on failure                                                                                       | `api/services/proposal-service.js`                                                              |
| Proposal boundary index — low        | `LocalityProposal.boundary` lacks a 2dsphere index                                                                                                       | Geospatial queries on proposal boundaries are not index-backed                                                          | `api/models/locality-proposal.js`                                                               |
| Plaintext dev credentials — medium   | Optional plaintext password storage under dev flags                                                                                                      | Plaintext-at-rest if enabled; must never use real data                                                                  | `api/lib/auth/credential-registry-config.js`, `api/lib/auth/credential-registry-writer.js`      |
| Credential registry sync — medium    | Same root cause as D5; status updates skipped                                                                                                            | Registry drift                                                                                                          | `app/api/admin/users/[id]/route.js`                                                             |
| Version disclosure — low             | Public health endpoint returns `APP_VERSION`                                                                                                             | Minor information disclosure                                                                                            | `app/api/health/route.js`                                                                       |
| HMR watch exclusion — informational  | ADR-016 claims a watch exclusion in `next.config.mjs`; none exists in the working tree                                                                   | Documentation drift; historical/unverified claim                                                                        | `next.config.mjs`, [decisions](../02-architecture/decisions.md)                                 |
| Documentation drift — informational  | Older docs referenced `make test-e2e` and called index sync safe                                                                                         | Operators may run nonexistent or unsafe commands                                                                        | [testing](testing.md), [roadmap](../roadmap.md)                                                 |

## Not implemented / proposed

The following are **not protections today**. They are planned or designed only, and belong to the workstreams in the [roadmap](../roadmap.md):

- **Account lifecycle security:** archived/deleted/inactive states, suspension timestamps and reasons, retention and deletion pipeline, self-service session management.
- **Administrator management improvements**, including reliable credential-registry synchronisation and safer bootstrap/recovery flows.
- **Shared account directory and responsibility assignment.**
- **In-app conversations / messaging privacy** — no model, route or transport exists; requirements are not yet approved.
- **Notifications and announcements**, notification centre, activity history.
- **Server-enforced audit immutability** at the storage layer, and a Content-Security-Policy header (no CSP is configured in `next.config.mjs`).
- **Trusted-proxy allowlist** for rate-limit client IP, global/middleware rate limiting, and rate limits on reset-confirm and invitation acceptance.
- **Cookie hardening:** `__Host-` prefix, explicit `Max-Age`, consistent `Secure`.
- **CSP and further header hardening** beyond the baseline set in `next.config.mjs`.
- **HMR watch exclusion** attributed by ADR-016 — not present in the current tree; treat the ADR claim as historical/unverified.
- **Database-level audit immutability** via a role that denies update/delete on the collection; Atlas shared tiers cannot express this today.
- **Trusted-proxy configuration** so `clientAddress()` cannot be fooled by client-supplied forwarding headers.
- **A committed, reproducible Playwright seed** and a `test:e2e` command so browser checks can be re-run by anyone.

None of these should be assumed in threat models or operator procedures until implemented and verified. A design being accepted in an ADR does not make the control live; confirm against the current working tree and the [project status](../01-project/project-status.md).

## Operator security checklist

For anyone running the pilot or a local environment, these are the current expectations. They are operational reminders, not new guarantees.

1. Keep Atlas credentials only in git-ignored `.env.local`; never commit `.env.local`, dumps or `.local/`.
2. Confirm `MONGODB_URI` and `MONGODB_URI_TEST` point at different databases and that the test name ends in `_test` before running integration tests.
3. Do not run `npm run db:sync-indexes` on a shared database until D3 is fixed; it can drop indexes and omits two models.
4. Do not enable the plaintext credential-registry flags (`STORE_CREDENTIALS_*`) with real data or outside local development; they exist only to make local seeded accounts discoverable.
5. Treat a skipped integration suite as unverified, not passing; use `UTSAV_TEST_REQUIRE_DB=1` in CI.
6. Treat any credential that appeared in a chat, screenshot, issue or log as compromised and rotate it immediately.
7. Do not cite `make test-e2e` or `npm run test:e2e`; neither exists.
8. Restrict Atlas Network Access to specific IPs; avoid an open range beyond initial setup.
9. Do not claim audit records are tamper-proof at the database layer — immutability is application-level only.
10. Re-check the [roadmap](../roadmap.md) and [project status](../01-project/project-status.md) before assuming a planned control is live.

## Historical credential incident and rotation rule

- **Incident record — 2026-11-03:** an Atlas connection string containing its password was pasted into an AI chat during setup. The password was rotated the same day (a new value was generated locally and written directly into `.env.local`). **Rule:** any credential that has appeared in a chat, screenshot, issue or log is compromised and must be rotated immediately.
- **Resolution — 2026-11-04:** after the Atlas database-user password was reset and both ignored local URI files were updated, `make check-db` and `make ci` passed. Verification output contained only host, database name and latency — no URI, username or password was printed or committed.
- **Ongoing rule:** Atlas credentials live only in git-ignored `.env.local`. Never commit `.env.local`, dumps or `.local/`. Scripts must mask or omit connection strings, API keys and passwords. If a credential is ever exposed in a chat, screenshot or issue, rotate it. Network Access should list specific IPs only; an open `0.0.0.0/0` rule is not acceptable beyond initial setup.

No credential, host, connection string, API key, token or password value is reproduced in this document.

## Related documents

- [Architecture](../02-architecture/architecture.md) and [database](../02-architecture/database.md) — layers and data model.
- [Decisions](../02-architecture/decisions.md) — accepted ADRs (including the unverified ADR-016 HMR claim).
- [Testing](testing.md) — what automated and browser checks actually prove.
- [Roadmap](../roadmap.md) and [product requirements](../01-project/product-requirements.md) — planned lifecycle, messaging and privacy work.
- [Stage 2 authentication spec](../06-history/stage-2-authentication-spec.md) — original auth/session design (historical).

## Stabilization pass (2026-11-18)

- **Local artifacts** resolve against the project root discovered from a `package.json` marker, never `process.cwd()`. An explicit `UTSAV_LOCAL_DIR` override exists only for isolated tests.
- **Audit privacy:** the audit API returns only `_id`, `eventType`, actor/target fields, sanitized metadata and `createdAt`; `ipHash` and `userAgent` are never returned. Invitee emails and free-text reasons are no longer written to audit metadata; historical records are redacted on read but never rewritten. New IP hashes are `v1:` keyed HMAC-SHA256 using `AUTH_SECRET`.
- **Deletion:** disabled in UI, API and service until the retention policy is approved.
- **Permissions:** `application:note:write` is enforced by `POST /api/admin/applications/:id/note`; decisions no longer accept a note. A filesystem/AST registry test fails if any Admin API handler lacks a guard.

## Local path safety (2026-11-18)

All application-generated local files resolve through `api/lib/paths/local-artifacts.js`, which discovers the project root from a `package.json` name marker and validates overrides and segments. `UTSAV_LOCAL_DIR` may only point inside the repository. There are no writes to the parent `Repo/`, the home directory or `/tmp`. Playwright reports and failure artifacts, screenshots, test scratch spaces and isolated test registries all live under `Utsav-Connect/.local/`. The `admin.invitation.list_viewed` audit is emitted only for deliberate views; background refetches and StrictMode's duplicate development effect no longer create duplicate records.
