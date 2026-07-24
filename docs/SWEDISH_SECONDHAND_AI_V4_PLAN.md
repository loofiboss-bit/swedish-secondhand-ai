# Swedish Secondhand AI v4.0.0 — Focused Seller Workspace

Status: completed and published

Reviewed baseline: stable `v3.0.0` at `b8754dc` on 2026-07-24

Current public version: `v4.0.0`

## Outcome

v4.0.0 turns the existing guided seller coach into a focused, internally consistent workspace:

- one derived readiness model decides what is complete, blocking, optional, or recommended;
- the own-price path no longer appears blocked by optional comparable research;
- item review shows the next required facts instead of one long form;
- listing review opens as a compact preview with one clear copy action;
- image intake behaves consistently and safely from both quick start and the item workspace;
- project cards show the real next action and use accessible in-app dialogs;
- existing projects, facts, prices, images, listing edits, and outcomes remain intact.

The target user remains an occasional Swedish private seller preparing listings for Tradera,
Blocket, and Vinted on Windows or Linux.

## Current state

### Verified strengths

- Local-first Electron architecture with a narrow preload/IPC boundary, sandboxing, protected
  secrets, non-secret backups, and recovery behavior.
- Offline, Gemini, and Ollama analysis routes with explicit fallback behavior.
- Deterministic evidence-based valuation that requires approved realized comparables.
- Seller-entered prices are represented separately from evidence-based prices.
- User-edited listing fields survive regeneration unless replacement is explicitly confirmed.
- Schema 4 projects support archive, recoverable trash, outcomes, diagnostics, and backup/import.
- Windows and Linux release automation produces installers, portable packages, AppImage,
  checksums, and an SBOM.
- `npm run validate:release` passes locally:
  - 51 test files;
  - 245 tests;
  - nine Chromium E2E scenarios;
  - lint, typecheck, build, roadmap consistency, and formatting all pass.
- Repository Markdown documentation is English-only and enforced by validation.
- Public `v4.0.0-rc.1` passed exact-source Windows and Linux package, visible launch, stable-v3
  upgrade, checksum, SBOM, and artifact readback gates from `a0d895c`.
- Stable `v4.0.0` passed the same exact-source gates from `b529636` and was independently read
  back from the public release before this plan was closed.

### Stable v3 prerequisite result

Stable `v3.0.0` was published on 2026-07-24 from `b8754dc` after exact-source validation,
Windows/Linux package and upgrade checks, AppImage visible-render smoke, checksum/SBOM readback,
and zero-open-Dependabot verification. The README and public wiki were read back in English.

No release may be blocked by candidate age, elapsed calendar time, a soak period, or an
observation period. Release decisions depend only on current test, security, migration, platform,
artifact, and open-finding evidence.

The prerequisite is complete. v4 release evidence is evaluated independently against its exact
source and artifacts.

### Product inconsistencies to fix

1. **Readiness has several competing definitions.**
   - `projectProgressService` treats title, category, condition, any price decision, and any
     generated listing as complete.
   - `coachEngine` always treats fewer than two approved realized comparables and a missing
     valuation as blocking, even when the seller has selected their own price.
   - `listingReadinessService` evaluates a different set of listing fields.
   - legacy `WorkflowStep` state is still hydrated and persisted alongside derived project
     progress.

   The UI can therefore say that a project is complete while the coach still reports blocking
   pricing work, or remove the listing task even when the complete package is still blocked.

2. **Category values are not normalized at all consumption boundaries.**
   - AI and user edits can produce arbitrary category strings.
   - `listingTemplateService` indexes a fixed category-label map with the raw string.
   - An unknown category can therefore produce `undefined` labels or tags in generated copy.

3. **Quick-start image intake bypasses the safer item-workspace rules.**
   - The item workspace enforces count, MIME type, 10 MiB size, HEIC rejection, and local
     assessment.
   - Quick start only limits the number of files. Drag-and-drop can read unsupported or very large
     files into memory without the same validation or assessment.

4. **The primary workspaces remain visually dense.**
   - `AnalyzePanel`, `ValuationPanel`, and `TemplatesPanel` are each roughly 400–500 lines.
   - `src/index.css` is roughly 1,300 lines.
   - The Item screenshot is a long sequence of fields with repeated provenance expanders.
   - The Listing screenshot exposes nearly every marketplace field before the preview and final
     action.

5. **Project management still uses browser-native prompts.**
   - Rename and destructive confirmations use `window.prompt` or `window.confirm`.
   - These interrupt the desktop experience and provide weaker accessibility and validation than
     in-app dialogs.

6. **The current E2E suite is valuable but narrow.**
   - Six browser scenarios cover the core offline path, accessibility basics, project management,
     conservative facts, comparables, and outcome recording.
   - Direct store coverage is missing for `useProjectStore`.
   - The current local review could not execute E2E because the environment could not download
     the Playwright browser. The failure occurred before application code ran.

## Top priority

Create one authoritative, derived project-readiness model and make the coach, workspace tabs,
project cards, listing copy gate, and completion status consume it.

This outranks a visual redesign or new AI features because the current app can give contradictory
guidance about whether optional valuation work is required. v4 should first make the product
truthful and predictable, then simplify how that truth is presented.

## Scope

### Included

- stable v3 prerequisite and security gate;
- unified derived readiness and next-action contracts;
- normalization of category-dependent behavior without discarding the original reviewed text;
- one shared image-intake pipeline;
- progressive item review;
- preview-first listing review;
- accessible dialogs and clearer project actions;
- targeted CSS/component organization required by the redesigned views;
- tests, migration compatibility, documentation, screenshots, packaging, and v4 RC/stable gates.

### Explicitly excluded

- marketplace scraping;
- automatic browser control or marketplace publishing;
- new marketplaces;
- new AI providers or an OpenAI runtime;
- accounts, cloud sync, payments, mobile, or web clients;
- automatic application updates;
- AI-generated final numeric prices;
- relaxing Electron sandbox, IPC, secret, or backup safeguards;
- a React, state-management, persistence, or Electron rewrite;
- HEIC conversion unless it can be added without a large native dependency or packaging risk;
- broad dependency upgrades unrelated to a verified v4 requirement.

Listing output remains Swedish for the supported Swedish marketplaces. UI language can remain
Swedish or English.

## Prerequisite G0 — Publish stable v3.0.0

### Objective and user value

Finish the already-built v3 release safely so v4 starts from a supported, reproducible baseline.

### Likely affected paths

- `package.json`
- `package-lock.json`
- `.ai/CODEX_ROADMAP.md`
- `.ai/ROADMAP.md`
- `CHANGELOG.md`
- `README.md`
- `docs/OFFLINE_ACCEPTANCE_TEST.md`
- `docs/releases/v3.0.0.md`
- `.github/workflows/release.yml` only if a verified gate defect is found

### Implementation tasks

1. Update the lockfile so `fast-uri >= 3.1.4` is resolved without unrelated dependency churn.
2. Run standard validation and the security dependency gate.
3. Run the documented offline acceptance path on a clean Windows install and a clean
   Linux/AppImage profile; record results and any RC findings. Duration is informational and is
   never a release gate.
4. If the RC is clean, change the version from `3.0.0-rc.1` to `3.0.0` and update release state,
   changelog, README, and release notes.
5. Run the full release validation, Windows/Linux packaging, upgrade checks, checksum generation,
   SBOM generation, and artifact readback.
6. Publish stable v3 only after every gate passes.

### Acceptance criteria

- `npm audit --audit-level=high` reports zero high or critical findings.
- `npm run validate:release` passes.
- The v2.0.1-to-v3.0.0 upgrade retains projects and settings on Windows and Linux.
- Clean Windows and Linux launches complete the six-action offline listing path.
- The public stable release contains the expected three binaries, checksums, and SBOM.
- v3 roadmaps and documentation agree that stable is published.

### Verification

```bash
npm ci
npm run validate
npm run validate:security-deps
npm run validate:release
npm run package:smoke -- linux release
npm run package:smoke -- windows release
```

Run the release workflow for the final cross-platform package and upgrade checks.

### Checkpoint

Commit only the minimal security fix first. Commit release metadata separately after all stable
gates pass.

Suggested commits:

```text
fix(deps): resolve fast-uri security advisory
release: publish v3.0.0 stable
```

## Phase 1 — One readiness and next-action model

### Objective and user value

Every screen agrees on what is required, optional, recommended, complete, and safe to copy.

### Likely affected paths

- `src/core/types/domain.ts`
- `src/core/services/projectProgressService.ts`
- `src/core/services/coachEngine.ts`
- `src/core/services/listingReadinessService.ts`
- `src/core/services/categoryProfileService.ts`
- `src/core/services/listingTemplateService.ts`
- `src/core/services/sellPlanService.ts`
- `src/core/store/useProjectStore.ts`
- `src/core/store/useWorkflowStore.ts`
- `src/features/projects/CoachPanel.tsx`
- `src/features/projects/WorkspaceTabs.tsx`
- `src/features/projects/ProjectDashboard.tsx`
- corresponding service, store, component, and E2E tests

### Implementation tasks

1. Introduce a derived `ProjectReadiness` contract with:
   - stage readiness for Item, Price, Listing, and Follow-up;
   - blocker, warning, improvement, and optional-research severities;
   - one ordered next action;
   - stable target section and field identifiers.
2. Make pricing path-aware:
   - a valid seller-entered price completes the required price stage;
   - approved comparables and evidence-based valuation remain optional research on that path;
   - the evidence-based path requires the existing minimum approved realized evidence;
   - no price remains a blocker for the complete structured package.
3. Make listing completion depend on the selected marketplace draft having no readiness blockers,
   not merely on a generated template existing.
4. Derive project cards, tabs, coach count, completion status, and copy eligibility from the same
   model.
5. Keep legacy workflow fields readable for backward compatibility, but stop using them as current
   UI truth. Remove them from new persistence only if a deterministic, idempotent migration and
   rollback test justify a schema update.
6. Normalize category-dependent behavior through `normalizeSellerCategory` before profiles,
   labels, sell plans, templates, and market queries consume it. Preserve the reviewed raw category
   text when data would otherwise be lost.
7. Add contract tests covering every pricing path and contradictory-state regression.

### Acceptance criteria

- A project with reviewed minimum facts, a seller-entered price, and a blocker-free listing does
  not show comparable or valuation work as blocking.
- The same project may show evidence-based valuation as optional, never as required.
- An evidence-based price cannot become ready without the current approved-realized-evidence gate.
- Generated-but-incomplete listing drafts do not mark the project complete.
- Unknown AI/user category strings generate a safe `General` fallback label and never output
  `undefined`.
- Coach, project card, active tab status, and copy gate return the same blocker count and next
  action.
- Existing schema 4 projects open without data loss.

### Verification

```bash
npm run test -- projectProgressService coachEngine listingReadinessService categoryProfileService listingTemplateService
npm run test -- useProjectStore useWorkflowStore
npm run typecheck
npm run validate
npm run test:e2e
```

### Checkpoint

Commit after the new readiness contract, consumers, compatibility behavior, and focused regressions
all pass.

Suggested commit:

```text
feat(v4): unify project readiness and next actions
```

## Phase 2 — Shared safe image intake

### Objective and user value

Images added during quick start behave exactly like images added later: safe limits, clear errors,
local quality feedback, and no silent bypass.

### Likely affected paths

- new `src/core/services/imageIntakeService.ts`
- `src/core/services/photoAssessmentService.ts`
- `src/features/projects/ProjectDashboard.tsx`
- `src/features/analyze/AnalyzePanel.tsx`
- `src/core/store/useValuationStore.ts`
- `src/locales/sv/common.json`
- `src/locales/en/common.json`
- focused unit, component, and E2E tests

### Implementation tasks

1. Extract count, MIME, extension, size, decode, and assessment rules into one service.
2. Return per-file accepted/rejected results with localized error codes.
3. Use the service from file picker and drag-and-drop in both quick start and Item.
4. Ensure quick-start images receive the same local assessment metadata.
5. Show previews, removal, accepted count, rejected filenames, and actionable errors before project
   creation.
6. Keep the current six-image and 10 MiB-per-image limits unless package and memory tests support a
   change.
7. Do not add HEIC conversion in this phase; show a clear supported-format message.

### Acceptance criteria

- Quick start cannot ingest unsupported, HEIC/HEIF, oversized, or seventh images.
- Drag-and-drop and picker produce identical results.
- One invalid file does not discard other valid files.
- Accepted images have stable indices and matching photo assessments after project creation,
  removal, save, close, and reopen.
- No file path or image bytes appear in diagnostics or logs.

### Verification

```bash
npm run test -- imageIntakeService photoAssessmentService
npm run test -- ProjectDashboard AnalyzePanel useValuationStore
npm run validate
npm run test:e2e
```

### Checkpoint

Suggested commit:

```text
feat(v4): unify and harden image intake
```

## Phase 3 — Focused Item workspace

### Objective and user value

The seller sees only the facts needed for the next decision, while provenance and advanced facts
remain available without dominating the page.

### Likely affected paths

- `src/features/analyze/AnalyzePanel.tsx`
- new focused components under `src/features/analyze/components/`
- `src/features/projects/CoachPanel.tsx`
- `src/features/workflow/SummarySidebar.tsx`
- `src/shared/components/SectionCard.tsx`
- new accessible disclosure/dialog components under `src/shared/components/`
- `src/index.css`, preferably split into feature-oriented CSS modules/files without changing the
  build stack
- locales, screenshots, component tests, and E2E

### Implementation tasks

1. Split the panel into:
   - description and photo summary;
   - required facts;
   - recommended facts;
   - advanced/provenance details.
2. Replace repeated “Why this suggestion?” rows with one provenance control per uncertain or
   changed fact, plus a compact review drawer.
3. Show the category-specific required checklist first and collapse completed/recommended detail.
4. Keep one primary action for the current state: identify, retry, or continue.
5. Move full-pipeline and low-frequency actions into secondary controls.
6. Keep seller-edited/locked facts authoritative across re-analysis.
7. Add a sticky compact project summary only where it does not reduce the usable form width.
8. Establish consistent spacing, typography, button hierarchy, focus states, error states, and
   reduced-motion behavior for later phases.

### Acceptance criteria

- The default Item view presents the next required task and required facts before advanced detail.
- Completed required sections collapse without hiding validation problems.
- Re-analysis never overwrites a locked seller correction.
- Keyboard users can reach every fact, provenance explanation, image action, and continue action in
  logical order.
- At 200% text zoom there is no horizontal page overflow.
- At 1440×900 the description, image summary, next action, and required-fact section are visible
  without traversing the full advanced form.

### Verification

```bash
npm run test -- AnalyzePanel CoachPanel
npm run test:e2e
npm run docs:screenshots
npm run validate
```

Perform manual Swedish and English UI review at 100%, 150%, and 200% scaling.

### Checkpoint

Suggested commit:

```text
feat(v4): focus the item review workspace
```

## Phase 4 — Preview-first Listing workspace

### Objective and user value

The seller can review and copy a marketplace-ready listing without first navigating every
advanced field.

### Likely affected paths

- `src/features/templates/TemplatesPanel.tsx`
- new focused components under `src/features/templates/components/`
- `src/core/store/useListingStore.ts`
- `src/core/services/listingDraftService.ts`
- `src/core/services/listingReadinessService.ts`
- `src/core/services/sitePolicyService.ts`
- `src/shared/components/` dialog and status components
- CSS, locales, tests, E2E, and screenshots

### Implementation tasks

1. Open on the recommended marketplace and show a preview-first layout.
2. Keep title, description, price, primary fulfillment, cover image, blockers, and final copy
   action in the primary view.
3. Move category, attributes, tags, disclosure, image order, and policy provenance into clearly
   named editable sections.
4. Surface blocker fixes as buttons that focus the exact field.
5. Replace ambiguous copy actions with:
   - one primary **Copy ready listing** action gated by unified readiness;
   - one clearly secondary **Copy text only** action labelled as incomplete when blockers remain.
6. Preserve untouched/user-edited ownership during regeneration.
7. Replace `window.confirm` for destructive text replacement with an accessible in-app dialog that
   names the fields that will be replaced.
8. Handle clipboard rejection with a recoverable localized error and manual-selection fallback.

### Acceptance criteria

- One recommended marketplace is shown by default; switching marketplace remains explicit.
- The primary view shows the final text, price, cover, blockers, and copy state without exposing
  every advanced field.
- The ready-copy action is disabled for missing price or any true blocker and enabled immediately
  after the final blocker is resolved.
- Regeneration preserves every user-edited field unless the explicit replacement dialog is
  accepted.
- Clipboard success and failure are announced accessibly.
- Marketplace policy metadata is rechecked before the v4 RC and records the source and checked
  date.

### Verification

```bash
npm run test -- listingDraftService listingReadinessService sitePolicyService useListingStore TemplatesPanel
npm run test:e2e
npm run docs:screenshots
npm run validate
```

### Checkpoint

Suggested commit:

```text
feat(v4): add preview-first listing review
```

## Phase 5 — Professional project library and recovery polish

### Objective and user value

Projects communicate real progress and next actions, while rename, archive, trash, restore, and
destructive operations feel native and remain recoverable.

### Likely affected paths

- `src/features/projects/ProjectDashboard.tsx`
- `src/features/projects/ProjectFollowUpPanel.tsx`
- `src/core/store/useProjectStore.ts`
- `src/core/services/projectRepository.ts`
- shared dialog/menu/status components
- CSS, locales, store/component tests, and E2E

### Implementation tasks

1. Show readiness stage, next action, last saved time, selected price, and marketplace state on each
   project card.
2. Replace separate rename/archive/remove buttons with an accessible overflow menu.
3. Replace `window.prompt` and `window.confirm` with validated in-app dialogs.
4. Keep removal recoverable, keep undo visible, and require explicit confirmation only for
   irreversible empty-trash.
5. Make home prioritization consume unified next-action priority instead of project-status order
   alone.
6. Add direct `useProjectStore` tests for operation failures, active-project updates, trash state,
   and concurrent UI operations.
7. Verify autosave and project switching under rapid edits and failed persistence.

### Acceptance criteria

- Home priority ordering follows actual next-action severity and age, not only coarse status.
- Rename validates empty/oversized input without leaving the application.
- Archive and trash actions do not accidentally open the project.
- Restore and undo return the exact project data, images, listing edits, and status.
- A save failure remains visible and retryable; switching projects never writes one draft into
  another project.
- All dialogs trap focus, restore focus on close, and work with Escape where safe.

### Verification

```bash
npm run test -- useProjectStore projectRepository ProjectDashboard ProjectFollowUpPanel
npm run test:e2e
npm run validate
```

### Checkpoint

Suggested commit:

```text
feat(v4): polish project actions and recovery
```

## Phase 6 — v4 release hardening

### Objective and user value

Ship v4 without losing v2/v3 data or weakening security, accessibility, or package reliability.

### Likely affected paths

- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `README.md`
- `USER_GUIDE.md`
- `SUPPORT.md`
- `.ai/CODEX_ROADMAP.md`
- `.ai/ROADMAP.md`
- `docs/OFFLINE_ACCEPTANCE_TEST.md`
- `docs/guides/**`
- `docs/screenshots/**`
- `docs/releases/v4.0.0-rc.1.md`
- release validation scripts and workflows only where verified changes are needed

### Implementation tasks

1. Add E2E coverage for:
   - own-price readiness with optional evidence;
   - evidence-based readiness;
   - unknown category fallback;
   - quick-start image rejection and recovery;
   - locked facts across re-analysis;
   - user-edited listing fields across regeneration;
   - clipboard failure;
   - rename/archive/trash/restore dialogs;
   - save failure and project switching.
2. Add migration/compatibility fixtures from v2.0.1 and v3.0.0.
3. Run accessibility checks on onboarding, home, Item, Price, Listing, Follow-up, Settings, and
   recovery states.
4. Refresh screenshots only through the dedicated screenshot command.
5. Update English repository documentation while preserving and testing Swedish and English UI
   behavior and documenting Swedish listing output.
6. Run security, package, visible-render, upgrade, checksum, SBOM, and publication gates.
7. Publish `v4.0.0-rc.1`, resolve any current P0/P1 findings, and publish stable v4.0.0 as soon as
   every evidence-based cross-platform and publication gate passes.

### Acceptance criteria

- `npm run validate:release` passes.
- No high or critical production or release-tool dependency finding remains.
- All E2E scenarios pass on CI Chromium.
- Windows installer/portable and Linux AppImage pass clean install, visible render, and v3 upgrade.
- Existing projects retain original facts, images, price decisions, user-edited listing fields,
  archive/trash state, and outcomes.
- Serious and critical axe violations are zero in all primary views.
- The six-action path remains no worse than v3 and no longer shows optional evidence as blocking.
- Public artifacts, checksums, and SBOM pass readback.

### Verification

```bash
npm ci
npm run validate
npm run test:e2e
npm run validate:security-deps
npm run validate:release
npm run dist
npm run package:smoke -- linux release
npm run package:smoke -- windows release
npm run sbom
npm run checksums
```

### Checkpoint

Use separate commits for release tests/documentation and the final version bump.

Suggested commits:

```text
test(v4): harden migration and seller-flow release gates
docs(v4): refresh focused workspace guidance
release: publish v4.0.0-rc.1
```

## Release gate

v4.0.0 is complete only when:

- no candidate age, elapsed-time, soak, or observation-period requirement is used;
- G0 stable v3 is published;
- unified readiness has no known contradictory state;
- own-price and evidence-based paths both pass focused unit and E2E coverage;
- quick-start and Item image intake share the same validated service;
- user edits and legacy projects survive regeneration and upgrade;
- all standard, E2E, accessibility, security, package, upgrade, checksum, SBOM, and publication
  gates pass;
- Windows and Linux exact-host package, visible-launch, and upgrade smoke tests pass;
- current release evidence confirms no open P0/P1 or high security finding.

## Risks and open decisions

### Real risks

- Changing derived readiness may make existing projects appear less or more complete. Tests must
  distinguish a presentation change from data loss.
- Removing legacy workflow truth too aggressively could break imported drafts. Prefer derived
  compatibility before a schema migration.
- Listing regeneration is high-risk because seller edits must remain authoritative.
- Image decoding and assessment can increase memory usage. Retain strict per-file and total-count
  limits and test sequential ingestion.
- CSS restructuring can create broad visual regressions. Keep behavior and visual changes in
  separate checkpoints where practical.
- Marketplace field policies may change before release and require primary-source re-verification.

### Decisions to make only if implementation evidence requires them

- Whether legacy workflow fields can be removed without a schema change. Default: keep them
  readable but stop using them as UI truth.
- Whether `General` fallback should retain the original category as a reviewed attribute for
  display. Default: preserve the raw text and derive `General` only for internal profiles/labels.
- Whether AppImage and Windows package size/memory allow future HEIC support. Default: defer.

## Work that should not be repeated

- Do not rebuild secure secret storage, backup/import, trash recovery, provider routing, valuation
  math, or release artifact generation unless a failing test proves a defect.
- Do not add another progress store or readiness score.
- Do not replace deterministic pricing with an AI-generated number.
- Do not add providers, marketplaces, cloud sync, publishing automation, or a framework rewrite to
  v4.
- Do not update all dependencies as part of the `fast-uri` security fix.

## Codex execution handoff

After this plan is approved, use Goal/direct implementation mode one phase at a time. Begin with
G0 and do not mix v4 feature work into the stable v3 release.

```text
Inspect the repository and follow SWEDISH_SECONDHAND_AI_V4_PLAN.md. Start with G0 and verify the
current repository and release state before changing code. Implement one phase at a time, preserve
existing behavior and all user changes, and keep unrelated dependency or formatting changes out.
Run the phase-specific checks and the required repository validation. Stop on conflicting evidence,
failed security/release gates, migration uncertainty, or any risk of overwriting seller-authored
facts or listing fields. After each completed phase, report the user-visible changes, files and
contracts changed, exact verification results, remaining risks, and the proposed commit message.
Do not commit, push, tag, publish, or open a pull request unless explicitly authorized.
```
