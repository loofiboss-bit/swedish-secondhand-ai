# Security policy

## Supported versions

Security fixes target the current public v3 release-candidate or stable line and the latest
maintenance release needed for supported upgrades. Older v0.x and v1 builds should be upgraded.
Reproduce a v2 issue on the latest v2 maintenance build or v3 release candidate when possible.

The latest public package is listed on the
[GitHub Releases page](https://github.com/loofiboss-bit/swedish-secondhand-ai/releases).

## Report a vulnerability privately

Use the repository's
[private vulnerability reporting](https://github.com/loofiboss-bit/swedish-secondhand-ai/security/advisories/new)
flow. Do not open a public issue for an unpatched vulnerability, credential, backup content, or
private marketplace data.

Include:

- affected app version and package type;
- operating system and version;
- a minimal reproduction using test data;
- expected impact and required user interaction;
- whether operating-system protected storage was available.

Never include a real provider credential. Revoke any credential used during accidental exposure.

## Security boundary

- Electron uses context isolation, sandboxing, disabled Node integration, narrow preload methods,
  validated IPC, blocked navigation and new windows, and a restrictive content security policy.
- Gemini and Tradera secrets stay behind the main-process boundary in operating-system protected
  storage. The renderer receives configured or not-configured status, never the saved secret.
- Cloud operations stop when protected storage is unavailable. Offline mode and local Ollama
  remain usable.
- Credential-bearing requests have fixed destinations, bounded payloads and responses, deadlines,
  schema validation, and operation-rate limits.
- Numeric valuation requires explicit user-approved realized comparables. Insufficient evidence
  produces no numeric price.
- Backups exclude secrets and imports validate the full replacement before committing it.
- Safe diagnostics exclude user text, images, source URLs, and secrets.

## Download safety

Release packages include `SHA256SUMS.txt` and a CycloneDX software bill of materials. Verify the
checksum before running a download. Windows packages are not code-signed, so a valid checksum is
especially important.

Keep the operating system and app current. Review every generated fact and listing before use.
See [Install and update](./docs/guides/INSTALLATION.md) for verification commands.
