# Utsav-Connect documentation

Central index for the project. Last reorganized: 2026-11-17.

This directory is the authoritative source for **what the platform is, what currently works, what is incomplete, and where it is going**. Implementation claims are verified against source code, not inferred from older reports. Where a historical document conflicts with current code, the current document wins and the conflict is recorded.

## Start here

| If you want to know…                              | Read                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| What the product is intended to be                | [Product requirements](01-project/product-requirements.md)            |
| What actually works today, and with what evidence | [Feature status](03-features/feature-status.md)                       |
| How to run the upcoming devotee-portal acceptance | [Phase A checklist](03-features/phase-a-acceptance-checklist.md)      |
| How to run the admin workspace acceptance         | [Phase B checklist](03-features/phase-b-acceptance-checklist.md)      |
| Account lifecycle and deletion policy             | [Account lifecycle](03-features/account-lifecycle.md)                 |
| What was verified most recently                   | [Project status](01-project/project-status.md)                        |
| The active plan and priorities                    | [Roadmap](roadmap.md)                                                 |
| How the code is organized                         | [Architecture](02-architecture/architecture.md)                       |
| What data is stored                               | [Database](02-architecture/database.md)                               |
| What has been decided                             | [Architecture decisions](02-architecture/decisions.md)                |
| How we test and what is safe                      | [Testing](04-quality/testing.md) · [Security](04-quality/security.md) |
| How to keep these documents current               | [Documentation maintenance policy](MAINTENANCE.md)                    |
| Coding conventions                                | [Conventions](01-project/conventions.md)                              |
| Local operations and deployment                   | [Deployment](05-operations/deployment.md)                             |
| Dependency upgrades                               | [Upgrade workflow](05-operations/dependency-upgrades.md)              |

## Directory layout

```text
docs/
├── README.md                    this index
├── MAINTENANCE.md               documentation maintenance policy
├── roadmap.md                   ACTIVE two-workstream development roadmap
├── 01-project/                  product intent, status, conventions
│   ├── product-requirements.md
│   ├── project-status.md
│   └── conventions.md
├── 02-architecture/             current system design
│   ├── architecture.md
│   ├── database.md
│   └── decisions.md
├── 03-features/                 verification-level feature inventory
│   └── feature-status.md
├── 04-quality/                  security and testing
│   ├── security.md
│   └── testing.md
├── 05-operations/               local development and deployment
│   └── deployment.md
├── 06-history/                  archived, identifiable historical records
│   ├── original-roadmap.md
│   ├── stage-2-authentication-spec.md
│   ├── stage-2-decision-report.md
│   ├── admin-ui-completion-report.md
│   └── mongodb-index-review.md
└── screenshots/                 captured browser evidence
```

## Status vocabulary

Every status statement uses one of these labels:

| Label                                       | Meaning                                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| **Implemented and browser-verified**        | A real browser check exists and is recorded.             |
| **Implemented and automated-test verified** | Unit or integration tests prove it; no browser evidence. |
| **Implemented but inadequately tested**     | Code exists but proof is weak or partial.                |
| **Partially implemented**                   | Incomplete, unreachable, or missing key parts.           |
| **Designed but not implemented**            | Accepted design, no code.                                |
| **Planned**                                 | Future intention, not yet designed or approved.          |
| **Deprecated / superseded**                 | Historical only; do not rely on it.                      |

A component, route or model existing is **not** proof that a feature works. Browser verification is never inferred from a passing build or from Playwright simply being present.

## Evidence rules

1. **Automated tests**, **process checks** (build, HTTP probes) and **browser verification** are reported separately.
2. An integration suite that skipped because MongoDB was unreachable is **not** a passing suite.
3. Browser claims name the viewport, the route and the observed behaviour.
4. Known defects stay listed until fixed, even when unrelated tests pass.

## Historical material

`06-history/` contains documents that are no longer current but remain useful. Each carries a banner explaining its original purpose, date and why it was archived. Do not delete them; if they become misleading, add a clearer banner. Original long-form planning lives in [original-roadmap.md](06-history/original-roadmap.md); the accepted Stage 2 design lives in [stage-2-authentication-spec.md](06-history/stage-2-authentication-spec.md) and [stage-2-decision-report.md](06-history/stage-2-decision-report.md).

## Screenshots

Captured browser evidence is in [screenshots/](screenshots/). Additional screenshot sets from earlier verification runs are kept under git-ignored `.local/browser-screenshots/` and are not documentation assets.

## Scope note

Utsav-Connect has two public purposes — helping visitors find the Mahotsav venue (Kulti Golf Ground, Kulti, West Bengal, India) and letting people apply to become devotees — plus internal operations for devotees, administrators and Super Administrators. Account lifecycle, administrator management, campaign operations, communication, notifications and platform-wide security are part of the intended platform; several are not yet implemented. See [feature status](03-features/feature-status.md) before assuming any of them work.
