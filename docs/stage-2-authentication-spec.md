# Stage 2 authentication, devotee application, and administration specification (ACCEPTED DESIGN)

**Status: ACCEPTED DESIGN — implementation not authorized.** The owner accepted the decisions recorded in [`stage-2-decision-report.md`](stage-2-decision-report.md) on 2026-11-05. This document records the accepted design. No authentication code, model, route, dependency, collection, or environment variable described here is present on `main` or in repository history. Batch 0 requires explicit owner approval.

- Date: 2026-11-05
- Scope: Roadmap Stage 2 / Phase 4 — authentication, devotee applications, approval, roles, protected routes, administration, privacy, and account lifecycle.
- Decision inputs: [`stage-2-decision-report.md`](stage-2-decision-report.md), [`decisions.md`](decisions.md) ADR-010 and ADR-014.
- Language constraint: **JavaScript and JSX only.** No `.ts`, `.tsx`, `tsconfig*.json`, or `next-env.d.ts` may be introduced.
- Supersedes: the 2026-11-04 draft of this document, which assumed open registration could create an immediately usable devotee account and collected a date of birth. Both assumptions are withdrawn.
- Registration fields are final: **full name, email, password, phone, gender (Male/Female), and optional custom message.** Date of birth is not collected, stored, validated, displayed, or tested (D-22).
- Applicant access is limited: a verified applicant whose application is `pending_approval` or `rejected` may hold an `application`-scope session that can read only their own status/summary. The reserved `expired` state has no Stage 2 login eligibility. It is not devotee activation (D-25/D-26).
- No automatic applicant-PII purge or application-expiry job runs in Stage 2 (D-19). Retention periods and account deletion remain deferred.

## 1. Scope

### In scope

- Public devotee application with the six approved fields only.
- Mandatory review: every application starts `pending`; no public registration path grants devotee access.
- Email verification and approval before devotee access.
- Email + password login, logout, opaque sessions, password change and recovery.
- A limited applicant session for a verified applicant whose application is `pending_approval` or `rejected` to read only their own application status and summary. The reserved `expired` state is not eligible for a session.
- Four-level access hierarchy: visitor (anonymous), devotee, administrator, and the Super Admin owner tier.
- Granular administrator permissions assigned by the Super Admin.
- Server-side authorization for pages, Route Handlers, and data projections.
- Devotee application review and devotee management dashboard at `/admin/devotees`.
- Account suspension, reactivation, and application rejection. The `expired` state is reserved; no automatic expiry job runs in Stage 2.
- Invitation-report privacy rules and permission boundaries (the reporting feature itself is Stage 4).
- Audit logging for authentication, application review, administrator management, and sensitive access.
- Rate limiting for sensitive endpoints.
- MongoDB models and indexes for the auth, application, and administration workflows.
- Unit, integration, security, and browser test plans.
- Documentation and environment-variable updates.

### Out of scope

- OAuth, magic links, passkeys, MFA, and SSO.
- Email-address change.
- Self-service account deletion or anonymisation (deferred, D-07).
- Invitation codes for registration.
- Coordinator role and area assignments.
- Google Maps, areas, proposals, reports, population, and leaderboard implementation.
- Production deployment, domain, TLS, and email-domain authentication (Stage 7).
- Public devotee profiles or a public user directory.
- SMS verification of phone numbers.

### Non-negotiable product rules

1. A visitor who submits the registration form becomes an **applicant**, never an active devotee.
2. The application is stored with status `pending`.
3. Only an authorised administrator can approve or reject it.
4. A rejected applicant receives a generic notice; internal notes are never disclosed.
5. Pending, rejected, expired, and suspended accounts cannot use devotee APIs. A verified applicant whose application is `pending_approval` or `rejected` may use an `application`-scope session for their own status/summary only. The reserved `expired` state has no Stage 2 login eligibility.
6. Gender, phone number, email address, and the custom message are private applicant data. They are never returned by public APIs, exposed on devotee profiles, shown on public pages, or included in aggregate analytics. Date of birth is not collected at all.
7. Administrator creation and Super Admin privilege changes are Super Admin-only and are re-checked server-side. Critical security settings are deployment controls, not an in-app permission.

## 2. Architecture

### 2.1 Principles

1. **Server-authoritative.** The UI may hide controls, but every protected page and API re-checks the session, account state, role, and permission on the server.
2. **Application-first.** Public registration creates a pending application; it does not create a usable devotee session.
3. **Opaque sessions.** The browser holds a random token; the database holds only its hash. No user data is encoded in the cookie.
4. **Least privilege.** Devotee access is granted only after approval. Administrator access is an explicit, audited grant. The Super Admin tier cannot be self-assigned.
5. **Revocable by default.** Logout, suspension, rejection, password reset, and role or permission change revoke sessions immediately. Approval revokes the limited applicant session.
6. **Minimise and compartmentalise personal data.** Applicant PII lives in the application record, not in public projections, reports, logs, or analytics. Only the applicant and authorised administrators can read it. Date of birth is not collected.
7. **Fail safely.** Generic client errors; detailed server logs; no secrets or PII in responses, audit records, or logs.
8. **One envelope.** Every Route Handler uses `api/lib/http/responses.js`.

### 2.2 Module layout (planned)

```text
app/
├── login/page.jsx
├── register/page.jsx                 # devotee application form
├── verify-email/page.jsx
├── forgot-password/page.jsx
├── reset-password/page.jsx
├── application-status/page.jsx       # limited applicant or devotee: own status/summary
├── account/
│   ├── layout.jsx                    # requireActiveUser() — full sessions only
│   ├── page.jsx                      # own profile
│   └── password/page.jsx
├── dashboard/
│   └── layout.jsx                    # requireApprovedDevotee()
├── admin/
│   ├── layout.jsx                    # requireAdministrator()
│   ├── page.jsx
│   ├── devotees/
│   │   ├── page.jsx                  # overview + application/devotee tabs
│   │   ├── applications/[id]/page.jsx
│   │   └── [id]/page.jsx
│   ├── administrators/page.jsx       # Super Admin only
│   ├── invitation-reports/page.jsx   # permission-gated
│   └── audit/page.jsx
└── api/
    ├── auth/
    │   ├── register/route.js
    │   ├── login/route.js
    │   ├── logout/route.js
    │   ├── session/route.js
    │   ├── verify-email/route.js
    │   ├── resend-verification/route.js
    │   ├── forgot-password/route.js
    │   ├── reset-password/route.js
    │   └── accept-admin-invitation/route.js
    ├── account/
    │   ├── route.js
    │   ├── profile/route.js
    │   ├── application/route.js
    │   └── password/route.js
    └── admin/
        ├── devotees/overview/route.js
        ├── devotee-applications/route.js
        ├── devotee-applications/[id]/route.js
        ├── devotee-applications/[id]/approve/route.js
        ├── devotee-applications/[id]/reject/route.js
        ├── devotee-applications/[id]/resend-notification/route.js
        ├── devotee-applications/[id]/notes/route.js
        ├── devotees/route.js
        ├── devotees/[id]/route.js
        ├── devotees/[id]/status/route.js
        ├── administrators/route.js
        ├── administrators/[id]/permissions/route.js
        ├── administrators/[id]/status/route.js
        ├── administrators/[id]/resend-invitation/route.js
        ├── invitation-reports/route.js
        ├── invitation-reports/[id]/route.js
        └── audit-logs/route.js

api/
├── lib/
│   ├── auth/
│   │   ├── password.js               # hash, verify, needsRehash
│   │   ├── tokens.js                 # random token, hash, verify shape
│   │   ├── session.js                # create, read, revoke, cookie helpers
│   │   ├── permissions.js            # role/permission grants and checks
│   │   ├── application-state.js      # allowed transitions and guards
│   │   ├── rate-limit.js             # MongoDB fixed-window counters
│   │   └── csrf.js                   # Origin / content-type checks
│   ├── email/
│   │   ├── mailer.js                 # provider-agnostic interface
│   │   ├── dev-mailbox.js            # writes to .local/mail/
│   │   └── templates.js
│   └── http/handler.js               # withApiHandler wrapper
├── models/
│   ├── user.js
│   ├── session.js
│   ├── auth-token.js
│   ├── rate-limit.js
│   ├── audit-log.js
│   ├── devotee-application.js
│   └── devotee-application-note.js
└── services/
    ├── auth-service.js
    ├── account-service.js
    ├── application-service.js
    ├── devotee-admin-service.js
    └── administrator-service.js

ui/
├── components/auth/                  # AuthForm, PasswordField, FieldError
├── components/account/               # ProfileForm, PasswordForm, ApplicationSummary
├── components/admin/                 # OverviewCards, ApplicationTable, ApplicationDetail,
│                                     # InternalNotesPanel, ApproveDialog, RejectDialog,
│                                     # DevoteeTable, SuspendDialog, PermissionEditor, AuditTable
└── lib/auth-client.js                # fetch wrapper for auth endpoints

middleware.js                         # optional cookie-presence redirect only
scripts/
├── create-super-admin.js
└── sync-indexes.js
```

The exact file names can be adjusted during implementation, but the layer boundaries must not be: routing in `app/`, presentation in `ui/`, server-only domain code in `api/`.

### 2.3 Request flow — application submission

```text
POST /api/auth/register
  └─ app/api/auth/register/route.js
       └─ withApiHandler({ schema: applicationSchema, rateLimit: "register" })
            ├─ assertSameOrigin(request)
            ├─ parse + validate JSON (Zod, strict)
            ├─ applicationService.submitApplication({ fields, requestMeta })
            │    ├─ normalise email and phone
            │    ├─ reject duplicate account without revealing it
            │    ├─ hash password (Argon2id)
            │    ├─ create user (status: pending_verification, role: devotee)
            │    ├─ create devoteeApplication (status: pending)
            │    ├─ create email-verification token (24 h)
            │    ├─ write audit event (no PII)
            │    └─ enqueue verification email
            └─ jsonAccepted({ status: "accepted" }) + no session
```

### 2.4 Request flow — approval

```text
POST /api/admin/devotee-applications/:id/approve
  └─ withApiHandler({ auth: "required", permission: "application:review:all" })
       ├─ load application + user
       ├─ assert application.status === "pending"
       ├─ assert user.emailVerifiedAt is set
       ├─ transaction:
       │    ├─ application.status = "approved", reviewer, reviewedAt
       │    ├─ user.status = "active", approvedAt
       │    └─ auditLog("admin.application_approved")
       ├─ send approval email (failure recorded, decision not rolled back)
       └─ jsonSuccess({ application, user: safeUser })
```

### 2.5 Request flow — protected API

```text
GET /api/account
  └─ withApiHandler({ auth: "required", sessionScope: "full", account: "active" })
       ├─ read __Host-utsav_session cookie
       ├─ hash token, find session (not revoked, not expired, absolute limit)
       ├─ load user, check status === "active"
       ├─ check session.scope === "full"
       ├─ check emailVerifiedAt and application approval for devotees
       ├─ throttled lastSeenAt update
       ├─ handler({ user, session })
       └─ jsonSuccess(safeUser)
```

### 2.6 Request flow — protected page

```text
/admin/devotees → app/admin/layout.jsx
  └─ requireAdministrator()  (server component)
       ├─ read cookie via next/headers cookies()
       ├─ validate session + user
       ├─ require role admin or super_admin and status active
       ├─ no session → redirect("/login?next=/admin/devotees")
       ├─ authenticated devotee → 403 page
       └─ suspended/invited → redirect("/login?reason=unavailable")
```

`middleware.js` may perform a cheap cookie-presence redirect for `/dashboard`, `/account`, and `/admin`, but it must not be the authorization boundary. It cannot query MongoDB safely in the Edge runtime, and a forged cookie must still fail in the server layout and API.

## 3. Roles, permissions, and ownership

### 3.1 Role model

| Role                | Definition                                              | Stage 2 capabilities                                                                                                                                        |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor             | No authenticated session                                | Public pages, public aggregate statistics, health endpoint, login, application form, recovery pages                                                         |
| Applicant (limited) | Verified applicant with `session.scope = "application"` | Own application status and own application summary only. No dashboard, reports, proposals, profile editing, or password change.                             |
| Devotee             | Approved application + active account                   | Everything a visitor can do, plus own profile, own password, own session, own application summary, own reports; later own proposals                         |
| Administrator       | Administrative account created by a Super Admin         | Everything a devotee can do where applicable, plus permission-granted application review, devotee management, invitation-report access, audit access        |
| Super Admin         | Owner-level account created by CLI bootstrap            | Full platform authority; manages administrator accounts and grants permissions; cannot be self-demoted. Critical security settings are deployment controls. |

`visitor` is not stored on a user document. It is the absence of a valid session. `applicant` is not a stored role either: it is the `application` scope on a session for a verified user whose application is `pending` or `rejected`. The reserved `expired` state has no Stage 2 login eligibility. `coordinator` is not implemented in Stage 2.

**Admin/Moderator is one administrative tier, not two stored roles.** The UI may describe an administrator with review-only grants as a "Moderator"; the database stores `role: "admin"` plus `adminPermissions`. There is no separate stored moderator role (D-17).

### 3.2 Permission constants

Permissions are strings in the form `resource:action[:scope]`:

```text
account:read:self
account:update:self
account:password:update:self
application:read:self
application:read:all
application:review:all
application:note:write
devotee:read:all
devotee:status:update
invitation-report:read:all
audit:read:all
```

Reserved Super Admin capabilities are **not** assignable permission strings. They are enforced by `requireSuperAdmin()`:

```text
administrator:create
administrator:manage
administrator:permissions:update
security:settings:update
super-admin:grant
```

Defining later-stage permissions now avoids ad-hoc checks, but they must not be granted until the feature exists: `report:create`, `report:read:self`, `proposal:create`, `proposal:update:self`, `area:manage`, `population:manage`, `report:moderate`.

### 3.3 Role → permission matrix

| Permission                     | Visitor | Applicant (limited) | Devotee | Administrator   | Super Admin      |
| ------------------------------ | ------- | ------------------- | ------- | --------------- | ---------------- |
| `account:read:self`            | no      | status/summary only | yes     | yes             | yes              |
| `account:update:self`          | no      | no                  | yes     | yes             | yes              |
| `account:password:update:self` | no      | no                  | yes     | yes             | yes              |
| `application:read:self`        | no      | yes                 | yes     | yes             | yes              |
| `application:read:all`         | no      | no                  | no      | only if granted | yes              |
| `application:review:all`       | no      | no                  | no      | only if granted | yes              |
| `application:note:write`       | no      | no                  | no      | only if granted | yes              |
| `devotee:read:all`             | no      | no                  | no      | only if granted | yes              |
| `devotee:status:update`        | no      | no                  | no      | only if granted | yes              |
| `invitation-report:read:all`   | no      | no                  | no      | only if granted | yes              |
| `audit:read:all`               | no      | no                  | no      | only if granted | yes              |
| Manage administrators          | no      | no                  | no      | no              | yes              |
| Change Super Admin privileges  | no      | no                  | no      | no              | owner/CLI only   |
| Critical security settings     | no      | no                  | no      | no              | deployment-level |

### 3.4 Default administrator bundle

When a Super Admin creates an administrator, the default grants are:

```text
application:read:all
application:review:all
application:note:write
devotee:read:all
invitation-report:read:all
```

The Super Admin may add `devotee:status:update` and `audit:read:all`. The Super Admin may remove any grant. The default bundle reflects the product requirement that administrators review applications and access private invitation reports; it does not include administrator management or security settings.

### 3.5 Ownership rules

- `account:*:self` and `application:read:self` always derive the user ID from the session, never from the URL or body.
- A devotee may read only their own application and own invitation reports.
- Administrative endpoints may read or change another user only through `/api/admin/**` routes and only with the required role/permission.
- A devotee must never be able to change a request to another user's ID and succeed. This is tested explicitly.
- The client never supplies `role`, `adminPermissions`, `status`, `applicationStatus`, `reviewedByUserId`, or `submittedByUserId` on a create or update. Those values are derived server-side.
- Super Admin endpoints never accept `role: "super_admin"` from an administrator request. Promotion to Super Admin is a separate, owner-controlled operation (D-24).

## 4. MongoDB data model

All models use Mongoose 9, `timestamps: true`, explicit collection names, and `strict: "throw"` where practical. `passwordHash` and token hashes use `select: false`. No model exposes a raw document directly to a Route Handler; services return safe projections.

### 4.1 `users`

The account record contains identity, authentication, role, and lifecycle state. Applicant PII (`gender`, `phone`, `message`) is deliberately **not** stored here; it lives in `devoteeApplications`. Date of birth is not stored anywhere.

| Field               | Type          | Rules / notes                                                                                                   |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `_id`               | ObjectId      | Primary key                                                                                                     |
| `email`             | String        | Required, unique, trimmed, lowercased for lookup; max 254; private                                              |
| `name`              | String        | Required, 2–80 characters, trimmed, control characters rejected; not public in Stage 2                          |
| `passwordHash`      | String / null | Required for active/invited-complete accounts; `select: false`; null for an unaccepted administrator invitation |
| `passwordAlgorithm` | String        | e.g. `argon2id`; `select: false`; used for rehash decisions                                                     |
| `role`              | String enum   | `devotee`, `admin`, `super_admin`; default `devotee`                                                            |
| `status`            | String enum   | `pending_verification`, `pending_approval`, `active`, `rejected`, `expired`, `suspended`, `invited`, `deleted`  |
| `adminPermissions`  | [String]      | Only for role `admin`; default `[]`; validated against assignable permissions; Super Admin implicit all         |
| `emailVerifiedAt`   | Date / null   | Set on verification, Super Admin creation, or accepted administrator invitation                                 |
| `applicationId`     | ObjectId/null | Current `DevoteeApplication`; null for administrators                                                           |
| `approvedAt`        | Date / null   | Set when an application is approved and the account becomes active                                              |
| `rejectedAt`        | Date / null   | Set when an application is rejected                                                                             |
| `expiredAt`         | Date / null   | Reserved; no Stage 2 job sets it. A future approved policy may set it.                                          |
| `invitedByUserId`   | ObjectId/null | Super Admin who created an administrator invitation                                                             |
| `invitedAt`         | Date / null   | Administrator invitation timestamp                                                                              |
| `createdByUserId`   | ObjectId/null | CLI/system or Super Admin who created the account                                                               |
| `failedLoginCount`  | Number        | Default 0; reset on successful login                                                                            |
| `lockedUntil`       | Date / null   | Temporary lock after repeated failures                                                                          |
| `lastLoginAt`       | Date / null   | Updated on successful login                                                                                     |
| `passwordChangedAt` | Date / null   | Set on password change/reset/invitation acceptance                                                              |
| `suspendedAt`       | Date / null   | Set by an authorised administrator                                                                              |
| `suspensionReason`  | String / null | 3–500 characters; administrator-only visibility; never returned to the suspended devotee                        |
| `deletedAt`         | Date / null   | Reserved for the deferred soft-delete flow                                                                      |
| `createdAt`         | Date          | Mongoose timestamp                                                                                              |
| `updatedAt`         | Date          | Mongoose timestamp                                                                                              |

**Status invariants.**

| Status                 | Meaning                                                            | Devotee access | Session            |
| ---------------------- | ------------------------------------------------------------------ | -------------- | ------------------ |
| `pending_verification` | Application exists, email not verified                             | no             | none               |
| `pending_approval`     | Email verified, application awaiting review                        | no             | `application` only |
| `active`               | Email verified and application approved, or active administrator   | yes            | `full`             |
| `rejected`             | Application rejected; generic notice sent                          | no             | `application` only |
| `expired`              | Reserved; no Stage 2 job sets it; no Stage 2 login eligibility     | no             | none               |
| `suspended`            | Previously active account suspended by an authorised administrator | no             | none               |
| `invited`              | Administrator invitation issued; password not yet set              | no             | none               |
| `deleted`              | Reserved; not set in Stage 2                                       | no             | none               |

A limited `application` session is issued only when `emailVerifiedAt` is set and the account is `pending_approval` or `rejected`. It can read the applicant's own status/summary and nothing else. `pending_verification`, `expired`, `suspended`, `invited`, and `deleted` accounts receive no session.

**Indexes.**

```text
{ email: 1 } unique
{ role: 1, status: 1 }
{ status: 1, createdAt: -1 }
{ role: 1, createdAt: -1 }
{ applicationId: 1 }
{ createdAt: -1 }
```

**Index rationale.** `email` is the login lookup and must be unique. `role + status` supports administrator and devotee filters. `status + createdAt` supports the review and lifecycle queues. The application reference supports profile inspection without scanning applications. No index on `name` here; application search uses the snapshot fields in `devoteeApplications`.

### 4.2 `devoteeApplications`

One document per application attempt. The current application is flagged `isCurrent: true`; a partial unique index prevents two current applications for one user. The document is the authoritative review record and the only home of applicant PII.

| Field                        | Type          | Rules / notes                                                           |
| ---------------------------- | ------------- | ----------------------------------------------------------------------- |
| `_id`                        | ObjectId      | Primary key                                                             |
| `userId`                     | ObjectId      | Required, ref `User`, indexed                                           |
| `isCurrent`                  | Boolean       | Default true; partial unique index with `userId`                        |
| `status`                     | String enum   | `pending`, `approved`, `rejected`, `expired`; default `pending`         |
| `applicantName`              | String        | Immutable snapshot of the submitted full name; 2–80 characters          |
| `applicantNameSearch`        | String        | Lowercased, whitespace-normalised copy for prefix search                |
| `applicantEmail`             | String        | Immutable snapshot of the submitted email; lowercased                   |
| `applicantPhone`             | String        | Submitted phone in display form, normalised to E.164 where possible     |
| `applicantPhoneNormalized`   | String        | Digits only (with country code) for search; never exposed publicly      |
| `gender`                     | String enum   | `male` or `female` only, per the approved form                          |
| `message`                    | String / null | Optional; max 2,000 characters; plain text; control characters rejected |
| `submittedAt`                | Date          | Set on creation; default now                                            |
| `reviewedAt`                 | Date / null   | Set on approval or rejection                                            |
| `reviewedByUserId`           | ObjectId/null | Authorised administrator who decided                                    |
| `decisionNotificationStatus` | String enum   | `pending`, `sent`, `failed`; default `pending`; operational only        |
| `decisionNotificationSentAt` | Date / null   | Set after the approval/rejection email is accepted by the transport     |
| `expiredAt`                  | Date / null   | Reserved; no Stage 2 job sets it                                        |
| `createdAt`                  | Date          | Mongoose timestamp                                                      |
| `updatedAt`                  | Date          | Mongoose timestamp                                                      |

**Indexes.**

```text
{ userId: 1 } unique partial: { isCurrent: true }
{ status: 1, submittedAt: -1, _id: -1 }
{ submittedAt: -1, _id: -1 }
{ applicantEmail: 1 }
{ applicantPhoneNormalized: 1 }
{ applicantNameSearch: 1 }
{ reviewedByUserId: 1, reviewedAt: -1 }
```

**Notes.**

- The application snapshot is immutable after submission. If an applicant later changes their name or email, the account record changes, but the historical application keeps what was reviewed.
- `applicantEmail` is not unique in this collection. Uniqueness is enforced on `users.email`; the snapshot exists for search and audit.
- `applicantPhoneNormalized` is indexed but **not unique**; families may share a phone.
- Gender, phone, and message are never copied into `users`, public projections, reports, or analytics. No date-of-birth field exists.

### 4.3 `devoteeApplicationNotes`

Append-only internal notes. Notes are administrator-only, never sent to the applicant, and never included in a rejection notice.

| Field           | Type     | Rules / notes                                     |
| --------------- | -------- | ------------------------------------------------- |
| `_id`           | ObjectId | Primary key                                       |
| `applicationId` | ObjectId | Required, ref `DevoteeApplication`                |
| `authorUserId`  | ObjectId | Required, ref `User`                              |
| `body`          | String   | Required, 1–2,000 characters; plain text; trimmed |
| `createdAt`     | Date     | Mongoose timestamp; immutable                     |
| `updatedAt`     | Date     | Mongoose timestamp; no update endpoint in Stage 2 |

**Indexes.**

```text
{ applicationId: 1, createdAt: -1 }
{ authorUserId: 1, createdAt: -1 }
```

### 4.4 `sessions`

| Field               | Type        | Rules / notes                                                                                                                                        |
| ------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`               | ObjectId    | Primary key                                                                                                                                          |
| `userId`            | ObjectId    | Required, ref `User`, indexed                                                                                                                        |
| `scope`             | String enum | `full` or `application`; `application` is limited to the applicant's own status/summary                                                              |
| `tokenHash`         | String      | Required, unique, SHA-256 hex, `select: false`                                                                                                       |
| `createdAt`         | Date        | Mongoose timestamp                                                                                                                                   |
| `lastSeenAt`        | Date        | Updated at most once per 5 minutes                                                                                                                   |
| `expiresAt`         | Date        | Effective expiry: `min(now + 7 days, absoluteExpiresAt)`; the only TTL-indexed timestamp                                                             |
| `absoluteExpiresAt` | Date        | Absolute expiry (default now + 30 days); enforced by validation, not TTL                                                                             |
| `revokedAt`         | Date / null | Set on logout, suspension, rejection, password reset, or permission/role change                                                                      |
| `revokedReason`     | String/null | `logout`, `logout_all`, `password_reset`, `password_change`, `suspended`, `rejected`, `expired`, `role_change`, `permissions_change`, `admin_revoke` |
| `ipHash`            | String/null | HMAC-SHA-256 of the client IP with `AUTH_SECRET`                                                                                                     |
| `userAgent`         | String/null | Truncated to 300 characters; no secrets                                                                                                              |

**Indexes.**

```text
{ tokenHash: 1 } unique
{ userId: 1, revokedAt: 1 }
{ expiresAt: 1 } TTL, expireAfterSeconds: 0
```

There is exactly **one** TTL index, on `expiresAt`. `absoluteExpiresAt` is deliberately **not** TTL-indexed. Session validation checks both `expiresAt > now` and `absoluteExpiresAt > now`; TTL deletion is housekeeping, not the authorization decision. This avoids two competing deletion rules and any chance that an idle timestamp deletes a session before its absolute limit.

### 4.5 `authTokens`

Used for email verification, password reset, and administrator invitations. A single collection keeps token handling consistent.

| Field       | Type        | Rules / notes                                                        |
| ----------- | ----------- | -------------------------------------------------------------------- |
| `_id`       | ObjectId    | Primary key                                                          |
| `userId`    | ObjectId    | Required, ref `User`                                                 |
| `purpose`   | String enum | `email_verification`, `password_reset`, `admin_invitation`           |
| `tokenHash` | String      | Required, unique, SHA-256 hex, `select: false`                       |
| `expiresAt` | Date        | 24 hours verification; 30 minutes reset; 7 days administrator invite |
| `usedAt`    | Date / null | Set atomically when consumed                                         |
| `createdAt` | Date        | Mongoose timestamp                                                   |

**Indexes.**

```text
{ tokenHash: 1 } unique
{ userId: 1, purpose: 1, usedAt: 1 }
{ expiresAt: 1 } TTL, expireAfterSeconds: 0
```

Before issuing a new token for a user/purpose, invalidate unused tokens of that purpose. Consumption uses `findOneAndUpdate({ tokenHash, purpose, usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } })` so two concurrent requests cannot both succeed.

### 4.6 `rateLimits`

A small MongoDB-backed fixed-window counter. This is intentionally not an in-memory limiter, because multiple server instances would each allow the full quota.

| Field         | Type   | Rules / notes                                               |
| ------------- | ------ | ----------------------------------------------------------- |
| `_id`         | String | HMAC-derived key: `<action>:<identifierHash>:<windowStart>` |
| `count`       | Number | Incremented atomically                                      |
| `windowStart` | Date   | Start of the fixed window                                   |
| `expiresAt`   | Date   | End of window plus a small grace period                     |

**Indexes.**

```text
{ expiresAt: 1 } TTL, expireAfterSeconds: 0
```

`_id` is the key, so no extra unique index is needed. The key never contains a raw email, phone number, or IP address.

### 4.7 `auditLogs`

| Field         | Type            | Rules / notes                                                                                     |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| `_id`         | ObjectId        | Primary key                                                                                       |
| `actorUserId` | ObjectId / null | Null for anonymous failures and bootstrap events                                                  |
| `actorRole`   | String/null     | `devotee`, `admin`, `super_admin`, `system`                                                       |
| `action`      | String          | Dotted lowercase event name, e.g. `admin.application_approved`                                    |
| `targetType`  | String/null     | `user`, `session`, `devotee_application`, `invitation_report`, `administrator`, `system`          |
| `targetId`    | String/null     | String form of the target ID                                                                      |
| `outcome`     | String enum     | `success`, `failure`                                                                              |
| `reasonCode`  | String/null     | Stable code, e.g. `INVALID_CREDENTIALS`, `APPLICATION_SCOPE_RESTRICTED`                           |
| `metadata`    | Object          | Small, safe, redacted context; no name, email, phone, gender, message, token, password, or cookie |
| `ipHash`      | String/null     | HMAC-SHA-256 with `AUTH_SECRET`                                                                   |
| `userAgent`   | String/null     | Truncated; same privacy rules as sessions                                                         |
| `createdAt`   | Date            | Mongoose timestamp; immutable                                                                     |

**Indexes.**

```text
{ createdAt: -1 }
{ actorUserId: 1, createdAt: -1 }
{ action: 1, createdAt: -1 }
{ targetType: 1, targetId: 1, createdAt: -1 }
```

No TTL index until a retention period is approved (D-10/D-19). No update or delete service functions. An optional Mongoose pre-hook can reject updates/deletes as a defence in depth.

### 4.8 `invitationReports` (Stage 4 — proposed, not created in Batch 0)

The reporting feature is Stage 4, but the privacy requirements and permission boundary must be fixed now so the Stage 2 role model does not conflict with it.

| Field                       | Type          | Rules / notes                                                                                     |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `_id`                       | ObjectId      | Primary key                                                                                       |
| `areaId`                    | ObjectId      | Required, ref `Area`                                                                              |
| `submittedByUserId`         | ObjectId      | Required, ref `User`; derived from the session; never supplied by the client                      |
| `participatingDevoteeCount` | Number        | Required, integer ≥ 0; aggregate count only; no identities                                        |
| `invitationCount`           | Number        | Required, integer ≥ 0; the number of invitations reported                                         |
| `reportDate`                | Date          | Required                                                                                          |
| `notes`                     | String / null | Optional, max 1,000 characters; must not contain invitee names, phone numbers, or email addresses |
| `status`                    | String enum   | `submitted`, `verified`, `flagged`, `rejected`                                                    |
| `createdAt`                 | Date          | Mongoose timestamp                                                                                |
| `updatedAt`                 | Date          | Mongoose timestamp                                                                                |

**Indexes.**

```text
{ areaId: 1, reportDate: -1 }
{ submittedByUserId: 1, createdAt: -1 }
{ status: 1, reportDate: -1 }
```

**Hard privacy rules.**

- The submitter identity is stored once, in `submittedByUserId`, and is never duplicated into the participant count.
- There is no field for individual invitee names, phone numbers, or email addresses. The default collection must not add one.
- Devotees never receive another contributor's name, email, profile, or user ID. They receive aggregate campaign statistics and their own reports.
- Administrators with `invitation-report:read:all` may see all reports and contributor identity. Contributor identity means the account's name and email only; not phone, gender, or application message.
- Every administrative detail view and every change to a report is audited.

### 4.9 Retention and deletion (DEFERRED — no automatic purge in Stage 2)

- **No automatic applicant-PII deletion, anonymisation, expiry, or purge job runs in Stage 2.**
- No retention period is approved. No TTL index is created on `devoteeApplications`, `devoteeApplicationNotes`, or `auditLogs`.
- The `expired` application/user state is reserved for a future explicitly approved policy. No Stage 2 job sets it.
- Account deletion is deferred. No self-service deletion endpoint exists.
- Technical TTL indexes are limited to sessions, auth tokens, and rate-limit windows; they do not delete applicant PII.
- A future retention policy must be explicitly approved before any purge, anonymisation, or deletion implementation. It must not be invented in code or configuration.

### 4.10 Index creation

- Development may rely on Mongoose `autoIndex`, but production must not create indexes implicitly on every boot.
- `scripts/sync-indexes.js` calls `Model.syncIndexes()` for each model, prints only model names and index counts, and exits non-zero on failure.
- The script is run once per environment after deployment and verified with `Model.collection.indexes()`.
- Existing data migration is not needed in Stage 2 because no user collection exists yet. Future schema changes use versioned scripts under `scripts/migrations/`.

## 5. Password handling

### 5.1 Algorithm

**Recommended:** Argon2id through `@node-rs/argon2`.

| Parameter   | Value                        |
| ----------- | ---------------------------- |
| Memory      | 19,456 KiB (19 MiB)          |
| Iterations  | 2                            |
| Parallelism | 1                            |
| Salt        | 16 random bytes per password |
| Output      | 32 bytes                     |
| Encoding    | PHC string (`$argon2id$...`) |

**Fallback if native modules are rejected:** Node `crypto.scrypt` with `N=32768`, `r=8`, `p=3`, 16-byte salt, 32-byte key, `maxmem=64 MiB`, encoded as `scrypt$v=1$N=32768,r=8,p=3$<salt>$<hash>`.

### 5.2 Rules

- Never trim, lowercase, truncate, or normalise a password. Hash exactly the submitted string.
- Enforce length before hashing: minimum 12 characters, maximum 128. A longer maximum avoids memory/CPU abuse; it is not a security feature.
- Do not impose composition rules (mixed case, digits, symbols); length and rate limiting matter more.
- Use a unique random salt per password; never a global pepper.
- Compare with a constant-time function.
- On successful login, if the stored algorithm/parameters are below current policy, rehash the password and update the user record.
- Never return, log, email, or audit a password.
- Never display a password or password hash to an administrator, including in the devotee management dashboard.
- A password reset invalidates all existing sessions and unused reset tokens.
- An administrator invitation sets a password only through a single-use token; a Super Admin never types or sees the administrator's password.

### 5.3 Timing and enumeration

- For an unknown email, perform a dummy Argon2id/scrypt verification against a fixed hash so response time does not reveal account existence.
- Login returns the same `401 INVALID_CREDENTIALS` for unknown email and wrong password.
- Account-state errors (`EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `INVITATION_PENDING`) are returned only after the password verifies correctly. A verified pending or rejected applicant receives a limited session, not an account-state error. A reserved `expired` account receives `403 FORBIDDEN` and no session.
- Forgot-password, resend-verification, and application submissions are generic (see §13).

## 6. Session handling

### 6.1 Token

- 32 random bytes from `crypto.randomBytes`, encoded as base64url (43 characters).
- Only the SHA-256 hash is stored in `sessions.tokenHash`.
- The raw token appears only in the `Set-Cookie` header and the browser cookie jar.
- Never put a session token in a URL, JSON body, log, or audit record.

### 6.2 Cookie

| Attribute  | Development                 | Production                  |
| ---------- | --------------------------- | --------------------------- |
| Name       | `utsav_session`             | `__Host-utsav_session`      |
| `HttpOnly` | yes                         | yes                         |
| `Secure`   | no (localhost HTTP)         | yes                         |
| `SameSite` | `Lax`                       | `Lax`                       |
| `Path`     | `/`                         | `/`                         |
| `Domain`   | omitted                     | omitted (host-only)         |
| `Max-Age`  | 30 days (absolute lifetime) | 30 days (absolute lifetime) |

The `__Host-` prefix requires `Secure`, `Path=/`, and no `Domain`; it prevents a subdomain from setting a cookie for the parent domain. The cookie carries no user data.

### 6.3 Lifetime and rotation

- Idle timeout: 7 days from the last recorded activity.
- Absolute timeout: 30 days from creation.
- `expiresAt` is the effective expiry. On activity, set `expiresAt = min(now + 7 days, absoluteExpiresAt)`; `lastSeenAt`/`expiresAt` are extended at most once every 5 minutes to avoid a write per request.
- `absoluteExpiresAt` is never extended and is checked independently on every session lookup.
- A new token is generated on every login, which prevents session fixation.
- Logout revokes the current session and clears the cookie.
- Password change/reset, suspension, rejection, and role or permission change revoke all sessions for the user. Approval revokes the limited applicant session.
- An administrator may revoke a user's sessions through suspension.
- `pending_verification`, `invited`, `suspended`, and `deleted` accounts are never issued a session.
- `pending_approval` and `rejected` accounts may receive only an `application`-scope session, and only when `emailVerifiedAt` is set. The scope is stored in `session.scope`. `expired` accounts are never issued a session in Stage 2.

### 6.4 Lookup and failure behaviour

1. Read the cookie. If absent, the user is a visitor.
2. Hash the token and find a session with `revokedAt: null`, `expiresAt > now`, and `absoluteExpiresAt > now`.
3. Load the user. Suspend, reject, expire, delete, or role/permission changes revoke sessions as described above.
4. Enforce the scope:
   - `scope: "full"` requires `status === "active"` and a verified email. A devotee also requires an approved current application.
   - `scope: "application"` requires a verified email and `status` in `pending_approval` or `rejected`. It grants only `/application-status` and `GET /api/account/application`. The reserved `expired` state is never a valid session state in Stage 2.
   - Any mismatch revokes the session and treats the request as unauthenticated/forbidden.
5. Return a safe user projection including `sessionScope`; never return `passwordHash`, `passwordAlgorithm`, token hashes, or applicant PII beyond the own-summary route.
6. If MongoDB is unavailable, return `503 SERVICE_UNAVAILABLE` through the existing error mapping; do not silently treat the user as a visitor for protected operations.

## 7. Devotee application and approval workflow

### 7.1 Registration modes

| Mode           | Behaviour                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `applications` | `POST /api/auth/register` accepts an application. It always starts `pending` and never grants devotee access. |
| `closed`       | `POST /api/auth/register` returns `403 REGISTRATION_CLOSED`. Existing applications can still be reviewed.     |

`REGISTRATION_MODE` defaults to `closed` in production until the owner enables the application workflow. Development defaults to `applications` for testing. There is no `open` mode that grants immediate access.

Public applications require a working email transport for verification and decision notifications. If email is not configured, the application workflow must remain `closed`; it must not silently accept applications that can never be completed.

### 7.2 The six approved fields

| Field          | Required | Validation / storage                                                                                      |
| -------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Full name      | yes      | 2–80 characters; trim; collapse whitespace; Unicode letters, marks, spaces, apostrophes, hyphens, periods |
| Email address  | yes      | 3–254 characters; lowercase; valid shape; unique account identifier                                       |
| Password       | yes      | 12–128 characters; no trimming; at least one non-whitespace character                                     |
| Phone number   | yes      | E.164 (`+` and 8–15 digits); normalised digits stored for search (D-21)                                   |
| Gender         | yes      | Exactly `male` or `female`; labels "Male" and "Female"; no other options                                  |
| Custom message | no       | Max 2,000 characters; plain text; may be empty                                                            |

No date of birth, occupation, address, government identifier, photograph, or social-media handle is collected. The strict schema contains only the six approved fields; any other keys are rejected. Additional fields require a product and privacy review.

### 7.3 Submission flow

1. Validate the six fields with a strict Zod schema. Unknown keys are rejected.
2. Normalise email (trim, lowercase) and phone (E.164/digits).
3. Apply rate limits by IP and email HMAC before hashing the password.
4. Hash the password with Argon2id.
5. Look up the email.
   - **New:** create a user with `role: "devotee"`, `status: "pending_verification"`, `emailVerifiedAt: null`, and no session.
   - **Existing, pending verification:** do not create a duplicate; invalidate old verification tokens and send a fresh verification email.
   - **Existing, pending approval:** do not create a duplicate; send a generic "application is under review" email.
   - **Existing, active:** do not create a duplicate; send an "account already exists" email with login/reset links.
   - **Existing, rejected/expired:** do not create a duplicate and do not automatically reopen the application; send a generic notice or nothing.
   - **Existing, suspended/invited:** do not reveal the state; send a generic support message or nothing.
6. Create the application with `status: "pending"`, the immutable applicant snapshot, and `isCurrent: true`.
7. Create a single-use email-verification token (24 hours) and send the verification email.
8. Write `application.submitted` audit metadata with IDs and status only; never the name, email, phone, gender, or message.
9. Return `202 { data: { status: "accepted" } }` for any syntactically valid request, whether or not the email existed. No session is created.
10. If the email transport fails, return `503 EMAIL_UNAVAILABLE` and record the failure without the token or address. The account/application may exist; a later resend or administrator action can complete verification.

### 7.4 Duplicate-registration handling

- `users.email` has a unique index. The service also checks before insert, but the index is the race-safe authority.
- A duplicate-key error is caught and converted to the same generic `202` response; it must not become a 500 or reveal that the email exists.
- A partial unique index on `devoteeApplications { userId: 1, isCurrent: true }` prevents two current applications for one account.
- One email address maps to one account. Alternate addresses, aliases, and case variants are normalised before lookup.
- Reapplication after rejection is **not automatic** in Stage 2. A Super Admin may reopen an application under an audited policy (D-20). Automatic reapplication requires an explicit product decision.
- Expired applications do not silently create a new pending application. The applicant must contact support or use an approved reapplication flow.

### 7.5 Email verification

1. The verification email links to `${APP_BASE_URL}/verify-email#token=<raw-token>`. The fragment is not sent to the server in the initial request, keeping it out of access logs and cross-origin referrers.
2. The page reads the fragment in a client component and posts `{ token }` to `POST /api/auth/verify-email`.
3. The API hashes the token, finds an unused, unexpired `authTokens` record with purpose `email_verification`, marks it used atomically, and sets `emailVerifiedAt`.
4. If the application is already approved, the user becomes `active`; otherwise the user becomes `pending_approval`.
5. Rejected/expired accounts do not become active through verification. The email address may be marked verified, but the application status remains authoritative.
6. Audit `auth.email_verified`.
7. Expired/invalid tokens return `400 TOKEN_EXPIRED` or `400 TOKEN_INVALID`. The page offers a resend link.
8. Resend verification is rate-limited, invalidates old tokens, and only sends to an existing, unverified, pending account.

### 7.6 Review queue and decisions

The review queue is `/admin/devotees` → Applications. It lists applications with status `pending` by default, newest first, with cursor pagination (default 25, maximum 100). Staff can search by name, email, and phone and filter by status, email-verification state, and submission date.

**Approve.**

- Requires `application:review:all` and an active administrator account.
- Requires the applicant's email to be verified. If not, return `409 EMAIL_NOT_VERIFIED_FOR_APPROVAL` and show an actionable message. Staff may reject an unverified application.
- Performs a conditional update from `pending` to `approved`; a concurrent decision returns `409 APPLICATION_ALREADY_DECIDED`.
- In one transaction: set application status, reviewer, `reviewedAt`; set user status `active` and `approvedAt`; write the audit record.
- Send an approval email containing a login link and no password. A failed notification is recorded as `decisionNotificationStatus: "failed"`; the decision persists and can be retried.
- Revoke any sessions that might exist for the account; the applicant logs in fresh.

**Reject.**

- Requires `application:review:all`.
- Performs a conditional update from `pending` to `rejected`.
- In one transaction: set application status, reviewer, `reviewedAt`; set user status `rejected` and `rejectedAt`; revoke all sessions; write the audit record.
- Send a **generic** notification: the application was not approved at this time. It contains no internal note, reviewer identity, reason code, or hint about what to change.
- A rejected applicant with a verified email may log in again to the limited `application` session and read only their own summary. Rejection never grants devotee access.
- Internal notes are stored separately and are never included in the email, API response to the applicant, or login error.

**Review history.**

- `reviewedByUserId`, `reviewedAt`, and the audit trail provide the decision history.
- Internal notes are append-only and visible only to administrators with `application:read:all`/`application:note:write` as appropriate.
- Approval/rejection is not reversible through the same endpoint. A Super Admin may reopen an application only through an explicitly audited operation (D-20).

### 7.7 Decision notifications

| Event                 | Recipient     | Content                                                                            |
| --------------------- | ------------- | ---------------------------------------------------------------------------------- |
| Application submitted | Applicant     | Verification link; no status promise, no internal information                      |
| Email verified        | Applicant     | Confirmation that the application is awaiting review, if email is enabled          |
| Approved              | Applicant     | Generic approval message and login link; no password, no internal note             |
| Rejected              | Applicant     | Generic "not approved at this time" message; no reason, reviewer, or internal note |
| Admin invited         | Administrator | Single-use account-setup link; no password                                         |

- Notification templates are plain text plus HTML with escaped values; no user-controlled HTML.
- The transport is provider-agnostic. Development writes to `.local/mail/` and never prints tokens or full links to the console.
- Delivery failure is visible to the reviewing administrator. It never changes the review decision and never becomes a false success message.
- A retry endpoint (`POST /api/admin/devotee-applications/:id/resend-notification`) is available to administrators with review permission; it is rate-limited and audited.

### 7.8 Expiry and retention

- **No automatic expiry, retention, or purge job runs in Stage 2.**
- The `expired` application/user state is reserved for a future explicitly approved retention policy. No Stage 2 code sets it.
- No applicant PII is deleted or anonymised by a scheduled job. Retention periods remain deferred (D-19).
- If a future policy is approved, it must define the period, notification, audit, dry run, and restore rehearsal before any job is implemented.

## 8. Login, logout, and account endpoints

### 8.1 Login

1. Validate `{ email, password }`; do not reveal which field failed.
2. Apply per-IP and per-email rate limits before touching the password hash.
3. Load the user with `+passwordHash`; if absent, perform a dummy verification and return `401 INVALID_CREDENTIALS`.
4. Verify the password with a constant-time comparison.
5. On failure: increment the failure counter, apply temporary lockout if the threshold is crossed, audit `auth.login_failed`, and return `401 INVALID_CREDENTIALS`.
6. On success, check account state **after** password verification:
   - `pending_verification` → `403 EMAIL_NOT_VERIFIED`, no session.
   - `pending_approval` with a verified email → create an `application`-scope session and return `200` with `sessionScope: "application"`. No devotee access.
   - `rejected` with a verified email → create an `application`-scope session and return `200` with `sessionScope: "application"`. The UI shows a generic status and never internal notes.
   - `rejected` without a verified email → `403 EMAIL_NOT_VERIFIED`, no session.
   - `expired` → `403 FORBIDDEN`, no session. The reserved state has no Stage 2 login eligibility.
   - `suspended` → `403 ACCOUNT_SUSPENDED`, no session.
   - `invited` → `403 INVITATION_PENDING`, no session.
   - `deleted` → `401 INVALID_CREDENTIALS` or a generic unavailable response.
   - `active` → create a `full` session and continue.
7. For an active devotee, assert the current application is `approved` and `emailVerifiedAt` is set. If either invariant fails, deny login and log an internal consistency error; do not grant access.
8. Reset counters, set `lastLoginAt`, create the session with the correct scope, audit `auth.login_succeeded` without PII, set the cookie, and return the safe user plus `sessionScope`.
9. Never log the email, password, applicant PII, or session token.

### 8.2 Logout

- `POST /api/auth/logout` is idempotent.
- If a valid session exists, revoke it with reason `logout` and audit `auth.logout`.
- Always clear the cookie and return `204`.
- A cross-site logout is low-impact but still rejected by the origin check for consistency.

### 8.3 Session endpoint

- `GET /api/auth/session` returns the safe user, `sessionScope` (`full` or `application`), and session expiry for the UI.
- `401` when there is no valid session.
- Never returns the token, its hash, applicant PII, or password metadata.
- For administrators, returns the effective `permissions` array (Super Admin receives a marker such as `"*"`; the UI must not treat it as a substitute for server checks).

### 8.4 Account endpoints

- `GET /api/account` returns the same safe user shape without the session object.
- `PATCH /api/account/profile` accepts `{ name }` only. Email change is out of scope. The application snapshot is not rewritten; the current account name is what appears to authorised administrators and on the devotee's own reports.
- `GET /api/account/application` returns the authenticated applicant's or devotee's own application summary. It is a private account route, not a public or devotee profile; another devotee can never read it. A verified applicant whose application is pending or rejected, with an `application`-scope session, may call it; every other account API still requires a full active session. The response includes the applicant's own name, email, phone, gender, message, status, submitted/reviewed timestamps; it never includes internal notes or reviewer identity. It never includes a date of birth, because none exists.
- `POST /api/account/password` is described in §9.1.

### 8.5 Safe user projection

The safe projection used by auth/account responses contains only:

```text
id, name, email, role, status, emailVerified, applicationStatus, sessionScope,
permissions (administrators only), createdAt, lastLoginAt
```

It never contains `passwordHash`, `passwordAlgorithm`, `adminPermissions` raw storage details beyond the effective list, `suspensionReason`, internal notes, date of birth (which is not collected), gender, phone, or custom message.

## 9. Password change and recovery

### 9.1 Change password (authenticated)

1. Require a valid active session.
2. Validate `{ currentPassword, newPassword }`.
3. Verify the current password; wrong password returns `401 INVALID_CREDENTIALS`.
4. Reject if the new password equals the current password.
5. Hash and update; set `passwordChangedAt`; revoke all **other** sessions and rotate the current session.
6. Audit `auth.password_changed`.
7. Return `200 { data: { changed: true } }`.

### 9.2 Forgot password

1. Validate `{ email }`; apply rate limits.
2. Always return `202 { data: { status: "accepted" } }`, whether or not the account exists.
3. If an eligible active account exists: invalidate old reset tokens, create a 32-byte token valid for 30 minutes, store only its SHA-256 hash, and send `${APP_BASE_URL}/reset-password#token=<raw-token>`.
4. Pending, rejected, expired, invited, and suspended accounts do not receive a reset email. The response remains generic.
5. Audit `auth.password_reset_requested` without the email or token.
6. If email delivery fails, return `503 EMAIL_UNAVAILABLE`; do not claim an email was sent.

### 9.3 Reset password

1. Validate `{ token, password }`.
2. Atomically consume the token (unused, unexpired, purpose `password_reset`).
3. Hash the new password and update the user; set `passwordChangedAt`.
4. Revoke **all** sessions for the user, including the current one.
5. Invalidate any remaining reset tokens for the user.
6. Audit `auth.password_reset_completed`.
7. Return `200 { data: { reset: true } }`; the user logs in again.
8. Invalid/expired/used tokens return `400 TOKEN_INVALID` or `400 TOKEN_EXPIRED`.

### 9.4 Administrator password setup and override

- Administrators receive a single-use `admin_invitation` token; accepting it sets their password and activates the account. No password is generated, displayed, or emailed.
- A Super Admin may resend an administrator invitation. The token is never returned in an API response or written to a log.
- A Super Admin may mark an existing unverified account as verified after an out-of-band identity check. The action is audited as `admin.user_email_verified`.
- There is no general "set another user's password" endpoint. Password recovery is self-service for active accounts; administrator invitations are the only setup path for new administrators.

## 10. Account lifecycle and suspension

### 10.1 States and transitions

```text
submit application ──▶ pending_verification ──verify email──▶ pending_approval
pending_approval ──approve──▶ active
pending_verification/pending_approval ──reject──▶ rejected
active ──admin suspend──▶ suspended ──admin reactivate──▶ active
active ──deferred deletion──▶ deleted (soft, anonymised)
invited (administrator) ──accept invitation──▶ active
```

`expired` is reserved for a future approved retention policy; no Stage 2 transition sets it automatically. Application status mirrors the decision:

```text
pending ──approve──▶ approved
pending ──reject───▶ rejected
```

Approval requires `emailVerifiedAt`; rejection does not. The user and application records are updated in one transaction so the authorization gate and the review record cannot disagree.

### 10.2 Suspension rules

- Only an administrator with `devotee:status:update`, or a Super Admin, may suspend or reactivate.
- An administrator cannot suspend their own account (`409 SELF_ACTION_NOT_ALLOWED`).
- The last active Super Admin cannot be suspended (`409 LAST_SUPER_ADMIN`).
- Suspension sets `status`, `suspendedAt`, `suspensionReason`, and revokes all sessions with reason `suspended`.
- Login for a suspended user returns `403 ACCOUNT_SUSPENDED` only after a correct password.
- Reactivation clears suspension fields; it requires an approved application and verified email. The user must log in again.
- Every transition writes an audit record. The suspension reason is administrator-only and is never returned to the devotee.

### 10.3 Rejection and expiry rules

- Rejection sets `users.status = "rejected"` and `devoteeApplications.status = "rejected"`, revokes sessions, and sends a generic notice.
- Rejection does not grant devotee access. A verified rejected applicant may authenticate to an `application`-scope session for their own summary only.
- `expired` is reserved. **No automatic expiry or retention job runs in Stage 2**, and no code sets `expiredAt`.
- Neither rejected nor reserved expired state can be self-cleared. A Super Admin may reopen an application only through an explicitly audited operation; the default Stage 2 behaviour is no automatic reapplication (D-20).
- Pending, rejected, and expired accounts cannot read devotee APIs, even if a session record somehow exists. Pending and rejected applicants may use only the limited own-summary route. The reserved `expired` state has no allowed authenticated route in Stage 2.

### 10.4 Deletion (deferred)

- No self-service deletion endpoint in Stage 2.
- The `deletedAt` field is reserved; no code sets it yet.
- A future flow must anonymise name/email, purge applicant PII, revoke sessions, retain audit records under a non-identifying reference, and define how reports/proposals remain historically valid.
- The retention period is an owner/privacy decision (D-07, D-19). Do not invent it in code.

## 11. Administrator hierarchy and account management

### 11.1 Super Admin bootstrap

- `scripts/create-super-admin.js` is the only bootstrap and recovery path.
- It connects with `MONGODB_URI`, prompts for name, email, and password with hidden input, hashes with the same password module, and creates `role: "super_admin"`, `status: "active"`, `emailVerifiedAt` set.
- Only one active Super Admin exists initially (D-24). Normal mode refuses to create another.
- The documented recovery mode is interactive and requires explicit operator confirmation. It either resets the existing Super Admin's password or, only when no active Super Admin exists, creates the replacement. It never silently creates a second active Super Admin and writes an audit event.
- The recovery procedure is documented in [`deployment.md`](deployment.md) and tested against `utsav_connect_test`.
- No password is accepted as a command-line argument; no default credentials exist.
- No public endpoint can create or recover the first Super Admin.

### 11.2 Creating an administrator

- Only a Super Admin may create an administrator.
- `POST /api/admin/administrators` accepts `{ name, email, permissions }`; `permissions` must be a subset of assignable permissions. Super-Admin-only capabilities are rejected, not silently ignored.
- The service creates a user with `role: "admin"`, `status: "invited"`, `adminPermissions`, `invitedByUserId`, and no usable password hash.
- A single-use `admin_invitation` token (7 days) is created and emailed. The administrator sets their own password at `/accept-admin-invitation`.
- Accepting the invitation sets `emailVerifiedAt`, `passwordChangedAt`, `status: "active"`, and writes an audit record.
- A Super Admin can resend the invitation, change permissions, suspend the administrator, or revoke sessions. Every action is audited.
- A Super Admin cannot create an administrator with `role: "super_admin"`. Promotion to Super Admin is a separate owner-controlled operation (D-24).

### 11.3 Permission management

- `PATCH /api/admin/administrators/:id/permissions` accepts a complete replacement array of assignable permissions.
- Validation rejects unknown strings, duplicates, and all Super-Admin-only capabilities.
- The change takes effect on the next request because the user is reloaded from the database; all of the administrator's sessions are revoked as a defence in depth.
- An administrator cannot change their own permissions, role, or status.
- No client request may set `role`, `adminPermissions`, or `status` outside these Super Admin endpoints.

### 11.4 Super Admin protections

- The Super Admin role is not assignable through the public API.
- A Super Admin cannot suspend or demote themselves.
- The last active Super Admin cannot be suspended, demoted, or deleted.
- Critical security settings (cookie policy, session lifetimes, registration mode, email transport, security headers) are deployment environment controls, not an in-app grant. No `adminPermissions` value and no API call changes them.
- Super Admin actions are audited with the actor's user ID and role. Audit metadata never contains applicant PII.
- Recovery of a lost Super Admin account uses the documented and tested CLI procedure (D-24); it is never exposed as a public endpoint.

**Stage 2 scope note.** Critical security settings named here (cookie policy, session lifetimes, `REGISTRATION_MODE`, email transport, security headers) are deployment environment controls in Stage 2, not an in-app settings screen. They are changed only through the documented owner/operator procedure and are recorded as operational changes. No administrator permission grants access to them. An in-app security-settings surface would require its own model, API, UI, re-authentication/confirmation flow, and audit design before it could be implemented.

### 11.5 Privilege-escalation controls

- Role and permission values are server-derived or Super Admin-supplied; never accepted from registration, profile, application, or devotee-facing endpoints.
- The permission schema uses a closed allow-list. Unknown or reserved capability strings fail validation.
- `requirePermission()` checks the database user, not a JWT claim or a client-provided header.
- Administrators cannot access `/api/admin/administrators/**` or critical settings even if they can read other admin pages.
- The UI hides controls by permission, but hiding is never the control.
- Tests must attempt: self-promotion, permission injection, role injection, IDOR, forged session, and replay of a stale session after a permission change.

## 12. Authorization

### 12.1 Server helpers

| Helper                          | Purpose                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `getSession()`                  | Read cookie, validate session and scope, return `{ user, session }` or `null`            |
| `requireUser()`                 | Return any authenticated user with a valid session, or throw `UnauthorizedError`         |
| `requireApplicationAccess()`    | Allow only an `application` or `full` session for the own status/summary route           |
| `requireActiveUser()`           | Require a `full` session and `status === "active"`                                       |
| `requireApprovedDevotee()`      | Require `role === "devotee"`, active status, verified email, and an approved application |
| `requireAdministrator()`        | Require `role === "admin"` or `role === "super_admin"` and active status                 |
| `requireSuperAdmin()`           | Require `role === "super_admin"` and active status                                       |
| `requirePermission(permission)` | Check the effective permission set for an administrator; Super Admin implicitly passes   |
| `requireVerifiedEmail()`        | Throw `EmailNotVerifiedError` when `emailVerifiedAt` is null                             |
| `assertSameOrigin(request)`     | Reject mutating requests with a missing/mismatched `Origin`                              |

### 12.2 Protected pages

| Path                           | Guard                                 | Failure behaviour                                                                            |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/application-status`          | `requireApplicationAccess()`          | Redirect to `/login`; the page shows only the applicant's own status/summary                 |
| `/dashboard/**`                | `requireApprovedDevotee()`            | Redirect to `/login?next=<path>`; limited applicants get a generic unavailable page          |
| `/account/**`                  | `requireActiveUser()`                 | Redirect to `/login?next=<path>`; limited applicants are redirected to `/application-status` |
| `/admin/**`                    | `requireAdministrator()`              | Redirect to `/login` or a 403 page                                                           |
| `/admin/administrators/**`     | `requireSuperAdmin()`                 | 403 page                                                                                     |
| `/admin/devotees/**`           | Administrator + applicable permission | 403 page, with no data fetched                                                               |
| `/admin/invitation-reports/**` | `invitation-report:read:all`          | 403 page, with no report data fetched                                                        |
| `/login`, `/register`          | Redirect if already authenticated     | Full session → `/dashboard`; application session → `/application-status`                     |

Server Components are the authority. A client-side `useSession` hook is for display only and must not gate access. The admin layout may fetch the user once; each child page and Route Handler still checks the specific permission it needs.

### 12.3 Protected API

`withApiHandler` options:

```js
withApiHandler(handler, {
  schema, // optional Zod schema for body or query
  auth: "required", // "none" | "required" | "optional"
  sessionScope: "full", // "full" | "application" | "any"
  account: "active", // optional account-state gate
  roles: ["admin", "super_admin"], // optional role allow-list
  permission: "application:read:all", // optional granular permission
  superAdmin: false, // true for Super-Admin-only endpoints
  verified: true, // require emailVerifiedAt
  rateLimit: "admin", // named policy
});
```

The wrapper:

1. Assigns a request ID.
2. Rejects non-JSON content types for mutating requests.
3. Calls `assertSameOrigin` for `POST`, `PUT`, `PATCH`, `DELETE`.
4. Applies the rate limit.
5. Resolves the session and user, including `session.scope`.
6. Enforces the requested session scope first, then account state, role, permission, and verification.
7. Parses and validates the body/query with a strict Zod schema.
8. Calls the handler with `{ request, user, session, body, query, requestId }`.
9. Maps errors through `errorToResponse`.
10. Sets `Cache-Control: no-store`.

If the user is suspended, deleted, or no longer matches the session scope mid-session, the wrapper returns `401`/`403` and revokes the session; it never continues with a stale role. An `application`-scope session is accepted only by the own-status/summary route. Permission changes are read from the database on every request; a removed permission is effective immediately even before session revocation completes.

### 12.4 PII access rule

No page or API may return `gender`, `phone`, `message`, or internal notes unless:

1. the caller is the authenticated owner of the application and is reading `/application-status` or `GET /api/account/application`; or
2. the caller is an active administrator with `application:read:all` and is reading an authorized admin detail view, which is audited.

Email and name are returned to the authenticated owner and to administrators with the relevant permission. They are never returned to another devotee or to a public endpoint. The strict schema contains only the six approved fields; all other keys must be rejected.

## 13. API contracts

### 13.1 Conventions

- Base path: `/api`.
- Request and response bodies are JSON (`application/json`), except `204` responses.
- Success: `{ "success": true, "data": ... }`.
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`.
- All auth/account/admin responses include `Cache-Control: no-store`.
- IDs are strings in JSON.
- No endpoint accepts a session token in the body.
- No endpoint returns `passwordHash`, `passwordAlgorithm`, session hashes, token hashes, or internal notes to an applicant.
- List endpoints use cursor pagination (`cursor`, `limit`, default 25, maximum 100) and return `nextCursor`.
- Rate-limited responses set `Retry-After` and `X-RateLimit-*` headers where available.

### 13.2 Endpoint summary

| Method | Path                                                      | Auth     | Role / permission                                                                  | Purpose                                   |
| ------ | --------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| POST   | `/api/auth/register`                                      | none     | —                                                                                  | Submit a devotee application              |
| POST   | `/api/auth/verify-email`                                  | none     | —                                                                                  | Consume an email-verification token       |
| POST   | `/api/auth/resend-verification`                           | none     | —                                                                                  | Request another verification email        |
| POST   | `/api/auth/login`                                         | none     | —                                                                                  | Authenticate an active account            |
| POST   | `/api/auth/logout`                                        | optional | —                                                                                  | Revoke the current session                |
| GET    | `/api/auth/session`                                       | required | any valid scope                                                                    | Current user and session metadata         |
| POST   | `/api/auth/forgot-password`                               | none     | —                                                                                  | Request a password-reset email            |
| POST   | `/api/auth/reset-password`                                | none     | —                                                                                  | Consume a reset token and set a password  |
| POST   | `/api/auth/accept-admin-invitation`                       | none     | —                                                                                  | Set an invited administrator's password   |
| GET    | `/api/account`                                            | required | full active session                                                                | Current account                           |
| PATCH  | `/api/account/profile`                                    | required | full active session                                                                | Update display name                       |
| GET    | `/api/account/application`                                | required | `application` or `full` self                                                       | Own application summary                   |
| POST   | `/api/account/password`                                   | required | full active session                                                                | Change own password                       |
| GET    | `/api/admin/devotees/overview`                            | required | admin + `devotee:read:all`; application counts also require `application:read:all` | Dashboard counts                          |
| GET    | `/api/admin/devotee-applications`                         | required | admin + `application:read:all`                                                     | Search/filter applications                |
| GET    | `/api/admin/devotee-applications/:id`                     | required | admin + `application:read:all`                                                     | Applicant detail; audited                 |
| POST   | `/api/admin/devotee-applications/:id/approve`             | required | admin + `application:review:all`                                                   | Approve application                       |
| POST   | `/api/admin/devotee-applications/:id/reject`              | required | admin + `application:review:all`                                                   | Reject application                        |
| POST   | `/api/admin/devotee-applications/:id/resend-notification` | required | admin + `application:review:all`                                                   | Retry a decision email                    |
| GET    | `/api/admin/devotee-applications/:id/notes`               | required | admin + `application:read:all`                                                     | Read internal notes                       |
| POST   | `/api/admin/devotee-applications/:id/notes`               | required | admin + `application:note:write`                                                   | Add an internal note                      |
| GET    | `/api/admin/devotees`                                     | required | admin + `devotee:read:all`                                                         | Search/filter devotees                    |
| GET    | `/api/admin/devotees/:id`                                 | required | admin + `devotee:read:all`                                                         | Devotee profile and history; audited      |
| PATCH  | `/api/admin/devotees/:id/status`                          | required | admin + `devotee:status:update`                                                    | Suspend/reactivate                        |
| GET    | `/api/admin/administrators`                               | required | super admin                                                                        | List administrators                       |
| POST   | `/api/admin/administrators`                               | required | super admin                                                                        | Create/invite an administrator            |
| PATCH  | `/api/admin/administrators/:id/permissions`               | required | super admin                                                                        | Replace permission grants                 |
| PATCH  | `/api/admin/administrators/:id/status`                    | required | super admin                                                                        | Suspend/reactivate an administrator       |
| POST   | `/api/admin/administrators/:id/resend-invitation`         | required | super admin                                                                        | Resend an invitation                      |
| GET    | `/api/admin/invitation-reports`                           | required | `invitation-report:read:all`                                                       | All private reports; contributor identity |
| GET    | `/api/admin/invitation-reports/:id`                       | required | `invitation-report:read:all`                                                       | Report detail; audited                    |
| GET    | `/api/admin/audit-logs`                                   | required | admin + `audit:read:all`                                                           | Read audit history                        |

Reserved for later stages, not implemented in Stage 2: `POST /api/reports`, `GET /api/reports/mine`, `GET /api/public/statistics`, proposal and area endpoints.

### 13.3 Detailed contracts

#### `POST /api/auth/register`

Request:

```json
{
  "name": "Asha Devi",
  "email": "asha@example.com",
  "password": "correct horse battery staple",
  "phone": "+919876543210",
  "gender": "female",
  "message": "I have participated in the Mahotsav seva for six years."
}
```

Responses:

| Status | Code / data                | When                                                          |
| ------ | -------------------------- | ------------------------------------------------------------- |
| 202    | `{ "status": "accepted" }` | Valid request, regardless of whether the email already exists |
| 400    | `VALIDATION_ERROR`         | Invalid or missing field                                      |
| 403    | `REGISTRATION_CLOSED`      | `REGISTRATION_MODE=closed`                                    |
| 429    | `RATE_LIMITED`             | Registration rate limit exceeded                              |
| 503    | `EMAIL_UNAVAILABLE`        | Email transport failed; records may exist                     |

The response never says "email already registered" and never returns an application ID, user ID, status, or session. The email sent to an existing address is appropriate to that address's state but is not reflected in the HTTP response.

#### `POST /api/auth/login`

Request: `{ "email": "asha@example.com", "password": "correct horse battery staple" }`.

Success `200` returns the safe user, `sessionScope`, and session expiry. The user object includes `applicationStatus: "approved"` and `sessionScope: "full"` for active devotees. A verified applicant whose application is pending or rejected receives `sessionScope: "application"` and may only use `/application-status` and `GET /api/account/application`. The reserved `expired` state receives no session.

| Status | Code                  | Notes                                                   |
| ------ | --------------------- | ------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Missing/invalid fields                                  |
| 401    | `INVALID_CREDENTIALS` | Unknown email or wrong password; identical response     |
| 403    | `EMAIL_NOT_VERIFIED`  | Correct password, email not verified                    |
| 403    | `FORBIDDEN`           | Correct password, reserved expired account; no session  |
| 403    | `ACCOUNT_SUSPENDED`   | Correct password, suspended account                     |
| 403    | `INVITATION_PENDING`  | Correct password, administrator invitation not accepted |
| 429    | `RATE_LIMITED`        | Too many attempts; `Retry-After`                        |

#### `GET /api/auth/session`

`GET` returns the safe user and session expiry. `401 UNAUTHORIZED` when there is no valid session. It never returns applicant PII.

#### `POST /api/auth/verify-email`

Request: `{ "token": "<43-char base64url>" }`.

| Status | Code / data            | When                                  |
| ------ | ---------------------- | ------------------------------------- |
| 200    | `{ "verified": true }` | Token consumed                        |
| 400    | `TOKEN_INVALID`        | Unknown, used, or wrong-purpose token |
| 400    | `TOKEN_EXPIRED`        | Expired token                         |
| 429    | `RATE_LIMITED`         | Too many attempts                     |

#### `GET /api/admin/devotees/overview`

Returns counts only, with no PII:

```json
{
  "success": true,
  "data": {
    "totalApplications": 142,
    "pendingApplications": 18,
    "approvedDevotees": 96,
    "rejectedApplications": 21,
    "suspendedAccounts": 7,
    "awaitingEmailVerification": 4
  }
}
```

Counts are computed with indexed `countDocuments`/aggregation. Application counts are omitted unless the caller has `application:read:all`; devotee counts are omitted unless the caller has `devotee:read:all`. They are not cached across requests; `Cache-Control: no-store` prevents shared-cache leakage.

#### `GET /api/admin/devotee-applications`

Query: `q`, `status`, `emailVerified`, `from`, `to`, `sort` (`submittedAt`, `reviewedAt`, `name`, each with `asc`/`desc`), `cursor`, `limit`.

`q` searches name, email, and phone using normalised fields. List items are masked: name, masked email (e.g. `a***@example.com`), masked phone (last four digits), status, email-verified flag, submittedAt, reviewedAt. Full contact data is available only in the detail view. This reduces accidental exposure and bulk scraping.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "66...",
        "name": "Asha Devi",
        "emailMasked": "a***@example.com",
        "phoneMasked": "*******3210",
        "status": "pending",
        "emailVerified": true,
        "submittedAt": "2026-11-01T00:00:00.000Z",
        "reviewedAt": null
      }
    ],
    "nextCursor": null
  }
}
```

#### `GET /api/admin/devotee-applications/:id`

Returns the full applicant snapshot, current account state, review timestamps, and permission-filtered notes. The response is audited as `admin.application_viewed`. It never returns a password or hash. If the caller lacks `application:read:all`, return `403 FORBIDDEN` before querying.

#### `POST /api/admin/devotee-applications/:id/approve`

Request: `{}` or `{ "note": "Verified in person at the temple office." }` (the note is stored internally, never sent).

Success `200` returns the updated application and safe devotee. Errors: `403`, `404`, `409 EMAIL_NOT_VERIFIED_FOR_APPROVAL`, `409 APPLICATION_ALREADY_DECIDED`, `503 EMAIL_UNAVAILABLE` (decision still committed; retry notification).

#### `POST /api/admin/devotee-applications/:id/reject`

Request: `{ "note": "Duplicate application; no response required." }` (optional, internal only).

Success `200`. The applicant receives only the generic rejection template. Errors: `403`, `404`, `409 APPLICATION_ALREADY_DECIDED`.

#### `GET/POST /api/admin/devotee-applications/:id/notes`

- GET requires `application:read:all`; returns notes newest first with author display name and timestamp.
- POST requires `application:note:write`; body `{ "body": "..." }`; returns `201`.
- Notes are never editable or deletable through the API in Stage 2.
- Every read of the detail page and every note write is audited.

#### `PATCH /api/admin/devotees/:id/status`

Request: `{ "status": "suspended", "reason": "Repeated duplicate reports" }` or `{ "status": "active" }`.

Success `200` with the safe devotee. On suspension, all sessions are revoked. Reactivation requires an approved application and verified email. Errors: `400`, `403`, `404`, `409 SELF_ACTION_NOT_ALLOWED`, `409 LAST_SUPER_ADMIN` (administrator target), `409 INVALID_ACCOUNT_STATE`.

#### Administrator endpoints

- `POST /api/admin/administrators` body `{ name, email, permissions }`; returns `201` with the invited administrator and no token. Errors: `403`, `409 EMAIL_IN_USE`, `400 UNKNOWN_PERMISSION`, `400 RESERVED_PERMISSION`.
- `PATCH /api/admin/administrators/:id/permissions` body `{ permissions }`; replaces the grant set; revokes the target's sessions; audited.
- `PATCH /api/admin/administrators/:id/status` body `{ status: "active" | "suspended" }`; cannot target self or the last Super Admin.
- `POST /api/admin/administrators/:id/resend-invitation` reissues a single-use invitation token; no token is returned.

#### Invitation-report endpoints

- `GET /api/admin/invitation-reports` requires `invitation-report:read:all`; returns reports with contributor name/email and aggregate counts. Pagination and date/area filters are required.
- `GET /api/admin/invitation-reports/:id` returns one report and contributor identity; audited as `admin.invitation_report_viewed`.
- Devotee own-report and aggregate endpoints are Stage 4; they must enforce `submittedByUserId === session.user.id` and must never return another contributor's identity.
- No endpoint exposes invitee names, phone numbers, or email addresses.

### 13.4 Status codes

| Status | Meaning in this API                                     |
| ------ | ------------------------------------------------------- |
| 200    | Successful read/update                                  |
| 201    | Resource created (administrator invitation, note)       |
| 202    | Accepted, deliberately non-enumerating response         |
| 204    | Successful no-content (logout)                          |
| 400    | Validation or invalid/expired token                     |
| 401    | No valid session, or invalid credentials                |
| 403    | Authenticated but not allowed, unverified, or suspended |
| 404    | Resource not found (admin lookups)                      |
| 409    | Conflict (self-action, last admin, already decided)     |
| 429    | Rate limited                                            |
| 500    | Unexpected server error                                 |
| 503    | Database or email dependency unavailable                |

## 14. Validation rules

All schemas live under `api/lib/validation/` (server-only) and use `.strict()` so unexpected keys are rejected. Client-side validation is a convenience; the server is authoritative.

| Field         | Rule                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Trim; collapse internal whitespace; 2–80 characters; reject control characters; allow Unicode letters, marks, spaces, apostrophes, hyphens, periods |
| `email`       | Trim; lowercase; 3–254 characters; valid address shape; single `@`; no whitespace                                                                   |
| `password`    | 12–128 characters; no trimming; at least one non-whitespace character; reject NUL/control characters                                                |
| `phone`       | E.164: optional `+`, 8–15 digits; separators accepted at the edge and normalised; never used as a login identifier (D-21)                           |
| `gender`      | Exactly `male` or `female`; any other value is `400 VALIDATION_ERROR`                                                                               |
| `message`     | Optional; max 2,000 characters; trim leading/trailing whitespace; reject NUL/control characters; plain text                                         |
| `token`       | 43-character base64url string (32 random bytes)                                                                                                     |
| `role`        | `devotee`, `admin`, `super_admin`; only server/Super Admin paths may set it                                                                         |
| `status`      | Endpoint-specific enum; applicant and devotee endpoints cannot set account status                                                                   |
| `permissions` | Array of unique assignable permission strings; rejects unknown, reserved, and duplicate values                                                      |
| `reason`      | 3–500 characters; trim; reject control characters                                                                                                   |
| `note`        | 1–2,000 characters; trim; reject control characters                                                                                                 |
| `cursor`      | Opaque base64url, max 200 characters; decoded and validated as `createdAt,_id`                                                                      |
| `limit`       | Integer 1–100; default 25                                                                                                                           |
| `q`           | 2–100 characters; trim; normalise; escaped for prefix regex or used with indexed search fields                                                      |
| `from`, `to`  | ISO 8601 dates; `from <= to`                                                                                                                        |

Body size limit: 16 KiB for auth/account requests and 32 KiB for administrator note/detail requests. JSON parser failures return `400 VALIDATION_ERROR`, not a stack trace.

### 14.1 Form-field privacy validation

- The registration schema contains only the six approved fields. Unknown keys are rejected.
- The gender enum contains only the two approved values. It is not extensible by client input.
- Date of birth is not collected, stored, derived, or validated anywhere. No age eligibility check exists.
- Phone is stored in display form plus normalised digits; it is not used for login, public display, or SMS in Stage 2.
- The custom message is stored as plain text. It is never rendered with `dangerouslySetInnerHTML` and never included in analytics.

## 15. Error handling

### 15.1 Error classes

Extend `api/lib/http/errors.js` with:

| Class                              | Status | Code                              |
| ---------------------------------- | ------ | --------------------------------- |
| `UnauthorizedError`                | 401    | `UNAUTHORIZED`                    |
| `InvalidCredentialsError`          | 401    | `INVALID_CREDENTIALS`             |
| `ForbiddenError`                   | 403    | `FORBIDDEN`                       |
| `EmailNotVerifiedError`            | 403    | `EMAIL_NOT_VERIFIED`              |
| `AccountSuspendedError`            | 403    | `ACCOUNT_SUSPENDED`               |
| `InvitationPendingError`           | 403    | `INVITATION_PENDING`              |
| `RegistrationClosedError`          | 403    | `REGISTRATION_CLOSED`             |
| `NotFoundError`                    | 404    | `NOT_FOUND`                       |
| `ConflictError`                    | 409    | `CONFLICT`                        |
| `ApplicationAlreadyDecidedError`   | 409    | `APPLICATION_ALREADY_DECIDED`     |
| `EmailNotVerifiedForApprovalError` | 409    | `EMAIL_NOT_VERIFIED_FOR_APPROVAL` |
| `LastAdminError`                   | 409    | `LAST_ADMIN`                      |
| `LastSuperAdminError`              | 409    | `LAST_SUPER_ADMIN`                |
| `SelfActionError`                  | 409    | `SELF_ACTION_NOT_ALLOWED`         |
| `InvalidAccountStateError`         | 409    | `INVALID_ACCOUNT_STATE`           |
| `TokenInvalidError`                | 400    | `TOKEN_INVALID`                   |
| `TokenExpiredError`                | 400    | `TOKEN_EXPIRED`                   |
| `UnknownPermissionError`           | 400    | `UNKNOWN_PERMISSION`              |
| `ReservedPermissionError`          | 400    | `RESERVED_PERMISSION`             |
| `RateLimitError`                   | 429    | `RATE_LIMITED`                    |
| `EmailUnavailableError`            | 503    | `EMAIL_UNAVAILABLE`               |

`errorToResponse` already maps `AppError`; the new classes inherit from it. Extend `jsonError` to accept safe response headers (for `Retry-After` and rate-limit headers).

### 15.2 Rules

- Validation details list field paths and messages, never submitted values.
- Unknown errors return `500 INTERNAL_ERROR` with a generic message; the stack stays in the server log.
- Database errors are mapped to `503 SERVICE_UNAVAILABLE` through `DatabaseUnavailableError`.
- Authentication errors are generic; account-state errors appear only after a correct password.
- Rejection errors and emails never contain internal notes, reviewer identity, or a reason code that reveals the note.
- Never return a raw MongoDB error, driver message, index name, or document dump.
- Every response includes `Cache-Control: no-store` for auth/account/admin.

## 16. Audit logging

### 16.1 Events

| Action                                    | Actor             | Target              | Notes                                                |
| ----------------------------------------- | ----------------- | ------------------- | ---------------------------------------------------- |
| `application.submitted`                   | anonymous         | devotee_application | No name, email, phone, gender, or message            |
| `application.email_verified`              | anonymous/user    | devotee_application | No token                                             |
| `application.verification_resent`         | anonymous/user    | devotee_application | No token                                             |
| `application.approved`                    | admin/super admin | devotee_application | Reviewer ID, no applicant PII                        |
| `application.rejected`                    | admin/super admin | devotee_application | Reviewer ID, no applicant PII; note is separate      |
| `application.note_added`                  | admin/super admin | devotee_application | Note ID/length only, not note text                   |
| `application.viewed`                      | admin/super admin | devotee_application | Sensitive detail view; no PII in metadata            |
| `application.decision_notification`       | admin/system      | devotee_application | `sent`/`failed`; no recipient address                |
| `admin.administrator_created`             | super admin       | administrator       | Permission list                                      |
| `admin.administrator_permissions_changed` | super admin       | administrator       | Old/new permission names                             |
| `admin.administrator_suspended`           | super admin       | administrator       | —                                                    |
| `admin.administrator_reactivated`         | super admin       | administrator       | —                                                    |
| `admin.administrator_invitation_resent`   | super admin       | administrator       | No token                                             |
| `admin.super_admin_bootstrapped`          | system/cli        | administrator       | First Super Admin creation                           |
| `admin.devotee_suspended`                 | admin/super admin | user                | Reason code/reason text allowed; admin-only          |
| `admin.devotee_reactivated`               | admin/super admin | user                | —                                                    |
| `admin.devotee_viewed`                    | admin/super admin | user                | Sensitive profile view; no PII in metadata           |
| `admin.invitation_report_viewed`          | admin/super admin | invitation_report   | Sensitive detail view                                |
| `admin.invitation_report_changed`         | admin/super admin | invitation_report   | Stage 4; no contributor PII in metadata              |
| `auth.login_succeeded`                    | user              | user                | Session ID hash not recorded                         |
| `auth.login_failed`                       | anonymous         | user/null           | Reason code only; no email                           |
| `auth.logout`                             | user              | session             | Reason `logout`                                      |
| `auth.email_verified`                     | user              | user                | —                                                    |
| `auth.password_reset_requested`           | anonymous         | user                | No email/token                                       |
| `auth.password_reset_completed`           | anonymous/user    | user                | —                                                    |
| `auth.password_changed`                   | user              | user                | —                                                    |
| `auth.admin_invitation_accepted`          | invited admin     | administrator       | No token                                             |
| `account.profile_updated`                 | user              | user                | Changed field names only                             |
| `security.rate_limited`                   | anonymous/user    | endpoint            | Optional; application log, not audit, to avoid noise |

### 16.2 Rules

- Audit records are append-only. No API updates or deletes them.
- Metadata is a small flat object; no nested arbitrary request bodies.
- Never record passwords, password hashes, raw tokens, cookies, authorization headers, full email addresses, phone numbers, gender, custom messages, or internal note text. Date of birth is not collected.
- IP addresses are HMAC-SHA-256 with `AUTH_SECRET`; user agents are truncated.
- Admin mutations that change user/application state write the audit record in the same MongoDB transaction as the change. If the transaction fails, the change fails.
- Authentication audit writes are best-effort; a failure is logged as `audit.write_failed` and must not be silently ignored. A successful login is not rolled back because an audit insert failed, but the failure is visible to operators.
- Sensitive detail views (`application.viewed`, `devotee.viewed`, `invitation_report.viewed`) are audited because the requirement is that all sensitive administrative access is traceable.
- The admin audit viewer supports filters by actor, action, target, and date, with cursor pagination.

## 17. Privacy and data protection

### 17.1 Data classification

| Data                                       | Classification          | Purpose                                                           | Who may read                                                                           |
| ------------------------------------------ | ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Name                                       | Private account data    | Identify the applicant to reviewers; display to the account owner | Self; authorised administrators; contributor identity for report admins                |
| Email                                      | Private account data    | Login, verification, notifications, account recovery              | Self; authorised administrators; report admins for contributor identity                |
| Phone                                      | Private applicant data  | Reviewer contact/identity context; never public                   | Authorised administrators with `application:read:all`; self                            |
| Gender                                     | Private applicant data  | Application review context; never public or aggregated            | Authorised administrators with `application:read:all`; self                            |
| Custom message                             | Private applicant data  | Applicant's stated connection to the Mahotsav; review context     | Authorised administrators with `application:read:all`; self                            |
| Internal notes                             | Confidential admin data | Review continuity and accountability                              | Administrators with the relevant note/read permission                                  |
| Contributor identity on invitation reports | Private                 | Accountability for reports; administrative oversight              | Administrators with `invitation-report:read:all`; the contributor for their own report |
| Aggregate campaign statistics              | Public                  | Public map/statistics                                             | Everyone                                                                               |
| Password hash, tokens, session hashes      | Secret                  | Authentication                                                    | No API, no administrator UI, no log                                                    |

### 17.2 Access matrix

| Data / route                              | Visitor | Applicant (limited, own) | Devotee (own) | Devotee (other) | Admin with permission               | Super Admin |
| ----------------------------------------- | ------- | ------------------------ | ------------- | --------------- | ----------------------------------- | ----------- |
| Public aggregate statistics               | yes     | yes                      | yes           | yes             | yes                                 | yes         |
| Own account name/email                    | no      | yes                      | yes           | no              | yes (admin scope)                   | yes         |
| Own application status/summary            | no      | yes                      | yes           | no              | yes (admin scope)                   | yes         |
| Another devotee's application PII         | no      | no                       | no            | no              | only `application:read:all`         | yes         |
| Application list with masked contact data | no      | no                       | no            | no              | `application:read:all`              | yes         |
| Internal notes                            | no      | no                       | no            | no              | `application:read:all`/`note:write` | yes         |
| Own invitation reports                    | no      | no                       | yes           | no              | yes (admin scope)                   | yes         |
| All invitation reports + contributor IDs  | no      | no                       | no            | no              | `invitation-report:read:all`        | yes         |
| Another contributor's identity            | no      | no                       | no            | no              | only with report permission         | yes         |
| Audit logs                                | no      | no                       | no            | no              | `audit:read:all`                    | yes         |
| Administrator management                  | no      | no                       | no            | no              | no                                  | yes         |

### 17.3 Invitation-report privacy rules

- Administrators and authorized moderators can view all private invitation reports and contributor identities.
- Ordinary devotees never see other contributors' names, email addresses, profiles, or user IDs.
- Devotees see only approved aggregate campaign statistics and their own reports.
- The report stores `submittedByUserId` separately from `participatingDevoteeCount`; the count is never used to infer identities.
- No individual invitee names, phone numbers, or email addresses are collected by default. The report schema has no field for them.
- Aggregate analytics must suppress small cells if a count could identify a person; the threshold is a product decision, but the default is no contributor-level breakdown in public analytics.
- Sensitive administrative access and modifications are audited.

### 17.4 Purpose limitation and minimisation

- Gender, phone, and the custom message are collected only because the owner explicitly requires them for application review. They are not used for marketing, public profiles, leaderboards, or automated decision-making.
- Date of birth is **not** collected and no age eligibility check exists (D-22). The registration schema contains only the six approved fields.
- If the owner cannot state a necessary purpose for any other field, it should be removed before implementation. This is flagged as a privacy review item, not silently accepted.
- The registration form must not add occupation, address, date of birth, or other personal fields without a new product/privacy decision.
- Aggregate analytics must be computed from counts and non-identifying dimensions, never by returning raw applicant records to the client and aggregating there.

### 17.5 Logging and error hygiene

- Extend logger redaction to `password`, `passwordHash`, `token`, `tokenHash`, `cookie`, `authorization`, `secret`, `apiKey`, `email`, `phone`, `gender`, `message`, `notes`.
- Never log request bodies for auth, application, account, or admin endpoints.
- Validation errors do not echo submitted values.
- Audit metadata uses IDs and stable codes, not PII.
- Error responses to applicants never include reviewer identity or internal notes.

## 18. Security controls

### 18.1 CSRF

- `SameSite=Lax` on the session cookie.
- `assertSameOrigin` on every `POST`, `PUT`, `PATCH`, and `DELETE`: the `Origin` header must match `APP_BASE_URL` (plus explicitly allowed development origins).
- Require `Content-Type: application/json` for mutating API requests that carry a body; HTML form posts are rejected. Logout may have no body.
- Do not enable permissive CORS. No `Access-Control-Allow-Origin: *`.
- Logout is a POST; no state-changing GET requests.
- If a same-origin request legitimately lacks `Origin` (non-browser tooling), it must use an explicit test/operator path, not a production bypass.

### 18.2 Rate limits

| Policy                    | Key(s)          | Proposed limit                |
| ------------------------- | --------------- | ----------------------------- |
| `login`                   | IP + email HMAC | 20/15 min IP; 10/15 min email |
| `register`                | IP + email HMAC | 5/hour IP; 3/hour email       |
| `resend-verification`     | IP + email HMAC | 5/hour IP; 3/hour email       |
| `forgot-password`         | IP + email HMAC | 5/hour IP; 3/hour email       |
| `reset-password`          | IP              | 10/hour                       |
| `verify-email`            | IP              | 20/hour                       |
| `accept-admin-invitation` | IP + token hash | 10/hour IP; 5/hour token      |
| `application-review`      | admin user ID   | 100/min                       |
| `admin`                   | admin user ID   | 100/min                       |

- Counters live in MongoDB so multiple instances share them.
- Keys use HMAC-SHA-256 of the identifier with `AUTH_SECRET`; raw emails, phone numbers, and IPs are never stored.
- A rate-limited response includes `Retry-After`.
- Account lockout after repeated failures is temporary (`lockedUntil`) and audited; it must not permanently deny a legitimate user.
- `TRUST_PROXY=1` is required before trusting `X-Forwarded-For`; otherwise use a conservative identifier.

### 18.3 Account enumeration

- Login: `INVALID_CREDENTIALS` for both unknown email and wrong password; dummy hash for unknown email.
- Forgot password: always `202`.
- Resend verification: always `202`.
- Registration/application: always `202` for a valid request; no "email already in use" response.
- Admin-only endpoints may reveal account existence to authorized administrators.
- Timing: dummy verification and constant-time comparisons.

### 18.4 Injection and mass assignment

- Zod `.strict()` schemas reject unknown keys, including `role`, `status`, `adminPermissions`, `applicationStatus`, and `submittedByUserId`.
- Never pass `request.json()` directly to Mongoose.
- Never allow user input to become a MongoDB operator (`$gt`, `$ne`, etc.); treat all values as literals.
- Use `sanitizeFilter` or explicit equality objects for queries involving user input.
- Escape or avoid regex in `q` search; use a bounded, escaped prefix pattern on indexed normalised fields.
- React escapes output; no `dangerouslySetInnerHTML` with user data, notes, or messages.

### 18.5 Session and cookie hardening

- Opaque 256-bit tokens; hashed at rest.
- `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, no `Domain`.
- `__Host-` prefix in production.
- New token on login; revoke on logout, password reset, suspension, rejection, and role/permission change. Approval revokes the limited applicant session.
- One effective TTL index on `expiresAt`; `absoluteExpiresAt` is enforced during validation.
- Never expose tokens in URLs or logs.
- Reject a cookie whose session is expired, absolute-expired, revoked, or of the wrong scope even if its shape looks valid.

### 18.6 Administrator protections

- No public admin registration.
- CLI bootstrap only for the first Super Admin; no default password.
- Administrator accounts are created by a Super Admin and set their own password through a single-use invitation.
- Self-suspension, self-demotion, and self-permission changes are rejected.
- The last active Super Admin cannot be suspended or demoted.
- There is one stored `admin` role; "Moderator" is only a permission profile, never a second role.
- Administrator actions are audited; permission changes revoke sessions.
- `adminPermissions` is a closed allow-list; reserved Super Admin capabilities are rejected.
- Super Admin capabilities are checked by `requireSuperAdmin()` against the database user, never granted through an ordinary permission update.
- Recommend MFA for administrators before public launch (out of scope for Stage 2, but the login flow should allow a second step later).

### 18.7 PII and IDOR controls

- Every admin read of an application, devotee, or invitation report re-checks the permission server-side.
- List endpoints mask email and phone; full values require a detail request that is audited.
- Devotee endpoints derive the user ID from the session and never accept a target user ID.
- Admin detail pages must not fetch data in a shared cache; use `no-store`.
- Browser storage must not persist applicant PII. Client-side caches are cleared on logout.
- Tests must attempt to read another applicant's PII by changing IDs and by calling admin endpoints as a devotee.

### 18.8 Headers, secrets, and logging

- Existing security headers remain: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production, no `X-Powered-By`.
- Add `Cache-Control: no-store` to all auth/account/admin responses.
- `AUTH_SECRET` is at least 32 random bytes, server-only, never `NEXT_PUBLIC_*`.
- `EMAIL_API_KEY`/`SMTP_URL` are server-only.
- Extend logger redaction as described in §17.5.
- Never log request bodies for auth or application endpoints.
- Do not include tokens in error messages or audit metadata.

### 18.9 Dependency and build controls

- Pin the password-hashing dependency and review advisories before adding it.
- If a native module is used, add it to `serverExternalPackages` and smoke-test the production build on the target platform.
- `npm run check:js-only` remains in every gate.
- Consider adding `npm audit --omit=dev` to CI after the dependency set stabilizes.

## 19. Devotee Management Dashboard structure

### 19.1 Routes

| Route                               | Purpose                                                             | Access                                                          |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| `/admin/devotees`                   | Overview cards + Applications and Devotees tabs                     | Administrator with `devotee:read:all` or `application:read:all` |
| `/admin/devotees?tab=applications`  | Application queue, search, filter, sort, pagination                 | `application:read:all`                                          |
| `/admin/devotees/applications/[id]` | Applicant detail, review history, internal notes, approve/reject    | `application:read:all`; decisions need review                   |
| `/admin/devotees?tab=devotees`      | Registered devotee list, search, filter, sort, pagination           | `devotee:read:all`                                              |
| `/admin/devotees/[id]`              | Devotee profile, application summary, status history, audit history | `devotee:read:all`                                              |
| `/admin/administrators`             | Administrator list, invitations, permission editor, suspension      | Super Admin only                                                |
| `/admin/audit`                      | Audit log viewer                                                    | `audit:read:all` or Super Admin                                 |
| `/admin/invitation-reports`         | Private invitation reports                                          | `invitation-report:read:all`                                    |

### 19.2 Overview cards

The `/admin/devotees` page shows:

- Total applications.
- Pending applications.
- Approved/active devotees.
- Rejected applications.
- Suspended accounts.
- Awaiting email verification (operational support).

Counts are computed server-side with indexed queries and are scoped to the caller's permissions. A caller without `application:read:all` does not receive application counts; a caller without `devotee:read:all` does not receive devotee counts. The page must not load all records to calculate them in the browser.

### 19.3 Applications tab

**Table columns:** applicant name, masked email, masked phone, status, email verified, submitted date, reviewer, reviewed date, actions.

**Search:** name, email, and phone using the normalised application snapshot fields. Minimum two characters. Search is debounced and server-side.

**Filters:** status (`pending`, `approved`, `rejected`, `expired`), email verification (`verified`, `unverified`), submission date range.

**Sort:** registration date (default newest first), review date, name. Each is server-side and index-backed.

**Pagination:** cursor-based; default 25, maximum 100. The UI must not request every page in the background.

**Applicant detail:**

- Full name, email, phone, gender, custom message, submission time. There is no date-of-birth field.
- Email-verification state and timestamps.
- Current account status and application status.
- Review history (reviewer display name, decision, timestamp).
- Internal notes panel (append-only, permission-gated).
- Approve and reject actions with confirmation dialogs.
- Approve is disabled when the email is unverified, with an explanation.
- Reject dialog offers an optional internal note; the dialog states that the note is never sent to the applicant.
- No password or hash is ever shown.

Every detail opening is audited. List views are not audited individually, but filters and result counts must not be exposed to unauthorized roles.

### 19.4 Devotees tab

**Table columns:** name, masked email, status, approved date, last login, suspended date, actions.

**Search/filter:** name/email; account status (`active`, `suspended`, `rejected`, `expired`); approval date range.

**Devotee detail:**

- Current account profile (name, email).
- Application summary (private fields visible only with `application:read:all`).
- Approval/rejection timestamps and reviewer.
- Suspension/reactivation history.
- Audit history for the account.
- Suspend and reactivate actions. Suspension requires a reason; reactivation requires an approved application and verified email.

### 19.5 Administrator management

- Super Admin only.
- Create an administrator with name, email, and permission set.
- Show invitation status (`invited`, `active`, `suspended`).
- Resend invitation; change permissions; suspend/reactivate.
- The UI never displays or accepts a password for another administrator.
- The last Super Admin and self-target actions are blocked in both UI and API.

### 19.6 UI behaviour and accessibility

- Server Components fetch data; client components handle filters, dialogs, and optimistic UI only where safe.
- Use URL query parameters for search/filter/sort/page so views are shareable and back-button friendly.
- Loading, empty, and error states are explicit; failed permission checks show a 403 page, not an empty table.
- Tables become stacked cards on mobile; touch targets and focus states follow the existing design system.
- Dialogs trap focus, restore focus on close, and announce errors.
- PII is not written to `localStorage`, `sessionStorage`, or client-side analytics.
- Masking is performed server-side; the client never receives full values it should not display.

## 20. Environment and configuration

Add to `.env.example` (placeholders only; never real values) **when implementation is approved**:

```dotenv
# --- Authentication -----------------------------------------------------------
# At least 32 random bytes, base64 or hex. Generate with: openssl rand -base64 48
AUTH_SECRET=

# applications | closed — public applications always require review
REGISTRATION_MODE=closed

# true | false — required before an application can be approved
REQUIRE_EMAIL_VERIFICATION=true

# Session lifetimes in days
SESSION_IDLE_DAYS=7
SESSION_ABSOLUTE_DAYS=30

# Set to 1 only behind a trusted reverse proxy that supplies X-Forwarded-For
TRUST_PROXY=0

# --- Transactional email ------------------------------------------------------
# dev | resend | smtp | disabled
EMAIL_PROVIDER=dev
EMAIL_FROM=no-reply@example.com
# EMAIL_API_KEY=
# SMTP_URL=
```

There are **no** retention or purge variables in Stage 2. Applicant/audit retention is deferred (D-19); adding a retention period to configuration before it is approved would imply a policy that does not exist.

Update `api/lib/env/env.js` with a Zod schema that validates:

- `AUTH_SECRET` minimum length 32; required when auth is enabled.
- `REGISTRATION_MODE` enum `applications` or `closed`.
- `REQUIRE_EMAIL_VERIFICATION` boolean coercion; must be true when `REGISTRATION_MODE=applications` and email is enabled.
- `SESSION_IDLE_DAYS`/`SESSION_ABSOLUTE_DAYS` positive integers with safe bounds.
- `TRUST_PROXY` boolean.
- `EMAIL_PROVIDER` enum; provider-specific variables required only for the selected provider.
- `APP_BASE_URL` valid absolute URL; required in production.
- No applicant retention or purge variable is accepted in Stage 2.

Environment validation must continue to name variables, never values. Production must fail fast if `AUTH_SECRET` is missing or too short, or if public applications are enabled without a working email transport.

## 21. Testing strategy

### 21.1 Unit tests (no network)

| File                                        | Proves                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tests/unit/auth/password.test.js`          | Hash/verify, wrong password, unique salts, rehash decision, timing-safe comparison, length limits |
| `tests/unit/auth/tokens.test.js`            | 32-byte token shape, SHA-256 hash, constant-time helpers, expiry math                             |
| `tests/unit/auth/session.test.js`           | Cookie serialization, production vs development flags, effective/absolute expiry, rotation, scope |
| `tests/unit/auth/permissions.test.js`       | Role/permission matrix; devotee denied admin permissions; reserved capabilities rejected          |
| `tests/unit/auth/application-state.test.js` | Allowed application transitions; approval requires verified email; no rejected→active transition  |
| `tests/unit/auth/csrf.test.js`              | Same-origin acceptance/rejection, missing Origin, content-type rules                              |
| `tests/unit/auth/rate-limit.test.js`        | Key hashing, window math, limit boundaries, retry headers                                         |
| `tests/unit/auth/validation.test.js`        | Six application fields, gender enum, phone, message, strict unknown-key rejection                 |
| `tests/unit/auth/safe-user.test.js`         | No password/token fields and no applicant PII in API projections                                  |
| `tests/unit/auth/pii.test.js`               | Redaction of email/phone/gender/message/notes in logs and audit builders                          |
| `tests/unit/auth/audit.test.js`             | Event names, metadata redaction, no PII                                                           |
| `tests/unit/auth/admin-permissions.test.js` | Default bundle, grant/revoke validation, no privilege escalation through input                    |

### 21.2 Integration tests (real `MONGODB_URI_TEST`, `_test` database only)

| File                                                  | Proves                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `tests/integration/application-submission.test.js`    | New application pending, duplicate generic response, one current application, audit                      |
| `tests/integration/application-verification.test.js`  | Token single-use, expiry, status transitions, resend invalidation                                        |
| `tests/integration/application-review.test.js`        | Approve/reject atomicity, email-verified requirement, generic rejection, decision audit                  |
| `tests/integration/application-notes.test.js`         | Notes append-only, permission-gated, never returned to applicants                                        |
| `tests/integration/auth-login.test.js`                | Active full login; verified pending/rejected limited login; unverified/suspended denials; generic errors |
| `tests/integration/auth-session.test.js`              | Full/application scope, idle/absolute expiry, one TTL index, revocation, logout, forged cookie           |
| `tests/integration/auth-recovery.test.js`             | Forgot always 202, reset single-use, password change, session revocation                                 |
| `tests/integration/auth-rate-limit.test.js`           | 429 boundaries, Retry-After, window reset (short test windows)                                           |
| `tests/integration/admin-devotees.test.js`            | List/filter/search, detail view, suspend/reactivate, self/last-admin guards                              |
| `tests/integration/admin-hierarchy.test.js`           | Super Admin creates admin, invitation acceptance, permission changes, revocation                         |
| `tests/integration/admin-application-idor.test.js`    | Devotee cannot read applications, notes, or admin routes; admin without permission denied                |
| `tests/integration/pii-projections.test.js`           | No gender/phone/message/email leakage in public or devotee-other responses; no unapproved fields exposed |
| `tests/integration/audit.test.js`                     | Audit writes for auth/application/admin events; no secrets/PII                                           |
| `tests/integration/invitation-report-privacy.test.js` | (Stage 4 model) aggregate-only devotee view, admin identity view, no invitee PII                         |

Test hygiene:

- Use `databaseSuiteGate` from `tests/helpers/database.js`; honor `UTSAV_TEST_REQUIRE_DB=1`.
- Delete only the auth/application collections in `beforeEach`/`afterEach`; never touch `utsav_connect`.
- Use unique emails such as `test+<uuid>@example.test`.
- Use synthetic phone numbers and applicant details; never real applicant data. Use only the six approved fields in test fixtures.
- Do not use production email transport in tests; use the development mailbox or a stub.
- Do not assert on raw tokens in logs; assert on database state and HTTP responses.
- Never snapshot full applicant documents in test output.

### 21.3 End-to-end tests (Playwright, JS only)

Add `@playwright/test` with a `.mjs` config. Run against a production build served with `next start`, using `MONGODB_URI` pointed at a `_test` database and a test-only email mailbox.

Journeys:

1. Visitor submits the six-field application; sees a generic accepted state; no session.
2. Applicant verifies email; status becomes pending approval. Login opens only `/application-status` with an `application`-scope session; `/dashboard` is denied.
3. Administrator opens `/admin/devotees`, searches the application, reviews detail, adds an internal note, and approves.
4. Applicant logs in after approval and reaches `/dashboard` with a full session; pending/rejected applicants never reach it.
5. Administrator rejects another application with an internal note; the applicant receives only the generic message, sees only the limited summary, and never sees the note.
6. Devotee opens `/admin` and `/api/admin/devotees` and is denied.
7. Administrator without `devotee:status:update` cannot suspend; with it, suspension takes effect on the next request.
8. Super Admin invites an administrator, assigns a permission set, and the invited administrator sets a password.
9. An administrator attempts to create another administrator or change permissions; denied.
10. Ordinary devotee cannot see another contributor's identity in invitation reports; an authorized administrator can.
11. Applicant PII is absent from public pages, aggregate responses, browser storage, and logs; no unapproved fields exist in the form or payload.
12. Keyboard-only navigation and visible focus on the application, review, and permission dialogs.

If Playwright cannot run in the current environment, the check is reported as **unverified**, not assumed. Browser verification remains a release requirement per `AGENTS.md`.

### 21.4 Manual verification

- Desktop and mobile-width application, login, recovery, and admin screens.
- Screen-reader labels, error announcements, and focus management in review dialogs.
- Cookie attributes in the browser dev tools.
- `Set-Cookie` and `Cache-Control` headers via `curl`.
- No token, password, or applicant PII in server logs, browser console, or audit records.
- Dashboard counts match filtered list totals.
- Masked list fields and full detail fields behave as specified.
- Approve/reject emails contain no internal notes.
- Suspension/reactivation and permission changes take effect immediately.

### 21.5 Gates

| Gate             | Command                                 | Required for Stage 2 completion |
| ---------------- | --------------------------------------- | ------------------------------- |
| Unit + static    | `make check`                            | Yes                             |
| Integration      | `make ci` (DB required)                 | Yes                             |
| Production build | `make build`                            | Yes                             |
| E2E              | `make test-e2e` (new target)            | Yes, or documented unverified   |
| Browser          | manual, recorded in `project-status.md` | Yes, or documented unverified   |
| Security review  | checklist in §18 plus tests             | Yes                             |

## 22. Acceptance criteria

A Stage 2 feature is complete only when all applicable criteria are met and recorded.

### Application and approval

- [ ] AC-01 The registration form contains exactly the six approved fields; unknown fields are rejected.
- [ ] AC-02 A valid submission creates a `pending_verification` user and a `pending` application; no session is created.
- [ ] AC-03 A duplicate email returns the same `202` response as a new email; no enumeration and no second current application.
- [ ] AC-04 Email verification is single-use, expires after 24 hours, and moves the user to `pending_approval`.
- [ ] AC-05 An unverified application cannot be approved; rejection is still possible.
- [ ] AC-06 Approval sets the application `approved` and the user `active` in one transaction.
- [ ] AC-07 Rejection sets the application `rejected` and the user `rejected`; the notification is generic and contains no internal note.
- [ ] AC-08 Concurrent approve/reject requests cannot both succeed.
- [ ] AC-09 Pending, rejected, and expired accounts cannot call devotee APIs. A verified applicant whose application is pending or rejected may hold only an `application`-scope session for `/application-status` and `GET /api/account/application`; the reserved `expired` state cannot log in or hold any session.
- [ ] AC-10 The application snapshot is immutable and visible only to the owner and authorized administrators.

### Roles and administration

- [ ] AC-11 The role enum is `devotee`, `admin`, `super_admin`; no client can set `role`.
- [ ] AC-12 The first Super Admin is created by CLI; no public endpoint or default password exists.
- [ ] AC-13 Only a Super Admin can create an administrator, change permissions, or suspend an administrator.
- [ ] AC-14 Administrator invitations are single-use, expire, and set a password chosen by the invitee.
- [ ] AC-15 An administrator cannot self-promote, self-demote, self-suspend, or change their own permissions.
- [ ] AC-16 The last active Super Admin cannot be suspended or demoted.
- [ ] AC-17 Privilege-escalation attempts through body, query, headers, or client role manipulation are rejected and tested.

### Privacy

- [ ] AC-18 Gender, phone, message, and internal notes never appear in public APIs, public pages, devotee-other profiles, or aggregate analytics. No unapproved field exists in any form, model, payload, projection, or test.
- [ ] AC-19 Admin list endpoints mask email and phone; full values require an audited detail request.
- [ ] AC-20 A devotee or limited applicant cannot read another applicant's or devotee's PII by changing an ID.
- [ ] AC-21 Logs and audit metadata contain no email, phone, gender, message, or note text, and no unapproved fields are logged.
- [ ] AC-22 Invitation reports store the submitter separately from the participant count and contain no invitee PII.
- [ ] AC-23 Devotees see only aggregate statistics and their own reports; administrators with permission see contributor identities.
- [ ] AC-24 No automatic applicant-PII deletion, expiry, or purge job runs; retention periods are documented as deferred until explicitly approved (D-19).

### Sessions and authentication

- [ ] AC-25 Correct credentials for an active account create a session and set an `HttpOnly`, `SameSite=Lax` cookie; `Secure` and `__Host-` in production.
- [ ] AC-26 Wrong password and unknown email both return `401 INVALID_CREDENTIALS`.
- [ ] AC-27 Logout revokes the session and clears the cookie; the old cookie no longer works.
- [ ] AC-28 Session idle/absolute expiry and revocation are enforced server-side.
- [ ] AC-29 Password recovery is generic, single-use, rate-limited, and revokes sessions.
- [ ] AC-30 Passwords and hashes are never returned, displayed, or logged.

### Dashboard and lifecycle

- [ ] AC-31 `/admin/devotees` shows the six overview counts and matches the filtered lists.
- [ ] AC-32 Application search covers name, email, and phone; filters and sorting are server-side and indexed.
- [ ] AC-33 Lists use cursor pagination with default 25 and maximum 100; no full-collection load.
- [ ] AC-34 Approve/reject, notes, suspension, and reactivation actions are permission-gated and audited.
- [ ] AC-35 Suspension revokes all sessions immediately.
- [ ] AC-36 Reactivation requires an approved application and verified email.
- [ ] AC-37 Deletion is not exposed; `deletedAt` remains unused pending policy.

### Security and verification

- [ ] AC-38 Mutating requests with a missing/mismatched Origin are rejected.
- [ ] AC-39 Auth, application, and admin rate limits return `429` with `Retry-After`.
- [ ] AC-40 Rate-limit keys and audit IPs are HMAC-hashed; no raw email/phone/IP in the database.
- [ ] AC-41 Audit records exist for all events in §16 and contain no secrets or applicant PII.
- [ ] AC-42 No password hash, session token, token hash, applicant PII, or driver error appears in an API response or log.
- [ ] AC-43 `npm run check:js-only` passes; no TypeScript file or config exists.
- [ ] AC-44 `make check`, `make ci`, and `make build` pass; browser/E2E gaps are recorded as unverified.
- [ ] AC-45 Documentation is synchronized: README, project status, roadmap, changelog, architecture, testing, deployment, security, database, decisions, product requirements.
- [ ] AC-46 Exactly one session TTL index exists on `expiresAt`; `absoluteExpiresAt` is not TTL-indexed and is enforced during validation.
- [ ] AC-47 Super Admin capabilities cannot be granted through `adminPermissions` or any ordinary permission update; every check is server-side.
- [ ] AC-48 The CLI Super Admin recovery procedure is documented and tested against `utsav_connect_test`.
- [ ] AC-49 An `application`-scope session cannot read `/api/account`, profile, password, devotee, or administrator routes.

## 23. Implementation batches

### Batch 0 — Decision lock and foundation (next batch, after approval)

- Accepted decisions are already recorded in `docs/decisions.md`; Batch 0 implements them and does not reopen them.
- Update `.env.example` and `api/lib/env/env.js` with the auth/application/email variables. No retention or purge variables.
- Add Mongoose models and safe projections: `user`, `session`, `auth-token`, `rate-limit`, `audit-log`, `devotee-application`, `devotee-application-note`.
- Add password, token, session-cookie (with scope), permission, application-state, CSRF, rate-limit, validation, and audit primitives with unit tests.
- Add `scripts/create-super-admin.js`, including the documented recovery mode, and `scripts/sync-indexes.js`.
- Add integration tests for model constraints/indexes, the application state machine, permission grants, the limited applicant session, and the bootstrap/recovery scripts.
- No auth Route Handlers, no application review UI, and no public pages in this batch.
- Gate: `make check` + `make ci` + production build; update docs status.

**Batch 0 acceptance criteria.**

- [ ] B0-01 `users.email` is unique; a duplicate insert is rejected by the database index and handled safely.
- [ ] B0-02 One current application per user is enforced by a partial unique index.
- [ ] B0-03 Application status transitions reject invalid transitions (for example rejected→active).
- [ ] B0-04 Approval requires a verified email in the state-machine tests.
- [ ] B0-05 `passwordHash`, `tokenHash`, and session hashes are `select: false` and absent from every safe projection.
- [ ] B0-06 Applicant PII is absent from the user model, public projections, and audit metadata. The six-field schema is enforced everywhere; no unapproved field exists in any model, projection, or audit metadata.
- [ ] B0-07 The permission map distinguishes devotee, admin (granted permissions), and Super Admin (reserved capabilities).
- [ ] B0-08 Unknown and reserved permission strings are rejected; ordinary permission updates cannot grant Super Admin capabilities.
- [ ] B0-09 `scripts/create-super-admin.js` creates exactly one Super Admin with a hidden password prompt and an audit record; its documented recovery mode is tested.
- [ ] B0-10 `scripts/sync-indexes.js` creates exactly one session TTL index on `expiresAt`, no TTL index on `absoluteExpiresAt`, and the expected other indexes against `utsav_connect_test`.
- [ ] B0-11 No Route Handler, login UI, registration UI, or admin UI is added in Batch 0.
- [ ] B0-12 `make check`, `make ci`, and `make build` pass; the JavaScript-only guard passes.
- [ ] B0-13 Documentation records exactly what was verified and what remains unverified.
- [ ] B0-14 No real email is sent; tests use the development mailbox or a stub.
- [ ] B0-15 No production, development, or shared database is modified outside `utsav_connect_test`.

### Batch 1 — Application submission, verification, login, and recovery

- `POST /api/auth/register` (application form), `verify-email`, `resend-verification`, `login`, `logout`, `GET /api/auth/session`.
- Email verification and password recovery endpoints.
- Account-state handling: verified pending/rejected applicants receive only an `application`-scope session; no devotee access. `/application-status` and `GET /api/account/application` are the only allowed routes.
- Integration tests for submission, duplicates, verification, login, sessions, recovery, and rate limits.
- No admin review UI yet; review uses tests or an operator script only if explicitly approved.

### Batch 2 — Application review and devotee management APIs

- `application:read:all`/`review:all`/`note:write` services and endpoints.
- Overview counts; application search/filter/sort/pagination; detail; approve/reject; notes.
- Devotee list/detail; suspend/reactivate; audit history.
- PII masking, audited detail views, and IDOR tests.
- No admin dashboard UI yet.

### Batch 3 — Administrator hierarchy and `/admin/devotees` UI

- Super Admin bootstrap and administrator invitation flow.
- Administrator permission management and suspension.
- `/admin/devotees` overview, application queue, detail/review, notes, devotee management, and audit viewer.
- Accessible dialogs, mobile layout, loading/empty/error states.
- Browser and E2E verification for the review workflow.

### Batch 4 — Privacy boundaries and invitation-report integration

- Invitation-report permission constants and privacy tests against the Stage 4 model.
- Admin report list/detail routes (if the report model is available; otherwise these remain documented and not implemented).
- Devotee own-report and aggregate endpoints when Stage 4 begins.
- No invitee PII collection.

### Batch 5 — Hardening and Stage 2 closure

- Rate-limit tuning, dependency audit, security review.
- Full `make check`, `make ci`, production build, E2E, and browser record.
- Sync all documentation and record exact evidence in `project-status.md`.
- Close Stage 2 only when the acceptance criteria are verified or explicitly marked unverified with owner approval.

**Exact next implementation batch:** Batch 0 only, and only after the owner explicitly approves the final checklist in the decision report. D-25 is **ACCEPTED** (Option A); no owner confirmation remains pending for it. Batch 0 remains unauthorized until that explicit implementation approval. Batch 0 must not add login UI, application UI, admin UI, or public auth Route Handlers.

## 24. Risks and open items

| Risk / open item                             | Impact                                    | Mitigation / owner action                                                                                                            |
| -------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Native Argon2 unsupported on host            | Build/runtime failure                     | Verify on target platform; fallback scrypt; document ADR                                                                             |
| Email provider not chosen                    | Applications cannot verify or notify      | Keep `REGISTRATION_MODE=closed` until D-08 is resolved                                                                               |
| PII exposed by a broad admin permission      | Privacy breach                            | Split `application:read:all` from list/detail access; mask lists; audit detail views                                                 |
| Administrator over-granted permissions       | Insider risk                              | Default least-privilege bundle; Super Admin review; reserved capabilities blocked                                                    |
| Privilege escalation through mass assignment | Full compromise                           | Strict schemas; server-derived role/status; tests for role/permission injection                                                      |
| Duplicate applications or accounts           | Data integrity and review confusion       | Unique email; partial unique current application; generic duplicate handling                                                         |
| Rejection notice leaks internal notes        | Privacy and trust breach                  | Separate notes model; template review; tests assert note text absent                                                                 |
| Application retention not approved           | Unbounded PII retention                   | No purge/expiry job until D-19 is approved; periods documented as deferred                                                           |
| Limited applicant session overreaches        | Unauthorized access                       | Separate scope; own-summary route only; server-side scope check; revoke on approval                                                  |
| Unapproved field introduced by a client      | Unnecessary sensitive data                | Strict schema contains only six approved fields; unknown keys are rejected; no unapproved field in a model, API, UI, or test fixture |
| Invitation report contributor identity leak  | Privacy breach                            | Permission-gated admin endpoints; aggregate-only devotee views; tests                                                                |
| Native module/deployment target mismatch     | Production failure                        | Smoke-test build; `serverExternalPackages`; fallback documented                                                                      |
| No MFA for administrators                    | Higher impact if password reused          | Recommend MFA before public launch; login flow leaves room                                                                           |
| `TRUST_PROXY` misconfiguration               | Rate limits bypassed or over-applied      | Document deployment requirement; default off                                                                                         |
| No account deletion                          | Privacy request cannot be fully satisfied | Defer with D-07/D-19; define retention/anonymisation before launch                                                                   |
| Audit log volume and PII                     | Cost and privacy risk                     | Small metadata; no PII; retention policy; admin-only viewer                                                                          |

## 25. Non-goals and explicit non-claims

This specification does **not** claim that any control is implemented. It does not authorize:

- writing authentication, application, administrator, or dashboard code;
- adding dependencies;
- creating collections in the development or production database;
- sending real email;
- creating an administrator account;
- deploying or pushing Stage 2 work;
- implementing invitation reports or any Stage 3–5 feature.

Those actions require owner approval of the decision report and a separate implementation instruction.

<!-- END -->
