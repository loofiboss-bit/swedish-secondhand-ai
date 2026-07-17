# Contributing

Contributions should preserve the app's local-first, manual-publishing, and evidence-based pricing
boundaries. Read [AGENTS.md](./AGENTS.md) and the current
[implementation roadmap](./.ai/CODEX_ROADMAP.md) before changing behavior.

## Before opening a change

- Search existing issues and pull requests.
- Keep one roadmap milestone or focused fix per branch.
- Do not add accounts, cloud sync, scraping, automatic marketplace publishing, new AI runtimes,
  payments, mobile or web clients, or automatic updates to the v3 scope.
- Preserve unrelated local changes and existing data contracts.

## Local setup

```bash
npm ci
npm run electron:dev
```

Use focused tests while developing. Run the required repository gate before handoff:

```bash
npm run validate
```

Run `npm run test:e2e` for user-flow changes and Electron security tests for shell, preload, or IPC
changes. Documentation screenshots are generated separately with `npm run docs:screenshots`.

## Pull requests

Explain the user-visible change, data or security contracts affected, and exact commands run.
Include limitations and a rollback point. Add tests for behavior changes and do not weaken a gate
to make it pass.

Never include provider keys, private user data, generated backups, or real marketplace URLs in
fixtures, logs, screenshots, commits, or issues.
