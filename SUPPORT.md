# Support and recovery

Start with the [troubleshooting guide](./docs/guides/TROUBLESHOOTING.md). Preserve your projects
before reinstalling, resetting, importing, or clearing the local app profile.

## First checks

1. Export a full backup from **Settings → Backup and data recovery**.
2. Export safe diagnostics and review the JSON before sharing it.
3. Retry the same action in Offline mode.
4. If a provider is selected, use its connection test in Settings.
5. Record the app version, package type, operating system, and exact steps.

Never post API keys, backup files, listing text, project descriptions, images, private URLs, or
unpatched security details in a public issue.

## Restore projects

Deleting a project moves it to trash and offers **Undo**. Open **Projects → Trash** to restore it
later. Nothing is removed automatically. **Empty trash** is permanent and always requires
confirmation.

Backup format 3 includes live and trashed projects; compact backups omit images. Import accepts
formats 2 and 3 and validates the full replacement before committing it. Secrets are excluded
from every backup.

Follow [Back up, restore, and delete data](./docs/guides/BACKUP_AND_RECOVERY.md) before import or
reset.

## Upgrade and migration recovery

The first v3 start migrates schema-3 projects to schema 4. The schema-3 source remains as rollback
data until the schema-4 write and readback are verified. Corrupt or unsupported input opens
recovery and is not overwritten.

If an upgrade or import fails, stop changing the local data. Keep the original app profile and
backup, export safe diagnostics, and report the exact version transition.

## Provider failures

Use the connection test for Gemini, Ollama, or Tradera. Authentication failures require a valid
credential. An unavailable provider can be retried or bypassed with Offline mode when the action
does not require market data. A provider failure should not discard the active draft.

Read [Providers and market data](./docs/guides/PROVIDERS.md) for setup and data flow.

## Open an issue

Use a [GitHub issue](https://github.com/loofiboss-bit/swedish-secondhand-ai/issues) for a
reproducible non-security bug. Include sanitized reproduction steps, expected and actual behavior,
app and operating-system versions, package type, and the reviewed safe diagnostic JSON.

Use the private process in [SECURITY.md](./SECURITY.md) for credential exposure or a possible
vulnerability.
