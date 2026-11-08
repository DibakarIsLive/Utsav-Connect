# Security

Last updated: 2026-11-05. Lists the controls that exist in the code today and the ones still planned. Nothing here claims protection that is not implemented.

## Implemented

| Area                | Control                                                                                                                                                                                                                     | Where                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Secrets             | Only `.env.example` (placeholders) is committed; `.env*.local`, `.env` and `.local/` are git-ignored                                                                                                                        | `.gitignore`                                           |
| Env validation      | Zod schema; failures report the variable name, never the value                                                                                                                                                              | `api/lib/env/env.js`                                   |
| Server/client split | `server-only` on env, database and logging modules; Next refuses to bundle them client-side                                                                                                                                 | `api/lib/**`                                           |
| Response headers    | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, payment, usb off), HSTS (production only), `X-Powered-By` removed | `next.config.mjs`                                      |
| Error handling      | Clients receive generic envelopes (`INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, `SERVICE_DEGRADED`); driver and stack details stay in server logs                                                                               | `api/lib/http/responses.js`, `app/api/health/route.js` |
| Logging             | JSON lines; keys named like `password`, `token`, `secret`, `authorization`, `cookie`, `mongodb_uri` are redacted; stacks omitted in production                                                                              | `api/lib/logging/logger.js`                            |
| Database timeouts   | Bounded connection/selection timeouts (5 s) so an outage degrades the health endpoint instead of hanging requests                                                                                                           | `api/lib/mongodb/connection.js`                        |
| Health endpoint     | Never cached (`no-store`); exposes only status, latency and app version                                                                                                                                                     | `app/api/health/route.js`                              |
| Database transport  | Atlas `mongodb+srv://` connections are TLS-encrypted by default                                                                                                                                                             | Atlas                                                  |

## Database credentials (Atlas)

- The Atlas database user's password exists in exactly one place on a developer machine: `.env.local`. It is never printed by scripts (`check:db` logs host and database only), never logged by the app (`mongodb_uri` keys are redacted), and never committed.
- **Incident record — 2026-11-03:** the initial Atlas connection string, including the password, was pasted into an AI chat during setup. The password was rotated the same day (new value generated locally and written straight into `.env.local`). Treat any credential that has appeared in a chat, screenshot, issue, or log as compromised and rotate it.
- **Resolution — 2026-11-04:** after the Atlas database-user password was reset and both ignored local URIs were updated, `make check-db` and `make ci` passed. Verification output contained only host, database name, and latency; no URI, username, or password was printed or committed.
- Network Access in Atlas should list specific IPs only; `0.0.0.0/0` is not acceptable beyond the first-day setup.
- The application user should hold `readWrite` on the two project databases only (see `database.md`).

## Not implemented yet (do not assume)

- Authentication, sessions, password hashing, email verification, application approval, account lifecycle (Stage 2, ADR-010/ADR-014). The proposed design is in [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md); no code exists on `main` or in repository history.
- Authorization / role checks on the server (`api/lib/auth/permissions.js`) — no protected routes exist because no protected data exists.
- The `/admin/devotees` application review and devotee management dashboard.
- Rate limiting on sensitive endpoints.
- Content-Security-Policy — deferred until the Google Maps scripts/styles are known so the policy can be written correctly instead of permissively.
- CSRF protection for mutating routes (none exist yet).
- Audit logging collection, security event logging, sensitive-access auditing.
- Applicant-PII access controls; no automatic retention, expiry, or deletion job is implemented or approved.
- Invitation-report privacy enforcement (the feature is Stage 4).
- Dependency vulnerability scanning in CI (`npm audit` is not yet part of `make ci`).
- Automatic database backups (free tier has none — see `database.md`).

## Stage 2 security design (ACCEPTED — not implemented)

The following controls are specified and accepted but not active. They must not be described as implemented until the Stage 2 acceptance criteria in the specification are verified and Batch 0 is authorized.

| Area                      | Proposed control                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessions                  | Opaque 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie; `Secure` and `__Host-` prefix in production; SHA-256 hash stored in MongoDB                                                                                                                                                                                           |
| Revocation                | Logout, password reset, suspension, rejection, and role/permission changes revoke sessions immediately; approval revokes the limited applicant session; 7-day idle and 30-day absolute lifetime                                                                                                                                     |
| Passwords                 | Argon2id (19 MiB, 2 iterations, 1 lane) via `@node-rs/argon2`; Node `scrypt` documented fallback; versioned hash format; rehash on login                                                                                                                                                                                            |
| Application approval      | Public registration creates a `pending` application; no session; approval requires verified email; pending/rejected/expired accounts cannot use devotee APIs                                                                                                                                                                        |
| Applicant access          | A verified applicant whose application is `pending_approval` or `rejected` may hold only an `application`-scope session for `/application-status` and their own `GET /api/account/application`; all other account/devotee/admin APIs require a full active session. The reserved `expired` state cannot log in or hold any session. |
| Application decisions     | Atomic conditional updates; approval/rejection + user status + audit in a transaction; generic rejection notice; internal notes never disclosed                                                                                                                                                                                     |
| Administrator hierarchy   | `devotee`/`admin`/`super_admin`; one stored `admin` role; "Moderator" is a permission profile; granular `adminPermissions`; Super Admin-only administrator creation and permission changes                                                                                                                                          |
| Privilege escalation      | Strict schemas; server-derived role/status; closed permission allow-list; reserved capabilities rejected; self-promotion/demotion blocked; Super Admin capabilities never granted through ordinary permission updates                                                                                                               |
| Session TTL               | One effective TTL index on `expiresAt`, capped at `absoluteExpiresAt`; `absoluteExpiresAt` enforced during validation and never TTL-indexed                                                                                                                                                                                         |
| PII access                | Gender/phone/message only in the application record; no DOB collected; admin list masking; audited detail views; no public/devotee-other/aggregate exposure                                                                                                                                                                         |
| Invitation-report privacy | Submitter stored separately from participant count; no invitee PII by default; admin-only contributor identity; devotee aggregates and own reports only                                                                                                                                                                             |
| Audit                     | Append-only `auditLogs`; administrator-only viewer; HMAC-hashed IPs; no passwords, tokens, cookies, emails, phone numbers, gender, message, or notes                                                                                                                                                                                |
| CSRF                      | Origin check on every mutating request; JSON content type required; `SameSite=Lax`; no permissive CORS                                                                                                                                                                                                                              |
| Rate limiting             | MongoDB fixed-window counters keyed by HMAC of IP/email; login, application, verification, recovery, invitation, and admin policies                                                                                                                                                                                                 |
| Enumeration               | Generic login/forgot/reset/application responses; dummy password verification for unknown emails; account-state errors only after a correct password                                                                                                                                                                                |
| Authorization             | Server-side role/permission map; page guards and API guards; ownership checks; middleware is not the authority                                                                                                                                                                                                                      |
| Administrator rules       | No public admin registration; CLI Super Admin bootstrap; invitation-only admin setup; no self-suspension/demotion; last Super Admin protected                                                                                                                                                                                       |

## Applicant privacy rules (ACCEPTED DESIGN)

- The registration form collects only full name, email, password, phone, gender (Male/Female), and an optional message. No date of birth, occupation, address, or other personal information.
- Date of birth is not collected, stored, validated, displayed, or tested. No age eligibility or guardian-consent rule exists (D-22).
- Gender, phone number, email, and the custom message are private applicant data.
- They must never appear in public APIs, public pages, another devotee's profile, aggregate analytics, audit metadata, or logs.
- Administrators see full values only through permission-gated, audited detail views. List views mask email and phone. Authorized administrators and moderator-profile staff may see all private invitation reports and contributor identities; ordinary devotees cannot see another contributor's identity.
- The authenticated owner may read their own application summary through the limited applicant route, never internal notes or reviewer-only information.
- Purpose and access policy are documented in the specification §17. No retention period is approved and no automatic purge job runs in Stage 2; retention/deletion remain deferred (D-10/D-19).

## Invitation-report privacy rules (ACCEPTED DESIGN)

- Administrators and authorized moderators can view all private invitation reports and contributor identities.
- Ordinary devotees never see other contributors' names, email addresses, profiles, or user IDs.
- Devotees see only approved aggregate campaign statistics and their own reports.
- Store `submittedByUserId` separately from `participatingDevoteeCount`.
- Do not collect individual invitee names, phone numbers, or email addresses by default.
- All sensitive administrative access and modifications are auditable.

Full detail, API contracts, and tests: [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md). Decision status: [`stage-2-decision-report.md`](stage-2-decision-report.md).

## Operating rules

- Never commit `.env.local`, database dumps, API keys, or anything under `.local/`.
- Never paste connection strings or keys into chats or issues; share them through a password manager.
- Review `git diff` for secrets before every commit.
- Google Maps: use a browser-restricted public key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) and a separate server key (`GOOGLE_MAPS_SERVER_API_KEY`) with API restrictions and billing alerts (roadmap 6.3–6.4). Neither is read by the code yet.
