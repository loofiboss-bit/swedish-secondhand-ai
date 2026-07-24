# AGENTS.md — Swedish Secondhand AI

## Project

Swedish Secondhand AI is a desktop-first valuation and listing assistant for Swedish secondhand markets.

### Current stack

- React 18
- TypeScript
- Vite
- Electron
- Zustand
- IndexedDB through `idb-keyval`
- Vitest
- Playwright
- npm

### Supported platforms

- Windows
- Linux

### Product direction

The application should become a stable public desktop product before mobile, cloud accounts, subscriptions, or managed AI credits are considered.

The implementation roadmap is:

```text
docs/CODEX_ROADMAP.md
```

Codex must implement one roadmap milestone at a time.

---

## Sources of Truth

Before making changes, read the relevant files in this order:

1. `AGENTS.md`
2. `docs/CODEX_ROADMAP.md`
3. `.ai/ROADMAP.md`
4. `README.md`
5. `USER_GUIDE.md`, when user-facing behavior is affected
6. `package.json`
7. relevant source files
8. relevant tests
9. relevant GitHub Actions workflows

If the roadmap and the actual repository differ, report the mismatch before making broad changes.

Do not blindly implement assumptions from the roadmap when the code has already changed.

---

## Core Architecture

The intended dependency direction is:

```text
Provider adapters / platform services
                ↓
          Core services
                ↓
          Zustand stores
                ↓
     Features and components
```

### Responsibilities

#### Provider adapters

Provider-specific code belongs only in provider adapters.

Examples:

- OpenAI SDK calls
- Gemini SDK calls
- Ollama HTTP calls
- OpenAI-compatible endpoint handling
- provider-specific response parsing
- provider-specific error mapping

Provider SDK types must not leak into stores, UI components, or general domain types.

#### Core services

Core services contain business logic.

Examples:

- item analysis orchestration
- provider routing
- comparable normalization
- valuation calculation
- listing generation
- marketplace rules
- persistence coordination
- migrations

Use service singletons where the project already follows that pattern.

#### Zustand stores

Stores coordinate application state and service calls.

Stores must not:

- call provider SDKs directly;
- contain secret-management logic;
- contain raw IPC implementation details;
- implement valuation mathematics;
- contain marketplace-specific rendering logic.

#### Features and components

React components should handle:

- rendering;
- user input;
- calling store actions;
- local presentation state;
- accessibility behavior.

Components must not contain:

- API keys;
- provider SDK calls;
- persistence implementation;
- direct database access;
- unrestricted IPC calls;
- valuation algorithms.

---

## Change Management

### One milestone at a time

Implement exactly one roadmap milestone per branch or worktree.

Do not combine:

- provider architecture;
- security migration;
- UI redesign;
- valuation changes;
- dependency upgrades;
- release engineering;

unless the selected milestone explicitly requires them together.

### Keep changes independently mergeable

Every milestone must:

- compile independently;
- have its own tests;
- pass validation;
- preserve the application outside its stated scope;
- provide a clear rollback point.

### Avoid unrelated changes

Do not:

- reformat unrelated files;
- rename unrelated symbols;
- reorganize folders without a milestone requirement;
- update all dependencies during feature work;
- modify lockfiles unless dependencies intentionally change;
- replace working systems with broader rewrites;
- add speculative abstractions without a current use.

### Preserve current behavior

Unless explicitly required by the milestone:

- preserve current user-visible behavior;
- preserve keyboard shortcuts;
- preserve drafts;
- preserve history;
- preserve settings;
- preserve sale outcomes;
- preserve Windows and Linux packaging.

---

## AI Provider Architecture

### Supported provider direction

The roadmap targets:

- OpenAI
- Google Gemini
- Ollama
- OpenAI-compatible endpoints

Additional providers must not be added before the roadmap explicitly includes them.

### Provider-neutral contracts

Core code must depend on provider-neutral contracts.

Provider contracts should cover:

- provider ID;
- capabilities;
- configuration;
- item analysis;
- listing generation;
- comparable review;
- health checks;
- cancellation;
- timeout;
- normalized errors.

### Model configuration

Do not spread hardcoded model IDs throughout the repository.

Model IDs must be:

- configurable;
- resolved through provider configuration;
- isolated from general business logic;
- testable without network access.

Model profiles may map to provider-specific model IDs.

Examples:

```text
fast
balanced
high-quality
custom
local
```

### Structured model output

LLM responses must be:

1. parsed;
2. schema validated;
3. normalized;
4. checked before entering application state.

Never trust provider output solely because it is valid JSON.

Reject or normalize:

- missing required fields;
- unsupported enum values;
- impossible confidence values;
- unknown condition grades;
- invalid marketplace IDs;
- unsupported claims;
- malformed numeric values.

### AI and valuation

AI may help with:

- item identification;
- query generation;
- semantic comparable classification;
- explanation;
- listing copy;
- missing-information detection.

AI must not independently determine the final valuation price.

Final valuation must remain deterministic and based on:

- comparable data;
- explicit adjustments;
- outlier handling;
- pricing strategy;
- historical calibration;
- visible confidence logic.

### Provider fallback

Fallback must be explicit and user-controlled.

Do not fallback after:

- invalid API key;
- authentication failure;
- explicit cancellation;
- invalid user configuration.

Fallback may be considered after:

- temporary provider outage;
- timeout;
- rate limiting;
- transient network failure;

only when enabled by the user and allowed by the milestone.

---

## Electron Security

The current secure defaults must remain enabled:

```js
contextIsolation: true;
sandbox: true;
nodeIntegration: false;
```

Do not weaken these settings.

### Renderer restrictions

The renderer must not access:

- raw provider secrets;
- Node.js APIs;
- filesystem APIs;
- unrestricted Electron IPC;
- arbitrary shell commands;
- unrestricted external URLs.

### Preload bridge

Expose only narrow, typed capabilities.

Good:

```ts
window.desktop.ai.testConnection(...)
window.desktop.ai.analyzeItem(...)
window.desktop.secrets.update(...)
```

Bad:

```ts
window.electron.invoke(channel, payload);
window.desktop.exec(command);
window.desktop.readFile(path);
```

### IPC rules

Every IPC handler must:

- use an explicit channel;
- validate payloads;
- validate expected types;
- validate sender or frame where applicable;
- return normalized errors;
- avoid returning secrets;
- avoid logging sensitive payloads.

### Navigation and external links

Production Electron code must:

- block unexpected navigation;
- restrict new windows;
- use an allowlist for external URLs;
- avoid loading arbitrary remote content;
- use a Content Security Policy;
- keep the preload surface minimal.

### Secrets

API keys must never be:

- stored in Zustand;
- stored in normal renderer IndexedDB;
- displayed after saving;
- written to logs;
- included in diagnostics;
- included in test snapshots;
- included in backup exports by default;
- committed to the repository.

The renderer may receive only secret status such as:

```ts
{
  configured: true;
}
```

It must not receive the raw value.

### Secret migration

When moving existing keys:

1. read the old value;
2. store it securely;
3. verify secure storage succeeded;
4. remove the old plaintext value;
5. preserve the old value if migration fails;
6. record only a non-sensitive migration status.

Never silently discard a key.

---

## Persistence and Data Compatibility

Persisted user data includes:

- settings;
- drafts;
- images stored in drafts;
- history;
- valuations;
- generated listings;
- sale status;
- sold prices;
- provider preferences.

Treat persisted data as production user data.

### Schema changes

Any persisted schema change requires:

- a version number;
- a migration function;
- migration tests;
- safe defaults;
- failure handling;
- backward-compatibility consideration.

### Migration rules

A migration must:

- be deterministic;
- avoid data loss;
- preserve unknown safe fields where possible;
- handle partial data;
- handle corrupt records gracefully;
- avoid infinite retry loops;
- report failure clearly.

Do not delete old data until the new representation is successfully written and verified.

### Draft safety

Provider errors, app restarts, or failed migrations must not silently remove an active draft.

### Backup and import

Backup exports must not include secrets by default.

Imported data must be validated before replacing current data.

---

## Valuation Rules

### Evidence first

Valuation should prioritize:

1. exact model comparables;
2. product-family comparables;
3. brand and category history;
4. category and attribute matches;
5. user sale outcomes;
6. insufficient-evidence state.

### No universal condition-only price

Do not introduce or preserve a generic fallback that assigns a price based only on condition across unrelated categories.

When evidence is insufficient, return an explicit state rather than fabricated precision.

Example:

```ts
type ValuationStatus = 'ready' | 'low-confidence' | 'insufficient-evidence';
```

### Explainability

Every valuation should make it possible to determine:

- which comparables were used;
- which were excluded;
- why they were included or excluded;
- what adjustments were applied;
- how confidence was calculated;
- why the selected pricing strategy changed the result.

### User authority

User-corrected product facts must not be silently overwritten by a later AI analysis.

User exclusions of comparables must be respected.

---

## Listing Generation Rules

### Verified facts first

AI-generated listings must derive from a verified fact model.

Generated copy may:

- rephrase;
- improve structure;
- adapt tone;
- fit marketplace limits.

Generated copy must not:

- invent accessories;
- remove defects;
- claim testing that did not happen;
- claim authenticity without evidence;
- change product specifications;
- hide missing parts;
- imply warranties not provided by the user.

### Deterministic validation

Marketplace constraints should be validated deterministically where possible.

Examples:

- title length;
- required fields;
- unsupported tags;
- price format;
- missing condition;
- missing defect disclosure.

### Fallback

If AI listing generation fails, preserve or generate a deterministic usable template.

A provider failure must not destroy the user's current draft.

### Marketplace scope

Before v1.0, marketplace work is manual copy/export only.

Do not implement:

- scraping;
- automatic publishing;
- browser automation;
- credential collection for marketplaces.

---

## Error Handling

Use typed, normalized errors for recoverable failures.

Useful categories include:

- authentication;
- rate limit;
- timeout;
- cancellation;
- network;
- unsupported capability;
- model not found;
- invalid response;
- schema validation;
- persistence;
- migration;
- IPC validation.

User-facing errors should:

- be understandable;
- suggest an action;
- avoid provider internals where unnecessary;
- never expose secrets;
- preserve current work.

Do not swallow failures silently.

Do not convert every failure into an empty successful result.

---

## Logging and Diagnostics

Logs may include:

- app version;
- provider ID;
- model ID;
- operation name;
- timing;
- normalized error code;
- pipeline stage.

Logs must not include:

- API keys;
- authorization headers;
- raw image data;
- full prompts containing user data;
- complete listing descriptions without consent;
- private marketplace data;
- filesystem paths containing sensitive user information where avoidable.

Diagnostic exports must be sanitized and tested.

---

## Dependencies

Before adding a production dependency:

1. confirm the platform or existing dependencies cannot reasonably solve the problem;
2. explain why the dependency is needed;
3. evaluate maintenance status;
4. evaluate bundle impact;
5. evaluate security impact;
6. add only the minimal package required.

Do not add dependencies only to avoid writing a small, testable utility.

Do not update unrelated dependency versions during feature work.

---

## Testing

### General rules

Every behavior change requires tests.

Prefer:

- unit tests for deterministic logic;
- contract tests for provider adapters;
- integration tests for service/store flows;
- migration tests for persisted data;
- Playwright tests for core user workflows.

Do not:

- delete tests to make a change pass;
- weaken assertions without justification;
- replace real behavior assertions with snapshots only;
- mock the exact implementation under test;
- claim completion while validation fails.

### Provider tests

Provider tests must not require real paid API calls in normal CI.

Use mocks, fixtures, or local deterministic test doubles.

Test at minimum:

- successful response;
- invalid response;
- authentication failure;
- timeout;
- cancellation;
- rate limit;
- unsupported model or capability;
- schema validation.

### Migration tests

Each migration must test:

- valid previous version;
- partial previous version;
- missing optional fields;
- corrupt record;
- migration failure;
- idempotent retry where required.

### Security tests

Security-sensitive milestones should test:

- IPC payload rejection;
- secret non-disclosure;
- diagnostic sanitization;
- renderer access restrictions;
- navigation blocking where practical.

---

## Validation Commands

During development, run the smallest relevant tests first.

Before completion, run:

```bash
npm run validate
```

The repository quality gate currently includes:

- lint;
- typecheck;
- unit tests;
- production build;
- formatting check.

When the milestone affects E2E behavior, also run:

```bash
npm run test:e2e
```

When the milestone affects packaging or Electron behavior, run the relevant platform build or smoke test where available.

Never report a command as passing unless it was actually run and passed.

---

## Documentation

Update documentation when behavior changes.

Potentially affected files include:

- `README.md`
- `USER_GUIDE.md`
- `docs/CODEX_ROADMAP.md`
- `.ai/ROADMAP.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `PRIVACY.md`
- provider setup guides
- troubleshooting documentation

Do not mark a roadmap checkbox complete before the milestone is merged and validated.

Do not document planned behavior as already implemented.

---

## Git and Repository Hygiene

### Before editing

- inspect `git status`;
- understand current branch or worktree;
- avoid overwriting unrelated user changes;
- inspect recent relevant commits when needed.

### During implementation

- keep the diff focused;
- avoid generated files unless required;
- do not commit local secrets;
- do not modify release artifacts manually;
- do not stage unrelated changes.

### Completion

A milestone should result in one coherent commit or a small logical commit series.

Commit messages should describe intent, for example:

```text
feat(ai): add provider-neutral contracts
refactor(ai): migrate Gemini behind provider adapter
feat(ai): add OpenAI item analysis provider
security(electron): move provider secrets behind IPC boundary
test(valuation): add comparable relevance benchmark
```

Do not commit automatically unless the user explicitly asks.

---

## Codex Planning Requirements

Before implementing a milestone, produce a plan containing:

- current-state summary;
- roadmap mismatch analysis;
- exact files to create;
- exact files to modify;
- interfaces to introduce or change;
- persisted-data impact;
- tests to add or update;
- rollback point;
- acceptance criteria;
- explicit out-of-scope list.

If a requested milestone is too broad for an independently mergeable patch, split it before implementation.

Do not start broad edits while important architecture questions remain unresolved.

---

## Required Final Report

Every completed milestone must end with:

### Summary

What was implemented.

### Files changed

Each changed file and why.

### Behavior changed

User-visible and internal behavior changes.

### Tests

Tests added or updated.

### Commands run

Exact commands and exact results.

### Acceptance criteria

Each criterion marked as:

- passed;
- not passed;
- not applicable.

### Known limitations

Current limitations that remain.

### Deferred work

Work intentionally left for later milestones.

### Unrelated issues discovered

Problems found but not changed because they were outside scope.

### Validation status

Explicitly state whether:

```bash
npm run validate
```

passed.

Do not claim the milestone is complete if required validation is failing.

---

## Prohibited Work Before v1.0

Unless the roadmap is intentionally revised, do not implement:

- iOS;
- Android;
- web application;
- user accounts;
- cloud synchronization;
- managed AI credits;
- subscriptions;
- payment systems;
- team collaboration;
- automatic marketplace publishing;
- Blocket scraping;
- Vinted scraping;
- browser automation for publishing;
- large visual redesign;
- social features;
- plugin marketplace;
- speculative support for many extra AI vendors.

---

## Definition of Done

A roadmap milestone is done only when:

- scope matches the selected milestone;
- architecture rules are followed;
- persisted data remains safe;
- secrets remain protected;
- required tests exist;
- tests pass;
- `npm run validate` passes;
- E2E or packaging validation is run when applicable;
- documentation is current;
- final diff contains no unrelated changes;
- limitations and deferred work are reported;
- the user has reviewed the result before merge.
