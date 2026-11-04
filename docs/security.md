# Security

Last updated: 2026-11-04. Lists the controls that exist in the code today and the ones still planned. Nothing here claims protection that is not implemented.

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

- Authentication, sessions, password hashing, email verification, account lifecycle (Stage 2, ADR-010). The proposed design is in [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md); no code exists.
- Authorization / role checks on the server (`api/lib/permissions.js`) — no protected routes exist because no protected data exists.
- Rate limiting on sensitive endpoints.
- Content-Security-Policy — deferred until the Google Maps scripts/styles are known so the policy can be written correctly instead of permissively.
- CSRF protection for mutating routes (none exist yet).
- Audit logging collection, security event logging.
- Dependency vulnerability scanning in CI (`npm audit` is not yet part of `make ci`).
- Automatic database backups (free tier has none — see `database.md`).

## Stage 2 security design (PROPOSED — not implemented)

The following controls are specified but not active. They must not be described as implemented until the Stage 2 acceptance criteria in the specification are verified.

| Area                | Proposed control                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessions            | Opaque 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie; `Secure` and `__Host-` prefix in production; SHA-256 hash stored in MongoDB             |
| Revocation          | Logout, password reset, suspension, and role change revoke sessions immediately; 7-day idle and 30-day absolute lifetime                              |
| Passwords           | Argon2id (19 MiB, 2 iterations, 1 lane) via `@node-rs/argon2`; Node `scrypt` documented fallback; versioned hash format; rehash on login              |
| Email verification  | Single-use, 24-hour token; token in URL fragment; resend rate-limited; login blocked until verified for self-registered accounts                      |
| Password recovery   | Single-use, 30-minute token; generic `202` response; all sessions revoked; no account enumeration                                                     |
| CSRF                | Origin check on every mutating request; JSON content type required; `SameSite=Lax`; no permissive CORS                                                |
| Rate limiting       | MongoDB fixed-window counters keyed by HMAC of IP/email; login, registration, verification, recovery, and admin policies                              |
| Enumeration         | Generic login/forgot/reset/registration responses; dummy password verification for unknown emails; account-state errors only after a correct password |
| Authorization       | Server-side role/permission map; page guards and API guards; ownership checks; middleware is not the authority                                        |
| Audit               | Append-only `auditLogs`; admin-only viewer; HMAC-hashed IPs; no passwords, tokens, cookies, or raw emails                                             |
| Administrator rules | No public admin registration; CLI bootstrap with hidden prompt; no self-suspension/demotion; last active admin protected                              |

Full detail, API contracts, and tests: [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md). Decision status: [`stage-2-decision-report.md`](stage-2-decision-report.md).

## Operating rules

- Never commit `.env.local`, database dumps, API keys, or anything under `.local/`.
- Never paste connection strings or keys into chats or issues; share them through a password manager.
- Review `git diff` for secrets before every commit.
- Google Maps: use a browser-restricted public key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) and a separate server key (`GOOGLE_MAPS_SERVER_API_KEY`) with API restrictions and billing alerts (roadmap 6.3–6.4). Neither is read by the code yet.
