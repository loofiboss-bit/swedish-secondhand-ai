# Troubleshooting

Preserve your data first. If the app opens, export a full backup and safe diagnostics before
resetting, reinstalling, or clearing the local profile.

## The app does not start

1. Confirm that you downloaded the Windows x64 or Linux x64 package from this repository.
2. Verify its SHA-256 checksum against `SHA256SUMS.txt`.
3. On Linux, confirm that the AppImage is executable with `chmod +x`.
4. Close any existing app process and try once more.
5. Record the app version, package name, operating system, and exact visible error.

Reinstalling may not remove or repair the local app profile. Do not delete the profile before you
have a backup or have confirmed that no projects need recovery.

## Analysis fails

Switch to Offline in **Settings** and retry. If offline works, use the selected provider's
connection test.

- Gemini: check that a key is configured and protected storage is available.
- Ollama: confirm that Ollama is running, the model exists, and the base URL uses the local
  loopback address.
- Transient error: retry later or enable offline fallback.

Authentication and configuration errors require a settings change. A provider error should not
remove the active draft.

## Tradera returns no data

Confirm that both the App ID and App key are configured and that the connection test passes. Try a
broader item query. No result can also mean that the official API has no relevant observations;
the app does not scrape alternative pages.

You can add a manual comparable or continue with your own price. Mark manual prices accurately as
asking, realized, or unknown.

## No numeric recommendation appears

Open the evidence details. A recommendation requires at least two approved realized comparables.
Asking prices, unknown price types, excluded observations, and unapproved observations do not
count. Use your own price or decide later when evidence is insufficient.

## A listing cannot be copied

Open each blocker and complete the linked field. The complete structured package requires reviewed
facts and a price. Basic text can be prepared before pricing. Check known defects, missing parts,
test status, and authenticity before copying.

## A project looks missing

Clear project filters and search, then check archived projects and **Projects → Trash**. Restore a
trashed project instead of importing a backup when possible.

If the project disappeared after an import or upgrade, stop changing data, keep the original
backup, and export safe diagnostics.

## Prepare a useful bug report

Include:

- app version and package type;
- operating system and version;
- exact steps from a fresh app start;
- expected and actual result;
- a safe diagnostic JSON file after you review it.

Never attach API keys, backup files, listing text, project descriptions, images, private URLs, or
unpatched vulnerability details to a public issue. Use the private process in
[SECURITY.md](../../SECURITY.md) for security reports.
