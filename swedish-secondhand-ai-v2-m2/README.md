<p align="center">
  <img src="./docs/branding/readme-banner.svg" alt="Swedish Secondhand AI banner" width="100%" />
</p>

<p align="center">
  <img src="./docs/branding/logo.svg" alt="Swedish Secondhand AI logo" width="128" />
</p>

# Swedish Secondhand AI

Desktop-first valuation and listing assistant for Swedish secondhand markets.

## v2 Smart Seller Coach development

- A local project library keeps multiple items isolated as drafts, ready listings, published
  items, sold items, or paused work.
- Each item workspace is divided into Item, Market & price, Listing, and Follow-up; provider and
  backup settings live in a separate Settings view.
- Schema 3 migrates the active v1 draft and history without deleting the schema 2 rollback source.
- Full backups include project images; compact backups explicitly omit images. Secrets remain
  excluded from both formats.
- A deterministic seller coach orders the next actions by safety, missing facts, photos, market
  evidence, price, listing, and follow-up; every action explains why it matters.
- Local photo checks measure resolution, light, contrast, sharpness, duplicates, and crop risk
  without changing the original JPEG, PNG, or WebP.
- Category profiles and source-labelled fact candidates make unknowns visible while preserving
  every user correction and lock across later analysis.

## What's New in v1.0.0-beta.1

- Safe-by-default offline first run, with optional Ollama or Gemini modes and explicit transient
  fallback.
- Protected main-process provider boundary, evidence-gated pricing, verified listing facts, and
  versioned backup/migration support.
- Reproducible Windows NSIS/portable and Linux AppImage release artifacts with checksums and SBOM.

## v0.5 workflow foundation

- Guided listing workflow: `Analyze -> Comparables -> Price -> Templates -> Review`.
- Draft autosave and resume across app restarts.
- One-click `Run full pipeline` orchestration.
- Pricing strategies: `fast_sale`, `balanced`, `max_value`.
- Deterministic comparable ranking, user inclusion decisions, visible weighting, and outlier
  handling in valuation.
- Source-labelled product facts with user locks; a later AI analysis cannot overwrite a locked
  correction.
- Evidence-aware valuation statuses. Fewer than two approved comparables produce no numeric price.
- Confidence explanation breakdown (similarity, sample size, source quality, calibration).
- History outcome capture (`pending`, `sold`, `not_sold`) with sold-price feedback loop.
- Marketplace assist layer with per-site policy checks and quality scoring.
- Publish-readiness gate and actionable fix suggestions per template.
- Copy bundle export per site (title, description, tags, pricing notes).
- Guided workspace layout with persistent summary sidebar.
- Command palette (`Ctrl/Cmd + K`) and keyboard navigation shortcuts.
- History search/filter and detail drill-down.

## Core Capabilities

- Item identification from text or image.
- SEK valuation output with min/recommended/max range.
- Hybrid comparables: Tradera API + manual Blocket/Vinted comps.
- Tradera, Blocket, Vinted template generation with site-specific optimization.
- Local-first storage for settings, manual comps, drafts, and history.
- Swedish-first UI with English fallback.

## Item workspace

1. Create or open an item project.
2. Review the item from text/images.
3. Fetch Tradera comparables, add manual evidence, and estimate value.
4. Generate and review site listings.
5. Copy/export manually and track the item in Follow-up.

## Keyboard Shortcuts

- `Ctrl/Cmd + K` — Open command palette
- `Ctrl/Cmd + Enter` — Run full pipeline
- `Alt + ArrowRight` — Next workflow step
- `Alt + ArrowLeft` — Previous workflow step

## Tech Stack

- React 18 + TypeScript + Vite
- Electron 40
- Zustand
- idb-keyval
- i18next
- Vitest + Playwright

## Scripts

- `npm run dev`
- `npm run electron:dev`
- `npm run test`
- `npm run test:e2e`
- `npm run validate`
- `npm run validate:release`
- `npm run dist`

## API Notes

- Tradera comparables use official API access.
- Blocket and Vinted remain manual-posting workflows (no scraping/direct publishing).
- Gemini API keys and Tradera App keys are user-provided and encrypted through the operating
  system's protected credential storage. Tradera App IDs are non-secret settings. The renderer
  receives only configured/not-configured secret status.
- Tradera search uses the fixed official REST v4 endpoint. Asking prices are shown as market
  context; only verified realized prices can anchor a valuation.

See [Privacy](./PRIVACY.md), [Security](./SECURITY.md), and
[Support and recovery](./SUPPORT.md) for provider data flows, vulnerability reporting, backups,
migrations, and reset behavior.

## Build Targets

- Windows (NSIS + portable)
- Linux (AppImage)

## Documentation

- [User Guide](./USER_GUIDE.md)
- [Privacy](./PRIVACY.md)
- [Security policy](./SECURITY.md)
- [Support and recovery](./SUPPORT.md)
