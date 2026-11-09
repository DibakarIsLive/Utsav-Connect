# MongoDB Index Review Report

**Generated:** 2026-11-08
**Status:** Documentation only - NO automated synchronization performed

## Current Index Definitions

### 1. User Collection (`users`)

**Schema-defined indexes:**

- `email: 1` (unique, defined in schema field)
- `role: 1` (single field index)
- `status: 1` (single field index)
- `{ role: 1, status: 1 }` (compound index for admin queries)

**Purpose:** Support authentication, user lookup, and admin filtering by role/status.

**Safety:** All indexes are non-destructive additions. No drop required.

---

### 2. Session Collection (`sessions`)

**Schema-defined indexes:**

- `tokenHash: 1` (unique, defined in schema field)
- `userId: 1` (single field index)
- `expiresAt: 1` (single field index, used for lookups)
- `{ expiresAt: 1 }` (TTL index with `expireAfterSeconds: 0`)

**Purpose:** Fast session validation, user session lookup, and automatic expiration.

**Safety:** TTL index is critical for automatic cleanup. Verify MongoDB supports TTL before creating.

---

### 3. DevoteeApplication Collection (`devoteeapplications`)

**Schema-defined indexes:**

- `userId: 1` (single field index)
- `status: 1` (single field index)
- `isCurrent: 1` (single field index)
- `{ userId: 1, isCurrent: 1 }` (compound index, prevents duplicate current applications)
- `{ status: 1, createdAt: -1 }` (compound index for admin application listing)

**Purpose:** Support application review, status filtering, and prevent duplicate current applications per user.

**Safety:** All indexes support query performance. No conflicts expected.

---

### 4. AuthToken Collection (`authtokens`)

**Schema-defined indexes:**

- `tokenHash: 1` (unique, defined in schema field)
- `userId: 1` (single field index)
- `expiresAt: 1` (single field index)
- `{ expiresAt: 1 }` (TTL index with `expireAfterSeconds: 0`)
- `{ userId: 1, type: 1 }` (compound index for user token lookup by type)

**Purpose:** Email verification, password reset, admin invitations. TTL for automatic cleanup.

**Safety:** TTL index ensures tokens expire automatically. Critical for security.

---

### 5. AuditLog Collection (`auditlogs`)

**Schema-defined indexes:**

- `eventType: 1` (single field index)
- `actorId: 1` (single field index)
- `{ eventType: 1, createdAt: -1 }` (compound index for event history)
- `{ actorId: 1, createdAt: -1 }` (compound index for actor history)
- `{ targetId: 1, createdAt: -1 }` (compound index for target history)

**Purpose:** Support audit queries by event type, actor, or target with chronological sorting.

**Safety:** Append-only collection. Indexes support read performance without conflicts.

---

## Recommendations

### Index Synchronization

1. **DO NOT run automatic synchronization** in production without manual review
2. **Verify existing indexes** before creating new ones: `db.collection.getIndexes()`
3. **Create indexes during low-traffic periods** to avoid blocking operations
4. **Monitor index creation progress** using `db.currentOp()`

### Missing Indexes (for future consideration)

- Consider adding compound index `{ applicantEmail: 1, status: 1 }` on `devoteeapplications` if email-based search becomes frequent
- Consider adding `{ userId: 1, scope: 1 }` on `sessions` if scope filtering is needed

### TTL Index Verification

Before deploying, verify:

- MongoDB version supports TTL indexes (≥2.2)
- `expiresAt` field contains valid Date objects
- TTL monitor thread is running: `db.serverStatus().metrics.ttl`

---

## Index Creation Script (Manual Execution)

**⚠️ CAUTION:** Run this script manually in a non-production environment first.

```javascript
// Connect to MongoDB
// use utsav_connect

// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });
db.users.createIndex({ role: 1, status: 1 });

// Sessions
db.sessions.createIndex({ tokenHash: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// DevoteeApplications
db.devoteeapplications.createIndex({ userId: 1 });
db.devoteeapplications.createIndex({ status: 1 });
db.devoteeapplications.createIndex({ isCurrent: 1 });
db.devoteeapplications.createIndex({ userId: 1, isCurrent: 1 });
db.devoteeapplications.createIndex({ status: 1, createdAt: -1 });

// AuthTokens
db.authtokens.createIndex({ tokenHash: 1 }, { unique: true });
db.authtokens.createIndex({ userId: 1 });
db.authtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.authtokens.createIndex({ userId: 1, type: 1 });

// AuditLogs
db.auditlogs.createIndex({ eventType: 1 });
db.auditlogs.createIndex({ actorId: 1 });
db.auditlogs.createIndex({ eventType: 1, createdAt: -1 });
db.auditlogs.createIndex({ actorId: 1, createdAt: -1 });
db.auditlogs.createIndex({ targetId: 1, createdAt: -1 });
```

---

## Status: SAFE TO PROCEED

All index definitions are:

- ✅ Non-destructive (no drops required)
- ✅ Support existing query patterns
- ✅ Include necessary TTL indexes for automatic cleanup
- ✅ Properly defined with unique constraints where needed

**Next Steps:**

1. Review this document with database administrator
2. Verify MongoDB Atlas IP whitelist before testing
3. Run index creation in test database first
4. Monitor performance after index creation
