# Agent and contributor rules for Utsav-Connect

Short operating rules for anyone (human or AI assistant) changing this repository. Full context: `docs/Roadmap.md` (scope), `docs/architecture.md`, `docs/conventions.md`, `docs/project-status.md`.

1. **JavaScript only.** No `.ts`/`.tsx`, no `tsconfig*.json`, no `next-env.d.ts`. `npm run check:js-only` must pass.
2. **Inspect before changing.** Read `git status`, `git log --oneline -5`, and `docs/project-status.md` first. Preserve uncommitted work.
3. **Respect the layers.** `app/` = routing only; `ui/` = presentation; `api/` = server-only (`import "server-only"`). Import through `@/ui/...` and `@/api/...`.
4. **No fake success.** A feature is done only when tests, a build, and (for UI) a real browser check back it. Report browser checks separately from curl/tests, or mark them unverified.
5. **Protect data and secrets.** Never commit `.env.local`, dumps, or `.local/`. Never start/stop or point tests at a database whose name does not end in `_test`. Never log URIs, tokens, or passwords. Atlas credentials exist only in `.env.local`; if one ever appears in a chat, screenshot, or issue, rotate it.
6. **Work inside this repository.** Temporary files go under the git-ignored `.local/`; nothing is created outside the repo.
7. **Git discipline.** Conventional commits (`type: description`) only after `make check` passes; no history rewriting; no push or deploy without explicit permission.
8. **Checkpoints.** Update `docs/project-status.md`, `CHANGELOG.md`, and `docs/decisions.md` with every milestone; record what was verified and what was not.
9. **Ask, don't invent,** when a choice affects security, privacy, legal terms, product behaviour, or is irreversible (see open items in `docs/product-requirements.md`).
