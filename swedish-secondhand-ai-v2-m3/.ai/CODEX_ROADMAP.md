# Swedish Secondhand AI — v2.0.0 Smart Seller Coach roadmap

Target: a local-first, project-based Windows and Linux seller coach for Swedish private sellers.
Stable v1 remains the release prerequisite; v2 milestone branches stay isolated until that gate is
complete. Each milestone is independently tested and layered sequentially.

## Product boundary

v2 supports multiple local item projects, deterministic coaching, category-aware evidence,
photo-quality guidance, transparent market observations and pricing scenarios, editable Tradera,
Blocket and Vinted listing drafts, and manual listing follow-up. Gemini, Ollama and deterministic
offline analysis remain the only AI modes.

Accounts, cloud sync, scraping, browser automation, automatic marketplace publishing, payments,
mobile/web clients, automatic updates, and new AI runtimes remain out of scope.

## G0 — v1 stabilization prerequisite

Status: completed locally in merge `665af32`; public stable v1 remains time-gated.

- Align Tradera with fixed REST v4 App ID/App key authentication.
- Separate asking, realized and unknown price evidence.
- Cache bounded searches and prevent non-realized prices from anchoring valuations.
- Keep stable publication blocked until the original beta soak and live credential gates pass.

## M1 — Project library and schema 3 data

Status: completed and validated on `feature/v2-project-library`.

- Replace the global five-step shell with Home, Projects, item workspace, and separate Settings.
- Support draft, ready, listed, sold and paused project states.
- Store each project and its image media atomically in the schema 3 project database.
- Migrate the active v1 draft and history idempotently while retaining all schema 2 source keys.
- Enter read-only recovery when legacy data cannot be validated.
- Add full and compact format-2 backup/import for projects and images.

Acceptance: multiple projects remain isolated across restart; migration, corrupt data, images,
backup/import, reset, unit tests, E2E, and `npm run validate` pass.

## M2 — Deterministic seller coach and smart intake

Status: completed and validated on `feature/v2-smart-intake`.

- Add priority-ordered coach actions and evidence gaps.
- Add local image quality checks and category-specific photo coverage.
- Add Electronics, Fashion, Furniture, Collectibles and General fact profiles.
- Extend AI responses with candidates, uncertainty and evidence references without overriding
  locked user facts.

## M3 — Market intelligence and pricing workshop

Status: completed and validated on `feature/v2-market-workshop`.

- Add editable exact/broad comparable query plans, normalization and deduplication.
- Expose observation provenance, price kind, cache age and deterministic relevance.
- Compare all three pricing strategies without allowing AI or asking prices to set final prices.

## M4 — Listing studio and sell plan

Status: pending.

- Make listing fields editable with per-field origin and user-edit preservation.
- Add previews, character limits, image ordering, actionable policy issues and copy bundles.
- Add transparent marketplace, format, price and shipping recommendations.

## M5 — Follow-up and local learning

Status: pending.

- Track listing date, marketplace, URL, asking price, outcome and realized price.
- Add local 3/7/14-day follow-up guidance.
- Calibrate only from sufficient user-owned verified outcomes.

## M6 — Public beta and stable v2

Status: pending.

- Require migration, security, accessibility, E2E, package and release gates.
- Publish `v2.0.0-beta.1`, soak for at least 14 days, then publish stable only with no P0/P1,
  high-severity security, data-loss, upgrade or artifact-readback failure.

## Progress

- [x] G0 v1 stabilization prerequisite
- [x] M1 Project library and schema 3 data
- [x] M2 Deterministic seller coach and smart intake
- [x] M3 Market intelligence and pricing workshop
- [ ] M4 Listing studio and sell plan
- [ ] M5 Follow-up and local learning
- [ ] M6 Public beta and stable v2
