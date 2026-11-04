# Deployment and environment verification

Last updated: 2026-11-04. This is an environment-configuration record, **not** evidence that Utsav-Connect has been deployed. Production hosting, domain, monitoring, rollback, backup rehearsal, and release approval are all Stage 7 work.

## Current status

- Development and integration testing are intended to use MongoDB Atlas cluster `main` (ADR-012).
- No application deployment exists yet.
- The 2026-11-04 Stage 1 closure gate **passed** after the Atlas database-user password was aligned: `make check-db`, `make ci`, and production runtime checks succeeded. See `project-status.md`.

## Atlas configuration requirements

Keep actual values only in the ignored `.env.local` file:

```dotenv
MONGODB_URI=mongodb+srv://<db-user>:<db-password>@<cluster-host>/utsav_connect?retryWrites=true&w=majority&appName=<cluster>
MONGODB_URI_TEST=mongodb+srv://<db-user>:<db-password>@<cluster-host>/utsav_connect_test?retryWrites=true&w=majority&appName=<cluster>
```

Requirements:

1. The database user's password in Atlas must exactly match the value embedded in both ignored local URIs. Never paste it into a chat, issue, or committed file.
2. Grant the application user only `readWrite` on `utsav_connect` and `utsav_connect_test`; do not grant built-in administrative roles unless a later operational task explicitly needs one.
3. Add the developer or deployment host's public IP to the Atlas Network Access list. Do not leave `0.0.0.0/0` enabled beyond temporary setup.
4. Keep the default TLS-enabled Atlas connection. The URI must include each database name; otherwise the driver defaults to `test`.
5. Treat `utsav_connect_test` as disposable test-only data. `tests/helpers/database.js` rejects a test URI whose database name does not end in `_test`.

The owner reported the intended `readWrite` grants and active IP access entries on 2026-11-04. Live authentication now succeeds; the exact role grants and allow-list entries have not been independently audited from inside the application.

## Verification procedure

Run from the repository root:

```bash
make check-db
make ci
```

Expected sequence:

1. `make check-db` prints `MongoDB reachable` with only host, database, and latency.
2. `make ci` runs the JavaScript-only guard, ESLint, Prettier, 47 unit tests, the six Atlas-backed integration tests with `UTSAV_TEST_REQUIRE_DB=1`, and the production build.
3. The integration suite connects only to `MONGODB_URI_TEST`. Its current tests only connect and ping; they create, modify, and delete no records.
4. On failure, preserve the sanitized error output. Do not substitute a local MongoDB server, skip tests, or weaken the `_test` guard to close the gate.

## Resolved issue (2026-11-04)

An earlier attempt that day resolved the Atlas SRV/TXT records and reached the cluster but returned `bad auth`, indicating a credential mismatch rather than a network or TLS problem. After the database-user password was reset and both local URIs were updated, the verification procedure above passed in full: `make check-db` reached `utsav_connect`, `make ci` passed all six Atlas-backed integration tests and the production build, and a served production build returned 200 from the pages and health endpoint. No credentials were printed during verification.

## Future production checklist

Before Stage 7 deployment, choose a hosting provider and Atlas production tier/region; use separate production credentials and data; configure monitoring, error tracking, backups, restoration testing, a domain, HTTPS, deployment rollback, and post-deploy smoke tests. None of these are complete today.
