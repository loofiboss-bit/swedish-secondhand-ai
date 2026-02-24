# Swedish Secondhand AI

Desktop app for Swedish secondhand pricing and listing generation.

## MVP Capabilities

- Item identification from text or image.
- SEK valuation output with min/recommended/max range.
- Hybrid comparables: Tradera API + manual Blocket/Vinted comps.
- Copy-paste templates for Tradera, Blocket, and Vinted.
- Local-first storage (settings, manual comps, history).
- Swedish-first UI with English fallback.

## Tech Stack

- React 18 + TypeScript + Vite
- Electron 40
- Zustand
- idb-keyval
- i18next
- Vitest + Playwright

## Scripts

- `npm run dev`
- `npm run electron:dev`
- `npm run test`
- `npm run test:e2e`
- `npm run validate`
- `npm run dist`

## API Notes

- Tradera comparables use official API access.
- Blocket and Vinted are manual comparable entry in MVP.
- Gemini API key is user-provided and stored locally.

## Build Targets

- Windows (NSIS + portable)
- Linux (AppImage)
