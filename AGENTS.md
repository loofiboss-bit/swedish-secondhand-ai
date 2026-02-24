# AGENTS.md — Swedish Secondhand AI

## Project

- Desktop-first valuation and listing assistant for Swedish secondhand markets.
- Stack: React 18 + TypeScript + Vite + Electron.
- Package manager: npm.

## Core Rules

- Use service singletons for business logic.
- Use Zustand stores for app state.
- Keep components free from persistence and API logic.
- Prefer path aliases (`@core`, `@features`, `@shared`, `@`).
- Run `npm run validate` before merging.

## Architecture

`Services -> Stores -> Features/Components`

## Quality Gate

`npm run validate`
