# Swedish Secondhand AI — v3 user guide

v3 is designed for occasional private sellers. Everything works locally without an account,
API key, or market data. Gemini, Ollama and official Tradera data are optional enhancements.

## 1. Start offline

Choose **Start offline** on the welcome page. The overview shows that offline analysis is ready,
while enhanced AI analysis and Tradera data are optional. **Try with example** creates a clearly
marked local demo without network access or secrets.

Create the first item with a project name and description. Add up to six JPEG, PNG or WebP images
by selecting or dropping them; images are optional.

![Overview](./docs/screenshots/01-overview.png)

## 2. Item

The workspace follows **Item → Price → Listing → Done**. The coach shows only the most important
next action; open the full list only when needed.

Choose **Identify item**, then review seller-authored facts such as title, category, brand, model,
condition, defects, accessories, test status and authenticity. Your corrections are authoritative.
Source, uncertainty, evidence references and locks live under **Why this suggestion?**.

![Item step](./docs/screenshots/02-analyze-detected-item.png)

## 3. Choose a price

The fastest path is **Use my own price**. Enter SEK and confirm. It is always labelled **Your
price** and never receives confidence, a range, or an AI/market claim.

You can also decide later, which allows listing text to be drafted but blocks the complete copy
package until a price exists.

![Your price](./docs/screenshots/03-valuation-result.png)

### Optional evidence-based valuation

Open **Evidence-based valuation and market data**. Tradera asking prices are context only. A
numeric recommendation requires at least two realized prices that you explicitly approve. Manual
comparables explain the difference between an asking price and a verified final price. Search
plans, weights, full provenance and the three pricing scenarios remain available as advanced
tools.

## 4. Listing

Choose **Update untouched fields**. The recommended marketplace opens first; switch between
Tradera, Blocket and Vinted with tabs. Edit title, description, price, category, attributes,
shipping/pickup, tags and disclosure. Regeneration preserves user-edited fields unless you
explicitly confirm replacement.

Blockers link to and focus the affected field. Warnings and improvements do not block copying when
the required facts and price are complete. Basic listing text can be copied without a price; the
structured package requires one. Publication remains manual.

![Listing studio](./docs/screenshots/04-templates-quality.png)

## 5. Done and follow-up

After manual publication, record marketplace, date, starting price and an optional listing URL.
Later record sold, not sold or paused. Verified outcomes stay local and can calibrate future
recommendations only after sufficient same-category history.

![Done](./docs/screenshots/05-review-history.png)

## 6. Projects and safe deletion

Projects can be searched, filtered by status, renamed and archived. **Delete** moves a project to
trash and immediately offers **Undo**. Trash is never cleared automatically. Permanent deletion
happens only after confirming **Empty trash**.

Autosave reports **Saving…**, **Saved**, or **Could not save**. A manual retry appears only after a
save failure.

## 7. Settings and providers

Settings shows only the selected AI mode. Gemini, Ollama and Tradera each have a localized
connection test with a concrete recovery action. If protected secret storage is unavailable,
cloud operations stay disabled while offline and Ollama remain usable.

## 8. Backup, migration and diagnostics

Backup format 3 includes live and trashed projects and can omit images. Secrets are always
excluded. Import accepts formats 2 and 3 and validates the full replacement before writing.

The privacy-safe diagnostic export contains app/platform version, schema migration state,
provider configured status and normalized error codes. It never includes descriptions, listing
text, images, source URLs or secrets.

## 9. Accessibility and shortcuts

The app supports keyboard navigation, 200% zoom and reduced motion. Useful shortcuts:

- `Ctrl/Cmd + K` — command palette
- `Ctrl/Cmd + Enter` — run the guided pipeline
- `Alt + ArrowRight` — next step
- `Alt + ArrowLeft` — previous step

![Command palette](./docs/screenshots/06-command-palette.png)
