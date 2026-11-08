# Stage 2 decision report — authentication, devotee applications, and administration

**Status: DECISIONS ACCEPTED — IMPLEMENTATION NOT AUTHORIZED.** The owner accepted the decisions below on 2026-11-05. Batch 0 still requires explicit approval after the final checklist is reviewed. No Stage 2 code is present on `main` or in repository history.

- Date: 2026-11-05 (supersedes the 2026-11-04 draft)
- Source of scope: [`Roadmap.md`](Roadmap.md) Phase 4; [`product-requirements.md`](product-requirements.md); [`decisions.md`](decisions.md) ADR-010 and ADR-014.
- Related specification: [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md).
- Registration fields are final: **full name, email, password, phone, gender (Male/Female), and optional custom message.** **Date of birth is not collected or stored, and no age eligibility check exists.**
- Retention/deletion policy remains explicitly deferred. No automatic applicant-PII purge runs in Stage 2.

## 1. Final decision register

| ID   | Decision                                                                  | Status                     | Final resolution                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Authentication library and ownership                                      | ACCEPTED                   | First-party authentication with opaque MongoDB-backed sessions. No Auth.js dependency.                                                                           |
| D-02 | Public application posture and registration mode                          | ACCEPTED                   | `REGISTRATION_MODE` accepts `applications` or `closed`; `closed` is the safe default; no mode grants devotee access. Public applications are enabled explicitly. |
| D-03 | Email verification and notification requirement                           | ACCEPTED                   | Email verification is required before approval; rejection is allowed before verification.                                                                        |
| D-04 | Primary credential method                                                 | ACCEPTED                   | Email + password only in Stage 2; OAuth and magic links deferred.                                                                                                |
| D-05 | Session strategy                                                          | ACCEPTED                   | Opaque database sessions, hashed at rest; no JWT session state.                                                                                                  |
| D-06 | Password hashing                                                          | ACCEPTED                   | Argon2id via `@node-rs/argon2`; Node `scrypt` fallback documented if native modules are unsupported.                                                             |
| D-07 | Account lifecycle                                                         | ACCEPTED                   | Pending verification, pending approval, active, rejected, suspended, invited, and reserved expired/deleted states; account deletion deferred.                    |
| D-08 | Transactional email provider and sender identity                          | ACCEPTED                   | Provider-agnostic adapter. Public registration stays disabled until a provider, verified sender domain, and tested delivery exist.                               |
| D-09 | First Super Admin bootstrap                                               | ACCEPTED                   | CLI-only `create-super-admin.js` with hidden password prompt; no default account.                                                                                |
| D-10 | Audit-log retention and visibility                                        | DEFERRED                   | Append-only, administrator-only audit log. No TTL or purge until a retention period is explicitly approved.                                                      |
| D-11 | Login identifier and display name                                         | ACCEPTED                   | Email is the login identifier; name is not public in Stage 2.                                                                                                    |
| D-12 | Password policy                                                           | ACCEPTED                   | Minimum 12, maximum 128 characters; no composition rules; no trimming or normalisation.                                                                          |
| D-13 | Role hierarchy                                                            | ACCEPTED                   | Visitor (anonymous), devotee, administrator, Super Admin. No coordinator role in Stage 2.                                                                        |
| D-14 | Session lifetime and rotation                                             | ACCEPTED                   | 7-day idle, 30-day absolute, new token on login. **One** effective TTL index on `expiresAt`; absolute expiry enforced at validation.                             |
| D-15 | Administrator self-protection                                             | ACCEPTED                   | No self-suspension/demotion/permission change; last active Super Admin protected; rejected attempts audited.                                                     |
| D-16 | Hosting, Atlas tier/region, Maps, population sources, leaderboard privacy | DEFERRED                   | Stage 3–7 decisions; no auth-schema impact.                                                                                                                      |
| D-17 | Admin/Moderator role modeling                                             | ACCEPTED                   | One stored `admin` role plus granular permissions. "Moderator" is a responsibility/permission profile, not a separate role.                                      |
| D-18 | Administrator invitation and password setup                               | ACCEPTED                   | Single-use email invitation, valid 7 days; invitee chooses their own password.                                                                                   |
| D-19 | Application/PII retention                                                 | ACCEPTED (policy deferred) | No automatic applicant-PII deletion or purge in Stage 2. Retention periods require explicit future approval.                                                     |
| D-20 | Reapplication after rejection                                             | ACCEPTED                   | No automatic reapplication. Super Admin may reopen explicitly with an audit record.                                                                              |
| D-21 | Phone format and verification                                             | ACCEPTED                   | Store E.164; no SMS verification initially. Phone is not a login identifier.                                                                                     |
| D-22 | Date of birth and age policy                                              | ACCEPTED                   | **Remove DOB completely.** Do not collect or store it; do not implement age eligibility checks.                                                                  |
| D-23 | Review/email-verification sequencing                                      | ACCEPTED                   | Review may reject at any time; approval requires a verified email.                                                                                               |
| D-24 | Super Admin recovery and multiple Super Admins                            | ACCEPTED                   | One Super Admin initially; documented and tested CLI recovery procedure; additional Super Admins deferred.                                                       |
| D-25 | Applicant status access                                                   | ACCEPTED                   | Limited applicant session for `/application-status` and the applicant's own summary only. No dashboard, reports, proposals, or devotee APIs.                     |
| D-26 | Data-subject access to own application fields                             | ACCEPTED                   | Authenticated applicants/devotees may read their own application summary; never internal notes or reviewer-only information.                                     |
| D-27 | Invitation-report contributor identity and read auditing                  | ACCEPTED                   | Authorized administrators and moderator-profile staff see all private reports and contributor identities; ordinary devotees see only aggregates/own reports.     |

**Deferred, not blocking Batch 0:** D-10 audit retention, D-19 applicant-PII retention periods, D-07 account deletion, and D-16 Stage 3–7 platform decisions. None may be implemented by invention.

## 2. Application and activation workflow

Public application submission and devotee activation are deliberately separate.

```text
Visitor submits six fields
        │
        ▼
user: pending_verification
application: pending
no session
        │
        │  single-use email verification (24 hours)
        ▼
user: pending_approval
application: pending
limited applicant session allowed
        │
        ├── administrator approves (verified email required)
        │        └── transaction: application approved + user active + audit
        │            └── all sessions revoked; user logs in fresh as devotee
        │
        └── administrator rejects (allowed before verification)
                 └── transaction: application rejected + user rejected
                     + sessions revoked + generic rejection email
```

- `pending_verification` cannot log in; the applicant must verify the email first.
- `pending_approval` and `rejected` applicants with verified emails may authenticate to a **limited applicant session** that can read only `/application-status` and `GET /api/account/application`. They cannot access the dashboard, reports, proposals, profile editing, password change, or any administrator API.
- `expired` is a reserved future state; no Stage 2 login eligibility or automatic expiry behaviour is authorized.
- `suspended`, `invited`, and `deleted` accounts cannot log in.
- Active devotees receive a full session and can use devotee features.
- Approval revokes the limited session. Rejection revokes sessions; the applicant may log in again to the limited summary view if the account remains email-verified.
- A limited session is identified by `session.scope = "application"`; full sessions use `scope = "full"`. Every protected API checks scope and ownership server-side. `scope = "full"` is necessary where required but never sufficient by itself; devotee features require an active devotee account and appropriate role, administrator features require the admin role and specific granted permissions, and Super Admin capabilities require explicit Super Admin authorization.

### Submission

The final form collects exactly:

1. Full name — required.
2. Email address — required.
3. Password — required.
4. Phone number — required.
5. Gender — required, `Male` or `Female`.
6. Custom message — optional.

No date of birth, occupation, address, government identifier, photograph, or social-media handle is collected.

The server validates a strict schema, normalises email and phone, hashes the password with Argon2id, creates the user as `pending_verification`, creates a `pending` application with an immutable applicant snapshot, creates a 24-hour verification token, writes an audit record without PII, and sends the verification email.

The HTTP response is always a generic `202 { "status": "accepted" }` for a syntactically valid request. It never discloses whether the email already exists and never creates a session. Duplicate handling covers new, pending-verification, pending-approval, active, rejected/expired, and suspended/invited accounts without leaking account state.

### Approval and rejection

- Approval requires `application:review:all` and a verified email.
- Approval performs a conditional transition from `pending` to `approved`; concurrent decisions return `409 APPLICATION_ALREADY_DECIDED`.
- One transaction updates the application, the user status, and the audit record, so authorization and review history cannot disagree.
- Rejection is possible for any pending application, including an unverified one.
- Rejection updates both records, revokes sessions, and sends a generic notice: the application was not approved at this time. It contains no internal note, reviewer identity, reason code, or hint about what to change.
- Internal notes are append-only, administrator-only, and never sent to the applicant or included in login errors.
- Reapplication is **not automatic**. A Super Admin may reopen an application only through an explicitly audited operation.
- A failed decision email does not roll back the decision. Notification status is recorded and can be retried; the UI must not claim false success.

### Registration modes and email gate

`REGISTRATION_MODE` has two values:

- `applications` — accept applications; every one starts pending and receives no devotee access.
- `closed` — return `403 REGISTRATION_CLOSED`; existing applications can still be reviewed.

There is no `open` mode that grants immediate access. Production defaults to `closed`.

Public applications remain disabled until all of the following are verified:

1. A transactional email provider is selected and configured.
2. The sender domain is verified (SPF, DKIM, DMARC as applicable).
3. Verification, approval, rejection, password recovery, and administrator-invitation delivery have been tested.
4. Review staffing and the application-review runbook are ready.

Retention/deletion is not a launch gate in Stage 2 because no automatic purge job exists. Applicant data remains retained until a future policy is explicitly approved; that must be recorded as a known limitation, not hidden behind an unapproved retention period.

## 3. Roles, permissions, and applicant access

Stored roles are `devotee`, `admin`, and `super_admin`. `visitor` is the absence of a session. The limited applicant session is not a role; it is a session scope tied to an applicant with a verified email.

| Capability                               | Visitor | Applicant (limited) | Devotee |            Administrator            |   Super Admin    |
| ---------------------------------------- | :-----: | :-----------------: | :-----: | :---------------------------------: | :--------------: |
| Public pages and aggregate statistics    |   yes   |         yes         |   yes   |                 yes                 |       yes        |
| Submit an application                    |   yes   |         no          |   no    |                 no                  |        no        |
| Limited application status / own summary |   no    |         yes         |   yes   |                 no                  |        no        |
| Full devotee features                    |   no    |         no          |   yes   |           only if active            |  only if active  |
| Review applications                      |   no    |         no          |   no    |      `application:review:all`       |       yes        |
| Read applicant detail / internal notes   |   no    |         no          |   no    | `application:read:all` / note grant |       yes        |
| Manage devotees, suspend/reactivate      |   no    |         no          |   no    |       `devotee:status:update`       |       yes        |
| See all reports + contributor identities |   no    |         no          |   no    |    `invitation-report:read:all`     |       yes        |
| Read audit history                       |   no    |         no          |   no    |          `audit:read:all`           |       yes        |
| Create/manage administrators             |   no    |         no          |   no    |                 no                  |       yes        |
| Change administrator permissions         |   no    |         no          |   no    |                 no                  |       yes        |
| Change Super Admin privileges            |   no    |         no          |   no    |                 no                  | owner-controlled |
| Critical security settings               |   no    |         no          |   no    |                 no                  | deployment-level |

### Permission model

Assignable administrator permissions are a closed allow-list:

```text
application:read:all
application:review:all
application:note:write
devotee:read:all
devotee:status:update
invitation-report:read:all
audit:read:all
```

The default administrator bundle is application read/review/note, devotee read, and invitation-report read. The Super Admin may add devotee-status and audit-read grants, and may remove any grant.

Super Admin capabilities are **not assignable permission strings**. They are enforced by `requireSuperAdmin()`:

```text
administrator:create
administrator:manage
administrator:permissions:update
security:settings:update
super-admin:grant
```

### One administrator role

There is one stored `admin` role. "Moderator" is a responsibility/permission profile: an administrator whose grants focus on application review and invitation reports. The server never branches on the label "moderator"; it checks `adminPermissions`.

### Super Admin protections

- The Super Admin role cannot be assigned through a public API, registration, or ordinary permission update.
- An administrator cannot create another administrator, change permissions, or change Super Admin privileges.
- No administrator can self-promote, self-demote, self-suspend, or change their own permissions.
- The last active Super Admin cannot be suspended, demoted, or deleted.
- Super Admin-only capabilities are checked against the database user, not a JWT claim, header, or client value.
- Critical security settings are deployment environment controls in Stage 2, not an in-app settings screen. An in-app settings surface would require a separate model, API, UI, re-authentication flow, and audit design.

## 4. Data model and privacy boundary

Batch 0 proposes seven models: `user`, `devotee-application`, `devotee-application-note`, `session`, `auth-token`, `rate-limit`, and `audit-log`.

### `devotee-application`

The final application snapshot contains:

- `applicantName`
- `applicantEmail`
- `applicantPhone`
- `gender` (`male` or `female`)
- `message` (optional)
- status, reviewer, timestamps, and the `isCurrent` flag

**There is no `dateOfBirth` field.** No application, account, audit, analytics, report, UI, API, validation, or test may collect or derive DOB.

### `user`

The account contains identity, authentication, role, status, and lifecycle metadata. Phone, gender, and the custom message are **not** stored on `users`; they live only on the application record.

### PII rules

| Data                 | Classification          | Who may read                                                            |
| -------------------- | ----------------------- | ----------------------------------------------------------------------- |
| Name                 | Private account data    | Self; authorized administrators; report admins for contributor identity |
| Email                | Private account data    | Self; authorized administrators; report admins for contributor identity |
| Phone                | Private applicant data  | Self; administrators with `application:read:all`                        |
| Gender               | Private applicant data  | Self; administrators with `application:read:all`                        |
| Custom message       | Private applicant data  | Self; administrators with `application:read:all`                        |
| Internal notes       | Confidential admin data | Administrators with the applicable note/read grant                      |
| Contributor identity | Private                 | Report admins; the contributor for their own report                     |
| Password/tokens      | Secret                  | No API, UI, or log                                                      |

- Phone, gender, email, and custom messages never appear in public APIs, public pages, another devotee's profile, aggregate analytics, logs, or audit metadata.
- Admin list views mask email and phone; full contact data requires a permission-gated, audited detail view.
- The applicant's own summary is private and contains no internal notes or reviewer identity.
- No DOB is collected, so there is no age-based eligibility check or age-related rejection path.

### Invitation-report privacy

- `submittedByUserId` is stored separately from `participatingDevoteeCount`.
- There is no field for invitee names, phone numbers, or email addresses by default.
- Authorized administrators, including moderator-profile staff with `invitation-report:read:all`, see all private reports and contributor name/email.
- Ordinary devotees see only aggregate statistics and their own reports; never another contributor's identity.
- Every administrative report detail view and every report change is audited.

## 5. Session design

- Opaque 32-byte token, base64url; only the SHA-256 hash is stored.
- Cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`; production uses `Secure` and `__Host-utsav_session`.
- Idle lifetime: 7 days. Absolute lifetime: 30 days.
- `expiresAt` is the **effective** expiry. On activity, set `expiresAt = min(now + 7 days, absoluteExpiresAt)`.
- `absoluteExpiresAt` is not TTL-indexed.
- There is **one TTL index** on `expiresAt`. Session validation independently checks both `expiresAt > now` and `absoluteExpiresAt > now`.
- `lastSeenAt` and `expiresAt` update at most once every 5 minutes.
- A new token is generated on every login; logout, password reset, suspension, approval, rejection, and role/permission changes revoke sessions.
- `session.scope` is `full` or `application`. A limited applicant session cannot access devotee or administrator routes.
- Verified `pending_approval` and `rejected` applicants can hold only an `application`-scope session. `pending_verification`, `expired`, `suspended`, `invited`, and `deleted` accounts cannot hold a session.

## 6. Email and administrator invitations

- Provider-agnostic adapter with a development mailbox and a production HTTP/SMTP transport selected by environment variables.
- No real email in tests; development writes to a git-ignored `.local/mail/` directory without printing tokens.
- Templates: verification, application under review, approval, generic rejection, password reset, administrator invitation.
- Administrator invitation tokens are single-use, hashed at rest, expire after 7 days, and are delivered by email. No administrator password is generated, displayed, or emailed.
- Public applications remain closed until verification, approval/rejection, recovery, and invitation delivery are tested.

## 7. Retention, deletion, and audit

- **No automatic applicant-PII deletion or purge job runs in Stage 2.**
- Retention periods are not approved. No TTL index is created on applicant PII or `auditLogs`.
- The `expired` user/application state is reserved for a future approved policy; no Stage 2 job sets it automatically.
- Account deletion is deferred. No self-service deletion endpoint exists.
- Audit logs are append-only, administrator-only, and contain IDs/stable codes rather than applicant PII.
- A future retention policy must be explicitly approved before any purge, anonymisation, or deletion job is implemented.

## 8. Batch 0 approval checklist

Batch 0 begins only after explicit owner approval. It is a foundation batch, not a UI batch.

### Scope

- [ ] Confirm the accepted decisions remain recorded in `docs/decisions.md` and move ADR-014 from accepted design to implementation status only when implementation begins.
- [ ] Add auth/application/email variables to `.env.example` and `api/lib/env/env.js`. Add no retention or purge variables.
- [ ] Add seven models with indexes and safe projections: `user`, `session`, `auth-token`, `rate-limit`, `audit-log`, `devotee-application`, `devotee-application-note`.
- [ ] Add password, token, session-cookie (with `full`/`application` scope), permission, application-state, CSRF, rate-limit, validation, and audit primitives with unit tests.
- [ ] Add `scripts/create-super-admin.js` (including documented recovery mode) and `scripts/sync-indexes.js`.
- [ ] Add integration tests for model constraints/indexes, application-state transitions, permission grants, the limited applicant session, and Super Admin bootstrap/recovery.

### Excluded from Batch 0

- No login UI, application form UI, administrator UI, or public auth Route Handlers.
- No `create-user.js` or `create-admin.js` shortcut that bypasses the application workflow.
- No collection in the development or production database.
- No real email delivery.
- No automatic retention, expiry, or purge job.

### Acceptance gate

- [ ] `users.email` is unique; duplicate inserts are handled safely.
- [ ] One current application per user is enforced by a partial unique index.
- [ ] Invalid application transitions are rejected.
- [ ] Approval requires a verified email.
- [ ] `passwordHash`, `tokenHash`, and session hashes are `select: false` and absent from every safe projection.
- [ ] Applicant PII is absent from the user model, public projections, and audit metadata.
- [ ] No DOB field exists in any model, schema, payload, test, or projection.
- [ ] The permission map distinguishes devotee, granted administrator, and reserved Super Admin capabilities.
- [ ] Unknown and reserved permission strings are rejected; ordinary permission updates cannot grant Super Admin capabilities.
- [ ] `create-super-admin.js` creates exactly one Super Admin with a hidden password prompt and an audit record; normal mode refuses a second active Super Admin.
- [ ] The documented CLI recovery procedure is tested against `utsav_connect_test` and does not silently create a second active Super Admin.
- [ ] `sync-indexes.js` creates exactly one session TTL index on `expiresAt`, no TTL index on `absoluteExpiresAt`, and the expected other indexes against `utsav_connect_test`.
- [ ] An `application`-scope session can read only `/application-status` and `GET /api/account/application`.
- [ ] No Route Handler, login UI, application UI, or admin UI is added.
- [ ] `make check`, `make ci`, and `make build` pass; the JavaScript-only guard passes.
- [ ] No real email is sent; tests use the development mailbox or a stub.
- [ ] No production, development, or shared database is modified outside `utsav_connect_test`.

## 9. Deferred policy items

These are **not** approved by the Stage 2 design and must not be implemented by assumption:

1. **D-10:** audit-log retention period; no TTL or purge until approved.
2. **D-19:** applicant-PII retention periods; no automatic deletion/purge in Stage 2.
3. **D-07:** account deletion/anonymisation policy.
4. **D-16:** hosting, production Atlas tier/region/backup, Google Maps, population sources, leaderboard privacy.

## 10. Confirmation required before Batch 0

No additional owner confirmation is required for the decisions currently approved for Stage 2. Explicitly deferred decisions and sub-components remain deferred and are excluded from implementation authorization.

## 11. What is explicitly not authorized

This report does **not** authorize:

- writing authentication, application, administrator, or dashboard code;
- adding dependencies;
- creating collections in development or production;
- sending real email;
- creating an administrator account;
- deploying or pushing Stage 2 work;
- implementing automatic retention, expiry, or deletion;
- implementing invitation reports or any Stage 3–5 feature.

Those actions require separate explicit approval. The next implementation step remains Batch 0 only.
