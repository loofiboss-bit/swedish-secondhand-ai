<p align="center">
  <img src="./docs/branding/readme-banner.svg" alt="Swedish Secondhand AI" width="100%" />
</p>

# Swedish Secondhand AI

Swedish Secondhand AI is a local-first desktop seller coach for Tradera, Blocket, and Vinted.
It helps you review item facts, choose a price, and prepare listing text without signing in or
publishing on your behalf.

The current public build is **v3.0.0-rc.1** for Windows x64 and Linux x64. It is a release
candidate, so back up your projects before upgrading.

[Download v3.0.0-rc.1](https://github.com/loofiboss-bit/swedish-secondhand-ai/releases/tag/v3.0.0-rc.1)
· [Install guide](./docs/guides/INSTALLATION.md)
· [Svensk kom igång-guide](./docs/guides/KOM_IGANG.md)
· [Full user guide](./USER_GUIDE.md)

![The offline welcome screen](./docs/screenshots/01-overview.png)

## What you can do

- Start offline with no account, API key, or network connection.
- Keep separate projects for items you are preparing, listing, or following up.
- Review and correct every fact used in a listing. Your edits remain authoritative.
- Set your own price, wait until later, or use approved realized comparables for an
  evidence-based recommendation.
- Prepare separate copy for Tradera, Blocket, and Vinted, then publish it manually.
- Archive projects, recover deleted projects from trash, and export non-secret backups.
- Add Gemini, local Ollama, and official Tradera data when you want more analysis or market
  evidence.

The app does not scrape marketplaces, publish listings, sync projects to the cloud, or run
automatic updates.

## The shortest path to a listing

1. Select **Start offline**.
2. Create a project with a name and item description.
3. Select **Identify item** and correct the detected facts.
4. Open **Price**, enter **Your price**, and select **Use my price**.
5. Open **Listing** and select **Update untouched fields**.
6. Review a marketplace tab and copy the structured package.

Listing text can be drafted before you choose a price. The complete copy package needs a price.
For an evidence-based recommendation, approve at least two verified realized prices. Asking
prices remain context only.

## Choose an analysis mode

| Mode    | Network use       | Best for                               | What leaves the device                   |
| ------- | ----------------- | -------------------------------------- | ---------------------------------------- |
| Offline | None              | A quick start and manual review        | Nothing                                  |
| Ollama  | Local loopback    | Local model analysis                   | Requests stay on the same device         |
| Gemini  | Google Gemini API | Cloud-assisted text and image analysis | Item text and up to two supported images |

Tradera is configured separately. It sends a bounded search query to Tradera's official API only
when you request market data. Read [Providers and market data](./docs/guides/PROVIDERS.md) before
adding credentials.

## Downloads and verification

The v3 release candidate includes:

- a Linux x64 AppImage;
- a Windows x64 installer and portable executable;
- `SHA256SUMS.txt` for download verification;
- a CycloneDX software bill of materials.

Windows packages are not code-signed. Verify the SHA-256 checksum before opening a downloaded
file. The [install guide](./docs/guides/INSTALLATION.md) has commands for Linux and Windows.

## Documentation

Start with the [documentation index](./docs/README.md), or open one of these guides:

- [Install and update](./docs/guides/INSTALLATION.md)
- [Kom igång på svenska](./docs/guides/KOM_IGANG.md)
- [Create your first listing](./docs/guides/FIRST_LISTING.md)
- [Choose a price](./docs/guides/PRICING.md)
- [Configure Gemini, Ollama, and Tradera](./docs/guides/PROVIDERS.md)
- [Back up, restore, and delete data](./docs/guides/BACKUP_AND_RECOVERY.md)
- [Troubleshoot common problems](./docs/guides/TROUBLESHOOTING.md)

The GitHub [wiki](https://github.com/loofiboss-bit/swedish-secondhand-ai/wiki) is the short
user-facing entry point. Repository guides remain the source of truth for versioned instructions.

## Privacy and pricing safeguards

Projects, images, settings, outcomes, and generated listings stay in the local app profile unless
you explicitly use Gemini or Tradera. Secrets are stored behind the Electron main-process
boundary using operating-system protected storage and are excluded from backups and diagnostics.

AI can suggest facts and explain evidence. It cannot set the final numeric price. The app only
calculates an evidence-based price from comparables that you approve, and it returns no numeric
recommendation when the evidence is insufficient.

Read [Privacy](./PRIVACY.md), [Security](./SECURITY.md), and
[Support and recovery](./SUPPORT.md) for the complete boundaries.

## Development

The app uses React, TypeScript, Vite, Electron, Zustand, Vitest, and Playwright.

```bash
npm ci
npm run electron:dev
```

Run `npm run validate` before submitting a change. See [Contributing](./CONTRIBUTING.md) for the
repository workflow and [scripts/README.md](./scripts/README.md) for release utilities.

## License

[MIT](./LICENSE)
