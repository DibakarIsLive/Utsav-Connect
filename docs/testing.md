# Testing

Last updated: 2026-11-03.

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

## Stage 1 closure re-verification — 2026-11-04

`make check-db` and a direct, credential-safe `MONGODB_URI_TEST` ping both reached Atlas but returned `MongoServerError: bad auth : authentication failed`. The test URI still targets `utsav_connect_test` and passes the `_test` suffix guard; no test data was created, changed, or removed.

`make ci` was deliberately **not run** because it sets `UTSAV_TEST_REQUIRE_DB=1` and the database prerequisite failed. Do not bypass that gate or change tests to make it pass. After the Atlas password matches `.env.local`, run:

```bash
make check-db
make ci
```

The production build was run independently and passed on 2026-11-04. See `project-status.md` for its route list and the closure record.

## Planned

- Playwright end-to-end tests once interactive flows exist (Stage 2).
- Accessibility checks (axe) on each page in CI.
- Coverage reporting (`@vitest/coverage-v8`) when models and services land.
