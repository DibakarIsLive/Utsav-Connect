# Account lifecycle

Status: **suspension/reinstatement implemented and browser-verified; permanent deletion DISABLED** (2026-11-18). This document is the authoritative reference for creation, editing, activation, suspension/reinstatement and the currently-disabled permanent deletion.

> **Deletion is disabled.** A single flag (`ACCOUNT_DELETION_POLICY_APPROVED`) gates the UI, API (410) and service. No deletion, anonymization or migration runs until the data-retention policy is formally approved. The implementation below is retained but dormant; its tests are skipped while unapproved.

Real pilot accounts (`mr.dib@gmail.com`, `devotee@gmail.com`) are never used in automated tests and must never be deleted or modified. Deletion exists to remove temporary development/acceptance accounts.

## States

| Dimension                                 | Values                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Application (`DevoteeApplication.status`) | `pending` → `approved` / `rejected`; historical records retained                                    |
| Account (`User.status`)                   | `pending_verification`, `pending_approval`, `active`, `rejected`, `suspended`, `invited` (reserved) |
| Session scope                             | `application` (verified pending/rejected) or `full` (active devotees and administrators)            |

Application status and account status are separate. Rejection never grants devotee access and never deletes the application.

## Permission matrix

| Operation                   | Devotee                  | Admin                         | Super Admin | Enforcement                                   |
| --------------------------- | ------------------------ | ----------------------------- | ----------- | --------------------------------------------- |
| Self-register (application) | yes (public, mode-gated) | —                             | —           | `POST /api/auth/register`, Zod + rate limit   |
| Apply verification token    | owner                    | —                             | —           | single-use hashed token                       |
| Invite administrator        | no                       | no                            | yes         | `requireSuperAdmin`                           |
| Create account directly     | no                       | no                            | yes         | `POST /api/admin/users`                       |
| View devotee directory      | no                       | `devotee:read:all`            | yes         | `GET /api/admin/accounts`                     |
| Change devotee status       | no                       | `devotee:status:update`       | yes         | `PATCH /api/admin/accounts/:id/status`        |
| Edit admin role/permissions | no                       | no                            | yes         | `PATCH /api/admin/users/:id`                  |
| Suspend/reinstate admin     | no                       | no (self-service not allowed) | yes         | same PATCH; last active Super Admin protected |
| Delete devotee              | no                       | `devotee:delete`              | yes         | `DELETE /api/admin/accounts/:id`              |
| Delete administrator        | no                       | **no**                        | yes         | same endpoint; role checked in service        |
| Delete Super Admin          | no                       | no                            | **no**      | always refused                                |

Permanent deletion uses the distinct `devotee:delete` grant. `devotee:status:update` only permits suspension/reinstatement and never implies deletion. The new permission is **not** included in default/manager bundles and is not automatically granted to existing administrators; a Super Admin must assign it explicitly. Super Admin holds every capability by role. Self-deletion and deletion of Super Admin accounts are always refused.

## Permanent deletion behaviour

`DELETE /api/admin/accounts/:id` requires `{ reason }` (5–500 chars), `assertTrustedOrigin`, and an authenticated admin session. The service re-checks permissions for the concrete target.

| Collection                        | Action                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                           | **Deleted** (the account can no longer authenticate)                                                                                                           |
| `sessions`                        | **Deleted** (all live cookies revoked immediately)                                                                                                             |
| `authtokens`                      | **Deleted** (verification, reset and invitation tokens by `userId` and by email)                                                                               |
| `devoteeapplications`             | **Retained and anonymized**: name → "Deleted account", email → `deleted-<id>@invalid.local`, phone/message cleared, `anonymizedAt` + `anonymizedForUserId` set |
| `localityproposals`               | **Retained and anonymized** proposer name/email with the same markers                                                                                          |
| `invitationreports`               | **Retained** for aggregate coverage; contributor identity can no longer be resolved because the User is gone; counts remain intact                             |
| `auditlogs`                       | **Retained** (append-only). A new `admin.account.deleted` event records actor, target, role and reason                                                         |
| `.local/test-users/<Role>/*.json` | **Deleted** only after the database transaction commits; failure leaves the file in place                                                                      |

Writes are wrapped in a MongoDB transaction where supported. Suspension does not remove registry files; reinstatement does not create duplicates. The registry is never the source of truth for account existence. No plaintext password is stored in MongoDB, API responses or audit metadata.

Duplicate deletion requests are idempotent (`deleted: false, alreadyDeleted: true`) and do not produce a second audit event.

## Recovery limitations

Deletion is irreversible. There is no undelete path and no backup-based recovery procedure in this repository. Anonymized historical records cannot be re-linked to the removed account. If an account was deleted in error, it must be recreated through the normal workflow.

## Safe testing

- Automated tests use only `utsav_connect_test`; `tests/integration/account-deletion.test.js` refuses any database whose name does not end in `_test` and is never the pilot name.
- Browser tests create their own temporary accounts via the API and delete those; no seeded shared fixture is required for destructive cases.
- The local credential registry is redirected to a temporary directory during integration tests.
- Never run deletion tests against `utsav_connect_pilot`.
