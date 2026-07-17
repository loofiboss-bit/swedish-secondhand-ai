# Install and update

The public release provides Windows x64 and Linux x64 packages. Download only from the
[GitHub Releases page](https://github.com/loofiboss-bit/swedish-secondhand-ai/releases).

The current build is `v3.0.0-rc.1`, a release candidate. Back up your projects before installing
it over an older version.

## Verify the download

Download `SHA256SUMS.txt` with the app package. On Linux, run this in the download directory:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

The selected AppImage should report `OK`.

On Windows, open PowerShell in the download directory:

```powershell
Get-FileHash .\Swedish-Secondhand-AI-3.0.0-rc.1-windows-x64-setup.exe -Algorithm SHA256
```

Compare the result with the matching line in `SHA256SUMS.txt`. Do not open the file if the values
differ.

## Windows

Choose one package:

- `windows-x64-setup.exe` installs shortcuts and lets you choose the install directory.
- `windows-x64-portable.exe` runs without an installer.

The packages are not code-signed, so Windows may show a SmartScreen warning. Verify the checksum
first and continue only if the file came from this repository's release page and the hash matches.

## Linux

Make the AppImage executable, then run it:

```bash
chmod +x ./Swedish-Secondhand-AI-3.0.0-rc.1-linux-x86_64.AppImage
./Swedish-Secondhand-AI-3.0.0-rc.1-linux-x86_64.AppImage
```

Move the AppImage to a stable folder before creating your own launcher. The app does not install
or update itself.

## Upgrade

1. Export a full backup from **Settings → Backup and data recovery**.
2. Close the old app.
3. Install or open the new package.
4. Confirm that the Projects view contains the expected items and images.
5. Keep the backup until you have verified the upgrade.

The first v3 start migrates v2 schema-3 projects to schema 4. The app keeps verified rollback data
and opens recovery instead of activating an invalid partial migration.

## Uninstall

Removing the executable or installed program may leave the local app profile in place. Export a
backup before removing app data manually. Deleting the local profile is permanent and does not
necessarily remove provider keys from operating-system protected storage.

For upgrade or startup problems, use [Troubleshooting](./TROUBLESHOOTING.md).
