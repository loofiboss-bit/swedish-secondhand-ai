# Privacy

Swedish Secondhand AI is a local-first desktop app. Projects, images, reviewed facts, valuations,
listing drafts, settings, comparables, and outcome history remain in the local app profile unless
you explicitly use Gemini or Tradera.

The app has no account system, cloud sync, telemetry upload, automatic publishing, or background
marketplace scraping.

## Provider data

| Service | When data is sent                | Data sent                                            | Credential handling                           |
| ------- | -------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| Offline | Never                            | Nothing                                              | No credential                                 |
| Ollama  | When Ollama analysis is selected | Item text and up to three images over local loopback | No cloud credential                           |
| Gemini  | When Gemini analysis is selected | Item text and up to two supported original images    | API key in operating-system protected storage |
| Tradera | When you request market data     | A bounded search query and public App ID             | App key in operating-system protected storage |

Ollama connections are restricted to HTTP loopback on port `11434`. Tradera uses the fixed
official REST v4 endpoint and caches results locally for 24 hours. Blocket and Vinted are manual
copy workflows; the app does not connect to, scrape, or publish on either marketplace.

If protected storage is unavailable, Gemini and authenticated Tradera operations stay disabled.
Offline and Ollama remain available.

## Local analysis and history

Photo quality, duplicate detection, category checklists, coach actions, fact candidates, and
knowledge gaps are computed or stored locally. Photo assessment does not alter the original
image.

Publication dates, marketplace URLs, starting prices, outcomes, final prices, and sale duration
remain local. Price calibration uses only complete outcomes that you record on the device. It
requires at least five outcomes in the same category and is never uploaded.

## Backups

Backup format 3 contains live and trashed projects and can include project images. Compact backups
omit images. Backups exclude API keys, protected values, and secret status.

The current app imports formats 2 and 3. It validates the complete replacement before writing and
does not activate a partial dataset after a failed import. Read
[Back up, restore, and delete data](./docs/guides/BACKUP_AND_RECOVERY.md) before importing or
resetting data.

## Diagnostics

The safe diagnostic export contains app and platform versions, migration state, configured
provider status, and normalized error codes. It excludes project descriptions, listing text,
images, source URLs, and secrets.

Review any diagnostic file before sharing it. Diagnostics are not uploaded automatically.

## Deletion

Deleting a project moves it to recoverable trash. **Empty trash** permanently removes trashed
projects after explicit confirmation. Resetting local data does not necessarily delete protected
provider keys; remove those keys separately in Settings.

For security reports, follow [SECURITY.md](./SECURITY.md). For recovery help, follow
[SUPPORT.md](./SUPPORT.md).
