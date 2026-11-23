# Database

Last updated: 2026-11-17.

This document describes the **actual** persistence layer as verified by direct source inspection of `api/models/**` and `scripts/sync-indexes.js`, cross-checked by direct source inspection on 2026-11-17 (see the [documentation maintenance policy](../MAINTENANCE.md)). Source is authoritative for field and index details; where older documentation disagreed, source won and the differences are recorded in [Corrections to prior documentation](#corrections-to-prior-documentation).

No database command (connect, dump, index create/drop, or sync) was run while writing this document. All statements below come from reading code and previously recorded observations.

## Status and evidence labels

Claims here use the project's standard labels: **Implemented and browser-verified**, **Implemented and automated-test verified**, **Implemented but inadequately tested**, **Partially implemented**, **Designed but not implemented**, **Planned**, **Deprecated / superseded**. A model's presence in source means **Implemented** (schema verified); per-model browser or test evidence is not asserted here — see [`../04-quality/testing.md`](../04-quality/testing.md). The read-only pilot snapshot in [Pilot snapshot](#pilot-snapshot-dated-observation) is a **dated observation**, not a live check performed for this rewrite.

## Storage and connection

- MongoDB Atlas via Mongoose 9.11.4; all database access lives under `api/` and is marked `import "server-only"`.
- Connection: `api/lib/mongodb/connection.js` (server-only); it caches the connection so Next.js hot reloads and concurrent requests share one pool, and logs only host/database name — **never the URI**. Environment is loaded lazily through Zod validation (`getEnv()`).
- Credentials exist **only** in git-ignored `.env.local`. This document contains **no credentials, real URIs, hosts, secrets, or tokens**. A connection string is shown only in generic placeholder form:

  ```text
  mongodb+srv://<user>:<password>@<cluster-host>/<db-name>?retryWrites=true&w=majority&appName=<cluster>
  ```

  Always include the database name; an Atlas URI ending in `/` makes the driver default to a database named `test`.

- The application never starts, stops, or reconfigures the cluster. A local `mongod` is also usable for offline development; the code does not depend on which is used.

## Database environments

Two distinct databases are configured. They have **different names** and are never interchangeable.

| Purpose             | Variable           | Database name         | Notes                                                                                                |
| ------------------- | ------------------ | --------------------- | ---------------------------------------------------------------------------------------------------- |
| Pilot / development | `MONGODB_URI`      | `utsav_connect_pilot` | Human-used environment; treat as real data, read-only for inspection unless a change is intentional. |
| Tests               | `MONGODB_URI_TEST` | `utsav_connect_test`  | Isolated test database; name **must** end in `_test`.                                                |

Separation rules:

- **`_test` guard.** The integration gate enforces that the test database name ends in `_test`; tests skip (and fail loudly if `UTSAV_TEST_REQUIRE_DB=1`) when the test database is unreachable. Tests must **never** be pointed at `utsav_connect_pilot` or any database whose name does not end in `_test`. This guard protects the human-used pilot data from fixture setup/teardown.
- Integration tests may create and drop their own fixtures **only** in `utsav_connect_test`; they clean up after themselves.
- Never log, print, or paste URI values. `make check-db` / `make check-pilot` verify reachability without exposing credentials.

### Pilot snapshot (dated observation)

Recorded **2026-11-17** by read-only inspection of `utsav_connect_pilot` (point-in-time; not re-run for this rewrite):

| Collection            | Documents | Notes                                                                                             |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `users`               | 2         | `mr.dib@gmail.com` — `super_admin`, `active`; `devotee@gmail.com` — `devotee`, `active`, verified |
| `devoteeapplications` | 1         | `approved`                                                                                        |
| `auditlogs`           | 33        | append-only history                                                                               |
| `authtokens`          | 3         | —                                                                                                 |
| `sessions`            | 1         | —                                                                                                 |
| `areas`               | 0         | no official areas yet                                                                             |
| `localityproposals`   | 0         | —                                                                                                 |
| `invitationreports`   | 0         | —                                                                                                 |

`ratelimits` was not part of the recorded snapshot. The empty `areas`, `localityproposals`, and `invitationreports` counts mean the geographic and reporting features have little or no production-shaped data yet.

## Model inventory

There are exactly **9 Mongoose models** (all import `server-only`, all use the `mongoose.models.X || mongoose.model("X", …)` pattern, none declare an explicit collection name, none use `strict: "throw"`, none use a soft-delete plugin, and only `AuditLog` registers hooks):

| #   | Model                | Collection (Mongoose plural) | Responsibility                                                                |
| --- | -------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| 1   | `User`               | `users`                      | Core account identity, role, status, credentials, verification                |
| 2   | `Session`            | `sessions`                   | Opaque, hashed, scoped login sessions with idle + absolute expiry             |
| 3   | `AuthToken`          | `authtokens`                 | Single-use hashed email verification, password reset, admin invitation tokens |
| 4   | `RateLimit`          | `ratelimits`                 | MongoDB-backed fixed-window rate-limit counters                               |
| 5   | `DevoteeApplication` | `devoteeapplications`        | Application snapshot and review decision/history                              |
| 6   | `Area`               | `areas`                      | Official approved geographic area in the campaign hierarchy                   |
| 7   | `LocalityProposal`   | `localityproposals`          | Proposed new areas awaiting admin review                                      |
| 8   | `InvitationReport`   | `invitationreports`          | Devotee-submitted invitation activity against areas                           |
| 9   | `AuditLog`           | `auditlogs`                  | Append-only, application-level audit/event history                            |

### 1. User (`users`)

Responsibility: canonical account record for authentication and authorization. Roles: `devotee`, `admin`, `super_admin`. Status values are more granular than role.

| Field                    | Type     | Constraints / notes                                                                                                                         |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`                  | String   | `required`, `unique`, `index`, `lowercase`, `trim`                                                                                          |
| `emailVerified`          | Boolean  | default `false`                                                                                                                             |
| `passwordHash`           | String   | `required`, **`select: false`** (excluded from queries by default)                                                                          |
| `fullName`               | String   | `required`, `trim`                                                                                                                          |
| `phone`                  | String   | `required`, `trim`                                                                                                                          |
| `gender`                 | String   | enum `male` / `female`, `required`                                                                                                          |
| `role`                   | String   | enum `devotee` / `admin` / `super_admin`, default `devotee`, `index`                                                                        |
| `status`                 | String   | enum `pending_verification` / `pending_approval` / `active` / `rejected` / `suspended` / `invited`, default `pending_verification`, `index` |
| `adminPermissions`       | [String] | default `undefined` (set for admins); **no schema enum** — permission strings validated in application code                                 |
| `lastLoginAt`            | Date     | optional                                                                                                                                    |
| `createdAt`, `updatedAt` | Date     | `timestamps: true`                                                                                                                          |

Indexes: `email` (unique), `role`, `status`, compound `{ role: 1, status: 1 }`.
Statics/projections: `safeProjection` excludes `passwordHash`; `adminListProjection` excludes `passwordHash` and `phone` (PII masked in lists).
Relationships: referenced by `Session.userId`, `AuthToken.userId`, `DevoteeApplication.userId` / `reviewedBy`, `LocalityProposal.proposedBy` / `reviewedBy`, `InvitationReport.contributorId` / `reviewedBy`, `AuditLog.actorId`, and `Area.createdBy` / `updatedBy`.
Data ownership: written by auth/admin services and Super Admin flows; never mutated directly by `ui/`.
Audit: identity/role/status changes and login/logout are recorded in `AuditLog` (application-level).
Gap: there is **no** `archived` / `deleted` / `eligible_inactive` state and no `suspendedAt` / suspension-reason field — suspension is a `status` value only.

### 2. Session (`sessions`)

| Field                    | Type              | Constraints / notes                                                                          |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `tokenHash`              | String            | `required`, `unique`, `index` — SHA-256 of the raw token; raw token lives only in the cookie |
| `userId`                 | ObjectId → `User` | `required`, `index`                                                                          |
| `scope`                  | String            | enum `application` / `full`, default `full`; **`application` is a scope, not a role**        |
| `expiresAt`              | Date              | `required`; idle expiry (TTL)                                                                |
| `absoluteExpiresAt`      | Date              | `required`; 30-day hard cap (enforced in code, not TTL-indexed)                              |
| `lastActivityAt`         | Date              | default `Date.now`; slides on validation                                                     |
| `userAgent`              | String            | optional                                                                                     |
| `ipHash`                 | String            | hashed IP for audit context                                                                  |
| `createdAt`, `updatedAt` | Date              | `timestamps: true`                                                                           |

Indexes: `tokenHash` (unique), `userId`, and **TTL** `{ expiresAt: 1 }` with `expireAfterSeconds: 0` (the only TTL on this collection).
Relationships: `userId` → `User`.
Data ownership: auth service on login/validation; sessions are **deleted** on suspend and on password-reset confirmation.
Audit: session creation/validation feeds access events; `ipHash` is hashed, raw IPs are never stored.
Gap: **no `revokedAt` field or index** — revocation is done by deleting documents.

### 3. AuthToken (`authtokens`)

| Field                    | Type              | Constraints / notes                                                                          |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `tokenHash`              | String            | `required`, `unique`, `index` — SHA-256 of raw token; raw token lives only in the email link |
| `userId`                 | ObjectId → `User` | `index`, **optional** — admin invitations have no user until accepted                        |
| `email`                  | String            | `lowercase`, `trim`; holds invitee email when no user exists                                 |
| `type`                   | String            | enum `email_verification` / `password_reset` / `admin_invitation`, `required`                |
| `expiresAt`              | Date              | `required`; TTL (24h verification/reset, 7-day invitation)                                   |
| `usedAt`                 | Date              | set when consumed (single-use)                                                               |
| `metadata`               | Mixed             | e.g. `{ invitedBy, permissions }` for admin invitations                                      |
| `createdAt`, `updatedAt` | Date              | `timestamps: true`                                                                           |

Indexes: `tokenHash` (unique), `userId`, **TTL** `{ expiresAt: 1 }` (`expireAfterSeconds: 0`), compound `{ userId: 1, type: 1 }`.
Relationships: optional `userId` → `User`.
Data ownership: auth/invitation services; tokens are single-use and hashed at rest.
Audit: token issuance/consumption events feed `AuditLog`.
Gap: the field is `type`, not `purpose`; there is no `purpose` or `usedAt` compound index.

### 4. RateLimit (`ratelimits`)

| Field       | Type   | Constraints / notes                                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------------------------------- |
| `key`       | String | `required`, `unique`, `index`; incorporates the window bucket so each bucket is a separate document |
| `count`     | Number | `required`, default `0`, `min: 0`                                                                   |
| `expiresAt` | Date   | `required`; TTL with `expireAfterSeconds: 60`                                                       |
| —           | —      | `timestamps: false` (no `createdAt` / `updatedAt`)                                                  |

Indexes: `key` (unique), **TTL** `{ expiresAt: 1 }` with `expireAfterSeconds: 60`.
Relationships: none (standalone counters).
Data ownership: security/HTTP helpers; counts are keyed by IP/account with the time bucket embedded in `key`.
Audit: not an audit source; it is transient enforcement state.
This model was previously omitted from the index script; the replaced additive workflow now covers all nine models — see [Index management](#index-management).

### 5. DevoteeApplication (`devoteeapplications`)

| Field                    | Type              | Constraints / notes                                                       |
| ------------------------ | ----------------- | ------------------------------------------------------------------------- |
| `userId`                 | ObjectId → `User` | `required`, `index`                                                       |
| `applicantName`          | String            | `required` — applicant snapshot field (no immutability hook)              |
| `applicantEmail`         | String            | `required`, `lowercase` — applicant snapshot field (no immutability hook) |
| `applicantPhone`         | String            | `required`                                                                |
| `gender`                 | String            | enum `male` / `female`, `required`                                        |
| `message`                | String            | optional custom message                                                   |
| `status`                 | String            | enum `pending` / `approved` / `rejected`, default `pending`, `index`      |
| `isCurrent`              | Boolean           | default `true`, `index` — marks the active application record             |
| `reviewedBy`             | ObjectId → `User` | reviewer                                                                  |
| `reviewedAt`             | Date              | review timestamp                                                          |
| `reviewNote`             | String            | **embedded string**, admin-only internal note                             |
| `createdAt`, `updatedAt` | Date              | `timestamps: true`                                                        |

Indexes: `userId`, `status`, `isCurrent`, compound `{ userId: 1, isCurrent: 1 }`, compound `{ status: 1, createdAt: -1 }`.
Statics/projection: `applicantProjection` excludes `reviewNote` and `reviewedBy` from applicant-facing reads.
Relationships: `userId` → applicant `User`; `reviewedBy` → reviewing admin `User`.
Data ownership: submitted by applicants; reviewed/decided by admins. Full application history is preserved (separate from `User`), so a reapplication is a new document rather than an overwrite.
Audit: submit and review decisions feed `AuditLog` (e.g. `application.submitted`, `application.approved`).

> **`reviewNote` is an embedded string field on `DevoteeApplication`, not a collection.** There is no `devoteeApplicationNotes` model (see [Planned / historically designed models](#planned--historically-designed-models-not-implemented)). There is also no `expired` status, no `submittedAt` field (created time is `createdAt`), and no unique-partial constraint generated by the schema.

### 6. Area (`areas`)

Official, approved geographic areas in a flexible parent/child hierarchy (e.g. Region → Town → Locality → Block). `type` is free-form, not an enum.

| Field                    | Type                         | Constraints / notes                                                   |
| ------------------------ | ---------------------------- | --------------------------------------------------------------------- |
| `name`                   | String                       | `required`, `trim`, `index`                                           |
| `normalizedName`         | String                       | `required`, `lowercase`, `trim`, `index`                              |
| `code`                   | String                       | `trim`, `uppercase`, `sparse`, `index`                                |
| `type`                   | String                       | `trim`, default `"Locality"`, `index`; free-form                      |
| `parentId`               | ObjectId → `Area`            | default `null`, `index`                                               |
| `ancestorIds`            | [ObjectId → `Area`]          | default `[]`, `index`                                                 |
| `status`                 | String                       | enum `approved` / `archived`, default `approved`, `required`, `index` |
| `placeId`                | String                       | `trim`, `sparse`, `index`                                             |
| `formattedAddress`       | String                       | `trim`                                                                |
| `location`               | Point GeoJSON                | default `undefined`; coordinates `[lng, lat]`                         |
| `boundary`               | Polygon/MultiPolygon GeoJSON | default `undefined`                                                   |
| `populationEstimate`     | Number                       | default `0`, `min: 0`                                                 |
| `notes`                  | String                       | `trim`, `maxlength: 2000`                                             |
| `createdBy`, `updatedBy` | ObjectId → `User`            | audit metadata                                                        |
| `createdAt`, `updatedAt` | Date                         | `timestamps: true`                                                    |

Indexes: `name`, `normalizedName`, `code` (sparse), `type`, `parentId`, `ancestorIds`, `status`, `placeId` (sparse), **2dsphere (sparse)** on `{ location: "2dsphere" }` and `{ boundary: "2dsphere" }`, compounds `{ parentId: 1, status: 1 }`, `{ normalizedName: 1, parentId: 1 }`, `{ status: 1, name: 1 }`.
Relationships: self-referential via `parentId` / `ancestorIds`; referenced by `LocalityProposal.parentId` / `approvedAreaId` / `duplicates[].areaId` and `InvitationReport.areaId`.
Data ownership: admins with `area:manage` permission. **The only "soft delete" in the system is `Area.status = "archived"`** — no hard-delete/soft-delete plugin exists anywhere.
Audit: `createdBy` / `updatedBy` capture administrative authorship; area management events feed `AuditLog`.

### 7. LocalityProposal (`localityproposals`)

Staging area for new-area proposals. Pending proposals never touch official `Area` records or public statistics until approved.

| Field                                     | Type                            | Constraints / notes                                                                                                               |
| ----------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `normalizedName`                  | String                          | `required`; `normalizedName` is `lowercase` + `trim`; both `index`                                                                |
| `type`                                    | String                          | `trim`, default `"Locality"`; free-form                                                                                           |
| `parentId`                                | ObjectId → `Area`               | default `null`, `index`                                                                                                           |
| `placeId`                                 | String                          | `trim`, `sparse`, `index`                                                                                                         |
| `formattedAddress`                        | String                          | `trim`                                                                                                                            |
| `location`                                | Point GeoJSON                   | default `undefined`                                                                                                               |
| `boundary`                                | Polygon/MultiPolygon GeoJSON    | default `undefined` — **no 2dsphere index** (known gap)                                                                           |
| `status`                                  | String                          | enum `pending` / `needs_correction` / `approved` / `rejected` / `duplicate` / `withdrawn`, default `pending`, `required`, `index` |
| `duplicates`                              | [subdoc]                        | default `[]`; each: `areaId` → `Area`, `areaName`, `reason`, `confidence` enum `high`/`medium`/`low` default `medium`             |
| `proposedBy`                              | ObjectId → `User`               | `required`, `index`                                                                                                               |
| `proposerName`, `proposerEmail`           | String                          | `required`                                                                                                                        |
| `reviewedBy`                              | ObjectId → `User`; `reviewedAt` | Date                                                                                                                              | review metadata |
| `reviewNotes`, `correctionNotes`, `notes` | String                          | `trim`, `maxlength: 2000` each                                                                                                    |
| `approvedAreaId`                          | ObjectId → `Area`               | set on approval                                                                                                                   |
| `createdAt`, `updatedAt`                  | Date                            | `timestamps: true`                                                                                                                |

Indexes: `name`, `normalizedName`, `parentId`, `placeId` (sparse), `status`, `proposedBy`, compound `{ status: 1, createdAt: -1 }`, compound `{ proposedBy: 1, status: 1 }`, **2dsphere (sparse)** on `{ location: "2dsphere" }`. No index on `boundary`.
Relationships: `proposedBy` / `reviewedBy` → `User`; `parentId`, `approvedAreaId`, `duplicates[].areaId` → `Area`. Approval creates an `Area` and links it via `approvedAreaId` (this is not transactional — a known open issue).
Data ownership: devotees/admins propose; admins with `proposal:review` review.
Audit: proposal lifecycle events feed `AuditLog`.

### 8. InvitationReport (`invitationreports`)

Records invitation activity submitted by active devotees against approved areas. **No invitee names, phone numbers, email addresses, or participant-count field** are stored.

| Field                    | Type              | Constraints / notes                                                          |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------- |
| `areaId`                 | ObjectId → `Area` | `required`, `index`                                                          |
| `contributorId`          | ObjectId → `User` | `required`, `index`                                                          |
| `invitationCount`        | Number            | `required`, `min: 1`                                                         |
| `reportDate`             | Date              | `required`, default `Date.now`, `index`                                      |
| `description`            | String            | `trim`, `maxlength: 1000`                                                    |
| `status`                 | String            | enum `active` / `flagged` / `invalid`, default `active`, `required`, `index` |
| `reviewedBy`             | ObjectId → `User` | admin reviewer                                                               |
| `adminNotes`             | String            | `trim`, `maxlength: 1000`                                                    |
| `createdAt`, `updatedAt` | Date              | `timestamps: true`                                                           |

Indexes: `areaId`, `contributorId`, `reportDate`, `status`, compounds `{ areaId: 1, status: 1 }`, `{ contributorId: 1, status: 1 }`, `{ reportDate: 1, status: 1 }`.
Relationships: `areaId` → `Area`; `contributorId` / `reviewedBy` → `User`.
Data ownership: active devotees submit; admins with `invitation-report:read:all` review/flag.
Audit: submission and review events feed `AuditLog`.
This model was previously omitted from the index script; the replaced additive workflow now covers all nine models — see [Index management](#index-management).

### 9. AuditLog (`auditlogs`)

Append-only event history. `metadata` and all fields are intended to be non-PII (IDs and codes only).

| Field        | Type              | Constraints / notes                                                            |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| `eventType`  | String            | `required`, `index` (e.g. `user.login`, `application.approved`)                |
| `actorId`    | ObjectId → `User` | `index`                                                                        |
| `actorRole`  | String            | enum `devotee` / `admin` / `super_admin` / `system`                            |
| `targetId`   | ObjectId          | polymorphic (no `ref`) — `User`, `DevoteeApplication`, etc.                    |
| `targetType` | String            | e.g. `"User"`, `"DevoteeApplication"`                                          |
| `metadata`   | Mixed             | safe, non-PII context                                                          |
| `ipHash`     | String            | hashed IP                                                                      |
| `userAgent`  | String            | optional                                                                       |
| `createdAt`  | Date              | `timestamps: { createdAt: true, updatedAt: false }` — immutable after creation |

Indexes: `eventType`, `actorId`, compounds `{ eventType: 1, createdAt: -1 }`, `{ actorId: 1, createdAt: -1 }`, `{ targetId: 1, createdAt: -1 }`. **No TTL.**
Relationships: `actorId` → `User`; `targetId` is polymorphic with `targetType` as a plain string discriminator.
Data ownership: written by application services; never edited or deleted by normal flows.
Audit/immutability: enforced by Mongoose hooks — `pre("save")` blocks modification of existing documents, and `pre` hooks on `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `deleteOne`, `deleteMany`, `findOneAndDelete` reject all mutation. **The guard is bypassed only when `NODE_ENV=test`** (so integration tests can clean fixtures). This is **application-level only** — it is not a storage-layer role that denies update/delete, which Atlas shared tiers cannot express per collection.
No `action`, `actorUserId`, or `targetType + targetId + createdAt` compound exists.

## Planned / historically designed models (not implemented)

These collections appear in older specs and product-requirements notes but **no Mongoose model exists** for any of them. They are **Designed but not implemented** / **Planned** and must not be described as present:

| Planned collection        | Historical intent                                          | Status                                                                                           |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `devoteeApplicationNotes` | Append-only internal notes on applications                 | Not implemented — review notes are a single embedded string `reviewNote` on `DevoteeApplication` |
| `populationRecords`       | Historical population figures for areas                    | Not implemented                                                                                  |
| `areaAssignments`         | Coordinator/volunteer area assignments (OPEN product item) | Not implemented                                                                                  |
| `notifications`           | Notification centre / announcements                        | Not implemented                                                                                  |
| `systemSettings`          | Global system configuration                                | Not implemented                                                                                  |

> There is no notes collection. `reviewNote` (DevoteeApplication), `reviewNotes` / `correctionNotes` / `notes` (LocalityProposal), and `adminNotes` (InvitationReport) are all **embedded strings** on their parent documents, not separate collections.

Shared capabilities that depend on the absent models — account directory, in-app conversations, announcements, notification centre, activity history, session management, audit — are **missing except audit**. See [`../roadmap.md`](../roadmap.md) and [`../01-project/product-requirements.md`](../01-project/product-requirements.md).

## Retention

- **No TTL on `DevoteeApplication` or `AuditLog`.** Application PII and audit history are retained indefinitely by design; there is no `expired` state, no anonymisation job, and no automatic purge.
- **TTL exists only on three transient collections:** `Session.expiresAt` (`expireAfterSeconds: 0`), `AuthToken.expiresAt` (`expireAfterSeconds: 0`), and `RateLimit.expiresAt` (`expireAfterSeconds: 60`). Every other TTL claim in older docs is wrong.
- **No purge/cleanup jobs** exist beyond MongoDB's TTL monitor on those three collections.
- **Deletion / retention policy is DEFERRED** and requires explicit owner approval (privacy/legal/product decision — D-19/D-10 in [`decisions.md`](decisions.md) and open items in [`../01-project/product-requirements.md`](../01-project/product-requirements.md)). Do not invent a retention period.
- **No migrations directory** exists. Schema changes are applied via model edits plus the index process below; there is no versioned migration framework.
- **Soft archive is limited to `Area`** (`status: "archived"`). No other model has a soft-delete/archive mechanism.

## Index management

D3 is resolved. `scripts/sync-indexes.js` was replaced with a **non-destructive additive** workflow (`npm run db:sync-indexes`) that covers **all nine models**, including `RateLimit` and `InvitationReport`. It never calls `syncIndexes()` or any drop operation.

| Mode                 | Command                                | Behaviour                                                                                   |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Read-only inspection | `npm run db:sync-indexes -- --inspect` | Lists existing, missing and conflicting indexes; makes no writes                            |
| Dry run              | `npm run db:sync-indexes -- --dry-run` | Same report plus the exact planned `createIndex()` calls; no writes                         |
| Additive apply       | `npm run db:sync-indexes -- --apply`   | Creates **only** missing indexes; refuses conflicts; never drops or alters existing indexes |

Safety rules:

- Conflicting indexes (same name but different keys, or same keys with different `unique`/`sparse`/`partial` options) are **reported and abort the apply**, never repaired automatically.
- `--apply` against `utsav_connect_pilot` is refused unless `--allow-pilot` is passed explicitly. Inspection and dry-run are always read-only and safe on the pilot.
- Unique, compound, sparse, partial and geospatial index definitions come from `model.schema.indexes()`; existing indexes come from `collection.indexes()`.

Verified 2026-11-17 (read-only): pilot — 61 existing indexes, 0 missing, 0 conflicting; `utsav_connect_test` — 65 existing indexes, 0 missing, 0 conflicting. No index was created, altered or dropped in either database. A remaining design gap (not an index conflict) is that `LocalityProposal.boundary` has no `2dsphere` index while `Area.boundary` does; adding it requires a model change and a separate decision.

## Corrections to prior documentation

The previous version of this file (and the historical index review) contained material inaccuracies. Corrections made here, each verified against source:

- **"None [collections] are defined yet" / "not created"** → false. All 9 models exist and are implemented; the old "Stage 2 collections are accepted design but not present" section was wrong.
- **14 planned collections were listed as the roadmap set** → the real set is 9; `devoteeApplicationNotes`, `populationRecords`, `areaAssignments`, `notifications`, `systemSettings` do not exist.
- **Development DB named `utsav_connect`** → correct name is `utsav_connect_pilot`; test is `utsav_connect_test`.
- **User indexes `status + createdAt`, `role + createdAt`, and an `applicationId` field** → none exist; real indexes are `email` (unique), `role`, `status`, `{ role, status }`.
- **Session `revokedAt`, `userId + revokedAt`, single `expiresAt` index** → no `revokedAt` field exists; real TTL is `{ expiresAt: 1 }` with `expireAfterSeconds: 0`.
- **AuthToken `purpose`, `userId + purpose + usedAt`** → the field is `type`; the compound is `{ userId: 1, type: 1 }`.
- **DevoteeApplication unique-partial `isCurrent`, `submittedAt`, `applicantEmail`/`applicantPhoneNormalized`/`applicantNameSearch`, `reviewedByUserId + reviewedAt`, `expired` status** → none exist; real indexes are `userId`, `status`, `isCurrent`, `{ userId, isCurrent }`, `{ status, createdAt: -1 }`, and there is no `expired` state.
- **InvitationReport `submittedByUserId`, `participatingDevoteeCount`, `areaId + reportDate` index** → contributor field is `contributorId`, there is no participant-count field, and the compounds are `{ areaId, status }`, `{ contributorId, status }`, `{ reportDate, status }`.
- **AuditLog `action`, `actorUserId`, `targetType + targetId + createdAt`** → fields are `eventType`, `actorId`, polymorphic `targetId`/`targetType`; there is no targetType compound index.
- **"syncIndexes() is safe/non-destructive"** → false; flagged as D3 above.
- **Backups, measured connection latency, and Atlas IP/role instructions** from the old doc were observational or out-of-scope claims; they are not repeated as verified facts here. Confirm any such procedure before relying on it.

## Account deletion fields (2026-11-18)

`DevoteeApplication` and `LocalityProposal` gained optional `anonymizedAt` and `anonymizedForUserId` fields. They are set when a user is permanently deleted so historical records remain but attribution is anonymized. No collection was added or removed. `User` has no soft-delete state; deletion is a hard delete inside a transaction with session/token cleanup. See [Account lifecycle](../03-features/account-lifecycle.md).

## Phase B data notes

No model, collection, field or index was added or changed in Phase B. Devotee status changes use the existing `User.status` enum (`active`/`suspended`); the mandatory reason is stored in the `AuditLog.metadata` of `admin.devotee.status_updated` (`{ from, to, reason }`) rather than a new `User` field — this avoids a schema migration. Suspension deletes `Session` records as before. Population updates reuse `Area.populationEstimate` and emit the existing `area.updated` audit event; there is no population-history collection. `suspendedAt`, deletion fields and `areaAssignments` remain unimplemented (PROPOSED ADR-018/019/023).

## Related documents

- [`architecture.md`](architecture.md) — system architecture and layers
- [`decisions.md`](decisions.md) — ADRs and open decisions (incl. retention D-19/D-10, index defect D3)
- [`../04-quality/security.md`](../04-quality/security.md) — secrets, data protection, guard expectations
- [`../04-quality/testing.md`](../04-quality/testing.md) — integration `_test` gate and coverage
- [`../roadmap.md`](../roadmap.md) — workstreams and phasing
- [`../06-history/mongodb-index-review.md`](../06-history/mongodb-index-review.md) — archived 2026-11-08 index review (historical only; its "non-destructive" claim is superseded)
