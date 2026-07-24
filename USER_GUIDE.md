# User guide

This guide covers the focused v4 development workflow while the current public download remains
v3.0.0-rc.1. If you have not installed the app, start with
[Install and update](./docs/guides/INSTALLATION.md). Swedish readers can use the shorter
[Quick start](./docs/guides/QUICK_START.md).

## Start without an account

Select **Start offline** on the welcome page. Offline mode needs no account, key, or network
connection. **Try with example** creates a marked demo project without using a provider.

Create a project with a clear name and a description of the item. You can also add up to six JPEG,
PNG, or WebP images. Quick start checks format, size, decoding, and local image quality before the
project is created. Unsupported and HEIC/HEIF files are rejected individually; valid files remain.
Images are optional.

![Offline welcome screen](./docs/screenshots/01-overview.png)

## Work through Item, Price, Listing, and Done

Each project has four steps. One derived readiness model powers the seller coach, project cards,
workspace tabs, and ready-copy action, so optional research cannot appear as a blocker on one
screen and complete on another. Open the full task list when you want to work out of order.

Autosave displays **Saving...**, **Saved**, or **Could not save**. If saving fails, the app keeps
the unsaved project open and prevents a project switch from replacing its in-memory draft. Use the
retry action before switching projects or closing the app.

### 1. Item

Select **Identify item**. Review required category-specific facts first; recommended facts and
advanced evidence stay in expandable sections. Correct anything that is wrong or uncertain. The
app does not override facts you lock.

Open **Review analysis evidence** to see candidates, uncertainty, references, and knowledge gaps.
A suggestion is not a verified claim until you review it.

![Reviewed item facts](./docs/screenshots/02-analyze-detected-item.png)

### 2. Price

Choose one route:

- **Use my own price** records the amount you choose. The app labels it **Your price** and does not
  attach confidence or market claims.
- **Use evidence-based price** calculates scenarios from realized comparables that you approve.
  A numeric recommendation needs at least two approved realized prices.
- **Decide later** lets you prepare listing text now. You must add a price before copying the
  ready listing package.

Asking prices show what sellers request, not what buyers paid. They never anchor the numeric
recommendation. Read [Choose a price](./docs/guides/PRICING.md) for the evidence rules and manual
comparable workflow.

![Seller-entered price](./docs/screenshots/03-valuation-result.png)

### 3. Listing

Select **Update untouched fields** to draft marketplace copy. The recommended marketplace opens
first as a compact preview with title, final text, price, fulfillment, cover, blockers, and the
copy action. Use the tabs to review Tradera, Blocket, and Vinted separately. Your explicit
marketplace selection is saved with the project.

The interface can be Swedish or English, but marketplace listing output remains Swedish for the
supported Swedish marketplaces.

Check the title, description, price, category, attributes, delivery or pickup details, tags, and
disclosures. Regeneration preserves fields you edited unless you explicitly approve replacement.
Blockers link to the field that needs attention. **Copy ready listing** is enabled only when the
selected marketplace and project have no true blocker. **Copy text only** remains available and
is labelled incomplete while blockers remain. If clipboard access fails, select the read-only
fallback text and copy it manually.

The app prepares copy only. Sign in to the marketplace yourself, verify its current terms and
fees, and paste the fields manually.

![Marketplace listing editor](./docs/screenshots/04-templates-quality.png)

### 4. Done

After publishing manually, record the marketplace, publication date, starting price, and optional
listing URL. Later mark the item as sold, not sold, or paused and add the final price when known.

Outcome history stays local. Price calibration starts only after at least five complete outcomes
in the same category, and any adjustment remains visible.

![Publication follow-up](./docs/screenshots/05-review-history.png)

## Manage projects safely

Open **Projects** to search or filter projects. Each card shows readiness, next action, selected
price, marketplace, and save time. Use its overflow menu to rename, archive, or move it to trash.
Deleting a project offers an immediate **Undo** action. Trash is not cleared automatically.

**Empty trash** permanently removes every project in trash and always asks for confirmation.
Export a backup first if you might need those projects later.

## Configure optional providers

Open **Settings** and choose Offline, Gemini, or Ollama. The page shows fields only for the
selected mode. Gemini and Tradera secrets are saved through operating-system protected storage;
the renderer sees only whether a key is configured.

Use the connection test after changing provider settings. If protected storage is unavailable,
Gemini and Tradera remain disabled. Offline mode and Ollama still work. See
[Providers and market data](./docs/guides/PROVIDERS.md) for setup and data-flow details.

## Back up and recover data

Open **Settings → Backup and data recovery** before upgrading, importing data, or clearing the
app profile.

- A full format-3 backup includes live projects, trashed projects, and images.
- A compact backup includes the same project records but omits images.
- Both backup types exclude secrets.
- Import accepts formats 2 and 3 and validates the replacement before writing it.

The first v3 start migrates schema-3 projects to schema 4 and keeps the verified schema-3 source
as rollback data. Corrupt or unsupported data opens recovery instead of being overwritten. Read
[Back up, restore, and delete data](./docs/guides/BACKUP_AND_RECOVERY.md) before a reset.

## Export diagnostics for support

The safe diagnostic export contains the app and platform version, migration state, configured
provider status, and normalized error codes. It excludes descriptions, listing text, images,
source URLs, and secrets.

Review the file before attaching it to a public issue. Never post an API key, private listing URL,
unpublished item description, or image.

## Keyboard and display support

The app supports keyboard navigation, 200% zoom, and reduced motion.

| Shortcut           | Action                            |
| ------------------ | --------------------------------- |
| `Ctrl/Cmd + K`     | Open the command palette          |
| `Ctrl/Cmd + Enter` | Run the guided pipeline           |
| `Alt + ArrowRight` | Move to the next project step     |
| `Alt + ArrowLeft`  | Move to the previous project step |

![Command palette](./docs/screenshots/06-command-palette.png)

## Get help

Start with [Troubleshooting](./docs/guides/TROUBLESHOOTING.md). For a reproducible bug, open a
[GitHub issue](https://github.com/loofiboss-bit/swedish-secondhand-ai/issues) with sanitized steps,
the app version, operating system, and safe diagnostic file. Report vulnerabilities through the
private process in [SECURITY.md](./SECURITY.md).
