# Product roadmap

The implementation authority is [`.ai/CODEX_ROADMAP.md`](./CODEX_ROADMAP.md).

## Released baseline

- v0.1.0 — MVP
- v0.5.0 — guided workflow, drafts, valuation calibration, marketplace checks, and productivity
- v1.0.0-beta.1 — public Windows/Linux beta with protected provider boundary, evidence-gated
  valuation, versioned local data, onboarding, checksums, and SBOM (published 2026-07-15)
- v2.0.0 — Smart Seller Coach with isolated item projects, schema 3 migration and recovery,
  deterministic coaching, market and pricing workshops, editable listings, local follow-up, and
  release checksums and SBOM (published 2026-07-16). A Linux blank-renderer defect was confirmed
  after publication; the corrective AppImage hotfix is implemented locally but not yet published.

The maintainer explicitly replaced the former stable-v1-first and v2 beta/soak sequence on
2026-07-16. The completed release state and gate evidence are recorded in the implementation
authority; this product summary must not reintroduce those superseded prerequisites.

## Current maintenance track

v2.0.x is the active maintenance line. Changes should preserve the v2 product boundary and data
contracts while prioritizing, in order:

1. P0/P1 startup, data-loss, migration, and security fixes;
2. cross-platform packaging and upgrade reliability;
3. accessibility and deterministic workflow defects;
4. documentation and release-state consistency.

New product milestones belong in `.ai/CODEX_ROADMAP.md` first. This file summarizes released
product direction and must stay consistent with that authority; `npm run validate:roadmaps`
enforces the current release-state contract.

The v2 line remains local-first and manual-publishing only. Broader provider, cloud, mobile,
payment, scraping, publishing, and automatic-update work remains out of scope.
