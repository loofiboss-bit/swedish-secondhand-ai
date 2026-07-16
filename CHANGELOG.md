# Changelog

## Unreleased

- Corrected Tradera access to the official fixed REST v4 search endpoint with separate public
  App ID and OS-protected App key, bounded daily requests, and a 24-hour local query cache.
- Distinguished asking, realized, and unknown comparable prices; only user-approved realized
  prices can anchor the deterministic valuation.

## 1.0.0-beta.1 - 2026-07-15

- Added first-run language, privacy, provider-status, and AI-mode onboarding with safe offline
  defaults and explicit transient fallback control.
- Added deterministic offline analysis, provider cancellation, bounded JPEG/PNG/WebP uploads,
  and localized recovery guidance.
- Added tag/version/changelog release validation, Windows NSIS/portable and Linux AppImage jobs,
  executable smoke checks, SHA-256 checksums, CycloneDX SBOM, and draft prereleases.

- Wrapped settings, drafts, history, and manual comparables in idempotent schema 2 envelopes;
  added strict v0.5/current-main migration and corrupt/unsupported-data behavior.
- Added secret-free format-1 backup, fully validated atomic selective import, selective/full reset,
  sanitized diagnostics, and privacy/security/support documentation.
- Changed Tradera, Blocket, and Vinted templates to use reviewed facts and explicitly preserve
  defects, missing accessories, untested state, and authenticity uncertainty.
- Added versioned, source-labelled product facts whose locked user corrections survive AI
  reanalysis, including explicit defects, accessories, and testing status.
- Added deterministic comparable relevance, visible weights, user inclusion/exclusion reasons,
  inspectable price adjustments, and five category benchmark fixtures.
- Replaced condition-only fallback prices with `ready`, `low-confidence`, and
  `insufficient-evidence`; insufficient evidence never contains a numeric price.
- Moved Gemini and Tradera secrets and cloud requests behind a validated Electron main-process
  boundary with OS-protected storage, safe legacy migration, CSP, and navigation restrictions.
- Added masked secret status, Gemini connection testing, and Swedish/English privacy and recovery
  guidance without exposing saved values to renderer state.
- Added provider-neutral AI contracts, registry, capabilities, and normalized errors.
- Migrated Gemini analysis and structured response parsing behind a tested provider adapter.
- Added an Ollama provider adapter with bounded configuration, health checks, and response
  validation.
- Added explicit provider routing and limited deterministic fallback for transient provider
  failures while preserving configuration, authentication, and cancellation errors.
- Added full `USER_GUIDE.md` with screenshot-based step-by-step manual.
- Added screenshot capture scenario (`e2e/user-guide.screenshots.spec.ts`) for doc maintenance.

## 0.5.0 - 2026-02-24

- Introduced guided workflow state machine with typed steps and persisted progress.
- Added draft persistence service with autosave/resume/discard flow.
- Added one-click pipeline orchestration (`runPipeline`) in valuation store.
- Added pricing strategies (`fast_sale`, `balanced`, `max_value`) and outlier-aware valuation.
- Extended comparables with source quality metadata and improved confidence modeling.
- Added valuation calibration service using sold-outcome history feedback.
- Added site policy service for Tradera/Blocket/Vinted listing validation.
- Added quality score service with publish-readiness scoring and fix suggestions.
- Added listing store assessment state (`qualityReport`, `siteValidation`) and copy bundle export.
- Reworked UI into guided workspace with stepper, persistent summary sidebar, and review gate.
- Added command palette and keyboard shortcuts for key workflows.
- Upgraded history panel with search/filter/detail view and sale outcome updates.
- Added responsive design token styling refresh for readability and hierarchy.
- Expanded i18n keys for workflow, quality, history outcomes, and command actions.
- Added new tests for policy service, quality scoring, workflow store, and updated integration/service tests.
- Fixed pre-existing formatter gate issue in `.github/dependabot.yml`.

## 0.1.0 - 2026-02-24

- Bootstrap new standalone desktop app repository.
- Add domain model for item analysis, comparables, valuation, and listing templates.
- Implement services for settings, Gemini-assisted item analysis, Tradera comparables, manual comps, valuation, templates, and history.
- Build React feature panels for analyze, valuation, templates, history, and settings.
- Add Swedish-first i18n with English fallback.
- Add unit/integration tests, Playwright smoke test, Electron shell, and CI validate workflow.
