# Support and recovery

## First checks

1. Record app version, operating system, selected AI mode, and public provider status. Do not copy
   API keys.
2. Retry offline mode to separate local workflow issues from provider/network issues.
3. Confirm Ollama listens on `http://localhost:11434` when local AI is selected.
4. Export a non-secret backup before resetting data when the app can still open.

## Data recovery

The Backup and data recovery panel can export all non-secret datasets, import selected datasets,
reset selected datasets, or reset all non-secret data. Import validates the whole file before
writing anything. Restart the app after an import or reset.

A v0.5/current-main payload is treated as schema 1 and migrated once to the schema 2 envelope.
Re-reading schema 2 is idempotent. Corrupt or unsupported data is rejected and is not overwritten
automatically. Provider keys are separate from backups and dataset reset.

## Getting help

Use a GitHub issue for reproducible non-security bugs. Include sanitized steps, version, platform,
and whether the problem survives offline mode. Use the private process in `SECURITY.md` for
security or credential concerns.
