<div align="center">

# 🎪 Utsav-Connect 🎪

### Mahotsav Invitation Campaign Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-only-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vitest](https://img.shields.io/badge/Tests-Vitest_4-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Track → Invite → Report → Analyze — Mahotsav invitation campaigns across any number of geographic areas**

[Quick Start](#-quick-start) • [Commands](#-commands) • [Structure](#-project-structure) • [Status](#-current-status) • [Roadmap](#-roadmap) • [Docs](#-documentation)

</div>

---

## 🎯 Vision

**Utsav-Connect** is the operations platform for a Mahotsav invitation campaign. It answers one question for everyone involved — _which localities have been invited, and how well?_

- **Visitors** explore approved localities on a map and read public campaign statistics.
- **Registered devotees** record the invitations they made, see their own history, and propose new localities or boundary changes.
- **Administrators** manage the official geography (areas, boundaries, hierarchy), population estimates, invitation reports, accounts, and an audit trail.

The venue is a single point of interest; the campaign itself has **no single-town or fixed-radius limit** and can grow to any number of areas.

### Design principles

| Principle                              | What it means in practice                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Proposed ≠ approved                    | Devotee proposals never touch official statistics until an administrator approves them                    |
| Permissions live on the server         | The UI hides buttons; Route Handlers enforce the rules — changing an ID in a request gains nothing        |
| History is preserved                   | Approvals, rejections, corrections and withdrawals are recorded, never silently overwritten               |
| Every number is defined                | Population estimate, reported invitations, registered devotees and active contributors are never mixed up |
| Count each report once                 | Region totals aggregate child areas without double counting                                               |
| Nothing is "done" until it is verified | Tests, a production build and a real-browser check back every feature claim                               |

---

## 📍 Current Status

> **Stage 1 — Foundation: implementation complete; formal closure blocked** (re-checked 2026-11-04) · Database: **MongoDB Atlas** cluster `main` · **Not deployed yet**

| Area                         | State                                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Project setup                | ✅ Next.js 16 App Router, JavaScript/JSX only, Tailwind 4, ESLint 9, Prettier 3                                  |
| Database                     | ⚠️ Atlas configuration and isolation guard are in place; live authentication currently returns `bad auth`        |
| App shell                    | ✅ Accessible header/nav/footer, Home, About, Map (explicit "not available yet" state), 404, error boundary      |
| API                          | ✅ `GET /api/health` (200 / 503 `SERVICE_DEGRADED`, never cached), JSON envelope + error mapping                 |
| Hardening                    | ✅ Security headers, redacting JSON logger, env validation, `server-only` boundary                               |
| Tests                        | ✅ 47 unit tests and a 6-test integration suite; ⏸ full `make ci` is blocked until Atlas authentication succeeds |
| Authentication & roles       | ⏳ Stage 2 — not started                                                                                         |
| Areas, map, invitations      | ⏳ Stages 3–4 — not started                                                                                      |
| Admin tools, analytics       | ⏳ Stages 5–6 — not started                                                                                      |
| Deployment, backups, go-live | ⏳ Stage 7 — not started                                                                                         |

Full verification record (exact commands, results, what was **not** verified): [`docs/project-status.md`](docs/project-status.md).

---

## 🛠️ Tech Stack

| Layer      | Choice                                                                         | Why                                                                                      |
| ---------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Framework  | **Next.js 16** (App Router, Turbopack) · **React 19**                          | One runtime for pages and API; Server Components by default                              |
| Language   | **JavaScript + JSX only** — no TypeScript, enforced by `npm run check:js-only` | Project rule; the check runs in every quality gate                                       |
| Database   | **MongoDB Atlas** via **Mongoose 9**                                           | Hosted replica set (transactions available), GeoJSON + `2dsphere` indexes for boundaries |
| Validation | **Zod 4**                                                                      | Environment variables today; every request body from Stage 2 on                          |
| Styling    | **Tailwind CSS 4** (`@theme` tokens, Turbopack loader)                         | Design tokens in CSS, no runtime cost                                                    |
| Testing    | **Vitest 4**                                                                   | Unit suites with no network; integration suites against a dedicated `_test` database     |
| Tooling    | ESLint 9 + `eslint-config-next`, Prettier 3 + Tailwind plugin, GNU Make        | Same commands locally and in CI                                                          |
| Planned    | Google Maps Platform (Places, Geocoding), Recharts, Auth.js _or_ equivalent    | Introduced in the stage that needs them — not installed yet                              |

Decisions and rejected alternatives are logged in [`docs/decisions.md`](docs/decisions.md) (ADR-001 … ADR-012).

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 20.12** and **npm ≥ 10** (developed on Node 25 / npm 11)
- **GNU Make** (preinstalled on macOS/Linux)
- A **MongoDB Atlas** cluster (free tier works) **or** any reachable MongoDB server

### 1 · Clone and install

```bash
git clone https://github.com/DibakarIsLive/Utsav-Connect.git
cd Utsav-Connect
make install          # npm ci — exact versions from package-lock.json
make doctor           # confirms node/npm and whether .env.local exists
```

### 2 · Configure the database

```bash
make setup-env        # copies .env.example → .env.local (never overwrites an existing file)
```

Open `.env.local` and set both connection strings from Atlas (**Database → Connect → Drivers**):

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/utsav_connect?retryWrites=true&w=majority&appName=<cluster>
MONGODB_URI_TEST=mongodb+srv://<user>:<password>@<cluster-host>/utsav_connect_test?retryWrites=true&w=majority&appName=<cluster>
```

Two rules the project enforces:

- **Include the database name** (`/utsav_connect`). A string ending in `/` silently falls back to a database called `test`.
- **The test database name must end in `_test`** — the integration suite refuses anything else so it can never touch real data.

In Atlas, add your IP under **Network Access** (don't leave `0.0.0.0/0` on). Then:

```bash
make check-db         # → MongoDB reachable: host=… database=utsav_connect latency=…ms
```

### 3 · Run

```bash
make dev              # http://localhost:3000  (PORT=4000 make dev to change)
make health           # calls /api/health on the running app
make stop             # stops whatever listens on PORT — nothing else
```

Production-style run: `make build && make start`.

### 4 · Before you commit

```bash
make check            # JS-only guard + ESLint + Prettier + unit tests (no database needed)
make ci               # check + integration tests (database required) + production build
```

---

## 📋 Commands

Every `make` target wraps a `package.json` script, so `npm run …` works equally. `make help` prints this list.

| Make                           | npm                               | What it does                                                                |
| ------------------------------ | --------------------------------- | --------------------------------------------------------------------------- |
| `make help`                    | —                                 | List all targets                                                            |
| `make doctor`                  | —                                 | Report node/npm (and optional `mongosh`) versions; is `.env.local` present? |
| `make install`                 | `npm ci`                          | Install exact dependency versions                                           |
| `make setup-env`               | —                                 | Create `.env.local` from `.env.example` (never overwrites)                  |
| `make dev`                     | `npm run dev -- --port PORT`      | Development server with hot reload                                          |
| `make build`                   | `npm run build`                   | Production build into `.next/`                                              |
| `make start`                   | `npm start -- --port PORT`        | Serve the production build                                                  |
| `make lint` / `lint-fix`       | `npm run lint` / `lint:fix`       | ESLint                                                                      |
| `make format` / `format-check` | `npm run format` / `format:check` | Prettier write / verify                                                     |
| `make check-js-only`           | `npm run check:js-only`           | Fail if any `.ts`/`.tsx`/`tsconfig*`/`next-env.d.ts` exists                 |
| `make test-unit`               | `npm run test:unit`               | 47 unit tests, no network                                                   |
| `make test-integration`        | `npm run test:integration`        | 6 tests against `MONGODB_URI_TEST`; skip with a notice if unreachable       |
| `make test`                    | `npm test`                        | Both suites                                                                 |
| `make check`                   | `npm run check`                   | **Quality gate** — JS-only + lint + format + unit tests                     |
| `make ci`                      | —                                 | `check` + integration (DB **required**, `UTSAV_TEST_REQUIRE_DB=1`) + build  |
| `make check-db`                | `npm run check:db`                | Ping MongoDB with `MONGODB_URI`; prints host + database only, never the URI |
| `make check-health`            | —                                 | Non-blocking: database ping + is the app listening on `PORT`?               |
| `make health`                  | —                                 | `curl` the running app's `/api/health`                                      |
| `make status`                  | —                                 | Git branch, working-tree summary, listening ports                           |
| `make show-urls` / `open`      | —                                 | Print / open local URLs                                                     |
| `make stop`                    | —                                 | Stop the process on `PORT` (only that port)                                 |
| `make clean-cache`             | —                                 | Remove `.next/`, `coverage/`, `.local/test-scratch/`                        |
| `make clean`                   | —                                 | `clean-cache` + `node_modules/` — **never** touches `.env*` or databases    |

---

## 📁 Project Structure

```text
Utsav-Connect/
├── app/                        # Next.js App Router — routing only
│   ├── layout.jsx              #   root layout: skip link, header, main, footer
│   ├── page.jsx                #   /          home
│   ├── about/page.jsx          #   /about
│   ├── map/page.jsx            #   /map       explicit "not available yet" state
│   ├── not-found.jsx           #   404
│   ├── error.jsx               #   route error boundary (client)
│   ├── icon.svg                #   favicon
│   └── api/health/route.js     #   GET /api/health → delegates to api/
├── ui/                         # Presentation layer (React, Tailwind)
│   ├── components/layout/      #   SiteHeader, MainNav (client), SiteFooter
│   ├── components/ui/          #   Container, PageHeader, StatusNotice
│   ├── lib/navigation.js       #   nav items + active-path rule
│   └── styles/globals.css      #   Tailwind import + @theme tokens
├── api/                        # Server-only domain code (import "server-only")
│   └── lib/
│       ├── env/env.js          #   Zod-validated environment, lazy + memoised
│       ├── mongodb/            #   connection.js, health.js, errors.js
│       ├── http/               #   errors.js (AppError…), responses.js (envelope, errorToResponse)
│       ├── logging/logger.js   #   JSON lines with secret redaction
│       └── app-info.js         #   APP_NAME / APP_VERSION
├── scripts/                    # check-javascript-only.js, check-mongodb.js, lib/load-env-file.js
├── tests/                      # unit/, integration/, helpers/, setup/, stubs/
├── docs/                       # architecture, decisions (ADRs), status, testing, database, security…
├── Makefile · package.json · next.config.mjs · eslint.config.mjs · vitest.config.mjs · jsconfig.json
├── .env.example                # placeholders only — copy to .env.local
├── AGENTS.md · CHANGELOG.md · LICENSE (MIT)
```

**Boundary rules:** `app/` composes `ui/` and calls `api/`; `ui/` never imports `api/` modules that touch the database; `api/` modules start with `import "server-only"` so Next.js refuses to ship them to the browser. Imports use the `@/` alias (`@/ui/...`, `@/api/...`); relative `../api/*` paths fail lint.

---

## ⚙️ Environment Variables

Validated on first server use by `api/lib/env/env.js`. Failures name the variable, never its value.

| Variable           | Required  | Default                 | Purpose                                                                   |
| ------------------ | --------- | ----------------------- | ------------------------------------------------------------------------- |
| `MONGODB_URI`      | yes       | —                       | Application database (`mongodb+srv://` or `mongodb://`), **with** db name |
| `MONGODB_URI_TEST` | for tests | —                       | Integration-test database; name **must** end in `_test`                   |
| `APP_BASE_URL`     | no        | `http://localhost:3000` | Public base URL                                                           |
| `LOG_LEVEL`        | no        | `info`                  | `debug` · `info` · `warn` · `error`                                       |
| `NODE_ENV`         | no        | `development`           | Set by Next.js                                                            |

Reserved for later stages and **not read yet**: `AUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`.

`.env.local` is git-ignored. Never paste connection strings into chats, issues or screenshots — if one leaks, rotate it in Atlas (see [`docs/security.md`](docs/security.md)).

---

## 🩺 Health Endpoint

`GET /api/health` — always fresh (`Cache-Control: no-store`).

```jsonc
// 200 — healthy
{ "success": true, "data": { "status": "ok", "checks": { "database": { "status": "ok", "latencyMs": 142 } }, "version": "0.1.0", "timestamp": "…" } }

// 503 — database unreachable (after a bounded 5 s)
{ "success": false, "error": { "code": "SERVICE_DEGRADED", "message": "One or more dependencies are unavailable." },
  "data": { "status": "degraded", "checks": { "database": { "status": "unavailable", "latencyMs": 5010, "message": "MongoDB did not respond to a ping." } }, "version": "0.1.0", "timestamp": "…" } }
```

Driver errors and stack traces stay in the server log; the response never contains them.

---

## 🧪 Testing & Verification

| Kind               | Where                              | Needs DB | Count |
| ------------------ | ---------------------------------- | -------- | ----- |
| Unit               | `tests/unit/`                      | no       | 47    |
| Integration        | `tests/integration/`               | yes      | 6     |
| Build              | `make build`                       | no       | —     |
| Browser (live DOM) | manual, recorded in project status | —        | —     |

Three kinds of evidence are reported separately — automated tests, process checks (`build`, `curl`), and real-browser checks — and anything not actually checked is marked **unverified**. Details: [`docs/testing.md`](docs/testing.md).

Integration tests connect to Atlas, so expect ≈ 600 ms per connection and ≈ 13 s for the whole suite. Two cases deliberately take 5 s each to prove the unreachable-database path.

---

## 🗺️ Roadmap

The authoritative plan is [`docs/Roadmap.md`](docs/Roadmap.md) (36 phases, 7 governing rules, release gates). Execution order:

| Stage | Scope                                                                          | Status      |
| ----- | ------------------------------------------------------------------------------ | ----------- |
| 1     | Requirements, project setup, JS-only enforcement, database, shell, tests, docs | ✅ Complete |
| 2     | Authentication, roles, server-side permissions                                 | ⏳ Next     |
| 3     | Geographic hierarchy, Google Maps, area details, locality proposals            | ⏳          |
| 4     | Invitation reporting and coverage statistics                                   | ⏳          |
| 5     | Administrator tools and audit history                                          | ⏳          |
| 6     | Analytics, contributor statistics, leaderboard                                 | ⏳          |
| 7     | Hardening, backups, deployment, go-live and maintenance                        | ⏳          |

Progress per milestone (what was built, verified, and left open) is kept in [`docs/project-status.md`](docs/project-status.md).

---

## 📚 Documentation

| Document                                                       | Contents                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`docs/project-status.md`](docs/project-status.md)             | Real state per roadmap task, verification record, limitations        |
| [`docs/architecture.md`](docs/architecture.md)                 | Layers, request flow, module responsibilities                        |
| [`docs/decisions.md`](docs/decisions.md)                       | ADR-001 … ADR-012 with context, decision, consequences               |
| [`docs/product-requirements.md`](docs/product-requirements.md) | Roles, pages, data rules, open decisions                             |
| [`docs/database.md`](docs/database.md)                         | Atlas setup, connection module, collection plan, backup/restore      |
| [`docs/deployment.md`](docs/deployment.md)                     | Atlas prerequisites, verification procedure, deployment limits       |
| [`docs/testing.md`](docs/testing.md)                           | Suites, commands, safety rules, verification policy                  |
| [`docs/security.md`](docs/security.md)                         | Implemented controls, credential handling, what is **not** there yet |
| [`docs/conventions.md`](docs/conventions.md)                   | Naming, imports, git and code style                                  |
| [`docs/Roadmap.md`](docs/Roadmap.md)                           | The full product roadmap                                             |
| [`AGENTS.md`](AGENTS.md)                                       | Operating rules for contributors and AI assistants                   |
| [`CHANGELOG.md`](CHANGELOG.md)                                 | Release notes                                                        |

---

## 🤝 Contributing

1. Branch from `main`: `type/kebab-case` (`feat/area-hierarchy`, `fix/health-timeout`).
2. Keep it JavaScript — `make check` fails on any TypeScript file or config.
3. Put UI in `ui/`, server logic in `api/`, routing in `app/`.
4. Add tests with the feature; run `make ci` before opening a pull request.
5. Commit as `type: imperative description` (`feat: add invitation report model`).
6. Never commit `.env.local`, dumps, or anything under `.local/`.

Full rules: [`docs/conventions.md`](docs/conventions.md) and [`AGENTS.md`](AGENTS.md).

---

## 📄 License

[MIT](LICENSE) © 2026 Dibakar Is Live

---

<div align="center">

**Built with ❤️ by [Dibakar](https://github.com/ThisIsDibakar)**

_Every invitation, every locality, one shared map._

</div>
