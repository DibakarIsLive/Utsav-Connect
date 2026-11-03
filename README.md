<div align="center">

# 🎪 Utsav-Connect 🎪

### Mahotsav Invitation Campaign Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-only-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Track → Invite → Report → Analyze — Mahotsav invitation campaigns across geographic areas**

[Quick Start](#-quick-start) • [Commands](#-commands) • [Structure](#-project-structure) • [Status](#-current-status) • [Docs](#-documentation)

</div>

---

## 🎯 Vision

**Utsav-Connect** tracks a Mahotsav invitation campaign across any number of geographic areas. Visitors explore approved localities and public statistics, registered devotees submit invitation reports and propose new localities, and administrators manage areas, boundaries, population estimates, and reports — with server-side permission checks and a preserved history of every important action.

The physical venue is one point of interest; the campaign itself has no fixed-radius or single-town restriction.

---

## 📍 Current Status

> **Stage 1 (Foundation) — in progress.** This repository currently contains the project foundation only: a JavaScript-only Next.js 16 app with a public shell (`/`, `/about`, `/map` placeholder), a MongoDB connection module, a `/api/health` endpoint, automated tests, and documentation.
>
> **Not implemented yet:** authentication and accounts, geographic areas and the Google Maps integration, invitation reports, population data, analytics, administration, notifications, deployment.

See [`docs/project-status.md`](docs/project-status.md) for the precise, verified state and [`docs/Roadmap.md`](docs/Roadmap.md) for the full plan.

---

## 🛠️ Tech Stack

| Layer           | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router) — frontend **and** backend           |
| Language        | JavaScript + JSX only (`.js` / `.jsx`). **No TypeScript.**   |
| UI              | React 19, Tailwind CSS 4                                     |
| Database        | MongoDB via Mongoose 9                                       |
| Validation      | Zod 4 (environment and request input)                        |
| Tests           | Vitest 4 (unit + integration)                                |
| Quality tooling | ESLint 9 (`eslint-config-next`), Prettier 3, JS-only scanner |
| Planned         | Auth.js or equivalent, Google Maps Platform, Recharts        |

The JavaScript-only rule is enforced by `npm run check:js-only`, which fails on any `.ts`/`.tsx` file, `tsconfig*.json`, or `next-env.d.ts`.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 20.12** and **npm ≥ 10** (developed on Node 25 / npm 11)
- **MongoDB** reachable from your machine (local `mongod` or a hosted cluster)
- `make` (preinstalled on macOS/Linux; optional — every target wraps an npm script)

### Installation

```bash
git clone https://github.com/DibakarIsLive/Utsav-Connect.git
cd Utsav-Connect

make install      # npm install
make setup-env    # copies .env.example → .env.local (edit if MongoDB is not on localhost:27017)
```

Start MongoDB separately (for example a local `mongod --dbpath <your-data-dir>`), then:

```bash
make dev          # http://localhost:3000
```

### Verify everything works

```bash
make check-db     # pings MongoDB with MONGODB_URI from .env.local
make check        # JS-only scan + lint + format check + unit tests
make test         # unit + integration tests (integration needs MongoDB)
make build        # production build
make health       # GET /api/health on a running server
```

Expected `make health` output while MongoDB is up:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "checks": { "database": { "status": "ok", "latencyMs": 1 } },
    "version": "0.1.0",
    "timestamp": "…"
  }
}
```

If MongoDB is down the endpoint returns **503** with `error.code = "SERVICE_DEGRADED"`; pages keep serving.

---

## 📖 Commands

Run `make help` for the same list in your terminal. Every target maps to a script in `package.json`.

| Make target             | npm equivalent             | What it does                                                         |
| ----------------------- | -------------------------- | -------------------------------------------------------------------- |
| `make install`          | `npm install`              | Install dependencies from the lockfile                               |
| `make setup-env`        | —                          | Create `.env.local` from `.env.example` (never overwrites)           |
| `make doctor`           | —                          | Report node/npm/mongod versions and whether `.env.local` exists      |
| `make dev`              | `npm run dev`              | Development server on `PORT` (default 3000)                          |
| `make build`            | `npm run build`            | Production build into `.next/`                                       |
| `make start`            | `npm run start`            | Serve the production build                                           |
| `make lint`             | `npm run lint`             | ESLint                                                               |
| `make lint-fix`         | `npm run lint:fix`         | ESLint with `--fix`                                                  |
| `make format`           | `npm run format`           | Prettier (write)                                                     |
| `make format-check`     | `npm run format:check`     | Prettier (check only)                                                |
| `make check-js-only`    | `npm run check:js-only`    | Fail if any TypeScript file/config exists                            |
| `make test-unit`        | `npm run test:unit`        | Unit tests (no database)                                             |
| `make test-integration` | `npm run test:integration` | Integration tests against `MONGODB_URI_TEST` (skip if unreachable)   |
| `make test`             | `npm test`                 | All tests                                                            |
| `make check`            | `npm run check`            | JS-only + lint + format check + unit tests                           |
| `make ci`               | —                          | `check` + integration tests (MongoDB **required**) + build           |
| `make check-db`         | `npm run check:db`         | Ping MongoDB using `.env.local`                                      |
| `make check-health`     | —                          | Non-blocking: is anything listening on 27017 / 3000?                 |
| `make health`           | —                          | `curl` the running app's `/api/health`                               |
| `make status`           | —                          | Git branch/HEAD, working tree, listening ports                       |
| `make show-urls`        | —                          | Print local URLs                                                     |
| `make open`             | —                          | Open the app in the default browser                                  |
| `make stop`             | —                          | Kill only the process listening on `PORT`                            |
| `make clean-cache`      | —                          | Remove `.next/`, `coverage/`, `.local/test-scratch/`                 |
| `make clean`            | —                          | `clean-cache` + `node_modules/` (never touches `.env*` or databases) |

Override ports per invocation: `make dev PORT=4000`, `make check-health MONGO_PORT=27018`.

---

## 🏗️ Project Structure

```text
Utsav-Connect/
├── app/                      # Next.js App Router (routing layer only)
│   ├── layout.jsx            #   root layout: header, main, footer, skip link
│   ├── page.jsx              #   /          home
│   ├── about/page.jsx        #   /about
│   ├── map/page.jsx          #   /map       explicit "not available yet" state
│   ├── not-found.jsx         #   404
│   ├── error.jsx             #   route error boundary (client)
│   ├── icon.svg              #   favicon
│   └── api/health/route.js   #   GET /api/health
├── ui/                       # Presentation layer (imported by app/)
│   ├── components/layout/    #   SiteHeader, MainNav, SiteFooter
│   ├── components/ui/        #   Container, PageHeader, StatusNotice
│   ├── lib/navigation.js     #   nav items + active-path helper
│   └── styles/globals.css    #   Tailwind import + design tokens
├── api/                      # Server-only domain code (guarded by `server-only`)
│   └── lib/
│       ├── env/env.js        #   Zod-validated environment (lazy, memoised)
│       ├── mongodb/          #   connection.js, health.js, errors.js
│       ├── http/             #   responses.js (JSON envelope), errors.js
│       ├── logging/logger.js #   JSON-line logger with secret redaction
│       └── app-info.js       #   APP_NAME / APP_VERSION
├── scripts/                  # check-javascript-only.js, check-mongodb.js, lib/
├── tests/                    # Vitest: unit/, integration/, helpers/, setup/, stubs/
├── docs/                     # Roadmap + architecture, decisions, testing, database, security…
├── Makefile · package.json · next.config.mjs · eslint.config.mjs · vitest.config.mjs
├── jsconfig.json             # "@/*" alias → repo root (@/ui/…, @/api/…)
├── .env.example              # variable names + safe placeholders (no secrets)
└── LICENSE (MIT)
```

Why `app/` + `ui/` + `api/` instead of one `src/` tree: Next.js requires `app/` at the root for routing, so `app/` holds only routes and composes from `ui/` (client-safe) and `api/` (server-only). Rationale and rejected alternatives are in [`docs/architecture.md`](docs/architecture.md) and [`docs/decisions.md`](docs/decisions.md).

---

## 🔐 Environment

Copy `.env.example` to `.env.local` (git-ignored). Variables read today:

| Variable           | Required | Default                 | Purpose                                                 |
| ------------------ | -------- | ----------------------- | ------------------------------------------------------- |
| `MONGODB_URI`      | yes      | —                       | Application database (`mongodb://` or `mongodb+srv://`) |
| `MONGODB_URI_TEST` | tests    | —                       | Integration-test database; name **must** end in `_test` |
| `APP_BASE_URL`     | no       | `http://localhost:3000` | Public base URL                                         |
| `LOG_LEVEL`        | no       | `info`                  | `debug` / `info` / `warn` / `error`                     |

Invalid or missing values fail fast with the variable name (never the value) when the server first needs them. Reserved names for later stages (`AUTH_SECRET`, Google Maps keys) are listed in `.env.example` as comments and are **not** read yet.

---

## 📚 Documentation

| Document                                                       | Contents                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| [`docs/project-status.md`](docs/project-status.md)             | What is implemented, verified, and pending — per roadmap  |
| [`docs/architecture.md`](docs/architecture.md)                 | Layers, module boundaries, request flow, config           |
| [`docs/decisions.md`](docs/decisions.md)                       | Architecture decision records (ADR-001 …)                 |
| [`docs/product-requirements.md`](docs/product-requirements.md) | Goals, roles, pages, collections, statistic definitions   |
| [`docs/testing.md`](docs/testing.md)                           | Test layout, how to run, DB gating, browser verification  |
| [`docs/database.md`](docs/database.md)                         | Connection lifecycle, dev/test separation, backup/restore |
| [`docs/security.md`](docs/security.md)                         | Secrets, headers, error handling, logging policy          |
| [`docs/conventions.md`](docs/conventions.md)                   | Naming, file layout, commits, branches                    |
| [`docs/Roadmap.md`](docs/Roadmap.md)                           | The full phased roadmap (source of truth for scope)       |
| [`CHANGELOG.md`](CHANGELOG.md)                                 | Notable changes per milestone                             |

---

## 🤝 Contributing

- Branches: `type/kebab-case` (e.g. `feat/area-hierarchy`). Commits: `type: description` (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`).
- Run `make check` before committing; `make ci` before opening a pull request.
- Never commit `.env.local`, database dumps, or anything under `.local/`.
- JavaScript and JSX only — the JS-only check is part of `make check`.

---

## 📄 License

Released under the [MIT License](LICENSE) — Copyright (c) 2026 Dibakar Is Live.

---

<div align="center">

**Built with ❤️ by [Dibakar](https://github.com/ThisIsDibakar)**

</div>
