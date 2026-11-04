# Stage 2 authentication specification (PROPOSED)

**Status: PROPOSED — not implemented and not authorized.** This document is a design artifact for owner review. No authentication code, model, route, dependency, or environment variable described here exists in the repository yet.

- Date: 2026-11-04
- Scope: Roadmap Stage 2 / Phase 4 — authentication, sessions, roles, protected routes, account lifecycle.
- Decision inputs: [`stage-2-decision-report.md`](stage-2-decision-report.md), [`decisions.md`](decisions.md) ADR-010.
- Language constraint: **JavaScript and JSX only.** No `.ts`, `.tsx`, `tsconfig*.json`, or `next-env.d.ts` may be introduced.

This specification assumes the recommended option set in the decision report. Sections marked **[conditional]** change if the owner chooses a different option.

## 1. Scope

### In scope

- Email + password registration, login, logout.
- Email verification (conditional on D-03).
- Password change and forgotten-password reset.
- Opaque, database-backed sessions with immediate revocation.
- Role-based access control for visitor, devotee, and administrator.
- Server-side protection of pages and Route Handlers.
- Account suspension and reactivation.
- Audit logging for authentication and account-administration events.
- Rate limiting for sensitive endpoints.
- MongoDB models and indexes for `users`, `sessions`, `authTokens`, `rateLimits`, `auditLogs`.
- Unit, integration, security, and browser test plans.
- Documentation and environment-variable updates.

### Out of scope

- OAuth, magic links, passkeys, MFA, SSO.
- Email-address change.
- Self-service account deletion or anonymisation (deferred, D-07).
- Invitation codes (deferred; `REGISTRATION_MODE=closed` is the pilot mechanism).
- Coordinator role and area assignments.
- Google Maps, areas, proposals, reports, population, leaderboard.
- Production deployment, domain, TLS, email-domain authentication (Stage 7).
- A public user directory or public devotee profiles.

## 2. Architecture

### 2.1 Principles

1. **Server-authoritative.** The UI may hide controls, but every protected page and API re-checks the session and permission on the server.
2. **Opaque sessions.** The browser holds a random token; the database holds only its hash. No user data is encoded in the cookie.
3. **Least privilege.** New accounts are devotees. Administrator is an explicit, audited grant. There is no public administrator registration.
4. **Revocable by default.** Logout, suspension, password reset, and role change revoke sessions immediately.
5. **Minimise personal data.** Email and display name only; no address, phone, or precise location. IP addresses are HMAC-hashed if stored.
6. **Fail safely.** Generic client errors; detailed server logs; no secrets in responses or audit records.
7. **One envelope.** Every Route Handler uses `api/lib/http/responses.js`.

### 2.2 Module layout (planned)

```text
app/
├── login/page.jsx
├── register/page.jsx
├── verify-email/page.jsx
├── forgot-password/page.jsx
├── reset-password/page.jsx
├── account/
│   ├── layout.jsx              # requireUser()
│   ├── page.jsx                # profile
│   └── password/page.jsx
├── dashboard/
│   └── layout.jsx              # requireUser()
├── admin/
│   ├── layout.jsx              # requireRole("admin")
│   ├── page.jsx
│   ├── users/page.jsx
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
    │   └── reset-password/route.js
    ├── account/
    │   ├── route.js
    │   ├── profile/route.js
    │   └── password/route.js
    └── admin/
        ├── users/route.js
        ├── users/[id]/status/route.js
        ├── users/[id]/role/route.js
        └── audit-logs/route.js

api/
├── lib/
│   ├── auth/
│   │   ├── password.js          # hash, verify, needsRehash
│   │   ├── tokens.js            # random token, hash, verify shape
│   │   ├── session.js           # create, read, revoke, cookie helpers
│   │   ├── permissions.js       # role → permission map, assertPermission
│   │   ├── rate-limit.js        # MongoDB fixed-window counters
│   │   └── csrf.js              # Origin / content-type checks
│   ├── email/
│   │   ├── mailer.js            # provider-agnostic interface
│   │   ├── dev-mailbox.js       # writes to .local/mail/
│   │   └── templates.js
│   └── http/handler.js          # withApiHandler wrapper
├── models/
│   ├── user.js
│   ├── session.js
│   ├── auth-token.js
│   ├── rate-limit.js
│   └── audit-log.js
└── services/
    ├── auth-service.js
    ├── account-service.js
    └── admin-user-service.js

ui/
├── components/auth/             # AuthForm, PasswordField, FieldError
├── components/account/          # ProfileForm, PasswordForm
├── components/admin/            # UserTable, StatusDialog, AuditTable
└── lib/auth-client.js           # fetch wrapper for auth endpoints

middleware.js                    # optional cookie-presence redirect only
scripts/
├── create-admin.js
├── create-user.js
└── sync-indexes.js
```

The exact file names can be adjusted during implementation, but the layer boundaries must not be: routing in `app/`, presentation in `ui/`, server-only domain code in `api/`.

### 2.3 Request flow — login

```text
POST /api/auth/login
  └─ app/api/auth/login/route.js
       └─ withApiHandler({ schema: loginSchema, rateLimit: "login" })
            ├─ assertSameOrigin(request)
            ├─ parse + validate JSON (Zod, strict)
            ├─ authService.login({ email, password, requestMeta })
            │    ├─ user = User.findOne({ email: normalized }).select("+passwordHash")
            │    ├─ verifyPassword (or dummy verify for unknown email)
            │    ├─ check status / email verification
            │    ├─ createSession(user) → raw token + hashed record
            │    ├─ auditLog("auth.login_succeeded")
            │    └─ return { user: safeUser, rawToken, expiresAt }
            └─ jsonSuccess(...) + Set-Cookie
```

### 2.4 Request flow — protected API

```text
GET /api/account
  └─ withApiHandler({ auth: "required" })
       ├─ read __Host-utsav_session cookie
       ├─ hash token, find session (not revoked, not expired)
       ├─ load user, check status === "active"
       ├─ throttled lastSeenAt update
       ├─ handler({ user, session })
       └─ jsonSuccess(safeUser)
```

### 2.5 Request flow — protected page

```text
/dashboard → app/dashboard/layout.jsx
  └─ requireUser()  (server component)
       ├─ read cookie via next/headers cookies()
       ├─ validate session + user
       ├─ no session → redirect("/login?next=/dashboard")
       └─ suspended/deleted → redirect("/login?reason=unavailable")
```

`middleware.js` may perform a cheap cookie-presence redirect for `/dashboard`, `/account`, and `/admin`, but it must not be the authorization boundary. It cannot query MongoDB safely in the Edge runtime, and a forged cookie must still fail in the server layout and API.

## 3. Roles, permissions, and ownership

### 3.1 Role model

| Role          | Definition                                | Stage 2 capabilities                                                                                      |
| ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Visitor       | No authenticated session                  | Public pages, public statistics, health endpoint, login/register/recovery pages                           |
| Devotee       | Registered account with `role: "devotee"` | Everything a visitor can do, plus own profile, own password, own session, and later own reports/proposals |
| Administrator | Account with `role: "admin"`              | Everything a devotee can do, plus user administration and audit history                                   |

`visitor` is not stored on a user document. It is the absence of a valid session. `coordinator` is not implemented in Stage 2; adding it later is a schema-enum extension plus an area-assignment model.

### 3.2 Permission constants

Permissions are strings in the form `resource:action[:scope]`:

```text
account:read:self
account:update:self
account:password:update:self
admin:users:read
admin:users:status:update
admin:users:role:update
admin:audit:read
```

Planned for later stages (not granted in Stage 2): `report:create`, `report:read:self`, `proposal:create`, `proposal:update:self`, `area:manage`, `population:manage`, `report:moderate`. Defining them now avoids inventing ad-hoc checks later, but they must not be granted until the corresponding feature exists.

### 3.3 Role → permission map

| Permission                     | Devotee | Administrator |
| ------------------------------ | ------- | ------------- |
| `account:read:self`            | yes     | yes           |
| `account:update:self`          | yes     | yes           |
| `account:password:update:self` | yes     | yes           |
| `admin:users:read`             | no      | yes           |
| `admin:users:status:update`    | no      | yes           |
| `admin:users:role:update`      | no      | yes           |
| `admin:audit:read`             | no      | yes           |

### 3.4 Ownership rules

- `account:*:self` always derives the user ID from the session, never from the URL or body.
- Admin endpoints may read or change another user only through the `/api/admin/users/:id/*` routes and only with an admin permission.
- A devotee must never be able to change a request to another user's ID and succeed. This is tested explicitly.
- Route-level role checks are necessary but not sufficient; resource ownership checks are added when reports and proposals exist.

## 4. MongoDB data model

All models use Mongoose 9, `timestamps: true`, explicit collection names, and `strict: "throw"` where practical. `passwordHash` and token hashes use `select: false`. No model exposes a raw document directly to a Route Handler; services return safe projections.

### 4.1 `users`

| Field               | Type          | Rules / notes                                                            |
| ------------------- | ------------- | ------------------------------------------------------------------------ |
| `_id`               | ObjectId      | Primary key                                                              |
| `email`             | String        | Required, unique, trimmed, lowercased for lookup; max 254                |
| `name`              | String        | Required, 2–80 characters, trimmed, control characters rejected          |
| `passwordHash`      | String        | Required; `select: false`; never returned                                |
| `passwordAlgorithm` | String        | e.g. `argon2id`; `select: false`; used for rehash decisions              |
| `role`              | String enum   | `devotee` or `admin`; default `devotee`                                  |
| `status`            | String enum   | `pending_verification`, `active`, `suspended`; default depends on policy |
| `emailVerifiedAt`   | Date / null   | Set on verification or administrator creation                            |
| `failedLoginCount`  | Number        | Default 0; reset on successful login                                     |
| `lockedUntil`       | Date / null   | Temporary lock after repeated failures                                   |
| `lastLoginAt`       | Date / null   | Updated on successful login                                              |
| `passwordChangedAt` | Date / null   | Set on password change/reset                                             |
| `suspendedAt`       | Date / null   | Set by administrator                                                     |
| `suspensionReason`  | String / null | 3–500 characters; administrator-only visibility                          |
| `deletedAt`         | Date / null   | Reserved for the deferred soft-delete flow                               |
| `createdAt`         | Date          | Mongoose timestamp                                                       |
| `updatedAt`         | Date          | Mongoose timestamp                                                       |

**Indexes.**

```text
{ email: 1 } unique
{ role: 1, status: 1 }
{ status: 1, createdAt: -1 }
{ createdAt: -1 }
```

**Index rationale.** `email` is the login lookup and must be unique. `role + status` supports admin filters. `status + createdAt` supports the user list and future moderation queues. No index on `name` in Stage 2; add a text/index strategy only when search requires it.

### 4.2 `sessions`

| Field               | Type        | Rules / notes                                                                                           |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `_id`               | ObjectId    | Primary key                                                                                             |
| `userId`            | ObjectId    | Required, ref `User`, indexed                                                                           |
| `tokenHash`         | String      | Required, unique, SHA-256 hex, `select: false`                                                          |
| `createdAt`         | Date        | Mongoose timestamp                                                                                      |
| `lastSeenAt`        | Date        | Updated at most once per 5 minutes                                                                      |
| `expiresAt`         | Date        | Idle expiry (default now + 7 days)                                                                      |
| `absoluteExpiresAt` | Date        | Absolute expiry (default now + 30 days)                                                                 |
| `revokedAt`         | Date / null | Set on logout, suspension, password reset, role change                                                  |
| `revokedReason`     | String/null | `logout`, `logout_all`, `password_reset`, `password_change`, `suspended`, `role_change`, `admin_revoke` |
| `ipHash`            | String/null | HMAC-SHA-256 of the client IP with `AUTH_SECRET`                                                        |
| `userAgent`         | String/null | Truncated to 300 characters; no secrets                                                                 |

**Indexes.**

```text
{ tokenHash: 1 } unique
{ userId: 1, revokedAt: 1 }
{ expiresAt: 1 } TTL, expireAfterSeconds: 0
{ absoluteExpiresAt: 1 } TTL, expireAfterSeconds: 0
```

The application checks expiry explicitly; TTL deletion is housekeeping, not the authorization decision. Two TTL indexes are intentional: the earliest expiry removes the record.

### 4.3 `authTokens`

Used for email verification and password reset; a single collection keeps token handling consistent.

| Field       | Type        | Rules / notes                                   |
| ----------- | ----------- | ----------------------------------------------- |
| `_id`       | ObjectId    | Primary key                                     |
| `userId`    | ObjectId    | Required, ref `User`                            |
| `purpose`   | String enum | `email_verification`, `password_reset`          |
| `tokenHash` | String      | Required, unique, SHA-256 hex, `select: false`  |
| `expiresAt` | Date        | 24 hours for verification, 30 minutes for reset |
| `usedAt`    | Date / null | Set atomically when consumed                    |
| `createdAt` | Date        | Mongoose timestamp                              |

**Indexes.**

```text
{ tokenHash: 1 } unique
{ userId: 1, purpose: 1, usedAt: 1 }
{ expiresAt: 1 } TTL, expireAfterSeconds: 0
```

Before issuing a new token for a user/purpose, invalidate unused tokens of that purpose. Consumption uses `findOneAndUpdate({ tokenHash, purpose, usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } })` so two concurrent requests cannot both succeed.

### 4.4 `rateLimits`

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

`_id` is the key, so no extra unique index is needed. The key never contains a raw email or IP address.

### 4.5 `auditLogs`

| Field         | Type            | Rules / notes                                                       |
| ------------- | --------------- | ------------------------------------------------------------------- |
| `_id`         | ObjectId        | Primary key                                                         |
| `actorUserId` | ObjectId / null | Null for anonymous failures and bootstrap events                    |
| `actorRole`   | String/null     | `devotee`, `admin`, `system`                                        |
| `action`      | String          | Dotted lowercase event name, e.g. `auth.login_succeeded`            |
| `targetType`  | String/null     | `user`, `session`, `system`                                         |
| `targetId`    | String/null     | String form of the target ID                                        |
| `outcome`     | String enum     | `success`, `failure`                                                |
| `reasonCode`  | String/null     | Stable code, e.g. `INVALID_CREDENTIALS`, `ACCOUNT_SUSPENDED`        |
| `metadata`    | Object          | Small, safe, redacted context; no email, token, password, or cookie |
| `ipHash`      | String/null     | HMAC-SHA-256 with `AUTH_SECRET`                                     |
| `userAgent`   | String/null     | Truncated; same privacy rules as sessions                           |
| `createdAt`   | Date            | Mongoose timestamp; immutable                                       |

**Indexes.**

```text
{ createdAt: -1 }
{ actorUserId: 1, createdAt: -1 }
{ action: 1, createdAt: -1 }
{ targetType: 1, targetId: 1, createdAt: -1 }
```

No TTL index until a retention period is approved (D-10). No update or delete service functions. An optional Mongoose pre-hook can reject updates/deletes as a defence in depth.

### 4.6 Index creation

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
- A password reset invalidates all existing sessions and unused reset tokens.

### 5.3 Timing and enumeration

- For an unknown email, perform a dummy Argon2id/scrypt verification against a fixed hash so response time does not reveal account existence.
- Login returns the same `401 INVALID_CREDENTIALS` for unknown email and wrong password.
- Account-state errors (`EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`) are returned only after the password verifies correctly.
- Forgot-password, resend-verification, and registration responses are generic (see §12).

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
- `lastSeenAt`/`expiresAt` are extended at most once every 5 minutes to avoid a write per request.
- A new token is generated on every login, which prevents session fixation.
- Logout revokes the current session and clears the cookie.
- Password change/reset, suspension, and role change revoke all sessions for the user.
- An administrator may revoke a user's sessions through suspension.

### 6.4 Lookup and failure behaviour

1. Read the cookie. If absent, the user is a visitor.
2. Hash the token and find a session with `revokedAt: null`, `expiresAt > now`, and `absoluteExpiresAt > now`.
3. Load the user. If missing, suspended, or deleted, revoke the session and treat the request as unauthenticated/forbidden.
4. Return a safe user projection; never return `passwordHash` or token hashes.
5. If MongoDB is unavailable, return `503 SERVICE_UNAVAILABLE` through the existing error mapping; do not silently treat the user as a visitor for protected operations.

## 7. Registration and email verification

### 7.1 Registration modes

| Mode     | Behaviour                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------- |
| `open`   | `POST /api/auth/register` accepts a new account. Email verification is required before login.            |
| `closed` | `POST /api/auth/register` returns `403 REGISTRATION_CLOSED`. Administrators create accounts out of band. |

`REGISTRATION_MODE` defaults to `closed` in production until the owner explicitly enables open registration. Development defaults to `open` for testing.

### 7.2 Registration flow (`open`)

1. Validate `{ name, email, password }` with a strict Zod schema.
2. Normalise email for lookup (trim, lowercase). Keep the original casing only if needed for display; the canonical stored value is lowercase.
3. Check rate limits by IP and email HMAC.
4. Look up the email.
   - **New:** create a user with `role: "devotee"`, `status: "pending_verification"` (if verification is required) or `active`, and no session.
   - **Existing, verified:** do not create a duplicate; send an "account already exists" email with a login/reset link.
   - **Existing, unverified:** invalidate old verification tokens and send a fresh verification email.
   - **Suspended/deleted:** do not reveal the state; send nothing or a generic support message.
5. Always return `202 { data: { status: "accepted" } }` for a syntactically valid request, whether or not the email existed. This avoids account enumeration.
6. If email delivery fails, return `503 EMAIL_UNAVAILABLE` and log the failure without the token or address. The account may exist; a later resend or administrator action can complete verification.
7. Audit `auth.register` with the new user ID if one was created; do not record the raw email.

### 7.3 Verification flow

1. The verification email links to `${APP_BASE_URL}/verify-email#token=<raw-token>`. The fragment is not sent to the server in the initial request, keeping it out of access logs and cross-origin referrers.
2. The page reads the fragment in a client component and posts `{ token }` to `POST /api/auth/verify-email`.
3. The API hashes the token, finds an unused, unexpired `authTokens` record with purpose `email_verification`, marks it used atomically, sets `emailVerifiedAt`, and changes `status` to `active` (if it was `pending_verification`).
4. Audit `auth.email_verified`.
5. Return `200 { data: { verified: true } }`. The user can now log in.
6. Expired/invalid tokens return `400 TOKEN_EXPIRED` or `400 TOKEN_INVALID`. The page offers a resend link.

### 7.4 Resend verification

- `POST /api/auth/resend-verification` accepts `{ email }` and always returns `202` for a valid email shape.
- Rate limited by IP and email HMAC (for example 5 per hour per IP, 3 per hour per email).
- Only an existing, unverified, non-suspended user receives an email.
- Old unused verification tokens are invalidated before a new one is issued.
- Administrator-created accounts are already verified; a resend request for them is a no-op with the same `202`.

## 8. Login and logout

### 8.1 Login

1. Validate `{ email, password }`; do not reveal which field failed.
2. Apply per-IP and per-email rate limits before touching the password hash.
3. Load the user with `+passwordHash`; if absent, perform a dummy verification and return `401 INVALID_CREDENTIALS`.
4. Verify the password with a constant-time comparison.
5. On failure: increment the failure counter, apply temporary lockout if the threshold is crossed, audit `auth.login_failed`, and return `401 INVALID_CREDENTIALS`.
6. On success but `emailVerifiedAt` is null: return `403 EMAIL_NOT_VERIFIED` without creating a session.
7. On success but `status === "suspended"`: return `403 ACCOUNT_SUSPENDED` without creating a session.
8. On success: reset counters, set `lastLoginAt`, create a new session, audit `auth.login_succeeded`, set the cookie, return the safe user.
9. Never log the email, password, or session token.

### 8.2 Logout

- `POST /api/auth/logout` is idempotent.
- If a valid session exists, revoke it with reason `logout` and audit `auth.logout`.
- Always clear the cookie and return `204`.
- A cross-site logout is low-impact but still rejected by the origin check for consistency.

### 8.3 Session endpoint

- `GET /api/auth/session` returns the safe user and session expiry for the UI.
- `401` when there is no valid session.
- Never returns the token, its hash, or the user's password metadata.

## 9. Password change and recovery

### 9.1 Change password (authenticated)

1. Require a valid session.
2. Validate `{ currentPassword, newPassword }`.
3. Verify the current password; wrong password returns `401 INVALID_CREDENTIALS`.
4. Reject if the new password equals the current password.
5. Hash and update; set `passwordChangedAt`; revoke all **other** sessions and rotate the current session.
6. Audit `auth.password_changed`.
7. Return `200 { data: { changed: true } }`.

### 9.2 Forgot password

1. Validate `{ email }`; apply rate limits.
2. Always return `202 { data: { status: "accepted" } }`, whether or not the account exists.
3. If an active, verified user exists: invalidate old reset tokens, create a 32-byte token valid for 30 minutes, store only its SHA-256 hash, and send `${APP_BASE_URL}/reset-password#token=<raw-token>`.
4. Audit `auth.password_reset_requested` without the email or token.
5. If email delivery fails, return `503 EMAIL_UNAVAILABLE`; do not claim an email was sent.

### 9.3 Reset password

1. Validate `{ token, password }`.
2. Atomically consume the token (unused, unexpired, purpose `password_reset`).
3. Hash the new password and update the user; set `passwordChangedAt`.
4. Revoke **all** sessions for the user, including the current one.
5. Invalidate any remaining reset tokens for the user.
6. Audit `auth.password_reset_completed`.
7. Return `200 { data: { reset: true } }`; the user logs in again.
8. Invalid/expired/used tokens return `400 TOKEN_INVALID` or `400 TOKEN_EXPIRED`.

### 9.4 Administrator verification override

- An administrator may mark an existing unverified account as verified after an out-of-band identity check.
- The action is audited as `admin.user_email_verified` with the administrator as actor.
- The endpoint is admin-only and rate-limited; it is not a general "set password" endpoint.

## 10. Account lifecycle and suspension

### 10.1 States

```text
register (open) ──▶ pending_verification ──verify──▶ active
register (closed/admin) ───────────────────────────▶ active
active ──admin suspend──▶ suspended ──admin reactivate──▶ active
active/suspended ──deferred deletion──▶ deleted (soft, anonymised)
```

### 10.2 Suspension rules

- Only an administrator with `admin:users:status:update` may suspend or reactivate.
- An administrator cannot suspend their own account (`409 SELF_ACTION_NOT_ALLOWED`).
- The last active administrator cannot be suspended (`409 LAST_ADMIN`).
- Suspension sets `status`, `suspendedAt`, `suspensionReason`, and revokes all sessions with reason `suspended`.
- Login for a suspended user returns `403 ACCOUNT_SUSPENDED` only after a correct password.
- Reactivation clears suspension fields; email verification is not silently granted; the user must log in again.
- Every transition writes an audit record.

### 10.3 Deletion (deferred)

- No self-service deletion endpoint in Stage 2.
- The `deletedAt` field is reserved; no code sets it yet.
- A future flow must anonymise name/email, revoke sessions, retain audit records under a non-identifying reference, and define how reports/proposals remain historically valid.
- The retention period is an owner/privacy decision (D-07, D-10). Do not invent it in code.

## 11. Authorization

### 11.1 Server helpers

| Helper                          | Purpose                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `getSession()`                  | Read cookie, validate session, return `{ user, session }` or `null`  |
| `requireUser()`                 | Return the user or throw `UnauthorizedError`; used by pages and APIs |
| `requireRole(role)`             | Require `user.role === role` or throw `ForbiddenError`               |
| `requirePermission(permission)` | Check the role → permission map or throw `ForbiddenError`            |
| `requireVerifiedEmail()`        | Throw `EmailNotVerifiedError` when `emailVerifiedAt` is null         |
| `assertSameOrigin(request)`     | Reject mutating requests with a missing/mismatched `Origin`          |

### 11.2 Protected pages

| Path                  | Guard                             | Failure behaviour                  |
| --------------------- | --------------------------------- | ---------------------------------- |
| `/dashboard/**`       | `requireUser()`                   | Redirect to `/login?next=<path>`   |
| `/account/**`         | `requireUser()`                   | Redirect to `/login?next=<path>`   |
| `/admin/**`           | `requireRole("admin")`            | Redirect to `/login` or a 403 page |
| `/login`, `/register` | Redirect if already authenticated | Redirect to `/dashboard`           |

Server Components are the authority. A client-side `useSession` hook is for display only and must not gate access.

### 11.3 Protected API

`withApiHandler` options:

```js
withApiHandler(handler, {
  schema, // optional Zod schema for body or query
  auth: "required", // "none" | "required" | "optional"
  roles: ["admin"], // optional role allow-list
  permission: "admin:users:read",
  verified: true, // require emailVerifiedAt
  rateLimit: "admin", // named policy
});
```

The wrapper:

1. Assigns a request ID.
2. Rejects non-JSON content types for mutating requests.
3. Calls `assertSameOrigin` for `POST`, `PUT`, `PATCH`, `DELETE`.
4. Applies the rate limit.
5. Resolves the session and user.
6. Checks role/permission/verification.
7. Parses and validates the body/query with a strict Zod schema.
8. Calls the handler with `{ request, user, session, body, query, requestId }`.
9. Maps errors through `errorToResponse`.
10. Sets `Cache-Control: no-store`.

If the user is suspended or deleted mid-session, the wrapper returns `401`/`403` and revokes the session; it never continues with a stale role.

## 12. API contracts

### 12.1 Conventions

- Base path: `/api`.
- Request and response bodies are JSON (`application/json`), except `204` responses.
- Success: `{ "success": true, "data": ... }`.
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`.
- All auth/account/admin responses include `Cache-Control: no-store`.
- IDs are strings in JSON.
- No endpoint accepts a session token in the body.
- No endpoint returns `passwordHash`, `passwordAlgorithm`, session hashes, or token hashes.
- Rate-limited responses set `Retry-After` and `X-RateLimit-*` headers where available.

### 12.2 Endpoint summary

| Method | Path                                | Auth     | Role  | Purpose                                  |
| ------ | ----------------------------------- | -------- | ----- | ---------------------------------------- |
| POST   | `/api/auth/register`                | none     | —     | Create an account or accept generically  |
| POST   | `/api/auth/login`                   | none     | —     | Authenticate and create a session        |
| POST   | `/api/auth/logout`                  | optional | —     | Revoke the current session               |
| GET    | `/api/auth/session`                 | required | any   | Current user and session metadata        |
| POST   | `/api/auth/verify-email`            | none     | —     | Consume an email-verification token      |
| POST   | `/api/auth/resend-verification`     | none     | —     | Request another verification email       |
| POST   | `/api/auth/forgot-password`         | none     | —     | Request a password-reset email           |
| POST   | `/api/auth/reset-password`          | none     | —     | Consume a reset token and set a password |
| GET    | `/api/account`                      | required | any   | Current account                          |
| PATCH  | `/api/account/profile`              | required | any   | Update display name                      |
| POST   | `/api/account/password`             | required | any   | Change password                          |
| GET    | `/api/admin/users`                  | required | admin | List/filter users                        |
| GET    | `/api/admin/users/:id`              | required | admin | Read one user                            |
| PATCH  | `/api/admin/users/:id/status`       | required | admin | Suspend/reactivate                       |
| PATCH  | `/api/admin/users/:id/role`         | required | admin | Change role                              |
| PATCH  | `/api/admin/users/:id/verify-email` | required | admin | Manual verification override             |
| GET    | `/api/admin/audit-logs`             | required | admin | Read audit history                       |

### 12.3 Detailed contracts

#### `POST /api/auth/register`

Request:

```json
{ "name": "Asha Devi", "email": "asha@example.com", "password": "correct horse battery staple" }
```

Responses:

| Status | Code / data                | When                                                          |
| ------ | -------------------------- | ------------------------------------------------------------- |
| 202    | `{ "status": "accepted" }` | Valid request, regardless of whether the email already exists |
| 400    | `VALIDATION_ERROR`         | Invalid name/email/password                                   |
| 403    | `REGISTRATION_CLOSED`      | `REGISTRATION_MODE=closed`                                    |
| 429    | `RATE_LIMITED`             | Registration rate limit exceeded                              |
| 503    | `EMAIL_UNAVAILABLE`        | Email transport failed                                        |

The response never says "email already registered". The email sent to an existing verified address says an account already exists and offers login/reset; it does not disclose the password or session.

#### `POST /api/auth/login`

Request:

```json
{ "email": "asha@example.com", "password": "correct horse battery staple" }
```

Success `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66...",
      "name": "Asha Devi",
      "email": "asha@example.com",
      "role": "devotee",
      "status": "active",
      "emailVerified": true
    },
    "session": { "expiresAt": "2026-12-04T00:00:00.000Z" }
  }
}
```

Errors:

| Status | Code                  | Notes                                               |
| ------ | --------------------- | --------------------------------------------------- |
| 400    | `VALIDATION_ERROR`    | Missing/invalid fields                              |
| 401    | `INVALID_CREDENTIALS` | Unknown email or wrong password; identical response |
| 403    | `EMAIL_NOT_VERIFIED`  | Correct password, unverified email                  |
| 403    | `ACCOUNT_SUSPENDED`   | Correct password, suspended account                 |
| 429    | `RATE_LIMITED`        | Too many attempts; `Retry-After`                    |

#### `POST /api/auth/logout`

- Request body: none.
- Success: `204`.
- Always clears the cookie. Revokes the session if one exists.
- Does not require a valid session (idempotent).

#### `GET /api/auth/session`

Success `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66...",
      "name": "Asha Devi",
      "email": "asha@example.com",
      "role": "devotee",
      "status": "active",
      "emailVerified": true
    },
    "session": { "expiresAt": "2026-12-04T00:00:00.000Z", "lastSeenAt": "2026-11-04T00:00:00.000Z" }
  }
}
```

Unauthenticated: `401 UNAUTHORIZED`.

#### `POST /api/auth/verify-email`

Request: `{ "token": "<43-char base64url>" }`.

| Status | Code / data            | When                                  |
| ------ | ---------------------- | ------------------------------------- |
| 200    | `{ "verified": true }` | Token consumed                        |
| 400    | `TOKEN_INVALID`        | Unknown, used, or wrong-purpose token |
| 400    | `TOKEN_EXPIRED`        | Expired token                         |
| 429    | `RATE_LIMITED`         | Too many attempts                     |

#### `POST /api/auth/resend-verification`

Request: `{ "email": "asha@example.com" }`.
Always `202 { "status": "accepted" }` for a valid email shape, even if the account does not exist or is already verified. Rate limits apply.

#### `POST /api/auth/forgot-password`

Request: `{ "email": "asha@example.com" }`.
Always `202 { "status": "accepted" }` for a valid email shape. Rate limits apply. No email is sent for unknown, suspended, or deleted accounts.

#### `POST /api/auth/reset-password`

Request:

```json
{ "token": "<43-char base64url>", "password": "a new long passphrase" }
```

| Status | Code / data         | When                                   |
| ------ | ------------------- | -------------------------------------- |
| 200    | `{ "reset": true }` | Password changed; all sessions revoked |
| 400    | `TOKEN_INVALID`     | Unknown/used/wrong-purpose token       |
| 400    | `TOKEN_EXPIRED`     | Expired token                          |
| 400    | `VALIDATION_ERROR`  | Password fails policy                  |
| 429    | `RATE_LIMITED`      | Too many attempts                      |

#### `GET /api/account`

Returns the same safe user shape as `GET /api/auth/session` without the session object.

#### `PATCH /api/account/profile`

Request: `{ "name": "Asha Devi" }`.
Success `200` with the safe user. Validation errors `400`. Audit `account.profile_updated`.

#### `POST /api/account/password`

Request: `{ "currentPassword": "...", "newPassword": "..." }`.
Success `200 { "changed": true }`. Wrong current password `401 INVALID_CREDENTIALS`. Policy failure `400`. Other sessions revoked. Audit `auth.password_changed`.

#### `GET /api/admin/users`

Query: `status`, `role`, `q`, `cursor`, `limit` (default 25, max 100).
Success `200`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "66...",
        "name": "Asha Devi",
        "email": "asha@example.com",
        "role": "devotee",
        "status": "active",
        "emailVerified": true,
        "createdAt": "2026-11-01T00:00:00.000Z",
        "lastLoginAt": "2026-11-04T00:00:00.000Z",
        "suspendedAt": null
      }
    ],
    "nextCursor": null
  }
}
```

Admin-only. `403 FORBIDDEN` for devotees.

#### `PATCH /api/admin/users/:id/status`

Request: `{ "status": "suspended", "reason": "Repeated duplicate reports" }`.
Success `200` with the safe user. On suspension, all sessions are revoked.

| Status | Code                      | When                                |
| ------ | ------------------------- | ----------------------------------- |
| 400    | `VALIDATION_ERROR`        | Invalid status/reason               |
| 403    | `FORBIDDEN`               | Not an administrator                |
| 404    | `NOT_FOUND`               | No such user                        |
| 409    | `SELF_ACTION_NOT_ALLOWED` | Admin targets own account           |
| 409    | `LAST_ADMIN`              | Would leave no active administrator |

#### `PATCH /api/admin/users/:id/role`

Request: `{ "role": "admin" }`.
Success `200` with the safe user. Role changes revoke the target user's sessions and write an audit record. An administrator cannot demote themselves; the last active administrator cannot be demoted.

#### `PATCH /api/admin/users/:id/verify-email`

Request: none or `{ "reason": "Verified in person" }`.
Success `200` with the safe user. Audit `admin.user_email_verified`. This is for delivery failures and pilot accounts, not a password-setting endpoint.

#### `GET /api/admin/audit-logs`

Query: `actorUserId`, `action`, `from`, `to`, `cursor`, `limit`.
Success `200` with `{ items, nextCursor }`. Items contain the safe audit fields from §4.5. Admin-only.

### 12.4 Status codes

| Status | Meaning in this API                                     |
| ------ | ------------------------------------------------------- |
| 200    | Successful read/update                                  |
| 202    | Accepted, deliberately non-enumerating response         |
| 204    | Successful no-content (logout)                          |
| 400    | Validation or invalid/expired token                     |
| 401    | No valid session, or invalid credentials                |
| 403    | Authenticated but not allowed, unverified, or suspended |
| 404    | Resource not found (admin lookups)                      |
| 409    | Conflict (self-action, last admin)                      |
| 429    | Rate limited                                            |
| 500    | Unexpected server error                                 |
| 503    | Database or email dependency unavailable                |

## 13. Validation rules

All schemas live under `api/lib/validation/` (server-only) and use `.strict()` so unexpected keys are rejected. Client-side validation is a convenience; the server is authoritative.

| Field        | Rule                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`       | Trim; collapse internal whitespace; 2–80 characters; reject control characters; allow Unicode letters, marks, spaces, apostrophes, hyphens, periods |
| `email`      | Trim; lowercase; 3–254 characters; valid address shape; single `@`; no whitespace                                                                   |
| `password`   | 12–128 characters; no trimming; must contain at least one non-whitespace character; reject NUL/control characters                                   |
| `token`      | 43-character base64url string (32 random bytes)                                                                                                     |
| `role`       | `devotee` or `admin`                                                                                                                                |
| `status`     | `active` or `suspended` for admin updates (`pending_verification` is system-managed)                                                                |
| `reason`     | 3–500 characters; trim; reject control characters                                                                                                   |
| `cursor`     | Opaque base64url, max 200 characters; decoded and validated as `createdAt                                                                           | _id` |
| `limit`      | Integer 1–100; default 25                                                                                                                           |
| `q`          | 2–100 characters; trim; escaped for regex or used with a safe text index                                                                            |
| `from`, `to` | ISO 8601 dates; `from <= to`                                                                                                                        |

Body size limit: 16 KiB for auth/account requests. JSON parser failures return `400 VALIDATION_ERROR`, not a stack trace.

## 14. Error handling

### 14.1 Error classes

Extend `api/lib/http/errors.js` with:

| Class                     | Status | Code                      |
| ------------------------- | ------ | ------------------------- |
| `UnauthorizedError`       | 401    | `UNAUTHORIZED`            |
| `InvalidCredentialsError` | 401    | `INVALID_CREDENTIALS`     |
| `ForbiddenError`          | 403    | `FORBIDDEN`               |
| `EmailNotVerifiedError`   | 403    | `EMAIL_NOT_VERIFIED`      |
| `AccountSuspendedError`   | 403    | `ACCOUNT_SUSPENDED`       |
| `RegistrationClosedError` | 403    | `REGISTRATION_CLOSED`     |
| `NotFoundError`           | 404    | `NOT_FOUND`               |
| `ConflictError`           | 409    | `CONFLICT`                |
| `LastAdminError`          | 409    | `LAST_ADMIN`              |
| `SelfActionError`         | 409    | `SELF_ACTION_NOT_ALLOWED` |
| `TokenInvalidError`       | 400    | `TOKEN_INVALID`           |
| `TokenExpiredError`       | 400    | `TOKEN_EXPIRED`           |
| `RateLimitError`          | 429    | `RATE_LIMITED`            |
| `EmailUnavailableError`   | 503    | `EMAIL_UNAVAILABLE`       |

`errorToResponse` already maps `AppError`; the new classes inherit from it. Extend `jsonError` to accept safe response headers (for `Retry-After` and rate-limit headers).

### 14.2 Rules

- Validation details list field paths and messages, never submitted values.
- Unknown errors return `500 INTERNAL_ERROR` with a generic message; the stack stays in the server log.
- Database errors are mapped to `503 SERVICE_UNAVAILABLE` through `DatabaseUnavailableError`.
- Authentication errors are generic; account-state errors appear only after a correct password.
- Never return a raw MongoDB error, driver message, or index name.
- Every response includes `Cache-Control: no-store` for auth/account/admin.

## 15. Audit logging

### 15.1 Events

| Action                          | Actor            | Target    | Notes                                                       |
| ------------------------------- | ---------------- | --------- | ----------------------------------------------------------- |
| `auth.register`                 | system/anonymous | user      | No email or password                                        |
| `auth.login_succeeded`          | user             | user      | Session ID hash not recorded                                |
| `auth.login_failed`             | anonymous        | user/null | Reason code only; no email                                  |
| `auth.logout`                   | user             | session   | Reason `logout`                                             |
| `auth.email_verified`           | user             | user      |                                                             |
| `auth.verification_resent`      | anonymous/user   | user      | No token                                                    |
| `auth.password_reset_requested` | anonymous        | user      | No email/token                                              |
| `auth.password_reset_completed` | anonymous/user   | user      |                                                             |
| `auth.password_changed`         | user             | user      |                                                             |
| `account.profile_updated`       | user             | user      | Changed field names only                                    |
| `admin.user_suspended`          | admin            | user      | Reason code/reason text allowed                             |
| `admin.user_reactivated`        | admin            | user      |                                                             |
| `admin.user_role_changed`       | admin            | user      | Old/new role                                                |
| `admin.user_email_verified`     | admin            | user      |                                                             |
| `admin.bootstrap`               | system/cli       | user      | First administrator creation                                |
| `security.rate_limited`         | anonymous/user   | endpoint  | Optional; log to application log, not audit, to avoid noise |

### 15.2 Rules

- Audit records are append-only. No API updates or deletes them.
- Metadata is a small flat object; no nested arbitrary request bodies.
- Never record passwords, password hashes, raw tokens, cookies, authorization headers, or full email addresses.
- IP addresses are HMAC-SHA-256 with `AUTH_SECRET`; user agents are truncated.
- Admin mutations that change user state should write the audit record in the same MongoDB transaction as the change. If the transaction fails, the change fails.
- Authentication audit writes are best-effort; a failure is logged as `audit.write_failed` and must not be silently ignored. A successful login is not rolled back because an audit insert failed, but the failure is visible to operators.
- The admin audit viewer supports filters by actor, action, target, and date, with cursor pagination.

## 16. Security controls

### 16.1 CSRF

- `SameSite=Lax` on the session cookie.
- `assertSameOrigin` on every `POST`, `PUT`, `PATCH`, and `DELETE`: the `Origin` header must match `APP_BASE_URL` (plus explicitly allowed development origins).
- Require `Content-Type: application/json` for mutating API requests that carry a body; HTML form posts are rejected. Logout may have no body.
- Do not enable permissive CORS. No `Access-Control-Allow-Origin: *`.
- Logout is a POST; no state-changing GET requests.
- If a same-origin request legitimately lacks `Origin` (non-browser tooling), it must use an explicit test/operator path, not a production bypass.

### 16.2 Rate limits

| Policy                | Key(s)          | Proposed limit                |
| --------------------- | --------------- | ----------------------------- |
| `login`               | IP + email HMAC | 20/15 min IP; 10/15 min email |
| `register`            | IP + email HMAC | 5/hour IP; 3/hour email       |
| `resend-verification` | IP + email HMAC | 5/hour IP; 3/hour email       |
| `forgot-password`     | IP + email HMAC | 5/hour IP; 3/hour email       |
| `reset-password`      | IP              | 10/hour                       |
| `verify-email`        | IP              | 20/hour                       |
| `account-password`    | user ID         | 5/hour                        |
| `admin`               | admin user ID   | 100/min                       |

- Counters live in MongoDB so multiple instances share them.
- Keys use HMAC-SHA-256 of the identifier with `AUTH_SECRET`; raw emails/IPs are never stored.
- A rate-limited response includes `Retry-After`.
- Account lockout after repeated failures is temporary (`lockedUntil`) and audited; it must not permanently deny a legitimate user.
- `TRUST_PROXY=1` is required before trusting `X-Forwarded-For`; otherwise use a conservative identifier.

### 16.3 Account enumeration

- Login: `INVALID_CREDENTIALS` for both unknown email and wrong password; dummy hash for unknown email.
- Forgot password: always `202`.
- Resend verification: always `202`.
- Registration: always `202` for a valid request; no "email already in use" response.
- Admin-only endpoints may reveal account existence to administrators.
- Timing: dummy verification and constant-time comparisons.

### 16.4 Injection and mass assignment

- Zod `.strict()` schemas reject unknown keys.
- Never pass `request.json()` directly to Mongoose.
- Never allow user input to become a MongoDB operator (`$gt`, `$ne`, etc.); treat all values as literals.
- Use `sanitizeFilter` or explicit equality objects for queries involving user input.
- Escape or avoid regex in `q` search; use a bounded, escaped pattern.
- React escapes output; no `dangerouslySetInnerHTML` with user data.

### 16.5 Session and cookie hardening

- Opaque 256-bit tokens; hashed at rest.
- `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, no `Domain`.
- `__Host-` prefix in production.
- New token on login; revoke on logout, password reset, suspension, role change.
- Never expose tokens in URLs or logs.
- Reject a cookie whose session is expired/revoked even if the signature/shape looks valid.

### 16.6 Administrator protections

- No public admin registration.
- CLI bootstrap only; no default password.
- Self-suspension and self-demotion are rejected.
- Last active administrator cannot be suspended or demoted.
- Admin actions are audited.
- Recommend MFA for administrators before public launch (out of scope for Stage 2, but the login flow should allow a second step later).

### 16.7 Headers, secrets, and logging

- Existing security headers remain: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production, no `X-Powered-By`.
- Add `Cache-Control: no-store` to all auth/account/admin responses.
- `AUTH_SECRET` is at least 32 random bytes, server-only, never `NEXT_PUBLIC_*`.
- `EMAIL_API_KEY`/`SMTP_URL` are server-only.
- Extend logger redaction to `password`, `passwordHash`, `token`, `tokenHash`, `cookie`, `authorization`, `secret`, `apiKey`, `email`, `ip`.
- Never log request bodies for auth endpoints.
- Do not include tokens in error messages or audit metadata.

### 16.8 Dependency and build controls

- Pin the password-hashing dependency and review advisories before adding it.
- If a native module is used, add it to `serverExternalPackages` and smoke-test the production build on the target platform.
- `npm run check:js-only` remains in every gate.
- Consider adding `npm audit --omit=dev` to CI after the dependency set stabilizes.

## 17. Environment and configuration

Add to `.env.example` (placeholders only; never real values):

```dotenv
# --- Authentication -----------------------------------------------------------
# At least 32 random bytes, base64 or hex. Generate with: openssl rand -base64 48
AUTH_SECRET=

# open | closed
REGISTRATION_MODE=closed

# true | false — required before login for self-registered accounts
REQUIRE_EMAIL_VERIFICATION=true

# Session lifetimes in days
SESSION_IDLE_DAYS=7
SESSION_ABSOLUTE_DAYS=30

# Set to 1 only behind a trusted reverse proxy that supplies X-Forwarded-For
TRUST_PROXY=0

# --- Transactional email ------------------------------------------------------
# dev | resend | smtp
EMAIL_PROVIDER=dev
EMAIL_FROM=no-reply@example.com
# EMAIL_API_KEY=
# SMTP_URL=
```

Update `api/lib/env/env.js` with a Zod schema that validates:

- `AUTH_SECRET` minimum length 32; required when auth is enabled.
- `REGISTRATION_MODE` enum.
- `REQUIRE_EMAIL_VERIFICATION` boolean coercion.
- `SESSION_IDLE_DAYS`/`SESSION_ABSOLUTE_DAYS` positive integers with safe bounds.
- `TRUST_PROXY` boolean.
- `EMAIL_PROVIDER` enum; provider-specific variables required only for the selected provider.

Environment validation must continue to name variables, never values. Production must fail fast if `AUTH_SECRET` is missing or too short.

## 18. Testing strategy

### 18.1 Unit tests (no network)

| File                                  | Proves                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tests/unit/auth/password.test.js`    | Hash/verify, wrong password, unique salts, rehash decision, timing-safe comparison, length limits |
| `tests/unit/auth/tokens.test.js`      | 32-byte token shape, SHA-256 hash, constant-time helpers, expiry math                             |
| `tests/unit/auth/session.test.js`     | Cookie serialization, production vs development flags, idle/absolute expiry, rotation             |
| `tests/unit/auth/permissions.test.js` | Role → permission matrix; devotee denied admin permissions                                        |
| `tests/unit/auth/csrf.test.js`        | Same-origin acceptance/rejection, missing Origin, content-type rules                              |
| `tests/unit/auth/rate-limit.test.js`  | Key hashing, window math, limit boundaries, retry headers                                         |
| `tests/unit/auth/validation.test.js`  | Name/email/password/token schemas, strict unknown-key rejection                                   |
| `tests/unit/auth/safe-user.test.js`   | No password/token fields in API projections                                                       |
| `tests/unit/auth/audit.test.js`       | Event names, metadata redaction, no PII                                                           |

### 18.2 Integration tests (real `MONGODB_URI_TEST`, `_test` database only)

| File                                          | Proves                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `tests/integration/auth-registration.test.js` | New account, duplicate generic response, closed mode, validation, audit       |
| `tests/integration/auth-login.test.js`        | Success, wrong password, unknown email, unverified, suspended, session cookie |
| `tests/integration/auth-session.test.js`      | Session lookup, idle/absolute expiry, revocation, logout, forged cookie       |
| `tests/integration/auth-verification.test.js` | Token single-use, expiry, resend invalidation, admin override                 |
| `tests/integration/auth-recovery.test.js`     | Forgot always 202, reset single-use, password change, session revocation      |
| `tests/integration/auth-rate-limit.test.js`   | 429 boundaries, Retry-After, window reset (short test windows)                |
| `tests/integration/admin-users.test.js`       | List/filter, suspend/reactivate, role change, self/last-admin guards          |
| `tests/integration/audit.test.js`             | Audit writes for auth/admin events; no secrets/PII                            |
| `tests/integration/auth-idor.test.js`         | Devotee cannot read/change another user or call admin endpoints               |

Test hygiene:

- Use `databaseSuiteGate` from `tests/helpers/database.js`; honor `UTSAV_TEST_REQUIRE_DB=1`.
- Delete only the auth collections in `beforeEach`/`afterEach`; never touch `utsav_connect`.
- Use unique emails such as `test+<uuid>@example.test`.
- Do not use production email transport in tests; use the development mailbox or a stub.
- Do not assert on raw tokens in logs; assert on database state and HTTP responses.

### 18.3 End-to-end tests (Playwright, JS only)

Add `@playwright/test` with a `.mjs` config. Run against a production build served with `next start`, using `MONGODB_URI` pointed at a `_test` database and a test-only email mailbox.

Journeys:

1. Visitor opens `/dashboard` and is redirected to `/login`.
2. Register → read verification token from the test mailbox → verify → login → dashboard.
3. Wrong password shows a generic error; no account enumeration.
4. Devotee opens `/admin` and is denied.
5. Devotee logs out; session cookie is cleared; back button does not restore access.
6. Admin suspends a devotee; the devotee's existing session is rejected on the next request.
7. Forgot password → reset → old session is revoked; new password works.
8. Keyboard-only navigation and visible focus on login/register forms.

If Playwright cannot run in the current environment, the check is reported as **unverified**, not assumed. Browser verification remains a release requirement per `AGENTS.md`.

### 18.4 Manual verification

- Desktop and mobile-width login/register/recovery forms.
- Screen-reader labels, error announcements, and focus management.
- Cookie attributes in the browser dev tools.
- `Set-Cookie` and `Cache-Control` headers via `curl`.
- No token or password in server logs, browser console, or audit records.
- Admin user list, suspension dialog, and audit viewer.

### 18.5 Gates

| Gate             | Command                                 | Required for Stage 2 completion |
| ---------------- | --------------------------------------- | ------------------------------- |
| Unit + static    | `make check`                            | Yes                             |
| Integration      | `make ci` (DB required)                 | Yes                             |
| Production build | `make build`                            | Yes                             |
| E2E              | `make test-e2e` (new target)            | Yes, or documented unverified   |
| Browser          | manual, recorded in `project-status.md` | Yes, or documented unverified   |
| Security review  | checklist in §16 plus tests             | Yes                             |

## 19. Acceptance criteria

A Stage 2 feature is complete only when all applicable criteria are met and recorded.

### Registration and verification

- [ ] AC-01 Open registration creates a `pending_verification` devotee and sends a verification email; no session is created.
- [ ] AC-02 Closed registration returns `403 REGISTRATION_CLOSED` and does not create an account.
- [ ] AC-03 Duplicate email returns the same `202` response as a new email; no enumeration.
- [ ] AC-04 Verification token is single-use, expires after 24 hours, and activates the account.
- [ ] AC-05 Resend verification invalidates old tokens and is rate-limited.

### Login and sessions

- [ ] AC-06 Correct credentials create a session and set an `HttpOnly`, `SameSite=Lax` cookie; `Secure` and `__Host-` in production.
- [ ] AC-07 Wrong password and unknown email both return `401 INVALID_CREDENTIALS`.
- [ ] AC-08 Unverified and suspended accounts cannot log in.
- [ ] AC-09 Logout revokes the session and clears the cookie; the old cookie no longer works.
- [ ] AC-10 Session idle/absolute expiry and revocation are enforced server-side.
- [ ] AC-11 A new token is issued on every login (no session fixation).

### Password recovery

- [ ] AC-12 Forgot-password always returns `202` and sends only to eligible accounts.
- [ ] AC-13 Reset token is single-use, expires after 30 minutes, and revokes all sessions.
- [ ] AC-14 Password change requires the current password and revokes other sessions.
- [ ] AC-15 Passwords are never logged, returned, or stored reversibly.

### Authorization

- [ ] AC-16 Visitors cannot access `/dashboard`, `/account`, or `/admin`; APIs return `401`.
- [ ] AC-17 Devotees cannot access `/admin` or admin APIs; APIs return `403`.
- [ ] AC-18 A devotee cannot read or modify another user's account by changing an ID.
- [ ] AC-19 Page guards and API guards are tested independently; middleware is not the only check.

### Administration and lifecycle

- [ ] AC-20 Admin can list/filter users and suspend/reactivate a devotee.
- [ ] AC-21 Suspension revokes all sessions immediately.
- [ ] AC-22 Admin cannot suspend/demote themselves or the last active administrator.
- [ ] AC-23 Role changes are audited and revoke the target's sessions.
- [ ] AC-24 Deletion is not exposed; `deletedAt` remains unused pending policy.

### Security and audit

- [ ] AC-25 Mutating requests with a missing/mismatched Origin are rejected.
- [ ] AC-26 Login/register/recovery rate limits return `429` with `Retry-After`.
- [ ] AC-27 Rate-limit keys and audit IPs are HMAC-hashed; no raw email/IP in the database.
- [ ] AC-28 Audit records exist for all events in §15 and contain no secrets.
- [ ] AC-29 No password hash, session token, token hash, or driver error appears in an API response or log.
- [ ] AC-30 `npm run check:js-only` passes; no TypeScript file or config exists.

### Verification

- [ ] AC-31 `make check` passes.
- [ ] AC-32 `make ci` passes with the Atlas `_test` database, no skipped integration suites.
- [ ] AC-33 `make build` passes and the production build serves the auth pages.
- [ ] AC-34 Browser/E2E checks pass, or remaining gaps are explicitly recorded in `project-status.md`.
- [ ] AC-35 Documentation is synchronized: README, project status, roadmap, changelog, architecture, testing, deployment, security, database, decisions.

## 20. Implementation batches

### Batch 0 — Decision lock and foundation (next batch, after approval)

- Record accepted decisions in `docs/decisions.md` (move ADR-014 from PROPOSED to ACCEPTED) and update ADR-010 status.
- Update `.env.example` and `api/lib/env/env.js` with auth/email variables.
- Add Mongoose models and safe projections: `user`, `session`, `auth-token`, `rate-limit`, `audit-log`.
- Add password, token, session-cookie, permission, CSRF, and rate-limit primitives with unit tests.
- Add `scripts/create-admin.js`, `scripts/create-user.js`, `scripts/sync-indexes.js`.
- Add integration tests for model constraints/indexes and the create-admin script.
- No auth Route Handlers and no UI in this batch.
- Gate: `make check` + `make ci`; update docs status.

### Batch 1 — Registration, login, logout, session

- `POST /api/auth/register`, `login`, `logout`, `GET /api/auth/session`.
- `withApiHandler`, error classes, audit writes, rate limits.
- Integration tests for registration/login/session/audit/rate limit.
- No email verification yet if D-03 is pending; registration can create `active` accounts only in closed mode for pilot.

### Batch 2 — Email verification and password recovery

- Verification/resend/forgot/reset endpoints.
- Email adapter and development mailbox; production provider per D-08.
- Verification/reset pages.
- Integration tests for token lifecycle and session revocation.

### Batch 3 — RBAC, protected pages, admin user management

- `permissions.js`, `requireUser`, `requireRole`, `requirePermission`.
- `/dashboard`, `/account`, `/admin` layouts and guards.
- Admin user list/status/role/verify endpoints and audit viewer.
- IDOR and permission tests.

### Batch 4 — UI and browser verification

- Login, register, verification, forgot/reset, account profile/password pages.
- Admin user table/dialogs and audit table.
- Accessible forms, loading/error states, mobile layout.
- Playwright E2E and manual browser record.

### Batch 5 — Hardening and documentation

- Rate-limit tuning, security review, dependency audit.
- Full `make check`, `make ci`, production build, E2E.
- Sync all documentation and record exact evidence in `project-status.md`.

**Exact next implementation batch:** Batch 0 only, and only after the owner answers the six questions in §7 of the decision report. Batch 0 must not add login UI or public auth endpoints; it establishes models, primitives, configuration, scripts, and tests.

## 21. Risks and open items

| Risk / open item                             | Impact                                     | Mitigation / owner action                                     |
| -------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Native Argon2 dependency unsupported on host | Build/runtime failure                      | Verify on target platform; fallback scrypt; document ADR      |
| Email provider not chosen                    | Open registration and recovery cannot work | Keep `REGISTRATION_MODE=closed` until D-08 is resolved        |
| Account enumeration through registration     | Privacy/abuse                              | Generic `202`; email existing users; rate limits              |
| Account lockout used for denial of service   | Legitimate user locked out                 | Per-IP + per-email limits, temporary locks, admin override    |
| Session cookie theft                         | Account takeover                           | HttpOnly/Secure/SameSite, short idle window, revocation       |
| Audit logs contain PII                       | Privacy risk                               | Hashed IPs, no emails/tokens, admin-only, retention decision  |
| No CSP                                       | XSS defence weaker                         | React escaping now; CSP in Stage 6/7 after Maps integration   |
| Deployment target unknown                    | Cookie/secure/native-module behaviour      | Decide hosting in Stage 7; test production build on target    |
| No MFA for administrators                    | Higher impact if admin password is reused  | Recommend MFA before public launch; login flow leaves room    |
| `TRUST_PROXY` misconfiguration               | Rate limits bypassed or over-applied       | Document deployment requirement; default off                  |
| No account deletion                          | Privacy request cannot be fully satisfied  | Defer with D-07; define retention/anonymisation before launch |

## 22. Non-goals and explicit non-claims

This specification does **not** claim that any control is implemented. It does not authorize:

- writing authentication code;
- adding dependencies;
- creating collections in the development or production database;
- sending real email;
- creating an administrator account;
- deploying or pushing Stage 2 work.

Those actions require owner approval of the decision report and a separate implementation instruction.
