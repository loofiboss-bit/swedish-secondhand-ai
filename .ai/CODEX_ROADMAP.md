# Swedish Secondhand AI — v4.0.0 Focused Seller Workspace roadmap

The product and acceptance authority is
[`docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md`](../docs/SWEDISH_SECONDHAND_AI_V4_PLAN.md).
This file records release ordering and repository checkpoint state without treating local,
unmerged work as released.

## G0 — Stable v3.0.0 prerequisite

Status: completed and published 2026-07-24 from merge `b8754dc`.

- Stable v3.0.0 passed exact-source validation, Windows/Linux package and v2.0.1 upgrade checks,
  AppImage visible-render smoke, checksum/SBOM verification, and public artifact readback.
- GitHub security readback reported zero open Dependabot alerts at publication.
- Repository Markdown documentation and the public wiki were normalized to English.

## M1 — Unified readiness and category boundaries

Target: one derived model for Item, Price, Listing, Follow-up, blocker count, next action, and copy
eligibility. Seller-entered pricing keeps comparable research optional; evidence-based pricing
retains its deterministic evidence gate. Category consumers normalize unknown values to General
without discarding reviewed source text.

## M2 — Shared safe image intake

Target: quick start and Item use the same sequential six-image, 10 MiB, MIME/extension, decode,
assessment, rejection, removal, and index-preservation contract. HEIC/HEIF remains explicitly
unsupported.

## M3 — Focused Item workspace

Target: description and photo summary first, followed by required facts, recommended facts, and
advanced provenance. One state-aware primary action remains visible and seller locks survive
re-analysis.

## M4 — Preview-first Listing workspace

Target: recommended marketplace preview, truthful ready-copy gate, secondary text-only copy,
focused blocker navigation, preserved user edits, accessible replacement dialog, and recoverable
clipboard failure.

## M5 — Project library and recovery polish

Target: readiness-driven priority and cards, accessible overflow actions and dialogs, recoverable
trash, serialized saves, and latest-request-wins project switching.

## M6 — Release hardening

Target: v2.0.1/v3 compatibility fixtures, expanded E2E and accessibility coverage, current
marketplace-policy source dates, refreshed screenshots and guidance, dependency/release
validation, package smoke, checksums, and SBOM.

Public `v4.0.0-rc.1` requires clean Windows/Linux package and upgrade evidence, green CI, and
public artifact readback. Stable v4 can follow immediately when current evidence confirms every
release gate, including no open P0/P1 or high-severity security finding. Candidate age, waiting
periods, and elapsed time are never release gates.

## Progress

- [x] G0 Stable v3.0.0 prerequisite
- [ ] M1 Unified readiness and category boundaries
- [ ] M2 Shared safe image intake
- [ ] M3 Focused Item workspace
- [ ] M4 Preview-first Listing workspace
- [ ] M5 Project library and recovery polish
- [ ] M6 Release hardening and public RC

Roadmap boxes are checked only after the relevant milestone is merged and its required validation
passes. Current branch evidence belongs in the v4 RC gate record until then.
