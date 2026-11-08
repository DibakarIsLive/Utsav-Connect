# Testing

Last updated: 2026-11-05.

## Layout

```text
tests/
├── unit/           pure logic, no network: env parsing, HTTP helpers, logger, navigation, JS-only scanner
├── integration/    real MongoDB: connection module, GET /api/health handler (imports the route directly)
├── helpers/        database.js — test URI guard, reachability probe, suite gate
├── setup/          load-env.js — loads .env.local before every suite
└── stubs/          server-only.js — empty module so `import "server-only"` works outside Next
```

Vitest configuration lives in `vitest.config.mjs` (Node environment, `@/` alias, 20 s timeouts for database cases).

Integration suites talk to the **MongoDB Atlas** cluster through `MONGODB_URI_TEST` in `.env.local` (database `utsav_connect_test`). Each connection to Atlas costs roughly 600 ms from the developer machine, so the integration run takes about 13 s in total; this is network latency, not a test problem.

## Commands

| Command                                              | Needs MongoDB | Notes                                               |
| ---------------------------------------------------- | ------------- | --------------------------------------------------- |
| `npm run test:unit` / `make test-unit`               | no            | 47 tests, < 1 s                                     |
| `npm run test:integration` / `make test-integration` | yes           | 6 tests; skips with a console notice if unreachable |
| `npm test` / `make test`                             | optional      | both suites                                         |
| `UTSAV_TEST_REQUIRE_DB=1 npm run test:integration`   | required      | fails instead of skipping — used by `make ci`       |
| `npm run test:watch`                                 | optional      | watch mode                                          |

## Database safety rules

- Integration tests use `MONGODB_URI_TEST` only. `tests/helpers/database.js` throws unless the database name ends in `_test`, so a mistaken URI can never point tests at development or production data.
- Tests create and drop nothing outside that database; the current suites only open connections and ping.
- "Unreachable" scenarios use `mongodb://127.0.0.1:1/utsav_connect_unreachable` — no server is ever stopped by a test. Each such case takes ~5 s because `serverSelectionTimeoutMS` is 5 000 ms by design.
- Unit-test scratch directories are created under the git-ignored `.local/test-scratch/` and removed after each test.

## What the current suites prove

| Suite                                    | Proves                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `unit/env.test.js`                       | required/optional variables, defaults, URI scheme check, error formatting, memoisation and reset     |
| `unit/http.test.js`                      | envelope shapes, status codes per error class, Zod issue formatting, no leakage of unknown errors    |
| `unit/logger.test.js`                    | level filtering, JSON-line output, redaction of sensitive keys (case-insensitive), error serialising |
| `unit/navigation.test.js`                | active-path rules (`/` exact, others prefix)                                                         |
| `unit/check-javascript-only.test.js`     | detection of `.ts/.tsx/.mts/.cts`, `tsconfig*.json`, `next-env.d.ts`; ignored directories            |
| `integration/mongodb-connection.test.js` | connect + reuse, health ping, disconnect/reconnect, `DatabaseUnavailableError` then recovery         |
| `integration/health-route.test.js`       | real handler returns 200 envelope; 503 `SERVICE_DEGRADED` without driver error text in the body      |

## Verification policy (from roadmap Rule 6 and Phase 36)

Three kinds of evidence are reported separately and never conflated:

1. **Automated tests** — the suites above.
2. **Process checks** — `npm run build`, `next start`/`next dev` with `curl` for status codes, headers and JSON bodies.
3. **Browser verification** — the page opened in a real browser and its live DOM/text read. If browser tooling is unavailable, the check is reported as _unverified_, not assumed.

Record of the 2026-11-03 milestone is in `project-status.md` → "Verification record".

### Reproducing the live 503 check without stopping MongoDB

```bash
MONGODB_URI="mongodb://127.0.0.1:1/utsav_connect_unreachable" npx next start -p 3001 &
curl -s -D - http://localhost:3001/api/health      # expect HTTP/1.1 503 + SERVICE_DEGRADED
kill $(lsof -nP -iTCP:3001 -sTCP:LISTEN -t)
```

## Stage 1 closure verification — 2026-11-04

An earlier attempt that day failed with `bad auth`; after the Atlas database-user password was aligned with the ignored `.env.local` value, the full gate was rerun without changing or skipping any test:

```bash
make check-db
make ci
```

Results:

- `make check-db`: **passed** — Atlas reachable, `database=utsav_connect`, latency 621 ms; only host and database name printed.
- `make ci`: **passed** — JS-only guard, ESLint, Prettier, 47 unit tests, 6 integration tests with `UTSAV_TEST_REQUIRE_DB=1` (2 files; 8.54 s on the closure run, 7.65 s on the final rerun), and the production build.
- Integration suites used `MONGODB_URI_TEST` (`utsav_connect_test`) and the `_test` suffix guard remained active. The suites only connect and ping; they created, changed, and removed no records.
- Production build: Next.js 16.4.4 compiled with 6 routes. Served with `next start`, `/`, `/about`, and `/map` returned 200, `/api/health` returned 200 `status: ok`, an unknown path returned 404, and the security headers listed in `security.md` were present. With an unreachable `MONGODB_URI`, pages still returned 200 while `/api/health` returned 503 `SERVICE_DEGRADED` after the bounded 5 s timeout.

No real-browser check was repeated during the closure run. See `project-status.md` for the complete record and the distinction between automated, process, and browser evidence.

## Stage 2 authentication and application test plan (ACCEPTED DESIGN — no tests written yet)

The full matrix is in [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md) §21. It is summarized here so the testing document remains the operational index.

On 2026-11-05 the documentation-only revision passed `make check` (JS-only guard, ESLint, Prettier, 5 unit files / 47 tests). No authentication or application test exists yet, so the run does not verify Stage 2 behaviour.

| Layer       | Planned suites                                                                                                                                                                                                                                                                                                        | Database | Gate                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| Unit        | password hash/verify/rehash, token shape/expiry, cookie flags, session scope, single-TTL calculation, permission matrix, application state machine, CSRF origin rules, rate-limit windows, six-field validation with strict unknown-key rejection, safe-user/PII projection, audit redaction, admin-permission grants | no       | `make check`                 |
| Integration | application submission, duplicate handling, verification, approve/reject atomicity, notes access, active login, limited applicant login, sessions, recovery, rate limits, devotee management, administrator hierarchy/invitation, IDOR, PII projections, audit                                                        | yes      | `make ci`                    |
| E2E         | apply/verify/limited applicant summary, admin review/approve, approved login, generic rejection, devotee denied admin, suspension revocation, administrator invitation/permissions, invitation-report privacy, keyboard navigation                                                                                    | yes      | `make test-e2e` (new target) |
| Security    | enumeration, CSRF, NoSQL injection, mass assignment, role/permission injection, Super Admin capability injection, session fixation, cookie attributes, scope escalation, self-promotion, last-Super-Admin guard, PII leakage, unapproved-field injection                                                              | yes      | integration + review         |
| Browser     | desktop/mobile application, login, recovery, admin review, notes, permission dialogs, masking, focus/labels                                                                                                                                                                                                           | yes      | manual record                |

Rules that carry over:

- Integration suites use `MONGODB_URI_TEST` only; the `_test` suffix guard is never weakened.
- Auth/application tests delete only their own collections in `utsav_connect_test`; they never touch `utsav_connect`.
- Tests use synthetic applicant data and a development mailbox or stub, never a real email provider or real person's PII.
- Never snapshot full applicant documents, tokens, or PII in test output.
- Any browser or E2E check that cannot run is recorded as **unverified**, not assumed.
- `UTSAV_TEST_REQUIRE_DB=1` remains mandatory in `make ci`; auth/application tests must not silently skip in CI.

## Planned

- Playwright end-to-end tests once interactive flows exist (Stage 2).
- Accessibility checks (axe) on each page in CI.
- Coverage reporting (`@vitest/coverage-v8`) when models and services land.
