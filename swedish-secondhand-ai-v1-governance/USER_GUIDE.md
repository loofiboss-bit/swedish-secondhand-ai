# Swedish Secondhand AI - User Guide

This guide covers the complete workflow in Swedish Secondhand AI v0.5.0, with screenshots from the app.

## 1. App Overview

The app is organized around a guided workflow:

1. Analyze
2. Comparables
3. Price
4. Templates
5. Review

![Overview](./docs/screenshots/01-overview.png)

## 2. Analyze Your Item

In **Analyze**:

1. Write a clear item description (brand, condition, model, defects, accessories).
2. Upload 1-6 images.
3. Click **Identify item**.

Tips for better results:

- Include exact model names if known.
- Mention condition details (e.g., "small scratch on armrest").
- Include included extras (charger, remote, box).

![Analyze step](./docs/screenshots/02-analyze-detected-item.png)

## 3. Fetch Comparables and Estimate Price

In **Comparables/Price**:

1. Click **Fetch Tradera comparables** (if API key is configured).
2. Add manual comparables from Blocket/Vinted when needed.
3. Choose pricing strategy:
   - `fast_sale`
   - `balanced`
   - `max_value`
4. Click **Estimate value**.

The sidebar shows current recommendation and confidence.

![Valuation result](./docs/screenshots/03-valuation-result.png)

## 4. Generate Templates and Quality Check

In **Templates**:

1. Click **Generate templates**.
2. Review templates for Tradera, Blocket, and Vinted.
3. Check quality score and policy issues.
4. Fix blocking issues before copying.
5. Use:
   - **Copy** (single listing text)
   - **Copy bundle** (title + description + tags + pricing notes)

![Templates quality](./docs/screenshots/04-templates-quality.png)

## 5. Review and History

In **Review/History**:

1. Save your listing result to history.
2. Search and filter previous valuations.
3. Open a history entry to inspect details.
4. Update sale outcome:
   - `pending`
   - `sold` (optionally add sold price)
   - `not_sold`

Outcome updates improve confidence calibration over time.

![Review and history](./docs/screenshots/05-review-history.png)

## 6. Command Palette and Shortcuts

Open command palette with `Ctrl/Cmd + K` to run key actions quickly.

Available shortcuts:

- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + Enter` - Run full pipeline
- `Alt + ArrowRight` - Next step
- `Alt + ArrowLeft` - Previous step

![Command palette](./docs/screenshots/06-command-palette.png)

## 7. Drafts and Recovery

The app autosaves your draft session.

- On restart, you can resume or discard draft.
- You can click **Save draft now** anytime.
- If current session conflicts with a saved draft, you can choose which one to keep.

## 8. Settings

Configure in **Settings**:

- Language: Swedish/English
- Gemini API key
- Tradera API key

Without API keys, fallback logic still works, but with lower confidence and fewer comparables.

## 9. Troubleshooting

### No Tradera comparables returned

- Verify Tradera API key.
- Check API base URL in settings.
- Add manual comparables so valuation can proceed.

### Template copy is disabled

- Resolve blocking policy issues in template card.
- Re-generate templates after fixing upstream data.

### Confidence is low

- Add better item description.
- Add more relevant manual comparables.
- Record real sold outcomes to improve calibration.

## 10. Recommended Workflow (Quick)

1. Describe + upload images
2. Identify item
3. Fetch/add comparables
4. Estimate with strategy
5. Generate templates
6. Fix blockers and copy bundle
7. Save to history and update sold outcome later
