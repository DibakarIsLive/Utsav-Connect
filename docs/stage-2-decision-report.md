# Stage 2 decision report — authentication and account policy

**Status: PREPARATION ONLY.** No Stage 2 code has been written, and nothing in this report authorizes implementation. Owner approval is required before the first authentication commit.

- Date: 2026-11-04
- Source of scope: [`Roadmap.md`](Roadmap.md) Phase 4, Phase 17, Phase 22; [`product-requirements.md`](product-requirements.md); [`decisions.md`](decisions.md) ADR-010.
- Related specification: [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md).
- Decision vocabulary: **OWNER** (requires an explicit owner decision), **CONVENTION** (engineering default already implied by existing rules), **DEFERRED** (not needed to start Stage 2).

## 1. Why this report exists

ADR-010 left the authentication approach open and listed three questions for the owner:

1. registration policy — open or invitation-only;
2. whether email verification is required at launch, which needs an email provider;
3. password-based authentication versus magic-link or OAuth.

The repository also has broader open product decisions in `product-requirements.md` (production database tier, hosting, Google Maps APIs, population sources, leaderboard privacy). Most are not Stage 2 blockers. This report separates the genuine Stage 2 blockers from decisions that can safely follow existing conventions or wait.

## 2. Decision inventory

| ID   | Decision                                                                                    | Source                   | Blocks Stage 2?    | Who decides         | Recommendation                                           |
| ---- | ------------------------------------------------------------------------------------------- | ------------------------ | ------------------ | ------------------- | -------------------------------------------------------- |
| D-01 | Authentication library and ownership of the auth layer                                      | ADR-010                  | Yes                | OWNER               | First-party auth with opaque database-backed sessions    |
| D-02 | Registration policy: open, invitation-only, or closed                                       | ADR-010, PRD open item 2 | Yes                | OWNER               | Configurable; open at launch, closed during pilot        |
| D-03 | Email verification requirement                                                              | ADR-010, PRD open item 2 | Yes                | OWNER               | Required before login for self-registered accounts       |
| D-04 | Primary credential method: password, magic link, or OAuth                                   | ADR-010                  | Yes                | OWNER               | Email + password at launch; no OAuth or magic link in v1 |
| D-05 | Session strategy: opaque database session or JWT                                            | ADR-010                  | Yes (technical)    | CONVENTION          | Opaque database session, hashed at rest                  |
| D-06 | Password hashing algorithm and parameters                                                   | ADR-010                  | Yes (technical)    | CONVENTION          | Argon2id, OWASP parameters, versioned hash format        |
| D-07 | Account lifecycle: suspension, reactivation, deletion                                       | Roadmap 4.8–4.9, 17.15   | Partly             | OWNER for deletion  | Suspend/reactivate now; soft-delete policy deferred      |
| D-08 | Transactional email provider and sender identity                                            | ADR-010, Roadmap 4.6     | Yes if D-03 is yes | OWNER               | Provider-agnostic adapter; owner selects vendor/domain   |
| D-09 | First administrator bootstrap                                                               | Roadmap 22.1             | Yes (operational)  | CONVENTION          | CLI script with hidden password prompt; no default admin |
| D-10 | Audit-log retention and visibility                                                          | Roadmap 3.5, 17.14–17.15 | No, but design now | OWNER for retention | Append-only, admin-only; 12-month proposal               |
| D-11 | Login identifier and public display name                                                    | PRD roles/profile        | No                 | CONVENTION          | Email as identifier; name is not public in Stage 2       |
| D-12 | Password policy strength                                                                    | Roadmap 17.1, 17.11      | No                 | CONVENTION          | Minimum 12 characters, maximum 128, no composition rules |
| D-13 | Role model for Stage 2                                                                      | PRD roles, Roadmap 4.10  | No                 | CONVENTION          | Visitor (anonymous), devotee, administrator only         |
| D-14 | Session lifetime and rotation                                                               | Roadmap 4.4              | No                 | CONVENTION          | 7-day idle, 30-day absolute, new token on login          |
| D-15 | Admin self-protection rules                                                                 | Roadmap 14, 17.11        | No                 | CONVENTION          | No self-suspension/demotion; never remove the last admin |
| D-16 | Production hosting, Atlas tier/region, Google Maps, population sources, leaderboard privacy | PRD open items 3–7       | No                 | OWNER / DEFERRED    | Keep out of Stage 2; decide in the stage that needs them |

---

## 3. Detailed decision records

### D-01 — Authentication library and ownership of the auth layer

**Problem.** ADR-010 records three options but no choice. Stage 2 cannot start without deciding who owns registration, login, sessions, password recovery, and the security boundaries around them.

**Available options.**

| Option                             | Strengths                                                                                                    | Weaknesses                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Auth.js v5 (`next-auth@5` beta) | App Router native; MongoDB adapter; standard OAuth providers; less custom session code                       | Beta dependency; API churn; the Credentials provider is JWT-session oriented, so database-session revocation and custom account states still need custom work |
| B. `next-auth@4`                   | Stable release; mature documentation                                                                         | Pages-Router-era API; Next.js 16 compatibility and migration risk; not the direction of the framework                                                         |
| C. First-party auth layer          | Full control of users, sessions, revocation, suspension, audit, and error contracts; no beta auth dependency | More security-sensitive code to write and test; the team owns CSRF, rate limiting, token handling, and crypto parameter choices                               |

**Recommendation.** **Option C — a small first-party authentication layer.** It should use well-tested platform primitives (Node `crypto`), a small number of focused modules, opaque database-backed sessions, and an explicit security test suite. This is not "hand-rolled crypto": password hashing and token generation use established algorithms and libraries, and every security-relevant branch is tested.

The decisive reason is not a preference for custom code. It is that the product needs database-backed revocation (suspension, password reset, role change, logout-all), and the Credentials flow in Auth.js does not provide that cleanly without writing the same user/password/session logic anyway. Adopting a beta auth dependency would add risk without removing the sensitive work.

**Technical implications.**

- New modules: `api/lib/auth/*`, `api/models/user.js`, `api/models/session.js`, `api/models/auth-token.js`, `api/models/audit-log.js`, `api/models/rate-limit.js`, `api/lib/email/*`.
- New Route Handlers under `app/api/auth/*`, `app/api/account/*`, and `app/api/admin/*`.
- A route wrapper in `api/lib/http/handler.js` for JSON parsing, Zod validation, authentication, authorization, request IDs, and error mapping.
- No new authentication framework dependency. A password-hashing dependency is proposed separately in D-06.
- A future OAuth provider can be added as an additional identity link without replacing the session layer.

**Security and privacy implications.**

- The application owns session revocation, CSRF defence, rate limiting, account enumeration behaviour, and audit records.
- No third-party auth service receives user credentials or identity data.
- The risk shifts from a beta dependency to implementation defects. Mitigation: OWASP parameters, constant-time comparisons, single-use hashed tokens, strict validation, and a security-focused test matrix.
- The session token must never be readable by JavaScript; only an opaque value in an `HttpOnly` cookie.

**Impact on future development.**

- Unblocks Stage 2 and every later authenticated feature.
- Establishes patterns for ownership checks, admin actions, and audit logging that Stages 3–5 will reuse.
- If the owner later prefers Auth.js, the user/session tables and API contracts can remain; the transport layer would be replaced. That is a contained migration, not a data rewrite.

**Owner input required:** Yes. This is a security architecture decision. Approval of the recommendation is requested explicitly.

---

### D-02 — Registration policy

**Problem.** The product does not say whether anyone may register, whether registration is invitation-only, or whether accounts are created by administrators.

**Available options.**

1. **Open registration.** Anyone with a valid email can create a devotee account. Lowest administrative burden; highest abuse surface.
2. **Invitation-only.** An administrator issues an invitation code or creates the account. Lower abuse surface; more administrative work and a new invitation model.
3. **Closed registration.** No public sign-up; administrators create accounts out of band. Suitable for a pilot, not for public launch.

**Recommendation.** Make registration **configuration-driven** with two modes for Stage 2: `open` and `closed`. Do not build invitation codes in Stage 2.

- `REGISTRATION_MODE=open` is the public-launch mode, combined with email verification and rate limiting.
- `REGISTRATION_MODE=closed` is the pilot/default-until-approved mode. Administrators create accounts with a CLI script or an admin-only operation; the account is marked verified because the administrator vouches for the identity.
- Invitation codes can be added later without changing the user model or the login flow.

This gives the owner a safe pilot position without blocking a later public launch.

**Technical implications.**

- One environment variable controls the public registration endpoint and the visibility of the registration link.
- `POST /api/auth/register` returns `403 REGISTRATION_CLOSED` when the mode is closed; the UI hides the form and explains how to request an account.
- An operator script, `scripts/create-user.js`, creates pilot accounts with a hidden password prompt. It reuses the same password hashing and audit path as the API.
- No invitation collection or invitation-code rotation is needed in Stage 2.

**Security and privacy implications.**

- Open registration needs email verification, rate limiting, generic duplicate-email responses, and abuse monitoring.
- Closed registration reduces spam and fake reports but concentrates account creation in administrators; every admin-created account must be audited.
- The registration response must not become an account-enumeration oracle. See D-03 and the specification.

**Impact on future development.**

- The launch policy can change without a schema migration.
- Invitation codes, if later required, become an additive feature.
- The pilot runbook must include account creation and verification steps.

**Owner input required:** Yes. The owner must choose the launch posture. The recommendation is: closed for pilot, open for public launch.

---

### D-03 — Email verification requirement

**Problem.** ADR-010 asks whether email verification is required at launch. The answer determines whether Stage 2 needs an email provider, verification tokens, and a verification UI.

**Available options.**

1. **No verification.** Accounts become active immediately. Simplest, but anyone can register with an address they do not control, and password recovery still needs email.
2. **Verification before login.** The account exists but cannot authenticate until the address is verified. Strongest anti-abuse posture; depends on reliable email delivery.
3. **Verification before write actions.** Users can log in and browse, but cannot submit reports or proposals until verified. Better UX when email is slow; more state checks throughout later features.

**Recommendation.** **Option 2 — verification before login — for self-registered accounts.** Administrator-created pilot accounts are marked verified at creation because the administrator has identified the person. Provide resend verification, a 24-hour token, rate limiting, and an administrator override for delivery failures.

If the owner does not want to commit to an email provider for Stage 2, the fallback is: keep `REGISTRATION_MODE=closed`, use administrator-created accounts, and defer open registration until the provider is ready. Do not run open registration with unverified addresses.

**Technical implications.**

- `authTokens` collection with purpose `email_verification`, SHA-256 token hash, 24-hour expiry, single use.
- Email adapter and templates for verification and "account already exists" notices.
- `GET /verify-email` page reads the token from the URL fragment and posts it to `POST /api/auth/verify-email`, so the token is not sent in a server access log or cross-origin referrer.
- `POST /api/auth/resend-verification` with per-email and per-IP rate limits.
- Login checks `emailVerifiedAt` after a correct password and returns `403 EMAIL_NOT_VERIFIED`; this does not reveal whether an address exists to someone who does not know the password.
- Admin-created accounts set `emailVerifiedAt` and record the administrator in the audit log.

**Security and privacy implications.**

- Verification proves control of an email address and supports self-service recovery.
- Email addresses are personal data; store the minimum, never log raw addresses, and hash identifiers used for rate-limit keys.
- Verification links must be single-use, expiring, and never logged. The fragment-based link reduces accidental leakage.
- Email delivery failure must not silently create unusable accounts; the API returns a controlled `503 EMAIL_UNAVAILABLE` and the account can be verified manually by an administrator.

**Impact on future development.**

- Requires an email provider decision (D-08) before open registration.
- Establishes the token infrastructure reused for password reset and, later, email change.
- Adds a small operational dependency (deliverability, SPF/DKIM/DMARC, bounce handling).

**Owner input required:** Yes. The owner must decide whether open registration is needed in Stage 2 and approve the email dependency.

---

### D-04 — Primary credential method

**Problem.** The platform can authenticate with a password, a magic link, an OAuth provider, or a combination. The choice changes the UI, the database, the recovery flow, and the support burden.

**Available options.**

| Option                    | Strengths                                                                   | Weaknesses                                                                                             |
| ------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Email + password          | Familiar; no third-party login dependency; works for any address            | Password reuse and weak passwords; needs hashing, reset, rate limits                                   |
| Magic link                | No password to store or reset; good security properties if email is trusted | Entirely dependent on email deliverability; link interception; awkward on shared devices               |
| Google OAuth              | Strong provider-side authentication; no password storage                    | Requires Google Cloud configuration; excludes users without Google; account-linking and privacy issues |
| Password + optional OAuth | Broadest access with a convenience path                                     | Largest Stage 2 scope; account linking and duplicate-identity handling                                 |

**Recommendation.** **Email + password at launch.** Do not implement magic link or OAuth in Stage 2. Design the user model so an OAuth identity can be linked later without changing the session layer.

Password authentication is the only method that works for every devotee without a third-party account. It also matches the existing product language ("login", "registration", "password recovery") and the roadmap's expectation of a conventional account system. The security cost is manageable with Argon2id, rate limiting, generic errors, and a tested reset flow.

**Technical implications.**

- Registration, login, logout, password change, forgot-password, and reset-password endpoints.
- Password hashing and verification (D-06).
- Email delivery for reset links (D-08).
- No OAuth callback routes, provider secrets, or account-linking tables in Stage 2.
- A future `identities` collection or `oauthAccounts` field can be added without changing the `users` document's role/status model.

**Security and privacy implications.**

- Passwords are a high-value secret: never log, never return, never store reversibly, and never email them.
- Password reset is an account-takeover path and must be single-use, expiring, rate-limited, and session-revoking.
- Magic links were rejected for Stage 2 because they concentrate all security in email deliverability, which is not yet operational.
- OAuth was rejected for Stage 2 because it adds a provider dependency and identity-linking complexity before the core account model is proven.

**Impact on future development.**

- OAuth can be added later as an optional convenience without disrupting existing accounts.
- Magic link can be added as an alternative login after the email provider is mature.
- The UI and support documentation remain simple for the pilot.

**Owner input required:** Yes. This is a product and security decision.

---

### D-05 — Session strategy

**Problem.** A session can be a signed stateless token (JWT) or an opaque identifier backed by a database record. The choice determines revocation, suspension, and scaling behaviour.

**Available options.**

1. **JWT-only.** No database lookup per request; easy horizontal scaling. Revocation before expiry requires a denylist, which reintroduces state; role/status changes can be stale.
2. **Opaque database session.** A random token is stored hashed in MongoDB. Every authenticated request reads the session and user. Revocation is immediate.
3. **Hybrid.** Short-lived JWT plus a refresh/session record. More moving parts; useful at very large scale, unnecessary here.

**Recommendation.** **Option 2 — opaque database sessions.** The application already depends on MongoDB for every meaningful feature, and immediate revocation is a requirement for suspension, password reset, and role changes. The cost is one indexed lookup per authenticated request, which is negligible at this project's scale.

**Technical implications.**

- `sessions` collection: `tokenHash` (unique), `userId`, `createdAt`, `lastSeenAt`, `expiresAt`, `absoluteExpiresAt`, `revokedAt`, `revokedReason`, `ipHash`, `userAgent`.
- 32 random bytes, base64url-encoded, returned only in the cookie; only the SHA-256 hash is stored.
- 7-day idle lifetime and 30-day absolute lifetime. `lastSeenAt` updates are throttled to once every 5 minutes to avoid a write on every request.
- TTL indexes on `expiresAt` and `absoluteExpiresAt`; application checks remain authoritative.
- New session token on every login; revoke all sessions on password reset, suspension, and role change.

**Security and privacy implications.**

- Immediate revocation is the main security gain.
- A stolen cookie is still a bearer credential; mitigate with `HttpOnly`, `Secure` in production, `SameSite=Lax`, no `Domain` attribute, and a `__Host-` cookie name in production.
- Session records contain a hashed IP and user agent for abuse investigation; both are personal data. Keep them minimal, hash the IP with `AUTH_SECRET`, and do not expose them in the UI.
- The database becomes a dependency for authenticated requests; the existing bounded timeouts and 503 behaviour apply.

**Impact on future development.**

- Admin suspension takes effect on the next request, not after a token expires.
- Logout-all and "revoke other sessions" are straightforward.
- No JWT signing-key rotation or clock-skew handling is needed.

**Owner input required:** No. This is a technical consequence of D-01 and the existing MongoDB architecture. It is recorded as a convention.

---

### D-06 — Password hashing algorithm and parameters

**Problem.** Password hashes must resist offline cracking if the database is exposed. The choice also affects deployment because some algorithms are native dependencies.

**Available options.**

| Option   | Notes                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| Argon2id | OWASP first choice; memory-hard; native addon (`@node-rs/argon2` or `argon2`)                       |
| scrypt   | OWASP-acceptable; built into Node `crypto`; no native dependency; parameter tuning matters          |
| bcrypt   | Mature and widely deployed; 72-byte input limit; not memory-hard; native or pure-JS implementations |

**Recommendation.** **Argon2id via `@node-rs/argon2`**, with OWASP baseline parameters: memory 19 MiB, iterations 2, parallelism 1, 16-byte random salt, 32-byte output. Store a versioned hash string and rehash on successful login when parameters change.

If the owner rejects a native dependency or the chosen deployment platform cannot load it, the fallback is Node's built-in `crypto.scrypt` with OWASP parameters (`N=32768`, `r=8`, `p=3`, 16-byte salt, 32-byte key, `maxmem` at least 64 MiB). The hash format must identify the algorithm and parameters so a future migration is possible.

**Technical implications.**

- Add one password-hashing dependency, or use the Node built-in fallback. The choice must be recorded in an ADR before implementation.
- If `@node-rs/argon2` is used, add it to `serverExternalPackages` in `next.config.mjs` and verify the production build loads it.
- Hash format example: `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`.
- Use `crypto.timingSafeEqual` for verification comparisons.
- Never trim or normalise passwords; hash exactly what the user submitted.
- Benchmark on the target runtime; a single hash should take roughly 100–500 ms, not several seconds.

**Security and privacy implications.**

- Argon2id is memory-hard and resistant to GPU cracking.
- A native dependency adds supply-chain and platform risk; pin versions and review advisories.
- Password hashes are never selected into API responses; the Mongoose field uses `select: false`.
- A compromised database still exposes hashes; strong parameters and rate-limited login are the remaining defences.

**Impact on future development.**

- The versioned hash format allows a later algorithm change without forcing every user to reset.
- The chosen dependency must be part of the deployment smoke test.

**Owner input required:** No, unless the owner has a platform constraint that forbids native modules. This is an engineering convention with a documented fallback.

---

### D-07 — Account lifecycle: suspension, reactivation, deletion

**Problem.** The roadmap requires account lifecycle and suspension, but the product has no retention or deletion policy. Suspension is clearly needed before Stage 3 write operations; deletion is a privacy/legal decision.

**Available options.**

1. **No account states.** Every account is active; administrators cannot stop abuse. Not acceptable.
2. **Active/suspended only.** Simple; covers moderation. Deletion remains undefined.
3. **Full lifecycle.** `pending_verification`, `active`, `suspended`, `deleted` (soft delete with PII anonymisation), with audited transitions.

**Recommendation.** Implement `pending_verification`, `active`, and `suspended` in Stage 2. Add an audited administrator suspension/reactivation flow. **Do not implement self-service account deletion in Stage 2.** Record a soft-delete/anonymisation design for a later privacy decision:

- Suspension: administrator sets status, reason, timestamp; all sessions are revoked immediately; login returns `403 ACCOUNT_SUSPENDED` only after a correct password.
- Reactivation: administrator clears suspension fields; the user must log in again; email verification is not silently granted.
- Deletion (deferred): mark `deletedAt`, anonymise name/email, revoke sessions, retain audit records and aggregate/report records under a non-identifying tombstone. The retention period requires owner and privacy review.

**Technical implications.**

- `users.status` enum and suspension fields; session revocation query by `userId`.
- Admin endpoints for status changes; audit records in the same transaction where possible.
- No hard-delete endpoint in Stage 2; no cascade deletion of reports/proposals before those collections exist.
- A future anonymisation script must be idempotent and tested against a copy of real data.

**Security and privacy implications.**

- Suspension is the primary abuse control before reports and proposals exist.
- Immediate session revocation prevents a suspended user from continuing with an existing cookie.
- Deletion is deliberately deferred because it interacts with audit retention, report history, and the roadmap's "history is preserved" rule. Inventing a retention period now would be an irreversible product decision.

**Impact on future development.**

- Adds `admin.users.suspend` and `admin.users.reactivate` permissions.
- The privacy policy and Stage 7 retention work must cover account deletion.
- Later features can rely on `status === "active"` as the write-eligibility gate.

**Owner input required:** Yes for deletion and retention. The suspension/reactivation workflow itself can follow the convention above.

---

### D-08 — Transactional email provider and sender identity

**Problem.** If email verification or password recovery is enabled, the application needs a reliable transactional email path. The provider, sender domain, and credentials are not chosen.

**Available options.**

| Option                       | Notes                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Resend                       | Simple HTTP API; good developer experience; vendor dependency; API key                                     |
| Amazon SES                   | Mature and cost-effective at volume; more AWS setup; sandbox/production access process                     |
| SMTP (Nodemailer or direct)  | Provider-agnostic; works with many hosts; connection pooling and deliverability are the operator's problem |
| Postmark / Mailgun / similar | Strong deliverability focus; another vendor and cost                                                       |
| Development mailbox only     | Writes messages to `.local/mail/`; never used in production                                                |

**Recommendation.** Build a **provider-agnostic `mailer` adapter** with two implementations: a development/test mailbox that writes messages under `.local/mail/` (never logs tokens), and a production HTTP or SMTP transport selected by environment variables. The owner selects the production vendor, sender address, and domain. Do not hard-code a provider into route handlers.

The adapter interface should be small:

```js
sendVerificationEmail({ to, name, token, expiresAt });
sendPasswordResetEmail({ to, name, token, expiresAt });
sendAccountExistsEmail({ to, name });
```

**Technical implications.**

- Environment variables: `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_API_KEY` or `SMTP_URL`, and `APP_BASE_URL`.
- Templates must be plain text plus HTML with no user-controlled HTML injection.
- The development transport writes to a git-ignored directory; it must not print tokens or full links to the console.
- Delivery failures are logged without the token or full email body; the API returns a controlled `503 EMAIL_UNAVAILABLE`.
- SPF, DKIM, and DMARC are owner/operator tasks before launch.

**Security and privacy implications.**

- Email addresses and message content are personal data; choose a provider with appropriate data-processing terms.
- API keys are server-only secrets; never expose them via `NEXT_PUBLIC_*`.
- Verification and reset tokens are bearer credentials; never log them, never include them in analytics, and prefer fragment-based links.
- An email provider outage must not create a false "email sent" success message.

**Impact on future development.**

- Required before open registration and self-service password recovery.
- The adapter can later send proposal-status notifications (Stage 6) without changing auth code.

**Owner input required:** Yes. The owner must choose the provider, sender domain, and whether to enable email-dependent flows at launch.

---

### D-09 — First administrator bootstrap

**Problem.** There must be a secure way to create the first administrator without a public endpoint or a default password.

**Available options.**

1. First registered user becomes administrator — rejected: anyone could race to register.
2. Seeded administrator with a password in an environment variable — rejected: secrets in deployment configuration and shell history.
3. CLI script with an interactive, hidden password prompt — recommended.
4. One-time bootstrap token printed by the server — workable but more moving parts.

**Recommendation.** `scripts/create-admin.js` (or `scripts/create-user.js --role admin`) connects with `MONGODB_URI`, prompts for email, name, and password without echoing the password, hashes it with the same password module, creates the user with `role: "admin"`, `status: "active"`, and `emailVerifiedAt` set, and writes an audit record. It refuses to create an administrator if one already exists unless `--force` is explicitly supplied; even then it requires confirmation.

**Technical implications.**

- Scripts load `.env.local` with the existing `scripts/lib/load-env-file.js` pattern.
- No password is accepted as a command-line argument; it would appear in shell history and process listings.
- The script uses the same Mongoose models and validation as the API.
- It must be documented in the deployment runbook and tested against `utsav_connect_test`.

**Security and privacy implications.**

- No default credentials exist in the repository.
- The operator must have database access and console access to the deployment environment.
- Audit the creation event with the operator identity recorded as `bootstrap` or `cli`.

**Impact on future development.**

- Stage 2 can be tested end-to-end without a public admin registration path.
- Stage 7 launch checklist can reference the exact command.

**Owner input required:** No. This is an operational convention; the owner runs the command.

---

### D-10 — Audit-log retention and visibility

**Problem.** Security-relevant actions must be traceable, but audit logs contain personal data and can grow without bound. The retention period and audience are not defined.

**Available options.**

1. No audit collection; rely on application logs — rejected: logs rotate and are not queryable by administrators.
2. Append-only audit collection, administrator-only, retained indefinitely — strong accountability, but unbounded personal data.
3. Append-only audit collection, administrator-only, fixed retention (for example 12 months) — balanced, but the period is a policy decision.
4. Audit collection with a public subset — not recommended; security events are not public information.

**Recommendation.** Implement an **append-only `auditLogs` collection** in Stage 2, readable only by administrators. Record authentication and account-administration events. Do **not** add a TTL index until the owner approves a retention period. The proposed default is 12 months, after which records are purged by an operational job. Store identifiers as references or HMAC hashes, never raw passwords, tokens, cookies, or email addresses.

**Technical implications.**

- Fields: `actorUserId`, `actorRole`, `action`, `targetType`, `targetId`, `outcome`, `reasonCode`, `metadata` (safe, small), `ipHash`, `userAgent`, `createdAt`.
- Indexes: `createdAt` descending, `actorUserId + createdAt`, `action + createdAt`, `targetType + targetId + createdAt`.
- No update or delete API. The application never exposes a mutation path.
- Admin mutation + audit write should use a MongoDB transaction where both records must be consistent. Authentication events log best-effort; an audit failure must not silently grant access, but must not lock a legitimate user out either. Log the audit failure loudly.
- Redaction tests are mandatory.

**Security and privacy implications.**

- Audit logs support incident response and accountability.
- They also concentrate sensitive behavioural data; restrict access, minimise metadata, and define retention.
- IP addresses are personal data; store an HMAC with `AUTH_SECRET`, not the raw address.
- Audit records must not become a second password/token store.

**Impact on future development.**

- Stage 3 proposal approvals and Stage 5 admin actions reuse the same collection and viewer.
- Retention policy must be reflected in the privacy documentation before launch.

**Owner input required:** Yes for the retention period and any privacy-policy wording. The append-only/admin-only design is an engineering convention.

---

## 4. Convention-safe decisions

These do not need a separate owner decision because the existing architecture and roadmap already imply them. They are recorded so implementation does not improvise.

| ID   | Decision                    | Convention                                                                                                                                       |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-11 | Login identifier            | Email address is the unique login identifier. `name` is a display name, not a username. No public profile directory in Stage 2.                  |
| D-12 | Password policy             | Minimum 12 characters, maximum 128, no composition rules, no trimming, no silent truncation. Rate limiting and Argon2id carry the security load. |
| D-13 | Stage 2 roles               | `visitor` is anonymous; `devotee` is a registered account; `admin` is an administrator. No coordinator role in Stage 2.                          |
| D-14 | Session lifetime            | 7-day idle timeout, 30-day absolute timeout, new token on login, revoke on logout/password reset/suspension/role change.                         |
| D-15 | Admin self-protection       | An administrator cannot suspend or demote their own account, and the last active administrator cannot be suspended or demoted.                   |
| D-16 | API envelope                | Every response uses the existing `{ success, data }` / `{ success, error }` envelope and `Cache-Control: no-store` for auth/account/admin.       |
| D-17 | Error language              | Generic client messages; no driver errors, stack traces, password hashes, session tokens, or account-existence leaks.                            |
| D-18 | Email change                | Out of scope for Stage 2. A later flow must re-verify the new address and notify the old address.                                                |
| D-19 | Multi-factor authentication | Out of scope for Stage 2. Recommended for administrator accounts before public launch; design the login flow so a second factor can be inserted. |
| D-20 | Account deletion UI         | Out of scope for Stage 2. Deferred with D-07.                                                                                                    |

## 5. Deferred decisions (not Stage 2 blockers)

| PRD item | Question                                     | Stage | Treatment                                                                                   |
| -------- | -------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| 3        | Production MongoDB tier, region, backup plan | 7     | Keep development on Atlas `main`; production choice later. Does not change auth schema.     |
| 4        | Production hosting platform                  | 7     | Affects cookie domain, email provider, and native-module support; decide before deployment. |
| 5        | Google Maps APIs and billing limits          | 3     | Independent of authentication.                                                              |
| 6        | Population estimate sources and cadence      | 4     | Independent of authentication.                                                              |
| 7        | Leaderboard privacy (public names vs opt-in) | 5–6   | Default is aggregated counts only; no public devotee identity in Stage 2.                   |
| 8        | License intent                               | —     | MIT accepted in ADR-011; no action.                                                         |

## 6. Recommended approval package

If the owner accepts the recommendations, the following decisions can be recorded as accepted and implementation can begin in batches:

1. **D-01:** first-party auth layer with opaque database-backed sessions.
2. **D-02:** configurable registration; `closed` for pilot, `open` for public launch.
3. **D-03:** email verification required before login for self-registered accounts; admin-created accounts verified by the administrator.
4. **D-04:** email + password at launch; no magic link or OAuth in Stage 2.
5. **D-05:** opaque session records, 7-day idle / 30-day absolute, hashed token at rest.
6. **D-06:** Argon2id via `@node-rs/argon2`; Node `scrypt` documented as the fallback if native modules are rejected.
7. **D-07:** suspend/reactivate in Stage 2; deletion/anonymisation deferred until retention policy approval.
8. **D-08:** provider-agnostic email adapter; owner selects the production provider and sender domain.
9. **D-09:** CLI administrator bootstrap with hidden password prompt.
10. **D-10:** append-only admin-only audit log; 12-month retention proposed, no TTL until approved.

## 7. Questions that still need an explicit owner answer

Only these block the first Stage 2 implementation batch:

1. **D-01:** Do you approve a first-party authentication layer with opaque database sessions, or do you want Auth.js v5 despite its beta status and credentials-session limitations?
2. **D-02:** Should the pilot use closed registration with administrator-created accounts, or open registration immediately?
3. **D-03:** Is email verification required before login? If yes, approve the email-provider dependency.
4. **D-04:** Do you approve email + password as the only credential method for Stage 2, with OAuth/magic link deferred?
5. **D-08:** Which transactional email provider and sender domain should be used, or should email-dependent flows remain disabled until one is chosen?
6. **D-07/D-10:** Do you approve deferring account deletion and setting a 12-month audit retention target, or do you want a different retention policy now?

If those six answers are "accept the recommendation", Stage 2 Batch 0 can start. If any answer differs, the affected sections of the specification must be revised before coding.

## 8. What is explicitly not decided here

- No authentication code has been written.
- No production provider, domain, or credential has been selected.
- No account-deletion or audit-retention period has been made final.
- No OAuth, magic-link, MFA, passkey, or email-change capability is authorized.
- No production deployment is authorized.
