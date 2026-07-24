# Security policy

## Supported versions

Security fixes are applied to the current public v1 beta/stable line. Development snapshots and
older v0.x builds should be upgraded before reporting behavior already corrected on the current
line.

## Reporting a vulnerability

Use the repository's private GitHub Security Advisory reporting flow. Do not open a public issue
for raw API keys, backup contents, or an unpatched vulnerability. Include affected version,
platform, minimal reproduction, expected impact, and whether protected storage was available.
Never include a real provider credential.

## v1 security boundary

- Electron uses context isolation, sandboxing, disabled Node integration, narrow preload methods,
  validated IPC, blocked navigation/new windows, and a restrictive CSP.
- Gemini and Tradera secrets live behind operating-system protected storage. Cloud features stop
  when that storage is unavailable; local Ollama and offline behavior remain usable.
- Credential-bearing calls, redirects, response size/schema, deadlines, and operation frequency
  are constrained in the main process.
- Backups exclude secrets and are validated completely before atomic import.

Keep the operating system and app current, review generated facts, and revoke provider keys if a
device profile may be compromised.
