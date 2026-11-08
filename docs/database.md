# Database

Last updated: 2026-11-05.

## Where the data lives

The project database is a **MongoDB Atlas** cluster (ADR-012):

| Purpose     | Variable           | Database name        | Notes                                                                |
| ----------- | ------------------ | -------------------- | -------------------------------------------------------------------- |
| Development | `MONGODB_URI`      | `utsav_connect`      | Atlas cluster `main`; created on first write                         |
| Tests       | `MONGODB_URI_TEST` | `utsav_connect_test` | same cluster; name **must** end in `_test` (enforced by the tests)   |
| Production  | `MONGODB_URI`      | open                 | tier, region, backup plan and whether it shares the cluster are open |

Connection strings are `mongodb+srv://<user>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority&appName=<cluster>`.
**Always include the database name** — an Atlas string that ends in `/` makes the driver default to a database called `test`.

Credentials live only in `.env.local` (git-ignored). The application never starts, stops, or configures the cluster; `npm run check:db` / `make check-db` verifies reachability and prints only host and database name. Live authentication and the isolated test database were verified on 2026-11-04 by `make check-db` and the six-test integration suite in `make ci`.

A local `mongod` still works for offline development (`mongodb://127.0.0.1:27017/utsav_connect`); the code does not care which one is used.

## Connection module

`api/lib/mongodb/connection.js` (server-only):

- `connectToDatabase({ uri? })` — connects with Mongoose using `MONGODB_URI` (or the given URI), caches the pending/resolved connection on `globalThis` so Next.js hot reloads and concurrent requests share one pool, logs `mongodb.connected` with host and database name (never the URI), and throws `DatabaseUnavailableError` on failure after clearing the cache so the next call retries.
- `CONNECTION_OPTIONS` — `serverSelectionTimeoutMS: 5000`, `connectTimeoutMS: 5000`, `socketTimeoutMS: 30000`, `maxPoolSize: 10`, `bufferCommands: false` (operations fail immediately instead of queueing while disconnected).
- `disconnectFromDatabase()` — used by tests and graceful shutdown.
- `getConnectionState()` — `disconnected | connected | connecting | disconnecting`.

`api/lib/mongodb/health.js` → `checkDatabaseHealth()` pings the `admin` database and returns `{ status: "ok" | "unavailable", latencyMs, message? }`.

Measured from the developer machine (India) to the cluster: first connection ≈ 600 ms, subsequent pings ≈ 100–300 ms. Expect the health endpoint and integration tests to be slower than against a local server.

## Collections

None are defined yet. Per roadmap Phase 3, each collection is introduced with its first real use and tests. The planned set: `users`, `devoteeApplications`, `devoteeApplicationNotes`, `sessions`, `authTokens`, `rateLimits`, `areas`, `localityProposals`, `invitationReports`, `populationRecords`, `auditLogs`, `areaAssignments`, `notifications`, `systemSettings`.

### Stage 2 auth and application collections (ACCEPTED DESIGN — not created)

The authentication specification introduces seven collections before the geographic ones. They are designed but **not present in any database** and no model file exists yet. Full field and index definitions: [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md) §4.

| Collection                | Purpose                                                                    | Key indexes                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                   | Account identity, role, status, password hash, verification timestamps     | `email` unique; `role + status`; `status + createdAt`; `role + createdAt`; `applicationId`                                                                                         |
| `devoteeApplications`     | Application snapshot, private applicant PII, review decision               | `userId` unique partial (`isCurrent`); `status + submittedAt`; `submittedAt`; `applicantEmail`; `applicantPhoneNormalized`; `applicantNameSearch`; `reviewedByUserId + reviewedAt` |
| `devoteeApplicationNotes` | Append-only internal notes                                                 | `applicationId + createdAt`; `authorUserId + createdAt`                                                                                                                            |
| `sessions`                | Opaque session hash, scope, expiry, revocation                             | `tokenHash` unique; `userId + revokedAt`; one TTL on effective `expiresAt`; `absoluteExpiresAt` validated but not TTL-indexed                                                      |
| `authTokens`              | Single-use verification, reset, and admin-invitation token hashes          | `tokenHash` unique; `userId + purpose + usedAt`; TTL on `expiresAt`                                                                                                                |
| `rateLimits`              | MongoDB-backed fixed-window counters for sensitive endpoints               | `_id` HMAC key; TTL on `expiresAt`                                                                                                                                                 |
| `auditLogs`               | Append-only authentication, application, administrator, and access history | `createdAt`; `actorUserId + createdAt`; `action + createdAt`; `targetType + targetId + createdAt`                                                                                  |

Rules for these collections:

- Store only SHA-256 hashes of session and auth tokens; the raw value exists only in the cookie or email link.
- Store `passwordHash` with `select: false`; no API projection includes it.
- Do **not** store gender, phone, or the custom message on `users`. They live only on `devoteeApplications` and are never copied into public projections. **Date of birth is not collected or stored anywhere.**
- Applicant name/email snapshots on the application are immutable; the current account name/email on `users` may change later.
- Hash IP addresses with `AUTH_SECRET` (HMAC-SHA-256); never store raw IPs in sessions or audit logs.
- Create indexes with `scripts/sync-indexes.js` in deployed environments; do not rely on implicit production index creation.
- No TTL on `auditLogs` or application PII until the owner approves retention (D-10/D-19).
- Integration tests may create and drop these collections only in `utsav_connect_test`.

### Application retention (DEFERRED — no automatic purge)

No applicant-PII retention period, automatic expiry, anonymisation, or purge job is approved for Stage 2. No TTL index exists on `devoteeApplications`, `devoteeApplicationNotes`, or `auditLogs`. The `expired` state is reserved and is not set by a Stage 2 job. A future policy must be explicitly approved before implementation; see [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md) §4.9 and D-19/D-10 in [`decisions.md`](decisions.md).

### Invitation-report collection (Stage 4 — PROPOSED)

`invitationReports` is not part of Batch 0. Its privacy shape is fixed now:

- `submittedByUserId` is stored separately from `participatingDevoteeCount`.
- No invitee names, phone numbers, or email addresses are collected by default.
- Contributor identity is resolved from `users` only for administrators with `invitation-report:read:all`.
- Devotees receive aggregate statistics and their own reports only.
- Indexes: `areaId + reportDate`, `submittedByUserId + createdAt`, `status + reportDate`.

Full field list: [`stage-2-authentication-spec.md`](stage-2-authentication-spec.md) §4.8.

Conventions to apply when they arrive (roadmap 3.3–3.10):

- Mongoose schemas with `timestamps: true`; audit metadata (`createdBy`, `updatedBy`) on administrative records.
- `_id` ObjectId everywhere; human-readable `slug` with a unique index where users see identifiers (areas).
- GeoJSON `Polygon`/`MultiPolygon`/`Point` fields with `2dsphere` indexes.
- Pagination by cursor on `_id` (or `createdAt,_id`), default page size 25, max 100.
- Multi-document writes (approve application → update user → write audit log) in a transaction. Atlas clusters are replica sets, so transactions are available without extra setup.

## Access control (Atlas)

- One database user for the application; grant it `readWrite` on `utsav_connect` and `utsav_connect_test` only — not the built-in `atlasAdmin` role — once the free-tier defaults are reviewed.
- Network Access: allow only the developer IP(s). Do not leave `0.0.0.0/0` enabled.
- Rotate the database password if it is ever pasted into a chat, ticket, or log (see `security.md`).

## Backup and restore

The Atlas free tier (M0) has **no automatic backups**; paid tiers do. Until the production tier is chosen, back up manually:

```bash
# backup (uses the URI from .env.local; run from the repo root)
set -a; . ./.env.local; set +a
mongodump --uri="$MONGODB_URI" --gzip --archive=".local/backup-$(date +%Y%m%d-%H%M).archive.gz"

# restore into a scratch database first, inspect, then promote
mongorestore --uri="$MONGODB_URI" --gzip --archive=.local/backup-….archive.gz \
  --nsFrom='utsav_connect.*' --nsTo='utsav_connect_restore_check.*'
```

`mongodump`/`mongorestore` come from MongoDB Database Tools (`brew install mongodb-database-tools`). Backups go under the git-ignored `.local/` and must be moved off the machine.

This procedure has **not yet been rehearsed**. Before launch (Stage 7): pick a tier with automatic backups or schedule the dump, store copies off-host, and rehearse a full restore.
