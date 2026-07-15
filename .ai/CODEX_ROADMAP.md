# Swedish Secondhand AI — direct v1.0.0 roadmap

Target: a stable public Windows and Linux desktop product. Baseline: released v0.5.0 with
provider-neutral contracts, Gemini adapter, Ollama adapter, and explicit AI router already merged
on `main`.

All remaining work belongs to the v1 train. There are no intermediate v0.7-v0.9 releases.
Each milestone is an independently tested branch/worktree merged sequentially to green `main`.
Package metadata stays at the last public version until the beta cut.

## Product boundary

v1 includes Gemini, Ollama, a deterministic offline mode, Tradera comparables, and manual
copy/export for Tradera, Blocket, and Vinted. OpenAI runtimes, compatible endpoints, generative
listing copy, automatic updates, accounts, cloud sync, subscriptions/payments, mobile/web,
scraping, browser automation, and automatic publishing are post-v1.

## G0 — Governance and green development baseline

Status: completed and validated.

- Add a concise repo-specific `AGENTS.md` and make this file the implementation authority.
- Remove `AGENTS.md` from workspace config-drift scope.
- Separate read-only regression E2E from explicit documentation screenshot generation.
- Backfill the changelog for the already merged provider contracts/adapters/router.
- Confirm `npm run validate` and read-only core E2E pass.

Acceptance: governance paths resolve, normal E2E never rewrites documentation, and the checkout
is clean after validation.

## M1 — Secure Electron and provider boundary

Status: completed and validated in merge `1667407`. Relevant changes from `483c3fe` were ported
without editor or screenshot noise, and superseded PR #5 was closed.

- Store Gemini and Tradera secrets with Electron `safeStorage`; never expose raw values.
- Migrate legacy renderer secrets only after verified secure writes; preserve them on failure.
- Execute Gemini and Tradera cloud calls in the main process through narrow typed IPC.
- Validate sender, payload, destination, size, model, and secret identifiers.
- Add CSP, deny unexpected navigation/windows, sanitize errors/logs, and keep secure defaults.
- Expose provider status, connection checks, privacy guidance, and recoverable failure states.

Acceptance: no raw secret is renderer-readable or exportable; migration rollback, unavailable
Linux protected storage, IPC rejection, navigation, provider errors, and draft preservation are
tested; validation and the security diff scan have no unresolved high-severity finding.

Rollback: keep legacy secrets until verified migration and revert the clean M1 merge if needed.

## M2 — Trustworthy deterministic valuation

Status: completed and validated in merge `ff2e57b`.

- Introduce versioned `VerifiedFact<T>` values with `ai`, `user`, and `heuristic` provenance and
  user locks for all price-relevant facts.
- Model defects, included/missing accessories, and tested/untested status explicitly.
- Rank comparables using visible deterministic relevance factors and let users include/exclude
  each comparable with a reason.
- Replace the condition-only price fallback with `ready`, `low-confidence`, and
  `insufficient-evidence`; insufficient evidence has no numeric price.
- Calculate prices from approved comparables with visible weights, outliers, condition,
  accessories, recency, shipping, source quality, and pricing strategy adjustments.
- Add category benchmark fixtures for Electronics, Fashion, Furniture, Collectibles, and General.

Acceptance: reanalysis cannot overwrite locked user facts; excluded comparables never affect
price; condition alone never produces a price; all adjustments are inspectable; benchmarks,
migrations, validation, and correction-flow E2E pass.

## M3 — Versioned user data and verified listings

Status: completed and validated in merge `5605260`.

- Wrap settings, drafts, history, and manual comparables in versioned persisted envelopes;
  interpret legacy bare payloads as schema 1 and migrate idempotently to schema 2.
- Add validated, atomic backup/import and selective/full reset. Secrets are never included.
- Generate marketplace templates only from verified facts and preserve defects, missing items,
  authenticity/testing uncertainty, and deterministic marketplace rules.
- Add sanitized diagnostics plus accurate privacy, security, support, migration, and recovery docs.

Acceptance: v0.5/current-main fixtures migrate; corrupt/unsupported imports change nothing;
backup round-trips non-secret data; provider/persistence failures preserve work; listings cannot
invent or hide material facts; validation and data-flow E2E pass.

## M4 — Public desktop beta

Status: completed. Merge `feb7d58` was published as public prerelease `v1.0.0-beta.1` on
2026-07-15 at 06:35:48 UTC. Release run `29394334330` passed validation, Linux AppImage startup,
Windows package smoke, artifact upload, SBOM, and checksum generation.

- Add first-run onboarding for language, privacy, AI mode, provider status, and offline use.
- Use explicit `gemini`, `ollama`, and `offline` modes plus a user-controlled transient-fallback
  setting. Never fall back for authentication, cancellation, or invalid configuration.
- Complete keyboard/focus/accessibility states, bounded image inputs, cancellation, and recovery.
- Add `validate:release`, tag/version/changelog checks, Windows NSIS/portable and Linux AppImage
  CI, package smoke tests, SHA-256 checksums, CycloneDX SBOM, and draft GitHub releases.
- Cut `v1.0.0-beta.1` from verified `main`; later beta tags contain blocker fixes only.

Acceptance: a new user reaches an offline result without external docs; core flow is keyboard
usable; v0.5 upgrade fixtures survive; Windows/Linux artifacts, checksum, and SBOM exist; all
validation, E2E, security, migration, package, and release jobs pass.

## M5 — Stable v1.0.0

Status: time-gated until 2026-07-22 at 06:35:48 UTC at the earliest, then contingent on the
remaining no-P0/P1, security, data-loss, upgrade, package, and artifact-readback gates.

- Keep beta public for at least seven calendar days.
- Fix reproducible P0/P1 and common core-flow P2 bugs only; do not expand product scope.
- Require no open P0/P1, high-severity security, raw-secret exposure, or data-loss issue.
- Verify Linux AppImage and CI Windows packages, checksums, SBOM, release notes, privacy/security
  docs, and v0.5 -> beta -> stable data compatibility.
- Set canonical version and documentation to `1.0.0`, tag `v1.0.0`, and verify release assets by
  remote readback. Windows artifacts remain unsigned until signing credentials exist.

Rollback: retain the final beta tag and artifacts until stable installation and upgrade readback
are verified.

## Progress

- [x] G0 Governance and baseline
- [x] M1 Secure Electron and provider boundary
- [x] M2 Trustworthy deterministic valuation
- [x] M3 Versioned user data and verified listings
- [x] M4 Public desktop beta
- [ ] M5 Stable v1.0.0
