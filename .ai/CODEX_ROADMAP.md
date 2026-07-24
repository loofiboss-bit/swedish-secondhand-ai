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

Status: completed and merged in `d33ab56`.

Target: one derived model for Item, Price, Listing, Follow-up, blocker count, next action, and copy
eligibility. Seller-entered pricing keeps comparable research optional; evidence-based pricing
retains its deterministic evidence gate. Category consumers normalize unknown values to General
without discarding reviewed source text.

## M2 — Shared safe image intake

Status: completed and merged in `d33ab56`.

Target: quick start and Item use the same sequential six-image, 10 MiB, MIME/extension, decode,
assessment, rejection, removal, and index-preservation contract. HEIC/HEIF remains explicitly
unsupported.

## M3 — Focused Item workspace

Status: completed and merged in `d33ab56`.

Target: description and photo summary first, followed by required facts, recommended facts, and
advanced provenance. One state-aware primary action remains visible and seller locks survive
re-analysis.

## M4 — Preview-first Listing workspace

Status: completed and merged in `d33ab56`.

Target: recommended marketplace preview, truthful ready-copy gate, secondary text-only copy,
focused blocker navigation, preserved user edits, accessible replacement dialog, and recoverable
clipboard failure.

## M5 — Project library and recovery polish

Status: completed and merged in `d33ab56`.

Target: readiness-driven priority and cards, accessible overflow actions and dialogs, recoverable
trash, serialized saves, and latest-request-wins project switching.

## M6 — Release hardening

Status: completed through public `v4.0.0-rc.1` from `a0d895c`.

Target: v2.0.1/v3 compatibility fixtures, expanded E2E and accessibility coverage, current
marketplace-policy source dates, refreshed screenshots and guidance, dependency/release
validation, package smoke, checksums, and SBOM.

Public `v4.0.0-rc.1` requires clean Windows/Linux package and upgrade evidence, green CI, and
public artifact readback. Stable v4 can follow immediately when current evidence confirms every
release gate, including no open P0/P1 or high-severity security finding. Candidate age, waiting
periods, and elapsed time are never release gates.

## Progress

- [x] G0 Stable v3.0.0 prerequisite
- [x] M1 Unified readiness and category boundaries
- [x] M2 Shared safe image intake
- [x] M3 Focused Item workspace
- [x] M4 Preview-first Listing workspace
- [x] M5 Project library and recovery polish
- [x] M6 Release hardening and public RC

The public RC passed exact-source validation, Windows/Linux build and upgrade jobs, checksum and
SBOM readback, and current security gates. Stable v4 uses the same evidence gates without a
candidate-age or waiting-period requirement.
