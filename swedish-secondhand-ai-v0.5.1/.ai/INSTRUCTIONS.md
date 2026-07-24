# AI Instructions — Swedish Secondhand AI

## Purpose

Build and maintain a local-first desktop app that:

- identifies secondhand items from text/images,
- estimates value in SEK,
- creates copy-ready listing templates for Tradera, Blocket, and Vinted.

## Non-goals (MVP)

- No scraping.
- No direct publishing APIs.
- No cloud accounts/sync.

## Workflow

1. Plan
2. Implement
3. Test
4. Validate (`npm run validate`)
5. Document (`CHANGELOG.md`, `README.md`)

## Standards

- TypeScript strict mode.
- Named exports.
- Service singleton pattern.
- Local persistence via idb-keyval.
