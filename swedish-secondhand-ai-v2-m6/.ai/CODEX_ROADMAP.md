# Swedish Secondhand AI — v2.0.0 Smart Seller Coach roadmap

Target: a local-first, project-based Windows and Linux seller coach for Swedish private sellers.
Each milestone is independently tested and layered sequentially. The maintainer explicitly removed
the beta and soak prerequisites on 2026-07-16; v2 therefore proceeds through a direct stable release
candidate while retaining migration, security, platform-upgrade, and artifact gates.

## Product boundary

v2 supports multiple local item projects, deterministic coaching, category-aware evidence,
photo-quality guidance, transparent market observations and pricing scenarios, editable Tradera,
Blocket and Vinted listing drafts, and manual listing follow-up. Gemini, Ollama and deterministic
offline analysis remain the only AI modes.

Accounts, cloud sync, scraping, browser automation, automatic marketplace publishing, payments,
mobile/web clients, automatic updates, and new AI runtimes remain out of scope.

## G0 — v1 contract stabilization

Status: completed in merge `665af32`.

- Align Tradera with fixed REST v4 App ID/App key authentication.
- Separate asking, realized and unknown price evidence.
- Cache bounded searches and prevent non-realized prices from anchoring valuations.
- Keep the live credential smoke as an operational integration gate without coupling v2 to a v1
  beta or soak.

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

Status: completed and validated on `feature/v2-listing-studio`.

- Make listing fields editable with per-field origin and user-edit preservation.
- Add previews, character limits, image ordering, actionable policy issues and copy bundles.
- Add transparent marketplace, format, price and shipping recommendations.

## M5 — Follow-up and local learning

Status: completed and validated on `feature/v2-follow-up-learning`.

- Track listing date, marketplace, URL, asking price, outcome and realized price.
- Add local 3/7/14-day follow-up guidance.
- Calibrate only from sufficient user-owned verified outcomes.

## M6 — Stable v2 release

Status: direct stable release candidate in progress; beta and soak requirements were explicitly
removed by the maintainer on 2026-07-16.

- Require migration, security, accessibility, E2E, package and release gates.
- Publish stable `v2.0.0` only with no P0/P1, high-severity security, data-loss, platform-upgrade,
  or artifact-readback failure.

## Progress

- [x] G0 v1 contract stabilization
- [x] M1 Project library and schema 3 data
- [x] M2 Deterministic seller coach and smart intake
- [x] M3 Market intelligence and pricing workshop
- [x] M4 Listing studio and sell plan
- [x] M5 Follow-up and local learning
- [ ] M6 Stable v2 release
