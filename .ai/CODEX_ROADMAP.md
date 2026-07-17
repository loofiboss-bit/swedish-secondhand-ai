# Swedish Secondhand AI — v3.0.0 Guided Selling roadmap

Target: a local-first Windows and Linux seller coach that lets an occasional Swedish private
seller create a copy-ready listing with their own price in at most six primary actions and within
five minutes. Evidence-based valuation remains an optional, clearly stronger pricing route.

## Product boundary

v3 retains Gemini, Ollama, deterministic offline analysis, official Tradera comparables, local
projects, protected secrets and manual copy/export for Tradera, Blocket and Vinted. Accounts,
cloud sync, scraping, automatic publishing, payments, mobile/web clients, new AI runtimes and
automatic updates remain out of scope.

## G0 — Safe v2.0.1 maintenance release

Status: completed and published 2026-07-17 from merge `c23d053`.

- Published the merged relative-asset AppImage fix as v2.0.1.
- Generalized semantic-version release and publication gates.
- Verified Windows and Linux packaging, v2.0.0 upgrades, visible AppImage rendering, checksums,
  SBOM and GitHub artifact readback.

## M1 — Schema 4 and simplified core contracts

Status: completed in merge `d201220` after local and GitHub validation.

- Add explicit project names, `PriceDecision`, archive state and recoverable trash.
- Migrate schema 3 deterministically and idempotently while retaining verified schema 3 rollback
  records.
- Export backup format 3 with live and trashed projects; import formats 2 and 3.
- Derive `ProjectProgress` from project data instead of persisting new workflow state.

## M2 — Immediate offline start and clear configuration

Status: in progress on `feature/v3-offline-start`.

- Make **Start offline** the primary first-run action and detect the OS language.
- Show only the selected provider configuration with localized connection tests.
- Add a network-free example project and a project quick start with name, description and images.

## M3 — Guided workflow and progressive detail

Status: planned.

- Use Item → Price → Listing → Done with one primary next action.
- Show only the coach's most important task; move provenance and advanced tools into details.
- Localize enums, dates, sources and normalized errors; use contextual dismissible errors.
- Expose localized autosave states and remove the legacy global workflow from UI state.

## M4 — Flexible pricing and simpler listing studio

Status: planned.

- Support evidence-based price, clearly labelled user price or no price yet.
- Generate listing text without valuation; require a price only for the complete copy bundle.
- Keep numerical recommendations gated by two approved realized comparables.
- Guide manual comparable entry and show one recommended marketplace tab at a time.

## M5 — Safe project management and support

Status: planned.

- Add search, status filters, rename, archive, trash/undo and explicit empty-trash confirmation.
- Export privacy-safe diagnostics without user text, images, URLs or secrets.
- Refresh README, user guide, support flow and all v3 screenshots.

## M6 — v3 release candidate and stable gate

Status: planned.

- Publish `v3.0.0-rc.1` only after full local and cross-platform release validation.
- Stable v3.0.0 requires a seven-day RC period, verified clean installs and v2.0.1 upgrades on
  Windows/Linux, no open P0/P1 or high security findings, and artifact/checksum/SBOM readback.

## Progress

- [x] G0 Safe v2.0.1 maintenance release
- [x] M1 Schema 4 and simplified core contracts
- [ ] M2 Immediate offline start and clear configuration
- [ ] M3 Guided workflow and progressive detail
- [ ] M4 Flexible pricing and simpler listing studio
- [ ] M5 Safe project management and support
- [ ] M6 v3 release candidate and stable gate
