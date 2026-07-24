# Support and recovery

## First checks

1. Open **Settings → Backup and data recovery** and export **safe diagnostics**. It contains only
   version, platform, migration/provider status and normalized error codes.
2. Retry in offline mode to separate a local workflow issue from provider or network access.
3. If Ollama is selected, confirm it is running at the configured local address.
4. Export a compact or full non-secret backup before resetting data.

Never paste API keys, listing text, project descriptions, images or private marketplace URLs into
a public issue.

## Schema 4 migration

The first v3 start migrates schema 3 projects deterministically to schema 4. Existing numeric
valuations become evidence-based price decisions; other projects remain unset. The schema 3
source stays as rollback data until the schema 4 write and readback are verified. Corrupt or
unsupported input opens recovery and is not overwritten.

## Restore projects

**Delete** moves a project to trash and offers **Undo**. Open **Projects → Trash** to restore it
later. Nothing is removed automatically. **Empty trash** is the only permanent project deletion
and always requires explicit confirmation.

## Backup and import

Format 3 backups contain live and trashed projects; compact backups omit images. Secrets are
excluded. Formats 2 and 3 can be imported. The complete selected replacement is validated before
any data is committed. Restart the app after import or reset.

## Provider failures

Use the connection test shown for Gemini, Ollama or Tradera. Authentication failures require a
new protected key; unavailable services can be retried or bypassed by continuing offline. A
provider failure must not discard the active draft.

## Getting help

Use a GitHub issue for reproducible non-security bugs and attach the safe diagnostic JSON plus
sanitized reproduction steps. Use the private process in `SECURITY.md` for credential or security
concerns.
