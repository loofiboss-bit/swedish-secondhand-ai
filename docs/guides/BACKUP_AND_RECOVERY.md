# Back up, restore, and delete data

Export a backup before upgrading, importing another backup, resetting the profile, or emptying
trash.

## Choose a backup

Open **Settings → Backup and data recovery**.

- A full format-3 backup includes live projects, trashed projects, and project images.
- A compact format-3 backup includes the same project records but omits images.
- Both types exclude Gemini and Tradera keys and other protected secrets.

Store the file somewhere outside the app profile. Check that it has a plausible size before
changing or deleting local data.

## Import

The current app accepts backup formats 2 and 3. Import validates the complete replacement before
committing it. If validation fails, the app does not activate a partial dataset.

1. Export a fresh backup of the current profile.
2. Select the backup to import.
3. Read the replacement summary and confirm the intended file.
4. Let validation and import finish without closing the app.
5. Restart the app, then check projects, trash, images, and settings.

Provider keys are not imported. Configure them again through Settings.

## Recover a deleted project

**Delete** moves a project to trash and shows **Undo**. You can also open **Projects → Trash** and
restore it later. Archiving does not move a project to trash.

Trash is never cleared on a timer. **Empty trash** permanently deletes every project in trash and
requires explicit confirmation. Back up first if any project might be needed later.

## Schema migration

The first v3 start migrates schema-3 projects to schema 4. Existing numeric valuations become
evidence-based price decisions; other projects retain no chosen price. The app keeps the verified
schema-3 source as rollback data until the new write and readback succeed.

Corrupt or unsupported input opens recovery and is not overwritten. Export what the recovery view
allows, keep the original profile unchanged, and attach only safe diagnostics to a public issue.

## Reset

A reset removes selected local app data. It does not necessarily remove provider secrets from
operating-system protected storage. Remove Gemini and Tradera keys through Settings before a full
cleanup if you also want those credentials deleted.

For a failed import or migration, follow [Troubleshooting](./TROUBLESHOOTING.md) and preserve the
original backup and profile until the issue is understood.
