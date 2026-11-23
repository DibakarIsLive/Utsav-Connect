# Documentation maintenance policy

Purpose: keep these documents aligned with the actual implementation. Documentation that drifts from code is worse than no documentation, because it creates false confidence.

This policy applies to every file under `docs/`, plus the root `README.md` and `AGENTS.md` where they reference documentation.

## 1. General rules

1. **Source code is the authority.** If a document and the code disagree, the code wins and the document must be corrected.
2. **No claim without evidence.** Use the status vocabulary in [README.md](README.md). Never mark a feature complete because a component, route or model exists.
3. **Evidence is reported in three separate categories:** automated tests, process checks (build/HTTP), and browser verification. A skipped integration suite is not a pass.
4. **Never invent status.** If something was not checked in this documentation task, say so. Do not copy an old "PASSED" claim into a current document.
5. **No secrets.** Never put connection strings, credentials, API keys, tokens, passwords, applicant PII or full URIs in documentation.
6. **Historical documents stay historical.** Move them to `06-history/` with a banner; do not silently delete useful information.
7. **One fact, one home.** If two documents state the same fact, link to the canonical one instead of duplicating it.

## 2. What to update when

| Change                                                               | Document(s) that must be updated                                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A feature is implemented                                             | [Feature status](03-features/feature-status.md) (status + evidence), [Project status](01-project/project-status.md) (checkpoint), [Roadmap](roadmap.md) (acceptance item or stage progress)                                                            |
| An API route changes (new route, method, guard, response shape)      | [Architecture](02-architecture/architecture.md) (API organization), [Feature status](03-features/feature-status.md), [Testing](04-quality/testing.md) if coverage changes                                                                              |
| A Mongoose model, field, enum or index changes                       | [Database](02-architecture/database.md) (model table + indexes), [Security](04-quality/security.md) if privacy/retention affected                                                                                                                      |
| An architectural decision is made                                    | [Decisions](02-architecture/decisions.md) — add a new ADR; never rewrite an approved decision silently. Add an implementation note if reality later diverges                                                                                           |
| A permission is added, removed or reassigned                         | [Product requirements](01-project/product-requirements.md) (roles), [Security](04-quality/security.md) (permission matrix), [Architecture](02-architecture/architecture.md), [Decisions](02-architecture/decisions.md) if it reverses a prior decision |
| A test command or seed process changes                               | [Testing](04-quality/testing.md) and [Deployment](05-operations/deployment.md) (only commands that exist; label proposed commands as planned)                                                                                                          |
| A dependency version or upgrade command changes                      | [Dependency upgrades](05-operations/dependency-upgrades.md), [Architecture](02-architecture/architecture.md), [Product requirements](01-project/product-requirements.md), [Project status](01-project/project-status.md)                               |
| A feature is deprecated or superseded                                | [Feature status](03-features/feature-status.md) → status **Deprecated / superseded**, and move obsolete docs to `06-history/` with a banner                                                                                                            |
| A roadmap milestone is completed                                     | [Roadmap](roadmap.md) (mark only with recorded evidence), [Project status](01-project/project-status.md), [Feature status](03-features/feature-status.md)                                                                                              |
| A Phase A acceptance step is executed or its scope changes           | [Phase A checklist](03-features/phase-a-acceptance-checklist.md) (record the observed result and any navigation/orphan-component decision), [Feature status](03-features/feature-status.md)                                                            |
| A Phase B acceptance step is executed or an admin permission changes | [Phase B checklist](03-features/phase-b-acceptance-checklist.md), [Feature status](03-features/feature-status.md), [Security](04-quality/security.md)                                                                                                  |
| A defect is found                                                    | [Feature status](03-features/feature-status.md) (known defects) and [Security](04-quality/security.md) if security-relevant; remove only after verification                                                                                            |
| The product vision or an open decision changes                       | [Product requirements](01-project/product-requirements.md) and a new PROPOSED ADR in [Decisions](02-architecture/decisions.md)                                                                                                                         |

## 3. Definition of "documented"

A feature is documented as working only when all of the following are true:

1. The current source implements it (verified by reading code, not by reading docs).
2. The relevant API and permission gates are described.
3. The appropriate test coverage is named, with its actual pass/skip state.
4. Browser verification is described with viewport, route and observed result — or explicitly marked as not browser-verified.
5. Known defects that affect it are listed.

## 4. Link and structure hygiene

- After moving or renaming any document, search the whole repository for the old path and fix every reference. This includes root `README.md`, `AGENTS.md`, `.prettierignore` and documents in `06-history/`.
- Use relative links inside `docs/`.
- Keep one canonical roadmap filename. The active plan is `docs/roadmap.md` (lowercase); the original long-form plan is archived as `docs/06-history/original-roadmap.md`.
- Keep heading hierarchy consistent: one `#` per document, `##` for major sections.
- Keep numbered directories (`01-project` … `06-history`) as the stable structure; add new files to the appropriate directory rather than to `docs/` root.

## 5. Checkpoint discipline

At each milestone, record in `project-status.md`: what changed, what was verified (with exact commands and outcomes), what was **not** verified, and which pilot/test database was used. Never write test counts from memory — read them from the test run or the existing record.

## 6. Historical decisions

Approved decisions are immutable in substance. If new requirements conflict, add a PROPOSED ADR that names the conflict and supersedes or amends the earlier decision only after owner approval. Historical Stage 2 documents in `06-history/` retain their original wording; their banners explain why their status lines are outdated.
