## Checkpoint — Automated test credential isolation (2026-11-19)

Playwright now creates a unique `.local/test-runs/playwright-<run>` workspace in `playwright.config.mjs`, exports it to the managed server via `webServer.env`, and `scripts/serve-e2e.mjs` reuses/validates it. Global setup records a real-registry snapshot and global teardown verifies it and removes only that run's workspace. Vitest uses one run-wide workspace via `tests/setup/global-isolation.mjs`, so cleanup runs even when suites are skipped. `tests/helpers/local-workspace.js` now strictly refuses cleanup outside `.local/test-runs/`. Added unit and integration isolation suites plus a Playwright isolation spec. `npm run check` 210 passed, `npm run build` passed, integration isolation 3 passed (DB suites skipped: Atlas unavailable), Playwright isolation 1 passed / 1 skipped (DB-dependent case). Real `.local/test-users/` checksums unchanged (250 files).

## Checkpoint — Local path and audit-view stabilization (2026-11-18)

Hardened `api/lib/paths/local-artifacts.js`: `UTSAV_LOCAL_DIR` is validated to resolve inside the project root, path segments are checked for traversal/absolute values, and the computed target is double-checked against both the repository root and the approved `.local` root. All test workspaces moved from `/tmp` into `.local/test-runs/`. Anchored `scripts/lib/load-env-file.js`, `scripts/take-screenshots.js`, Playwright output/report directories, and added `make show-local-paths` / `scripts/show-local-paths.mjs`. The two consecutive `admin.invitation.list_viewed` events were caused by React StrictMode running the invitation mount effect twice in development while the GET handler audited every fetch; the audit now fires only for an explicit `?view=1` request and a `useRef` guard ensures one initial view per mount. `npm run check` 204 passed, `npm run test:integration` 157 passed / 11 skipped, `make test-e2e` 195 passed / 12 skipped. Parent `Repo/.local` has no files; 250 existing credential records untouched.

## Checkpoint — Stabilization pass (2026-11-18)

Addressed all outstanding audit findings. `.local/` artifacts are now anchored to the discovered Utsav-Connect project root (marker-based resolver, not `process.cwd()`); the five misplaced `.eml` files were migrated into `Utsav-Connect/.local/mail/` and verified by checksum. Permanent account deletion is disabled in UI and API (410) pending formal retention-policy approval; suspension/reinstatement unchanged. Audit responses now use a field allowlist (no `ipHash`/`userAgent`), write-time metadata redaction, and keyed HMAC-SHA256 IP hashing with a versioned `v1:` prefix for new records; historical records are untouched. `application:note:write` is enforced via a separate note endpoint and separate UI action. Invitation acceptance is transactional, rate limited, and audits list access. The last-active-Super-Admin rule is an explicit, unit-tested policy function. A registry test fails any unguarded Admin API route. `npm run check` 199 passed, `npm run test:integration` 157 passed / 11 skipped (deletion), `npm run build` passed, `make test-e2e` 195 passed / 12 skipped / 0 failed. Pilot data and real accounts untouched.

# Project status

Last updated: 2026-11-17 · Branch `main` · Scope: [Product requirements](product-requirements.md) · Active plan: [Roadmap](../roadmap.md)

## Checkpoint — Administrator security and functional audit (2026-11-18)

Focused audit of administrator creation, invitations, granular permissions, overview metrics and account protection. Fixed: invitation acceptance sent an `email` field the strict API rejected; acceptance errors were stored but never rendered; the create-account form could create Super Admins (D-24 violation) — now refused at API and UI, with promotion via PATCH also refused; permission arrays are bounded and de-duplicated; overview devotee counts now come from a `devotee:read:all`-gated aggregation; recent activity now populates actor names. Added `tests/integration/admin-security-audit.test.js` (14 tests) and `tests/playwright/admin-security-audit.spec.js` (3 tests × 3 viewports). Open: `application:note:write` is still unenforced, invitee emails/reasons remain in audit metadata, and there is no central route-registry guard. `npm run check` 184 passed, `npm run test:integration` **148 passed**, `npm run build` passed, `make test-e2e` **198 passed / 0 failed / 0 skipped**. Pilot never contacted.

## Checkpoint — Full account lifecycle verification (2026-11-18)

Focused verification of the complete devotee lifecycle used a disposable `lifecycle-*` account in `utsav_connect_test` only, behind an explicit `_test` DB-name guard. Added `tests/integration/account-lifecycle-verification.test.js` (6 tests) and a browser test for status-dependent detail actions (reinstatement discoverable when suspended). Admin status changes now require a written reason in the API and UI, consistent with devotee suspension/reinstatement. Database checks confirmed the disposable account, its sessions/tokens and its credential-registry entry were removed while audit history and anonymized records were retained. Pilot was never contacted. `npm run check` 184 passed, `npm run test:integration` **134 passed**, `npm run build` passed, `make test-e2e` **189 passed / 0 failed / 0 skipped**.

## Checkpoint — Distinct devotee delete permission (2026-11-18)

Added `devotee:delete`; it is not auto-granted and is required for permanent devotee deletion. `devotee:status:update` still governs suspension/reinstatement only. Super Admin retains deletion of devotees and administrators; ordinary admins still cannot delete privileged accounts. `npm run check` 184 passed, `npm run test:integration` 128 passed, `make test-e2e` **186 passed / 0 failed / 0 skipped**, `npm run build` passed.

## Checkpoint — Account lifecycle (2026-11-18)

Permanent account deletion is implemented and browser-verified. `npm run check` 184 passed, `npm run test:integration` 126 passed, `make test-e2e` **183 passed / 0 failed / 0 skipped**, `npm run build` passed. Pilot accounts untouched. See [Account lifecycle](../03-features/account-lifecycle.md).

## Checkpoint — Focus-management fix (2026-11-17)

Fixed the shared `Modal` effect that re-ran whenever a caller passed a fresh `onClose` closure, stealing focus to the close button on every keystroke. Stabilised the callback with a ref, improved initial focus selection, added an in-modal focus trap, and fixed broken validation-error focus targets in area, account, login and report forms. Fixed the shared `PhoneInput` feedback loop that rewrote typed digits. `npm run check` 184 passed, `npm run test:integration` 121 passed, `make test-e2e` **171 passed / 0 failed / 0 skipped**, `npm run build` passed. See [Testing](../04-quality/testing.md) and the external `AI.md` report.

## Checkpoint — Next.js security patch (2026-11-17)

`next` and `eslint-config-next` moved from 16.4.4 to 16.4.6; React/React DOM unchanged (19.3.0). npm audit no longer reports a `next` advisory. `make dev` starts without any upgrade prompt; HMR was verified with a temporary route; `/`, `/about`, `/map`, `/apply`, `/api/health`, `/api/auth/me` returned 200 and protected routes redirected (307). `npm ci --dry-run`, `npm run check` (184), `npm run test:integration` (121), `npm run build`, and `make test-e2e` (150) all passed. New deliberate upgrade targets: `make next-upgrade-check` and `make next-upgrade NEXT_TARGET=… [CONFIRM=1]`. See [dependency upgrades](../05-operations/dependency-upgrades.md).

## Checkpoint — Phase B admin workspace (2026-11-17)

All eight Admin Workspace sections are integrated and browser-verified. Added dedicated pages for Devotee Management, Population Management and Campaign Analytics; added a devotee account directory API and a permission-gated status endpoint with mandatory reason, audit event and session revocation on suspension. Existing areas, reports, proposals, audit and dashboard components were reused. `npm run check` 184 passed, `npm run test:integration` 121 passed, `make test-e2e` **150 passed / 0 failed / 0 skipped**, `npm run build` passed. Next.js emitted a security upgrade nudge (not accepted; build passed on retry). See the [Phase B checklist](../03-features/phase-b-acceptance-checklist.md) and the external `AI.md` report.

## Checkpoint — Stage 0 stabilization (2026-11-17)

P0 defects D1, D2, D3 and D5 were fixed and regression-tested. Details and exact commands are in the Stage 0 final report (external `AI.md`) and in [Testing](../04-quality/testing.md).

- **D1** — imported the missing `logger` in `api/services/auth-service.js`; removed `emailSent` from the public password-reset response so existing/unknown emails are indistinguishable. 5 mocked unit regressions + 8 integration tests pass.
- **D5** — account update route now uses the pre-assignment `changed.status` value; registry updates are atomic and lock-protected, and failures never roll back MongoDB. 6 route regressions + 33 registry unit tests pass.
- **D2** — committed guarded E2E seed, server wrapper, shared DB guard, `make test-e2e`; pilot and unexpected DB names rejected; repeat seeding idempotent. Browser journeys: **93 passed, 0 failed**.
- **D3** — `scripts/sync-indexes.js` replaced with additive-only inspection/dry-run/apply covering all 9 models; no `syncIndexes()`, no drops; pilot `--apply` refused without explicit flag. Read-only inspection: 0 missing / 0 conflicting indexes in both databases.
- Regression: `npm run check` 184 unit tests passed; `npm run test:integration` 121 passed; `npm run build` passed; links 249 checked / 0 broken.
- Limitations: E2E ran on a production build because Next.js forbids a second dev server in one directory; real email, Maps and production deployment remain untested.

Status vocabulary: **IMPLEMENTED & VERIFIED** (code + evidence) · **IMPLEMENTED, UNVERIFIED** (code exists, acceptance not performed) · **PARTIAL** · **PLANNED** · **BLOCKED**.

For a feature-by-feature evidence matrix see [Feature status](../03-features/feature-status.md).

## 1. Current checkpoint (2026-11-17)

This item was a **documentation-only** reorganization. No application code, database record, pilot account, email or deployment was changed. The working tree still contains a large set of uncommitted implementation changes from earlier work; those changes were preserved.

### Verified during this documentation task (read-only)

| Check                     | Result                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git status before/after   | Captured and compared; no application source modified by this task                                                                                         |
| Pilot database inspection | Read-only: `mr.dib@gmail.com` = super_admin/active, `devotee@gmail.com` = devotee/active/verified, 1 approved application, 0 areas, 0 proposals, 0 reports |
| Database separation       | `MONGODB_URI` → `utsav_connect_pilot`; `MONGODB_URI_TEST` → `utsav_connect_test`                                                                           |
| Email configuration       | `EMAIL_PROVIDER=dev` → `.local/mail/` file transport; no real email sent                                                                                   |

### Recorded from the previous verification checkpoint (2026-11-16, not re-run here)

| Check                                                     | Recorded result                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run check` (JS-only, ESLint, Prettier, unit)         | PASSED — 167 unit tests, 11 files                                                                            |
| `npm run test:integration`                                | PASSED — 120 tests, 12 files, `_test` database                                                               |
| `npm run build`                                           | PASSED                                                                                                       |
| Real dev-browser check, desktop 1366×768 + mobile 390×844 | 0 React key warnings; 20 unique valid IDs in both layouts; filter/search/pagination/detail navigation worked |

These are historical claims with recorded evidence, not fresh results from this documentation task.

## 2. What exists today

| Area                                                                                           | State                                           | Notes                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Public website (home, About, venue `/map`, apply, auth entry pages)                            | IMPLEMENTED & VERIFIED (browser, 3 breakpoints) | `/map` is a static venue page, not an interactive campaign map                                                       |
| Identity: application, verification, login/logout, sessions, password reset, admin invitations | IMPLEMENTED; partly verified                    | Integration-tested; browser journeys cover login and some page access, not the full mutation lifecycles              |
| Devotee dashboard                                                                              | IMPLEMENTED, UNVERIFIED for full acceptance     | Real server-side data; report submission/reports/proposals/analytics on one page                                     |
| Admin workspace (overview, applications, areas, proposals, invitations, audit, users)          | IMPLEMENTED, UNVERIFIED for full acceptance     | Server-side permission gates; browser checks mostly assert headings                                                  |
| Super Admin (accounts, roles, invitations, permissions, suspension)                            | IMPLEMENTED, UNVERIFIED for full acceptance     | Direct creation and invitations exist; no platform-management page                                                   |
| Geographic and campaign backend                                                                | IMPLEMENTED & integration-tested                | Areas, proposals, reports, coverage, audit; pilot has no campaign data                                               |
| Interactive map, area details, public live statistics                                          | PARTIAL                                         | Fully coded components under `ui/components/maps/` and `ui/components/home/` are **orphaned — no page imports them** |
| Messaging, notifications, announcements, session UI, activity history, retention               | PLANNED / MISSING                               | See [Workstream B](../roadmap.md)                                                                                    |

## 3. Configuration status

| Setting             | Current value / status                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REGISTRATION_MODE` | `closed` — keep closed until real email delivery is proven                                                                                                                                               |
| `EMAIL_PROVIDER`    | `dev` — writes `.eml` files to `.local/mail/`; **no real email is sent**                                                                                                                                 |
| Email transports    | `dev` + Resend REST are implemented in code. **There is no SMTP transport** (an older document claimed one; corrected here)                                                                              |
| Google Maps         | Venue short link + name-based directions. Orphaned map components read `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; no server-side Places/Geocoding integration; short-link destination not independently resolved |
| Security headers    | Baseline headers on all routes; `no-referrer` + `no-store` on token pages; no CSP                                                                                                                        |
| HMR watch exclusion | An older ADR claimed a Turbopack watch exclusion for `.local/`; the current `next.config.mjs` does **not** contain one. Treat the ADR note as historical                                                 |

Official venue: **Kulti Golf Ground, Kulti, West Bengal, India**. Satsang Ashram, Deoghar is a separate sacred location and is never shown as the venue.

## 4. Known open items

1. **Password reset runtime defect** — `logger` used without import in `api/services/auth-service.js`; fails when email delivery is unavailable or a send fails, and leaks account existence.
2. **Playwright reproducibility** — seeded accounts are hard-coded; seed file is git-ignored; no `make test-e2e`; a committed failure artifact exists.
3. **Index management** — `scripts/sync-indexes.js` covers 7/9 models and can drop indexes.
4. **Dead permissions** — `application:note:write`, `devotee:read:all`, `devotee:status:update` are declared but never enforced.
5. **Audit immutability** is application-level only (Mongoose hooks, bypassed in test).
6. **Real email, Maps configuration, backups, hosting and deployment** remain outstanding.
7. **Documentation drift** from earlier stages is being corrected by this reorganization; historical documents are preserved with banners in [06-history](../06-history/).

## 5. Historical verification records (preserved)

### Stage 1 closure — 2026-11-04 (historical)

`make check-db` and `make ci` passed after an Atlas credential incident was resolved by rotating the password. Production build served; `/`, `/about`, `/map` returned 200; `/api/health` returned 200 and degraded correctly with an unreachable URI. Test counts at that time: 47 unit, 6 integration. Those counts are obsolete.

### Super Admin CLI checks — 2026-11-11 (historical)

`make test-superadmin-prompt`: 12 automated non-TTY checks passed; TTY-only checks documented for a real terminal. `make check-super-admin`: read-only pilot inspection. Its recorded output at that time (0 active Super Admins, `sa@utsav.test` not found) is **outdated** — the current pilot has one active Super Admin. `make createsuperuser` and `make recover-super-admin` are interactive and were not run by this documentation task.

### Admin applications key-warning fix — 2026-11-16 (historical)

Client component switched back to the serialized `id` field; 0 React key warnings in a real dev browser on desktop and mobile. See ADR-017 in [Decisions](../02-architecture/decisions.md).

## 6. Evidence rules

Automated tests, process checks and browser verification are reported separately. A skipped integration suite is not a pass. Browser claims name viewport, route and observed behaviour. See [Testing](../04-quality/testing.md).
