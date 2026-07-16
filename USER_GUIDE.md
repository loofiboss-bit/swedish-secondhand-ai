# Swedish Secondhand AI — v2 development user guide

This guide covers the local project-based workflow. Existing screenshots show the v1 visual
baseline and will be regenerated only through `npm run docs:screenshots` for the v2 beta.

## 1. Home and projects

The app opens on **Home**, where recent items and counts for each project state are visible.
**Projects** shows the complete local library. Create one project per item; projects can be:

- draft;
- ready;
- listed;
- sold;
- paused.

Opening a project gives four focused sections: **Item**, **Market & price**, **Listing**, and
**Follow-up**. Settings and backup tools are kept outside the item workflow.

![Overview](./docs/screenshots/01-overview.png)

## 2. Analyze Your Item

In **Analyze**:

1. Write a clear item description (brand, condition, model, defects, accessories).
2. Upload 1-6 images.
3. Click **Identify item**.

Review the detected facts before pricing. Correct title, category, brand, model, condition,
defects, accessories, and testing status, then keep important user values locked. A new AI
analysis preserves locked values.

The seller coach shows up to three next actions in priority order and opens the relevant field or
project section. Each action includes its reason and expected impact. Home also surfaces the
highest-priority projects.

Uploaded JPEG, PNG, and WebP files are kept unchanged. The local photo coach checks resolution,
light, contrast, possible blur, duplicates, and square-crop risk, then lets you assign each image
as cover, angle, defect, label/model, or accessories. It never edits or improves a photo
automatically. HEIC/HEIF is rejected with an explicit format message.

Electronics, Fashion, Furniture, Collectibles, and General use different required and recommended
fact/photo checklists. AI and offline analysis create source-labelled candidates with uncertainty
and text/image references. These are suggestions only; explicit knowledge gaps are shown instead
of offline guesses.

Tips for better results:

- Include exact model names if known.
- Mention condition details (e.g., "small scratch on armrest").
- Include included extras (charger, remote, box).
- Photograph defects and labels directly, and keep at least one clear cover image.

![Analyze step](./docs/screenshots/02-analyze-detected-item.png)

## 3. Fetch Comparables and Estimate Price

In **Comparables/Price**:

1. Review the generated exact and broad search variants. Edit, disable, or reset them from the
   locked item facts, then click **Fetch Tradera comparables** (if credentials are configured).
2. Add manual comparables from Blocket/Vinted when needed. Platform, price type, observation date,
   and optional HTTP/HTTPS source URL are explicit; entering a price never marks an item sold.
3. Filter by source or price type. Every row shows match type, source, date, relevance, cache age,
   search provenance, and whether it can affect valuation.
4. Explicitly include or exclude every realized comparable and review its visible reason and
   weight. System relevance is a suggestion; only a user-approved realized price can enter the
   numeric result. Excluded rows
   never affect the result.
5. Choose pricing strategy:
   - `fast_sale`
   - `balanced`
   - `max_value`
6. Click **Estimate value**. If fewer than two approved realized comparables remain, the app returns
   `insufficient-evidence` without a numeric price.
7. Use **Compare price scenarios** to display fast sale, balanced, and max value together with the
   exact deterministic adjustments in each scenario.

Active asking prices are shown separately as a market-context range and never anchor the price.

The sidebar shows current recommendation and confidence.

![Valuation result](./docs/screenshots/03-valuation-result.png)

## 4. Listing studio and sell plan

In **Listing**:

1. Click **Update untouched fields** to create or refresh Tradera, Blocket, and Vinted drafts.
2. Edit title, description, price, category/attribute checklist, shipping/pickup, tags, and
   disclosure independently for each marketplace. Every field shows whether it is generated or
   user-owned.
3. Regeneration updates only untouched fields. **Replace my text too** requires an explicit
   confirmation before any user-edited field is overwritten.
4. Review character counts, preview the listing, arrange images, select a cover, and inspect the
   square crop preview. Images are not edited.
5. Open blockers, warnings, or improvements to jump to the affected field. Copy actions remain
   disabled while blockers exist; the former generic 100-point score is no longer used.
6. Choose your time preference and inspect the transparent sell plan. It states marketplace,
   fixed price versus auction, pricing strategy, fulfillment, rationale, and whether it is based
   on market data, a general rule, or sufficient own history.
7. Use **Copy** for the basic text or **Copy structured package** for title, description, price,
   category, attributes, fulfillment, tags, image order, cover, and disclosure. Publication stays
   manual.

Each draft shows the marketplace-policy version, official source URL, and last check date.

![Templates quality](./docs/screenshots/04-templates-quality.png)

## 5. Follow-up and local learning

In **Follow-up**:

1. After manually publishing, record date, marketplace, optional HTTP/HTTPS URL, and actual
   starting price. The project becomes `listed`.
2. When opening the project after 3, 7, or 14 days, review due local advice for photos, price, or
   description. These are rules shown on demand, not notifications or automatic changes.
3. Record `sold`, `not sold`, or `paused`. A sold outcome requires verified final price and a sale
   date after publication; sale duration is calculated locally.
4. Every recommendation states whether it uses a general rule, market evidence, or sufficient own
   verified history. The app never presents a sale-probability estimate without evidence.

Local learning stays inactive until at least five complete sold outcomes exist in the same
category. It never pools unrelated categories. When active, confidence and any strategy price
factor identify own history as their basis, and the factor appears in visible valuation
adjustments.

![Review and history](./docs/screenshots/05-review-history.png)

## 6. Command Palette and Shortcuts

Open command palette with `Ctrl/Cmd + K` to run key actions quickly.

Available shortcuts:

- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + Enter` - Run full pipeline
- `Alt + ArrowRight` - Next step
- `Alt + ArrowLeft` - Previous step

![Command palette](./docs/screenshots/06-command-palette.png)

## 7. Projects and recovery

The app autosaves the active project. Multiple projects remain isolated from one another.

- The former v1 active draft and history migrate to schema 3 projects once.
- The original schema 2 records are retained as a rollback source throughout the 2.0 line.
- If migration input is corrupt or unsupported, the app opens read-only recovery without
  replacing the old data.

## 8. Settings

Configure in **Settings**:

- Language: Swedish/English
- Gemini API key
- Tradera App ID and App key

Cloud API keys and the Tradera App key are encrypted through the operating system's protected
credential storage. The non-secret Tradera App ID is stored with preferences. Saved secret values
are never shown again; Settings displays only whether a key is configured. On Linux, unlock or
configure the desktop keyring before saving a key.

Without API keys, fallback logic still works, but with lower confidence and fewer comparables.

## 9. Backup, migration, and reset

Settings includes **Backup and data recovery**. A full format-2 backup contains projects and
images; the compact option explicitly excludes images. Backups never include API keys. Imports
validate the complete file before replacing any selected dataset.

Legacy v0.5/current-main IndexedDB payloads migrate automatically to the schema 2 envelope on
first successful read. Corrupt or unsupported payloads are left untouched. Export a backup before
using selective or full non-secret reset, and restart the app after import/reset.

## 10. Troubleshooting

### No Tradera comparables returned

- Verify both the Tradera App ID and App key from the Tradera Developer Center.
- Wait for the 24-hour cache to expire if you need newly listed market context.
- Add manual comparables so valuation can proceed.

Tradera search results are asking-price context unless the source explicitly provides a realized
price. When adding a manual comparable, select **Verified realized price** only when the sale price
is known; unknown and asking prices do not determine the recommendation.

### Listing copy is disabled

- Open each blocker to focus the affected field.
- Confirm category, positive price, title length, and shipping/pickup terms.

### Confidence is low

- Add better item description.
- Add more relevant manual comparables.
- Record real sold outcomes to improve calibration.

## 11. Recommended Workflow (Quick)

1. Describe + upload images
2. Identify item
3. Fetch/add comparables
4. Estimate with strategy
5. Generate templates
6. Fix blockers and copy bundle
7. Record manual publication and verified outcome later
