# Swedish Secondhand AI — repository instructions

## Mission and v4 scope

Build a trustworthy local-first Windows and Linux desktop seller coach for Swedish secondhand
valuation, project management, and copy-ready listings. The v4 product plan is
`docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md`; release state and implementation checkpoints live in
`.ai/CODEX_ROADMAP.md`.

v4 supports Gemini, Ollama, deterministic offline analysis, Tradera comparables, and manual
copy/export for Tradera, Blocket, and Vinted. Do not add OpenAI runtimes, accounts, cloud sync,
payments, mobile/web clients, scraping, browser publishing, automatic marketplace publishing,
or automatic updates in v4.

## Read order

Before changing code, read the relevant sources in this order:

1. `AGENTS.md`
2. `docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md`
3. `.ai/CODEX_ROADMAP.md`
4. `.ai/ROADMAP.md`
5. `.ai/INSTRUCTIONS.md` and `.ai/WORKFLOW.md`
6. `README.md` and `USER_GUIDE.md` for affected user behavior
7. `package.json`, relevant implementation, tests, and workflows

Trust the checkout over stale documentation. Report material mismatches before broad edits.

## Architecture

Keep dependencies flowing in one direction:

```text
platform/provider adapters -> core services -> Zustand stores -> features/components
```

- Provider SDKs, response parsing, and provider errors stay inside provider/platform adapters.
- Core services own valuation, listing, persistence, migration, and orchestration logic.
- Stores coordinate state and service calls; they do not contain provider SDKs, secrets, IPC,
  persistence implementations, or valuation mathematics.
- Components render state, accept input, and call store actions. They do not access IndexedDB,
  Node APIs, provider SDKs, raw secrets, or unrestricted IPC.

## Non-negotiable v4 invariants

### Security

- Keep Electron `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`.
- Expose only narrow typed preload capabilities. Never expose general `invoke`, filesystem,
  shell, or arbitrary network capabilities.
- Validate every IPC sender and payload. Return normalized, non-sensitive errors.
- Cloud secrets live only behind the Electron main-process boundary and OS-protected storage.
- Never return, log, export, snapshot, or persist raw secrets in renderer state or IndexedDB.
- If protected storage is unavailable, disable cloud operations; Ollama/offline remain usable.
- Never delete a legacy plaintext secret until the secure write has been verified.

### Valuation integrity

- User-authored facts and comparable exclusions are authoritative.
- AI may identify facts and explain evidence, but it must not set the final numeric price.
- Final prices are deterministic and based on explicit approved comparables and adjustments.
- Never produce a category-independent condition-only price. Return `insufficient-evidence`.
- Preserve the active draft when providers, persistence, or migrations fail.

### Data and listings

- Treat settings, drafts, history, comparables, valuations, and listings as production data.
- Persisted schema changes require a version, deterministic idempotent migration, tests, safe
  rollback, and explicit corrupt/unsupported-data behavior.
- Backup/import excludes secrets and validates the complete replacement before committing it.
- Listing copy comes only from reviewed facts. Never invent testing, authenticity, accessories,
  specifications, or hide known defects/missing parts.

## Change workflow

- Implement one roadmap milestone per branch or worktree and merge milestones sequentially.
- Start every milestone from a clean, green `main`; preserve unrelated user changes.
- Keep diffs focused. Do not reformat, rename, upgrade dependencies, or edit lockfiles outside
  the milestone's needs.
- Add tests for every behavior change. Do not weaken gates or assertions to make work pass.
- Keep `npm run test:e2e` read-only. Documentation screenshots run only through
  `npm run docs:screenshots`.
- Update roadmap status only after the milestone is merged and required validation passes.

## Required validation

Run focused tests while developing. Before completing any milestone, run:

```bash
npm run validate
```

Also run `npm run test:e2e` for user-flow changes, Electron/security tests for shell or IPC
changes, and package smoke tests for packaging changes. Public releases additionally require
`npm run validate:release` and green Windows/Linux release jobs.

Never claim a command, artifact, CI job, migration, security review, or release passed unless it
was actually verified.

## Completion report

Every milestone handoff must state:

- summary and user-visible behavior;
- files and contracts changed;
- tests and exact commands run;
- acceptance criteria and validation status;
- known limitations, deferred work, and unrelated issues;
- rollback point.

Do not mark a milestone complete while required gates fail. Commit, push, PR, tag, or publish
only when the user's request authorizes that external state change.
