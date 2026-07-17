# AI Instructions — Swedish Secondhand AI

## Purpose

Build and maintain a local-first desktop app that:

- identifies secondhand items from text/images,
- estimates value in SEK,
- creates copy-ready listing templates for Tradera, Blocket, and Vinted.

## v3 product boundary

- Supported: Gemini, local Ollama, deterministic offline analysis, official Tradera comparables,
  local projects, and manual copy/export for Tradera, Blocket, and Vinted.
- Out of scope: accounts, cloud sync, scraping, browser or automatic marketplace publishing,
  payments, mobile or web clients, new AI runtimes, and automatic updates.

## Workflow

1. Plan
2. Implement one focused milestone or fix
3. Test the changed behavior
4. Validate with `npm run validate`
5. Update the affected product, user, support, and release documentation

## Standards

- TypeScript strict mode.
- Named exports.
- Keep dependencies flowing from platform/provider adapters to core services, Zustand stores, and
  features/components.
- Local persistence via idb-keyval.
- Keep secrets behind the Electron main-process boundary and out of renderer state, backups,
  diagnostics, logs, and snapshots.
