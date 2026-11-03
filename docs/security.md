# Security

Last updated: 2026-11-03. Lists the controls that exist in the code today and the ones still planned. Nothing here claims protection that is not implemented.

## Implemented

| Area                | Control                                                                                                                                                                                                                     | Where                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Secrets             | Only `.env.example` (placeholders) is committed; `.env*.local` and `.env` are git-ignored                                                                                                                                   | `.gitignore`                                           |
| Env validation      | Zod schema; failures report the variable name, never the value                                                                                                                                                              | `api/lib/env/env.js`                                   |
| Server/client split | `server-only` on env, database and logging modules; Next refuses to bundle them client-side                                                                                                                                 | `api/lib/**`                                           |
| Response headers    | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, payment, usb off), HSTS (production only), `X-Powered-By` removed | `next.config.mjs`                                      |
| Error handling      | Clients receive generic envelopes (`INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, `SERVICE_DEGRADED`); driver and stack details stay in server logs                                                                               | `api/lib/http/responses.js`, `app/api/health/route.js` |
| Logging             | JSON lines; keys named like `password`, `token`, `secret`, `authorization`, `cookie`, `mongodb_uri` are redacted; stacks omitted in production                                                                              | `api/lib/logging/logger.js`                            |
| Database timeouts   | Bounded connection/selection timeouts (5 s) so an outage degrades the health endpoint instead of hanging requests                                                                                                           | `api/lib/mongodb/connection.js`                        |
| Health endpoint     | Never cached (`no-store`); exposes only status, latency and app version                                                                                                                                                     | `app/api/health/route.js`                              |

## Not implemented yet (do not assume)

- Authentication, sessions, password hashing, email verification, account lifecycle (Stage 2, ADR-010).
- Authorization / role checks on the server (`api/lib/permissions.js`) — no protected routes exist because no protected data exists.
- Rate limiting on sensitive endpoints.
- Content-Security-Policy — deferred until the Google Maps scripts/styles are known so the policy can be written correctly instead of permissively.
- CSRF protection for mutating routes (none exist yet).
- Audit logging collection, security event logging.
- Dependency vulnerability scanning in CI (`npm audit` is not yet part of `make ci`).

## Operating rules

- Never commit `.env.local`, database dumps, API keys, or anything under `.local/`.
- Review `git diff` for secrets before every commit.
- Google Maps: use a browser-restricted public key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) and a separate server key (`GOOGLE_MAPS_SERVER_API_KEY`) with API restrictions and billing alerts (roadmap 6.3–6.4). Neither is read by the code yet.
