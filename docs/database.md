# Database

Last updated: 2026-11-03.

## Connection

`api/lib/mongodb/connection.js` (server-only):

- `connectToDatabase({ uri? })` — connects with Mongoose using `MONGODB_URI` (or the given URI), caches the pending/resolved connection on `globalThis` so Next.js hot reloads and concurrent requests share one pool, logs `mongodb.connected` with host and database name (never the URI), and throws `DatabaseUnavailableError` on failure after clearing the cache so the next call retries.
- `CONNECTION_OPTIONS` — `serverSelectionTimeoutMS: 5000`, `connectTimeoutMS: 5000`, `socketTimeoutMS: 30000`, `maxPoolSize: 10`, `bufferCommands: false` (operations fail immediately instead of queueing while disconnected).
- `disconnectFromDatabase()` — used by tests and graceful shutdown.
- `getConnectionState()` — `disconnected | connected | connecting | disconnecting`.

`api/lib/mongodb/health.js` → `checkDatabaseHealth()` pings the `admin` database and returns `{ status: "ok" | "unavailable", latencyMs, message? }`.

## Databases used

| Purpose     | Variable           | Database name         | Notes                                      |
| ----------- | ------------------ | --------------------- | ------------------------------------------ |
| Development | `MONGODB_URI`      | `utsav_connect`       | created on first write                     |
| Tests       | `MONGODB_URI_TEST` | `utsav_connect_test`  | name **must** end in `_test` (enforced)    |
| Production  | `MONGODB_URI`      | decided at deployment | hosted vs self-managed is still open (3.1) |

Local development uses a `mongod` started by the developer (any data directory); the application never starts or stops a database process. `npm run check:db` verifies connectivity.

## Collections

None are defined yet. Per roadmap Phase 3, each collection is introduced with its first real use and tests. The planned set: `users`, `areas`, `localityProposals`, `invitationReports`, `populationRecords`, `auditLogs`, `areaAssignments`, `notifications`, `systemSettings`.

Conventions to apply when they arrive (roadmap 3.3–3.10):

- Mongoose schemas with `timestamps: true`; audit metadata (`createdBy`, `updatedBy`) on administrative records.
- `_id` ObjectId everywhere; human-readable `slug` with a unique index where users see identifiers (areas).
- GeoJSON `Polygon`/`MultiPolygon`/`Point` fields with `2dsphere` indexes.
- Pagination by cursor on `_id` (or `createdAt,_id`), default page size 25, max 100.
- Multi-document writes (approve proposal → create area → write audit log) in a transaction; requires a replica set, so development `mongod` should be run as a single-node replica set before Stage 3.

## Backup and restore (procedure, not yet rehearsed)

```bash
# backup
mongodump --uri="$MONGODB_URI" --gzip --archive="backup-$(date +%Y%m%d-%H%M).archive.gz"

# restore into a scratch database first, inspect, then promote
mongorestore --uri="mongodb://127.0.0.1:27017" --gzip --archive=backup-….archive.gz \
  --nsFrom='utsav_connect.*' --nsTo='utsav_connect_restore_check.*'
```

Before launch (Stage 7): schedule backups, store them off-host, and rehearse a full restore on a copy.
