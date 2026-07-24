# Product roadmap

The v4 product authority is
[`docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md`](../docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md). Release
ordering and implementation checkpoints are tracked in
[`.ai/CODEX_ROADMAP.md`](./CODEX_ROADMAP.md).

## Released baseline

- v2.0.0 — Smart Seller Coach and schema 3 projects, published 2026-07-16.
- v2.0.1 — verified Windows/Linux maintenance release, published 2026-07-17.
- v3.0.0-rc.1 — Guided Selling release candidate with verified Windows/Linux packages,
  v2.0.1 upgrades, checksums, and SBOM, published 2026-07-17.
- v3.0.0 — stable Guided Selling release with exact-source Windows/Linux packages, v2.0.1
  upgrades, checksums, SBOM, and public readback, published 2026-07-24.
- v4.0.0-rc.1 — Focused Seller Workspace release candidate with exact-source Windows/Linux
  packages, stable-v3 upgrades, checksums, SBOM, and public readback, published 2026-07-24.
- v4.0.0 — stable Focused Seller Workspace release with exact-source Windows/Linux packages,
  stable-v3 upgrades, checksums, SBOM, and public readback, published 2026-07-24.

## Current product track

v4.0.0 Focused Seller Workspace makes readiness the single source of truth, keeps optional price
research optional on the seller-price path, unifies safe image intake, and focuses Item, Listing,
and project-management views.

The local-first/manual-publishing boundary remains unchanged. Gemini, Ollama, offline analysis,
and official Tradera data are the supported intelligence sources. Numerical evidence-based
valuation still requires user-approved realized comparables.

Stable v4 is public and all implementation milestones are complete. Its exact-source validation,
platform, upgrade, security, checksum, SBOM, and public-readback evidence is recorded in the
release notes and v4 plan. Candidate age, waiting periods, and elapsed time are not release gates.
