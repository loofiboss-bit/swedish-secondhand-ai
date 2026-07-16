# Privacy

Swedish Secondhand AI is a local-first desktop application. Preferences, drafts, history,
manual comparables, reviewed facts, valuations, and listing templates are stored on the local
device. These datasets use versioned records so upgrades can validate and migrate them before
use.

## Provider data

- **Gemini:** when selected, item text and at most two supported original images are sent to Google. The key
  remains in operating-system protected storage and is used only by the Electron main process.
- **Ollama:** requests are restricted to HTTP loopback on port `11434`.
- **Offline:** deterministic analysis does not send item content to an AI provider.
- **Tradera:** a bounded query plus the non-secret App ID is sent to the fixed official REST v4 API
  only when requested. The App key stays in the Electron main process. Results are cached locally
  for 24 hours to reduce external requests.
- **Blocket and Vinted:** v1 creates copy-ready text only. It does not scrape or publish.

Photo quality measurements, perceptual duplicate hashes, category checklists, coach actions, fact
candidates, and knowledge gaps are computed or stored locally. Photo assessment does not alter an
image. Ollama receives at most three images only when it is selected; offline mode receives none.

Publication URLs, dates, asking prices, outcomes, final prices, and sale duration remain inside the
local project database and backup. Local learning uses only complete user-recorded outcomes on the
device, requires at least five outcomes in the matching category, and is never uploaded.

## Backups and diagnostics

Backup format 2 contains selected non-secret datasets, app version, export time, and optionally
project images. Compact exports explicitly omit images. It never contains API keys, protected
values, or secret status. Legacy format-1 imports remain supported. Imports are fully validated
before replacement is committed, with rollback of legacy datasets if project replacement fails.

Diagnostics retain at most 100 local entries and sanitize credential-shaped values, sensitive
keys, errors, large strings, and deep data. Diagnostics are not uploaded automatically.

Resetting local data does not delete protected provider keys unless the user removes those keys
separately in Settings.
