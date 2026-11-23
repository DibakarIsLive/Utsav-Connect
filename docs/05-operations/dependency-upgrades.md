# Dependency upgrade workflow

Next.js 16.4.4 was affected by the November 2026 security advisories (fixed in 16.4.5) and was upgraded to **16.4.6** on 2026-11-17. The old interactive upgrade prompt in `make dev` is gone because 16.4.6 is outside the published advisory ranges; no warning was suppressed by configuration.

## Why the old prompt was unacceptable

Next.js 16.4.4's `next dev` parent process displayed a human upgrade menu when its live npm-advisory check found the installed version affected. Choosing "Upgrade now" deliberately stopped the dev worker (`handleSessionStop('SIGTERM')`) and exited the CLI before handing off to `next upgrade --agent=security`. That upgrade CLI scanned `PATH` for `claude`/`codex` executables and offered "Continue with Claude Code" or "Copy prompt for another coding agent" — neither belongs in a project-managed dependency workflow. See the final `AI.md` report for the exact code path.

## Supported procedure

Security information remains inspectable without an interactive wizard:

```bash
make next-upgrade-check
```

Read-only: prints the declared and lockfile versions of Next.js, the ESLint config and React, the latest stable Next.js from npm, and the current npm advisory status for `next`. No files change; no coding agent is invoked.

To upgrade deliberately:

```bash
make next-upgrade-check
make next-upgrade NEXT_TARGET=16.4.6          # dry run: prints the proposal, changes nothing
make next-upgrade NEXT_TARGET=16.4.6 CONFIRM=1
make check && npm run build && make test-e2e
```

- `NEXT_TARGET` is required; without it the target fails with guidance.
- `CONFIRM=1` is required for any install; the default is a dry run.
- Only `next` and `eslint-config-next` are installed, pinned exactly. React and React DOM are **never** changed by this target.
- `package.json` and `package-lock.json` changes are expected; review the diff before committing.
- The target never calls `next upgrade`, Claude Code, Cursor, Codex or any other agent, and it is never invoked by `make dev`.

`experimental.agentUpgrade: false` in `next.config.mjs` is a supported Next.js option that disables reminders entirely, but this project deliberately does **not** set it: the patched version removes the advisory condition, and the check target keeps security information visible.

## Additional checks

```bash
npm ci --dry-run       # lockfile consistency without modifying node_modules
npm audit --json       # advisory detail (parse rather than auto-fixing)
```
