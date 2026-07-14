# Swedish Secondhand AI — Codex Roadmap to v1.0.0

> Target: a stable public Windows and Linux desktop product.
> Baseline: v0.5.0 on `main`.
> Delivery rule: one independently validated milestone at a time.

## Product decision

v1.0.0 will make the existing product trustworthy and distributable. It will not try to
become a broad AI platform before the desktop foundation is safe.

The supported v1 AI modes are:

- Google Gemini for user-funded cloud analysis;
- Ollama for local analysis;
- deterministic offline fallback when AI is unavailable.

OpenAI, OpenAI-compatible endpoints, AI-written listing copy, Facebook Marketplace,
automatic updates, accounts, cloud sync, subscriptions, mobile clients, scraping and direct
marketplace publishing are deferred until after v1.0.0.

## Why the roadmap was reduced

The former roadmap put four providers, a new AI listing studio and release hardening on the
critical path at the same time. The repository still stores API keys in renderer IndexedDB,
uses a category-independent condition price when evidence is missing, has unversioned
persisted data and has no distributable release workflow. Those are release blockers. More
providers and generative surfaces are not.

v1 therefore prioritizes, in order:

1. provider isolation without behavior churn;
2. secret and IPC safety;
3. evidence-based valuation;
4. user-data compatibility and portability;
5. Electron, accessibility and packaging quality;
6. final stabilization.

## Rules for every milestone

- Read `AGENTS.md`, this file, `.ai/ROADMAP.md`, relevant source and tests first.
- Compare the milestone with the actual repository before editing.
- Preserve unrelated changes and persisted user data.
- Add tests for every behavior change.
- Run focused tests while developing and `npm run validate` before completion.
- Run `npm run test:e2e` for changed end-to-end behavior.
- Run the relevant Electron/package smoke test for shell or packaging changes.
- Do not mark a checkbox complete until the milestone is merged and validated.
- Do not weaken a quality gate to make a milestone pass.

---

# v0.6.0 — Safe AI foundation

## 0.6.1 Provider-neutral contracts

Status: merged.

- Define provider-neutral requests, responses, capabilities and errors.
- Add deterministic registry behavior and tests.
- Do not change runtime behavior.

Acceptance:

- no provider SDK types leak through core contracts;
- registry tests pass;
- `npm run validate` passes.

## 0.6.2 Gemini adapter migration

Status: merged.

- Move the Gemini SDK call and response parsing into a Gemini adapter.
- Keep the current prompt and two-image limit.
- Make model and timeout adapter configuration.
- Normalize authentication, rate limit, timeout, cancellation, network, model and response
  errors.
- Route Gemini through the provider registry.

Acceptance:

- `itemAnalysisService` has no Gemini SDK import;
- structured output is validated and normalized;
- contract tests cover text, images, partial/invalid output and provider failures;
- existing fallback behavior remains usable;
- `npm run validate` passes.

Rollback: remove the adapter/runtime registration and restore the former service call.

## 0.6.3 Ollama adapter and AI router

Status: merged.

- Move Ollama HTTP and parsing logic into a provider adapter.
- Validate base URL, model, output, timeout and cancellation.
- Add health checking without downloading or managing models.
- Introduce one router for explicit Gemini/Ollama selection.
- Never hide authentication, cancellation or invalid configuration behind fallback.
- Preserve the user's draft on every provider failure.

Acceptance:

- stores and UI do not branch on provider implementation details;
- both adapters satisfy the same analysis contract;
- endpoint, model, invalid-response, timeout and cancellation tests pass;
- `npm run validate` passes.

Rollback: restore the current Ollama helper while leaving provider contracts intact.

## 0.6.4 Secure Electron secret and AI boundary

- Add narrow typed preload capabilities for secret status/update/delete, connection test and
  cloud item analysis.
- Validate payloads and sender/frame for every IPC handler.
- Execute Gemini calls in the main process.
- Store Gemini and Tradera secrets with Electron `safeStorage` and never return raw values.
- Migrate existing plaintext settings only after secure write verification.
- Keep the old plaintext value when migration fails and show a non-sensitive recovery state.
- Store only provider preferences and configured/not-configured status in renderer state.
- Sanitize logs and errors.

Acceptance:

- raw cloud keys are absent from renderer persistence, Zustand, logs and diagnostics;
- migration success, rollback, secret status and invalid IPC payloads are tested;
- Electron security defaults remain enabled;
- `npm run validate` and Electron-focused tests pass;
- a security review has no unresolved high-severity finding.

Rollback: keep the migration idempotent and retain the last verified legacy value until the
secure representation is confirmed.

## 0.6.5 Provider settings and stabilization

- Present Gemini, Ollama and offline fallback clearly in Settings.
- Show masked configured status, model choice, connection state and privacy explanation.
- Add Swedish and English error recovery text.
- Test settings migration, provider switching, failed analysis and draft preservation.
- Update provider setup and troubleshooting documentation.

Release gate:

- no raw cloud key is renderer-readable;
- Gemini and Ollama have mocked contract coverage;
- failed provider requests preserve the active draft;
- `npm run validate` and relevant E2E tests pass.

---

# v0.7.0 — Trustworthy valuation

## 0.7.1 Versioned fingerprint and user corrections

- Version the item fingerprint and persisted records.
- Add provenance for AI/user values, structured defects and included/missing accessories.
- Support Electronics, Fashion, Furniture, Collectibles and General profiles.
- Let users correct all price-relevant fields and lock user-authored values.
- Migrate v0.5/v0.6 drafts and history without data loss.

Acceptance:

- reanalysis cannot silently overwrite a locked user value;
- valid, partial, corrupt and failed migration cases are tested;
- draft/history recovery preserves prior data;
- `npm run validate` and correction-flow E2E tests pass.

## 0.7.2 Comparable evidence and insufficient-evidence state

- Build ranked, visible queries from verified facts.
- Score model, family, category, condition, accessory, listing-age and source relevance.
- Detect spare parts and impossible prices deterministically.
- Add user include/exclude controls with reasons.
- Add `ready`, `low-confidence` and `insufficient-evidence` valuation states.
- Remove the universal condition-only SEK fallback.

Acceptance:

- excluded comparables never affect price;
- no precise price is returned from condition alone;
- missing evidence is an actionable normal state;
- category and override tests pass;
- `npm run validate` passes.

## 0.7.3 Deterministic weighted valuation and benchmark

- Weight approved comparables by relevance and source quality.
- Apply visible outlier, condition, accessory, shipping, recency and strategy adjustments.
- Record used/excluded comparables and confidence decomposition.
- Add reproducible category fixtures with expected ranges and sold prices.
- Fail tests on agreed benchmark regressions.

Acceptance:

- AI never sets the final numeric price;
- every adjustment is visible and testable;
- benchmark baseline and limitations are documented;
- `npm run validate` passes.

## 0.7.4 Valuation stabilization

- Exercise exact-model, sparse-evidence, corrupt-comparable and user-override flows.
- Verify sale-outcome calibration against the new result status.
- Update the user guide and changelog.

Release gate:

- no fabricated condition-only valuation remains;
- corrections and exclusions survive restart;
- benchmark and full validation pass.

---

# v0.8.0 — Safe listings and user data

## 0.8.1 Verified listing facts and marketplace profiles

- Derive listing copy from reviewed facts, never directly from untrusted provider output.
- Preserve defects, missing accessories and tested/untested state.
- Move Tradera, Blocket and Vinted rules into data-driven profiles.
- Add a generic copy/export profile.
- Keep deterministic templates as the v1 listing engine.

Acceptance:

- templates cannot remove known defects or claim unverified testing/authenticity;
- title, required field and price rules are deterministic;
- existing three marketplace flows remain compatible;
- `npm run validate` passes.

## 0.8.2 Persisted-data framework, backup and import

- Version settings, drafts, history, manual comparables and provider preferences.
- Centralize deterministic, idempotent migrations with explicit failure reporting.
- Export validated JSON without secrets.
- Validate imports before replacing current data.
- Add selective/full reset with explicit confirmation.

Acceptance:

- v0.5 through current fixtures migrate;
- export/import round trip preserves non-secret data;
- corrupt/unsupported imports make no changes;
- failed migrations preserve the previous representation;
- `npm run validate` passes.

## 0.8.3 Sanitized diagnostics and privacy

- Export app version, OS, provider ID, model ID, operation stage and normalized errors.
- Exclude secrets, authorization headers, raw images, full prompts/listings and sensitive paths.
- Add secret-scanning regression tests.
- Make `PRIVACY.md` match actual provider and local-storage behavior.

Acceptance:

- diagnostic fixtures contain useful support context and no sensitive payloads;
- privacy disclosures cover image sharing and local/cloud modes;
- `npm run validate` passes.

## 0.8.4 Listing and data stabilization

- Test drafts across listing errors, restart and migration.
- Test backup/import/reset in the UI.
- Update user documentation and changelog.

Release gate:

- current work survives provider and persistence failures;
- secrets are excluded from normal exports;
- deterministic listing fallbacks remain usable;
- full validation and relevant E2E tests pass.

---

# v0.9.0 — Public desktop beta

## 0.9.1 Electron shell hardening

- Add a production Content Security Policy.
- Block unexpected navigation and new windows.
- Allow only explicit HTTPS external destinations.
- Minimize and type the preload surface.
- Review Electron fuses and production loading.
- Audit production dependencies.

Acceptance:

- renderer has no Node or unrestricted IPC access;
- navigation, URL allowlist, sender and payload rejection are tested;
- no unresolved high-severity security finding remains;
- `npm run validate` and Electron smoke tests pass.

## 0.9.2 Onboarding, accessibility and reliability

- Add skippable first-run setup for language, AI mode, privacy and provider status.
- Complete keyboard navigation, focus handling, accessible names, empty/loading/error states
  and Swedish/English strings for the core flow.
- Bound image size/count and validate large-draft/history behavior.
- Make long provider work cancellable and recoverable.

Acceptance:

- a new user can reach a deterministic offline result without external documentation;
- the core flow is keyboard usable;
- large supported inputs do not create an unbounded memory path;
- `npm run validate` and core-flow E2E tests pass.

## 0.9.3 CI, packaging and release pipeline

- Keep PR validation on Node 22.
- Add Windows NSIS/portable and Linux AppImage workflows.
- Add package smoke checks, artifact retention and SHA-256 checksums.
- Validate tag/version/changelog alignment.
- Publish draft GitHub releases from `v*` tags.
- Document a manual update path; automatic updating stays post-v1.

Acceptance:

- clean CI builds produce named Windows and Linux artifacts;
- checksums match generated packages;
- package jobs are reproducible enough to diagnose;
- local Linux packaging or the closest available smoke test passes;
- `npm run validate` passes.

## 0.9.4 Documentation and beta gate

- Complete README, user guide, security, privacy, contributing, changelog, provider setup,
  troubleshooting, limitations and issue templates.
- Verify screenshots against current behavior.
- Run install/start/core-flow checks on available Linux hardware and CI Windows packages.

Public beta gate:

- no known data-loss or raw-secret exposure;
- provider failures do not crash the app or destroy drafts;
- migrations and backup recovery pass;
- supported packages build and start;
- core E2E, security checks and full validation pass.

---

# v1.0.0 — Stable public release

## 1.0.1 Beta triage and release blockers

- Reproduce beta feedback.
- Fix P0/P1 issues and common core-flow P2 issues only.
- Re-run security, data-loss, migration, valuation benchmark and packaging review.
- Record unsupported cases rather than expanding product scope.

Acceptance:

- no open P0 issue;
- no open P1 issue in a core flow;
- no unresolved high-severity security or data-loss finding;
- `npm run validate` passes.

## 1.0.2 Final v1.0.0 release

- Set version `1.0.0` in canonical metadata and user-facing documentation.
- Finalize changelog and release notes.
- Test upgrade from the public-beta data fixture.
- Verify drafts, history and settings survive upgrade.
- Run full unit, integration, E2E, build, format, package and security gates.
- Generate Windows/Linux artifacts and SHA-256 checksums through the release workflow.
- Verify the release metadata and downloadable assets.

Final gate:

- Gemini, Ollama and offline fallback fail safely;
- valuation never fabricates a condition-only price;
- user corrections and comparable exclusions are authoritative;
- secrets stay behind the Electron boundary;
- backup/import and migrations preserve user data;
- privacy, security and support documentation are current;
- Windows and Linux artifacts plus checksums exist;
- every required validation and CI job passes.

Rollback: keep the final beta tag and artifacts available until v1.0.0 installation and upgrade
readback are verified.

---

# Progress

## v0.6.0

- [x] 0.6.1 Provider-neutral contracts
- [x] 0.6.2 Gemini adapter migration
- [x] 0.6.3 Ollama adapter and AI router
- [ ] 0.6.4 Secure Electron secret and AI boundary
- [ ] 0.6.5 Provider settings and stabilization

## v0.7.0

- [ ] 0.7.1 Versioned fingerprint and user corrections
- [ ] 0.7.2 Comparable evidence and insufficient-evidence state
- [ ] 0.7.3 Deterministic weighted valuation and benchmark
- [ ] 0.7.4 Valuation stabilization

## v0.8.0

- [ ] 0.8.1 Verified listing facts and marketplace profiles
- [ ] 0.8.2 Persisted-data framework, backup and import
- [ ] 0.8.3 Sanitized diagnostics and privacy
- [ ] 0.8.4 Listing and data stabilization

## v0.9.0

- [ ] 0.9.1 Electron shell hardening
- [ ] 0.9.2 Onboarding, accessibility and reliability
- [ ] 0.9.3 CI, packaging and release pipeline
- [ ] 0.9.4 Documentation and beta gate

## v1.0.0

- [ ] 1.0.1 Beta triage and release blockers
- [ ] 1.0.2 Final v1.0.0 release

## Explicitly deferred until after v1.0.0

- OpenAI and OpenAI-compatible providers;
- AI-written listing copy and section regeneration;
- image-quality AI;
- Facebook Marketplace-specific profile;
- automatic updates;
- mobile/web clients;
- accounts, cloud sync, managed credits, subscriptions and payments;
- scraping, browser automation and automatic marketplace publishing.
