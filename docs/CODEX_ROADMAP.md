# Swedish Secondhand AI — Codex Implementation Roadmap

> Repository: `loofiboss-bit/swedish-secondhand-ai`  
> Target platforms: Windows and Linux desktop  
> Current baseline: v0.5.x  
> Target release: Public v1.0.0  
> Primary development method: Small, independently testable Codex milestones

---

## 1. Purpose

This roadmap turns Swedish Secondhand AI from a functional desktop MVP into a stable public product.

The roadmap is intentionally structured for Codex. Each milestone:

- has one primary objective;
- has explicit in-scope and out-of-scope work;
- should be implemented in its own branch or worktree;
- must remain independently testable and mergeable;
- must preserve user data;
- must pass the repository quality gate before completion.

Do not implement this entire roadmap in one task.

---

## 2. Product Direction

Swedish Secondhand AI should become a trustworthy Swedish desktop assistant for:

1. identifying secondhand items from text and images;
2. finding and reviewing comparable items;
3. producing explainable SEK valuation ranges;
4. generating marketplace-specific listing drafts;
5. tracking sale outcomes;
6. improving valuation confidence from real outcomes;
7. supporting multiple AI providers without coupling the product to one vendor.

The product should remain desktop-first until after v1.0.0.

---

## 3. Non-Negotiable Engineering Rules

Codex must follow these rules for every milestone.

### Architecture

- Keep the existing direction: `Services -> Stores -> Features/Components`.
- UI components must not contain persistence, secret-management, or provider SDK logic.
- Zustand stores coordinate state but must not become provider-specific.
- Provider-specific code must remain inside provider adapters.
- Core valuation logic must remain deterministic and testable.
- LLM output must never directly become trusted application state without validation.
- LLM output must not independently determine the final price.
- Prefer incremental migration over rewrites.

### Scope control

- Implement one milestone at a time.
- Do not mix unrelated refactors into feature work.
- Do not reformat unrelated files.
- Do not update all dependencies during a feature milestone.
- Do not change user-visible behavior unless the milestone explicitly requires it.
- Do not add a backend, mobile app, cloud account system, or payment system before v1.0.0.

### Security

- API keys must not be exposed to the renderer.
- Secrets must never be written to logs, snapshots, diagnostics, or error messages.
- IPC messages must use explicit channels and validated payloads.
- Keep Electron security controls enabled:
  - `contextIsolation: true`
  - `sandbox: true`
  - `nodeIntegration: false`
- Do not weaken Electron security for convenience.

### Data compatibility

- Existing settings, drafts, history, and sale outcomes are user data.
- Persisted schema changes require versioned migrations.
- Migration failures must not silently delete user data.
- New fields require safe defaults.
- Migration behavior must have tests.

### Quality gate

Before completing a milestone:

```bash
npm run validate
```

Codex must report:

- files changed;
- behavior changed;
- tests added or updated;
- exact commands run;
- exact pass/fail result;
- known limitations;
- deferred work;
- unrelated issues discovered but intentionally left unchanged.

---

## 4. Recommended Codex Workflow

For each milestone:

1. Start from a clean and updated `main`.
2. Create a dedicated branch or Git worktree.
3. Read:
   - `AGENTS.md`
   - this roadmap
   - `.ai/ROADMAP.md`
   - `README.md`
   - relevant source and test files
4. Use Plan mode before implementation.
5. Compare the roadmap against the actual repository.
6. Refine the task into an exact implementation plan.
7. Implement only the selected milestone.
8. Run focused tests during development.
9. Run `npm run validate`.
10. Review the final diff.
11. Run a dedicated Codex review.
12. Fix only confirmed issues.
13. Run validation again.
14. Commit only after the milestone is complete.

Recommended model usage:

| Work | Model | Reasoning |
|---|---|---|
| Architecture planning | GPT-5.6 Sol | Extra High |
| Normal milestone implementation | GPT-5.6 Sol | High |
| Mechanical tests/docs/refactors | GPT-5.6 Terra | Medium or High |
| Security boundary changes | GPT-5.6 Sol | Extra High |
| Final milestone review | GPT-5.6 Sol | High |

---

# Release Sequence

```text
v0.6.0  Multi-provider AI foundation
v0.7.0  Valuation intelligence and trust
v0.8.0  AI listing studio
v0.9.0  Public beta and release engineering
v1.0.0  Stable public release
```

---

# v0.6.0 — Multi-Provider AI Foundation

## Release objective

Replace the current Gemini/Ollama-specific flow with a provider-neutral AI architecture that supports:

- OpenAI;
- Google Gemini;
- Ollama;
- OpenAI-compatible endpoints.

Preserve existing user-visible behavior until each provider migration is complete.

---

## Milestone 0.6.1 — Provider Contracts

### Goal

Introduce provider-neutral contracts without changing runtime behavior.

### Inspect first

At minimum inspect:

- `src/core/types/`
- `src/core/services/itemAnalysisService.ts`
- `src/core/services/ollamaAnalysisProvider.ts`
- `src/core/services/settingsService.ts`
- `src/core/store/useSettingsStore.ts`
- `src/core/store/useValuationStore.ts`
- related tests

### In scope

Create a provider-neutral AI contract covering:

- provider identifiers;
- provider capabilities;
- item-analysis request;
- item-analysis response;
- listing-generation request;
- listing-generation response;
- comparable-review request;
- comparable-review response;
- provider health status;
- typed provider errors;
- cancellation and timeout context.

Suggested structure:

```text
src/core/ai/
├── contracts/
│   ├── AiProvider.ts
│   ├── AiCapabilities.ts
│   ├── AiRequests.ts
│   ├── AiResponses.ts
│   └── AiErrors.ts
├── AiProviderRegistry.ts
└── index.ts
```

Suggested provider IDs:

```ts
export type AiProviderId =
  | 'openai'
  | 'gemini'
  | 'ollama'
  | 'openai-compatible';
```

### Out of scope

- No OpenAI implementation.
- No provider SDK migration.
- No UI redesign.
- No IPC changes.
- No secret migration.
- No valuation changes.
- No listing-generation changes.

### Required tests

- Registry returns a registered provider.
- Duplicate registration behavior is deterministic.
- Unknown provider produces a typed error.
- Capability lookup is deterministic.
- Contract types do not leak provider SDK types.
- Existing tests remain unchanged and passing.

### Definition of done

- Provider-neutral contracts compile.
- Registry behavior is tested.
- No user-visible behavior changes.
- No current provider is removed.
- `npm run validate` passes.

### Rollback point

This milestone must be removable without affecting current provider behavior.

---

## Milestone 0.6.2 — Gemini Adapter Migration

### Goal

Move existing Gemini item analysis behind the new provider contract.

### In scope

- Create a Gemini provider adapter.
- Move Gemini-specific SDK calls out of `itemAnalysisService`.
- Keep current prompt behavior initially.
- Keep current image limits initially.
- Map Gemini errors to normalized provider errors.
- Validate parsed output before returning it.
- Keep the selected model configurable through provider configuration.
- Add Gemini contract tests with mocked SDK behavior.

Suggested structure:

```text
src/core/ai/providers/gemini/
├── GeminiProvider.ts
├── GeminiConfig.ts
├── GeminiResponseParser.ts
└── GeminiProvider.test.ts
```

### Out of scope

- Do not add new Gemini features.
- Do not change valuation behavior.
- Do not redesign settings.
- Do not move secrets across process boundaries yet.
- Do not remove fallback heuristics yet.

### Required tests

- Text-only analysis.
- Image and text analysis.
- Missing API key.
- Invalid JSON response.
- Partial structured response.
- Timeout.
- Authentication failure.
- Rate-limit failure.
- Existing Gemini behavior regression coverage.

### Definition of done

- `itemAnalysisService` no longer imports the Gemini SDK.
- Gemini is selected through the provider registry.
- Existing Gemini behavior is preserved.
- `npm run validate` passes.

---

## Milestone 0.6.3 — Ollama Adapter Migration

### Goal

Move Ollama analysis behind the same provider contract.

### In scope

- Create an Ollama provider adapter.
- Move Ollama-specific request logic into the adapter.
- Normalize model and base URL configuration.
- Add capability reporting.
- Add connection testing.
- Normalize timeout, network, model-not-found, and invalid-response errors.
- Preserve current local fallback behavior where appropriate.

Suggested structure:

```text
src/core/ai/providers/ollama/
├── OllamaProvider.ts
├── OllamaConfig.ts
├── OllamaResponseParser.ts
└── OllamaProvider.test.ts
```

### Out of scope

- No automatic model downloads.
- No Ollama process management.
- No local model recommendation engine.
- No broad settings redesign.

### Required tests

- Healthy local endpoint.
- Unreachable endpoint.
- Missing model.
- Invalid response.
- Text-only model behavior.
- Vision-capable model behavior.
- Timeout and cancellation.
- Current Ollama regression behavior.

### Definition of done

- Gemini and Ollama use the same provider contract.
- Stores do not branch on provider-specific implementation details.
- `npm run validate` passes.

---

## Milestone 0.6.4 — OpenAI Provider

### Goal

Add official OpenAI API support for item analysis.

### In scope

- Add the official OpenAI SDK.
- Implement text and image item analysis.
- Use structured output with schema validation.
- Support configurable model IDs.
- Add provider capabilities.
- Add timeout and cancellation.
- Normalize authentication, rate-limit, network, model, and schema errors.
- Add a connection test that does not expose the API key.
- Add mocked provider tests.

Suggested structure:

```text
src/core/ai/providers/openai/
├── OpenAiProvider.ts
├── OpenAiConfig.ts
├── OpenAiSchemas.ts
├── OpenAiResponseParser.ts
└── OpenAiProvider.test.ts
```

### Constraints

- Do not call OpenAI directly from React components.
- Do not store the API key in Zustand.
- Do not add ChatGPT account login.
- Do not describe ChatGPT Plus or Pro as API access.
- Do not let the model return an unvalidated `ItemFingerprint`.
- Do not use OpenAI to calculate the final price.

### Required tests

- Text-only analysis.
- Image analysis.
- Structured response validation.
- Missing required fields.
- Unknown optional fields.
- Authentication failure.
- Rate limit.
- Timeout.
- Cancellation.
- Unsupported model.
- Safe fallback behavior.

### Definition of done

- OpenAI is selectable through the provider registry.
- Provider errors are normalized.
- No SDK type leaks outside the adapter.
- `npm run validate` passes.

---

## Milestone 0.6.5 — OpenAI-Compatible Provider

### Goal

Support user-configured OpenAI-compatible endpoints.

### In scope

- Configurable base URL.
- Configurable model ID.
- Optional API key.
- Capability configuration.
- Connection test.
- Structured output compatibility handling.
- Clear errors when an endpoint does not support required features.

### Constraints

- Do not assume every compatible endpoint supports vision.
- Do not assume structured output works identically everywhere.
- Do not silently downgrade capabilities.
- Display capability limitations clearly.

### Required tests

- Endpoint with authentication.
- Endpoint without authentication.
- Vision unsupported.
- Structured output unsupported.
- Invalid base URL.
- Model not found.
- Timeout.
- Compatible successful response.

### Definition of done

- Custom compatible endpoints work without provider-specific changes elsewhere.
- Capability limitations are explicit.
- `npm run validate` passes.

---

## Milestone 0.6.6 — Provider Router and Fallback Policy

### Goal

Centralize provider selection and optional fallback behavior.

### In scope

- Add an AI router service.
- Resolve the selected provider through the registry.
- Support user-enabled fallback ordering.
- Never fallback after authentication or invalid-key errors.
- Allow fallback after temporary availability errors only.
- Track which provider produced a result.
- Return normalized diagnostics without secrets.

Suggested structure:

```text
src/core/ai/
├── AiRouter.ts
├── AiFallbackPolicy.ts
└── AiRouter.test.ts
```

### Required tests

- Primary provider success.
- Temporary primary failure and enabled fallback.
- Disabled fallback.
- Authentication failure does not fallback.
- Cancellation stops the chain.
- Provider identity is preserved in result metadata.

### Definition of done

- Provider selection logic is outside stores and UI.
- Fallback behavior is explicit and tested.
- `npm run validate` passes.

---

## Milestone 0.6.7 — Electron Secret and IPC Boundary

### Goal

Move provider secrets and AI execution out of renderer-accessible storage.

### Inspect first

- `electron/main.cjs`
- `electron/preload.cjs`
- renderer settings persistence
- current API call locations
- logging behavior
- test setup

### In scope

- Define explicit IPC channels for:
  - provider configuration status;
  - secret update;
  - secret deletion;
  - connection test;
  - item analysis.
- Validate every IPC payload.
- Validate sender/frame origin where applicable.
- Execute cloud-provider calls in the main process.
- Store secrets using an OS-backed or Electron-appropriate protected mechanism.
- Keep only non-secret provider preferences in renderer persistence.
- Migrate existing stored keys safely.
- Remove migrated plaintext keys only after successful migration.
- Add sanitized logs.
- Add migration and IPC tests.

Suggested bridge:

```ts
window.desktop.ai.getProviderStatus()
window.desktop.ai.updateSecret(...)
window.desktop.ai.deleteSecret(...)
window.desktop.ai.testConnection(...)
window.desktop.ai.analyzeItem(...)
```

### Constraints

- Never expose raw keys through the preload API.
- Do not expose a generic unrestricted IPC invoke method.
- Do not log request headers.
- Do not silently delete old secrets if migration fails.
- Keep Ollama local endpoint support functional.
- Preserve current drafts and history.

### Required tests

- Valid IPC request.
- Invalid payload.
- Unauthorized or invalid sender.
- Secret configured status.
- Secret update and deletion.
- Successful migration.
- Failed migration rollback.
- No secret in diagnostics.
- Renderer cannot read the raw secret.

### Definition of done

- Cloud API keys are no longer stored in IndexedDB.
- Renderer cannot access raw provider secrets.
- Existing users are migrated safely.
- `npm run validate` passes.

### Mandatory review

Run a dedicated security-focused Codex review before merging.

---

## Milestone 0.6.8 — Provider Settings and Onboarding

### Goal

Expose the new provider architecture through a clear user interface.

### In scope

- Provider selector.
- Model profile selector:
  - Fast
  - Balanced
  - High quality
  - Custom
- Custom model field.
- OpenAI-compatible base URL.
- Masked secret configuration state.
- Test connection action.
- Capability display.
- Fallback toggle and ordering.
- Provider-specific help text.
- Swedish and English translations.
- Migration status messaging.

### Constraints

- Never display a previously saved secret.
- Do not label API configuration as ChatGPT login.
- Keep advanced options collapsed by default.
- Do not make a successful connection test mandatory for local offline use.

### Required tests

- Provider selection.
- Secret configured/not configured status.
- Model profile changes.
- Custom model.
- Invalid base URL.
- Connection test states.
- Translation keys.
- Existing settings migration.

### Definition of done

- All four providers can be configured.
- Configuration errors are understandable.
- Secrets remain hidden.
- `npm run validate` passes.

---

## Milestone 0.6.9 — v0.6 Stabilization

### Goal

Complete the multi-provider release without expanding scope.

### In scope

- Integration tests across provider selection.
- E2E tests for settings and analysis.
- Error recovery.
- Draft preservation during provider failure.
- Documentation.
- Changelog.
- Provider troubleshooting guide.
- Release notes.

### Required validation

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run format:check
npm run validate
```

### Release gate

- No raw keys in renderer persistence.
- No provider SDK imports in stores or feature components.
- Provider failures do not lose drafts.
- Gemini and Ollama behavior has regression coverage.
- OpenAI and compatible endpoints have mocked contract coverage.
- All validation passes.

---

# v0.7.0 — Valuation Intelligence and Trust

## Release objective

Improve valuation quality and remove misleading fallback behavior.

---

## Milestone 0.7.1 — Versioned Domain Model

### Goal

Create a versioned product fingerprint that supports category-specific evidence.

### In scope

- Version `ItemFingerprint`.
- Add provenance metadata for important fields.
- Add structured defects.
- Add included and missing accessories.
- Add verification state.
- Add category-specific attribute profiles.
- Add migration for existing drafts and history.

Suggested concepts:

```ts
type FieldSource =
  | 'user'
  | 'ai'
  | 'image'
  | 'comparable'
  | 'unknown';

interface SourcedValue<T> {
  value: T;
  source: FieldSource;
  confidence?: number;
}
```

### Required category profiles before v1.0

- Electronics
- Fashion
- Furniture
- Collectibles
- General fallback

### Out of scope

- No category-specific UI redesign beyond required editing fields.
- No new marketplace integration.

### Definition of done

- Existing records migrate.
- New records preserve field provenance.
- Category attributes validate.
- `npm run validate` passes.

---

## Milestone 0.7.2 — User Correction Workflow

### Goal

Allow users to correct AI analysis before valuation.

### In scope

- Editable title, category, brand, model, and condition.
- Editable category attributes.
- Editable defects.
- Editable accessories.
- Visible field source.
- Mark user-edited fields as authoritative.
- Prevent later AI reruns from silently overwriting locked fields.

### Required tests

- Edit and save fields.
- Lock user-corrected fields.
- Reanalysis preserves locked values.
- Draft resume preserves edits.
- History preserves final corrected fingerprint.

### Definition of done

- The user can correct every price-relevant field.
- Corrections survive app restart.
- `npm run validate` passes.

---

## Milestone 0.7.3 — Comparable Query Builder

### Goal

Generate better comparable searches from verified product data.

### In scope

- Build multiple ranked search queries.
- Prefer exact model and variant.
- Add category-specific terms.
- Exclude obvious accessory-only or parts-only terms where relevant.
- Preserve a human-readable explanation for each query.

### AI role

AI may suggest query variants, but deterministic rules must:

- validate query length;
- deduplicate queries;
- preserve verified identifiers;
- reject hallucinated model identifiers.

### Definition of done

- Exact-model searches rank first.
- Generated queries are visible to the user.
- Tests cover multiple categories.
- `npm run validate` passes.

---

## Milestone 0.7.4 — Comparable Relevance Engine

### Goal

Improve inclusion and weighting of comparable items.

### In scope

Calculate relevance from:

- exact model;
- variant;
- category;
- condition;
- included accessories;
- listing age;
- sold versus active status;
- shipping inclusion;
- complete item versus spare part;
- bundle versus single item.

Add:

- include/exclude control;
- exclusion reason;
- normalized relevance score;
- source-quality score;
- user override.

### AI role

AI may classify semantic similarity and explain differences. Deterministic rules remain authoritative for:

- impossible prices;
- missing required identifiers;
- explicit spare-part language;
- user exclusions.

### Definition of done

- Users can inspect why a comparable was included.
- Users can exclude bad comparables.
- Excluded comparables never affect price.
- `npm run validate` passes.

---

## Milestone 0.7.5 — Remove Universal Condition Fallback

### Goal

Remove the current generic condition-only price anchor.

### Replacement order

When exact comparables are unavailable:

1. same model history;
2. same product family;
3. same brand and category;
4. same category and attribute profile;
5. user sale history;
6. insufficient evidence.

### Required result state

Add an explicit result such as:

```ts
type ValuationStatus =
  | 'ready'
  | 'low-confidence'
  | 'insufficient-evidence';
```

### Constraints

- Do not fabricate a recommended price.
- Do not return a precise range from condition alone.
- Keep a clear explanation of missing evidence.

### Definition of done

- No category uses a universal condition-only SEK anchor.
- Insufficient evidence is handled as a normal state.
- `npm run validate` passes.

---

## Milestone 0.7.6 — Weighted Valuation Model

### Goal

Calculate explainable prices from relevant evidence.

### In scope

- Weighted comparable prices.
- Median and percentile range.
- Outlier detection.
- Recency adjustment.
- Condition adjustment.
- Accessory adjustment.
- Shipping normalization.
- Pricing strategy multiplier.
- Confidence decomposition.
- Human-readable rationale.

### Constraints

- Keep calculations deterministic.
- Every adjustment must be testable.
- Every adjustment must be visible in the result explanation.
- AI must not directly set the numeric result.

### Definition of done

- Result includes min, recommended, max, confidence, status, and rationale.
- Used comparables are recorded.
- Adjustments are explainable.
- `npm run validate` passes.

---

## Milestone 0.7.7 — Calibration and Benchmark Suite

### Goal

Measure valuation quality and prevent regression.

### In scope

Create versioned benchmark fixtures containing:

- item facts;
- category;
- approved comparables;
- rejected comparables;
- expected range;
- actual sold price when available.

Track:

- median absolute percentage error;
- percentage of sold prices inside suggested range;
- false comparable inclusion;
- false comparable exclusion;
- result by category;
- result by provider-assisted versus deterministic path.

Suggested path:

```text
tests/fixtures/valuation-benchmark/
```

### Definition of done

- Benchmark can run locally and in CI.
- Results are reproducible.
- Threshold regressions fail tests or produce an explicit quality report.
- `npm run validate` passes.

---

## Milestone 0.7.8 — v0.7 Stabilization

### Release gate

- Universal fallback removed.
- User correction implemented.
- Comparable inclusion is explainable.
- Insufficient evidence is supported.
- Benchmark baseline documented.
- Data migrations tested.
- All validation passes.

---

# v0.8.0 — AI Listing Studio

## Release objective

Replace basic static listing templates with controlled AI-assisted listing generation.

---

## Milestone 0.8.1 — Verified Listing Facts

### Goal

Create a trusted fact model separate from generated copy.

Suggested model:

```ts
interface ListingFacts {
  title: string;
  brand?: string;
  model?: string;
  category: string;
  condition: ConditionGrade;
  defects: string[];
  includedAccessories: string[];
  missingAccessories: string[];
  attributes: Record<string, string>;
  pickupAvailable: boolean;
  shippingOptions: string[];
  testedState: 'tested' | 'partially-tested' | 'untested' | 'unknown';
}
```

### Rules

- Generated text may rephrase facts.
- Generated text may not add new facts.
- Defects may not be removed.
- Untested items may not be described as fully working.
- Authenticity may not be claimed without verified evidence.

### Definition of done

- Listing facts are reviewable before generation.
- Fact validation is tested.
- `npm run validate` passes.

---

## Milestone 0.8.2 — Marketplace Profile Registry

### Goal

Replace hardcoded marketplace behavior with profiles.

### Profiles before v1.0

- Tradera
- Blocket
- Vinted
- Facebook Marketplace
- Generic listing

Suggested contract:

```ts
interface MarketplaceProfile {
  id: MarketplaceSite;
  displayName: string;
  titleLimit: number;
  descriptionRules: DescriptionRule[];
  supportedFields: MarketplaceField[];
  shippingGuidance: string[];
}
```

### Constraints

- Manual copy/export only.
- No scraping.
- No direct publishing.
- No browser automation.

### Definition of done

- Marketplace rules are data-driven.
- Existing three marketplaces preserve current behavior.
- `npm run validate` passes.

---

## Milestone 0.8.3 — AI Listing Generation

### Goal

Generate marketplace-specific copy from verified facts.

### User controls

- Short, normal, detailed.
- Neutral or persuasive.
- Fast sale or maximum value.
- Pickup or shipping.
- Private or professional style.
- Swedish or English.
- Multiple headline variants.

### Required safeguards

- Structured generated response.
- Fact consistency validation.
- Defect preservation.
- Platform title limits.
- Prohibited unsupported claims.
- Fallback to deterministic template if AI generation fails.

### Definition of done

- All generated listings pass fact validation.
- Provider failure returns a usable deterministic draft.
- `npm run validate` passes.

---

## Milestone 0.8.4 — Section-Level Regeneration and Editing

### Goal

Allow controlled editing without regenerating the entire listing.

### In scope

- Regenerate title only.
- Shorten description.
- Make text more neutral.
- Improve structure.
- Rewrite shipping paragraph.
- Lock manually edited sections.
- Compare previous and new version.
- Undo last AI operation.

### Definition of done

- Locked sections are preserved.
- Every AI edit can be reviewed before replacement.
- Undo works across the current session.
- `npm run validate` passes.

---

## Milestone 0.8.5 — Image Quality Assistant

### Goal

Provide useful image guidance without changing images.

### In scope

Detect or estimate:

- low resolution;
- blur;
- duplicate images;
- poor lighting;
- missing main angle;
- missing label/model-number image;
- missing defect image;
- missing accessory image.

### Constraints

- Do not automatically alter user images.
- Do not claim certainty for subjective image-quality judgments.
- Keep image processing bounded and memory-safe.

### Definition of done

- Image guidance is actionable.
- Analysis failure does not block listing creation.
- `npm run validate` passes.

---

## Milestone 0.8.6 — Listing Quality Report

### Goal

Combine deterministic policy checks with AI-assisted review.

### Report sections

- Blocking issues.
- Missing facts.
- Marketplace-rule issues.
- Possible unsupported claims.
- Language improvements.
- Optional style suggestions.
- Publish-readiness status.

### Definition of done

- Blocking issues are deterministic where possible.
- AI suggestions are clearly labeled as suggestions.
- Current quality score behavior is migrated and tested.
- `npm run validate` passes.

---

## Milestone 0.8.7 — v0.8 Stabilization

### Release gate

- Generated copy cannot silently invent product facts.
- Existing manual templates remain available.
- All marketplace exports work.
- AI editing supports undo.
- Drafts survive generation failures.
- All validation passes.

---

# v0.9.0 — Public Beta and Release Engineering

## Release objective

Make the application installable, updateable, diagnosable, secure, and supportable for external beta users.

---

## Milestone 0.9.1 — First-Run Onboarding

### In scope

- Language.
- AI mode.
- Provider setup.
- Connection test.
- Local versus cloud explanation.
- Image-sharing disclosure.
- History preference.
- Example workflow.

### Definition of done

- New users can complete setup without reading external documentation.
- Setup can be skipped and reopened.
- `npm run validate` passes.

---

## Milestone 0.9.2 — Persisted Data Versioning

### In scope

- Version settings.
- Version drafts.
- Version history.
- Version provider preferences.
- Add migration framework.
- Add backup before destructive migrations.
- Add migration recovery.

### Definition of done

- Upgrade paths from v0.5, v0.6, v0.7, and v0.8 fixtures are tested.
- Failed migrations do not silently discard data.
- `npm run validate` passes.

---

## Milestone 0.9.3 — Backup, Import, and Reset

### In scope

- Export application data as JSON.
- Import validated backup.
- Reject unsupported or corrupt backup.
- Selective or full reset.
- Clear explanation of what will be deleted.
- Preserve secrets separately from normal export.

### Definition of done

- Export/import round trip is tested.
- Secrets are not included by default.
- Reset requires explicit confirmation.
- `npm run validate` passes.

---

## Milestone 0.9.4 — Diagnostics and Privacy

### Diagnostics may include

- app version;
- operating system;
- selected provider;
- configured model ID;
- sanitized error codes;
- last pipeline stage;
- validation status.

### Diagnostics must not include

- API keys;
- authorization headers;
- raw images;
- full listing text without explicit consent;
- personal data from marketplace listings.

### Definition of done

- Diagnostic export is useful for support.
- Secret scanning tests cover diagnostic output.
- Privacy documentation matches actual behavior.
- `npm run validate` passes.

---

## Milestone 0.9.5 — Electron Security Hardening

### In scope

- Content Security Policy.
- Navigation restrictions.
- New-window restrictions.
- External URL allowlist.
- IPC sender validation.
- Payload validation.
- Minimal preload surface.
- Electron fuses where appropriate.
- Dependency audit.
- Secure production protocol or equivalent safe loading strategy.

### Definition of done

- Security review has no unresolved high-severity findings.
- Renderer has no Node access.
- Unexpected navigation is blocked.
- `npm run validate` passes.

### Mandatory review

Run a separate security review task with high reasoning.

---

## Milestone 0.9.6 — CI Matrix

### Required workflows

```text
validate.yml
package-windows.yml
package-linux.yml
release.yml
```

### Validate workflow

- lint;
- typecheck;
- unit tests;
- integration tests;
- production build;
- formatting check.

### Windows workflow

- clean install;
- build NSIS;
- build portable;
- smoke test;
- upload artifacts.

### Linux workflow

- clean install;
- build AppImage;
- smoke test;
- upload artifacts.

### Definition of done

- Pull requests run validation.
- Release builds run on supported operating systems.
- Artifacts are reproducible enough to troubleshoot.
- `npm run validate` passes locally.

---

## Milestone 0.9.7 — Release Pipeline and Updates

### In scope

- Version/tag validation.
- GitHub Release creation.
- Windows and Linux artifacts.
- SHA-256 checksums.
- Release notes.
- Stable and beta channels.
- Automatic update support where reliable.
- Manual update path for unsupported package type.

### Constraints

- Do not silently install updates.
- Do not break portable builds.
- Failed update checks must not affect normal app use.

### Definition of done

- A release tag produces complete downloadable artifacts.
- Update checks can distinguish stable and beta.
- Checksums are published.
- `npm run validate` passes.

---

## Milestone 0.9.8 — Documentation and Support Surface

### Required files

- `README.md`
- `USER_GUIDE.md`
- `SECURITY.md`
- `PRIVACY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- provider setup guides;
- troubleshooting guide;
- known limitations;
- bug report template;
- feature request template.

### Definition of done

- Fresh users can install and configure the app.
- Provider errors have documented troubleshooting.
- Security reporting instructions exist.
- `npm run validate` passes.

---

## Milestone 0.9.9 — Public Beta Gate

Public beta can start only when:

- no known data-loss bug exists;
- provider failures do not crash the application;
- draft recovery works after restart;
- upgrade migrations preserve user data;
- Windows installer works on a clean machine;
- Linux AppImage works on a clean supported distribution;
- API keys do not appear in renderer storage or logs;
- core user flows have Playwright coverage;
- privacy and security documentation exist;
- all CI jobs pass.

---

# v1.0.0 — Stable Public Release

## Release objective

Stabilize the public beta. Do not add major new architecture or product areas.

---

## Milestone 1.0.1 — Beta Feedback Triage

### In scope

- Reproduce reported issues.
- Classify severity.
- Fix P0 and P1 issues.
- Fix high-frequency P2 usability issues.
- Document unsupported cases.

### Out of scope

- New platform.
- New backend.
- New provider unless required to fix compatibility.
- Major UI redesign.

---

## Milestone 1.0.2 — Performance and Reliability

### Focus areas

- image memory usage;
- large draft handling;
- startup time;
- provider cancellation;
- retry behavior;
- history search;
- migration time;
- update recovery;
- renderer responsiveness.

### Definition of done

- No known unbounded image-memory path.
- Long provider requests are cancellable.
- Large history datasets remain usable.
- `npm run validate` passes.

---

## Milestone 1.0.3 — Accessibility and UX Completion

### In scope

- Keyboard navigation.
- Focus handling.
- Screen-reader labels.
- Contrast review.
- Clear loading states.
- Clear empty states.
- Actionable error messages.
- Consistent Swedish terminology.
- English translation completeness.

### Definition of done

- Core flow is keyboard usable.
- Important controls have accessible names.
- Main error states are recoverable.
- `npm run validate` passes.

---

## Milestone 1.0.4 — Final Security and Data Review

### Required checks

- secret storage;
- IPC surface;
- log sanitization;
- update channel;
- dependency vulnerabilities;
- backup/import validation;
- migration safety;
- CSP and navigation;
- provider data disclosures.

### Release blocker

Any unresolved high-severity security or data-loss issue blocks v1.0.0.

---

## Milestone 1.0.5 — Final Release

### v1.0 feature set

#### AI providers

- OpenAI
- Gemini
- Ollama
- OpenAI-compatible

#### Valuation

- category-aware fingerprint;
- user corrections;
- explainable comparable scoring;
- deterministic weighted valuation;
- insufficient-evidence state;
- sale-outcome calibration;
- benchmark baseline.

#### Listings

- verified fact model;
- AI-assisted marketplace copy;
- deterministic fallback templates;
- Tradera;
- Blocket;
- Vinted;
- Facebook Marketplace;
- generic export;
- quality report.

#### Product quality

- secure secret storage;
- migrations;
- backup/import;
- diagnostics;
- hardened Electron shell;
- Windows packages;
- Linux AppImage;
- update channel;
- complete documentation.

### Final release gates

- No open P0 issue.
- No open P1 issue in a core flow.
- Upgrade from public beta is tested.
- Drafts and history survive update.
- Install and uninstall are tested.
- All providers fail safely.
- Benchmark baseline is documented.
- Privacy and security docs are current.
- Release artifacts and checksums are generated automatically.
- All validation and CI jobs pass.

---

# Explicitly Deferred Until After v1.0

Do not implement these items as part of this roadmap unless the roadmap is intentionally revised:

- iOS application;
- Android application;
- cloud synchronization;
- user accounts;
- managed AI credits;
- subscription payments;
- shared inventories;
- team collaboration;
- web application;
- automatic marketplace publishing;
- Blocket scraping;
- Vinted scraping;
- browser automation for listing publication;
- social features;
- large visual redesign;
- plugin marketplace;
- many additional AI vendors.

---

# Suggested Post-v1.0 Roadmap

## v1.1 — Workflow Expansion

- Batch item analysis.
- Inventory mode.
- CSV export.
- More category profiles.
- Advanced image guidance.
- Anthropic provider evaluation.

## v1.2 — Marketplace Intelligence

- Price monitoring.
- Market trend reporting.
- Time-to-sale estimates.
- Suggested price reductions.
- Seasonal effects.
- Local price differences.

## v2.0 — Managed Cloud

Only after the desktop product is proven:

- accounts;
- cloud sync;
- managed API usage;
- subscriptions;
- shared inventories;
- web and mobile clients.

---

# Codex Task Template

Use this template for each milestone.

```text
Read AGENTS.md, .ai/CODEX_ROADMAP.md, .ai/ROADMAP.md, README.md,
and all source and test files relevant to Milestone <ID>.

Goal:
Implement Milestone <ID>: <TITLE>.

Before editing:
1. Inspect the current implementation.
2. Compare the roadmap assumptions against the actual code.
3. Identify any material mismatch.
4. Produce an exact implementation plan.
5. Do not expand the scope beyond this milestone.

Constraints:
- Follow the service -> store -> feature architecture.
- Preserve existing behavior unless explicitly changed by the milestone.
- Preserve settings, drafts, history, and sale outcomes.
- Do not add unrelated refactors.
- Do not weaken tests or Electron security.
- Do not expose secrets to the renderer.
- Do not let AI directly determine final valuation prices.
- Do not add production dependencies without justification.

Implementation:
1. Make the smallest coherent change.
2. Add or update tests.
3. Run focused tests during development.
4. Run npm run validate.
5. Inspect the final diff for unrelated changes.
6. Perform a milestone-specific review.

Definition of done:
- All milestone acceptance criteria are met.
- Required tests exist and pass.
- npm run validate passes.
- No unrelated files changed.
- Known limitations are documented.

Final report:
- Summary.
- Files changed and why.
- Behavior changed.
- Tests added or updated.
- Exact commands and results.
- Acceptance criteria status.
- Known limitations.
- Deferred work.
- Unrelated issues discovered but not changed.
```

---

# Progress Tracking

Update this section only when a milestone is merged.

## v0.6.0

- [ ] 0.6.1 Provider Contracts
- [ ] 0.6.2 Gemini Adapter Migration
- [ ] 0.6.3 Ollama Adapter Migration
- [ ] 0.6.4 OpenAI Provider
- [ ] 0.6.5 OpenAI-Compatible Provider
- [ ] 0.6.6 Provider Router and Fallback Policy
- [ ] 0.6.7 Electron Secret and IPC Boundary
- [ ] 0.6.8 Provider Settings and Onboarding
- [ ] 0.6.9 v0.6 Stabilization

## v0.7.0

- [ ] 0.7.1 Versioned Domain Model
- [ ] 0.7.2 User Correction Workflow
- [ ] 0.7.3 Comparable Query Builder
- [ ] 0.7.4 Comparable Relevance Engine
- [ ] 0.7.5 Remove Universal Condition Fallback
- [ ] 0.7.6 Weighted Valuation Model
- [ ] 0.7.7 Calibration and Benchmark Suite
- [ ] 0.7.8 v0.7 Stabilization

## v0.8.0

- [ ] 0.8.1 Verified Listing Facts
- [ ] 0.8.2 Marketplace Profile Registry
- [ ] 0.8.3 AI Listing Generation
- [ ] 0.8.4 Section-Level Regeneration and Editing
- [ ] 0.8.5 Image Quality Assistant
- [ ] 0.8.6 Listing Quality Report
- [ ] 0.8.7 v0.8 Stabilization

## v0.9.0

- [ ] 0.9.1 First-Run Onboarding
- [ ] 0.9.2 Persisted Data Versioning
- [ ] 0.9.3 Backup, Import, and Reset
- [ ] 0.9.4 Diagnostics and Privacy
- [ ] 0.9.5 Electron Security Hardening
- [ ] 0.9.6 CI Matrix
- [ ] 0.9.7 Release Pipeline and Updates
- [ ] 0.9.8 Documentation and Support Surface
- [ ] 0.9.9 Public Beta Gate

## v1.0.0

- [ ] 1.0.1 Beta Feedback Triage
- [ ] 1.0.2 Performance and Reliability
- [ ] 1.0.3 Accessibility and UX Completion
- [ ] 1.0.4 Final Security and Data Review
- [ ] 1.0.5 Final Release
