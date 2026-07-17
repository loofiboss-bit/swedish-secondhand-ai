# Providers and market data

Offline mode is ready on first start. Configure Gemini, Ollama, or Tradera only when you need the
extra capability and accept its data flow.

## Offline

Offline analysis uses deterministic local rules. No item text or image leaves the device. Some
facts may remain unknown, so review and complete them yourself.

## Ollama

Ollama runs on the same device. Start Ollama separately, then open **Settings**, select
**Ollama**, and enter the local base URL and model. The default allowed connection is HTTP
loopback on port `11434`.

Use the connection test before analyzing an item. Ollama can receive the item text and up to three
images, but requests remain on the local loopback connection.

## Gemini

Open **Settings**, select **Gemini**, and enter your Gemini API key. The key is saved through
operating-system protected storage and is not returned to the renderer, diagnostics, or backups.

When you request Gemini analysis, item text and up to two supported original images are sent to
Google. Use the connection test after saving the key. Remove the key from Settings when you no
longer want the app to use it.

If protected storage is unavailable, Gemini stays disabled. Continue with Offline or Ollama.

## Tradera

Tradera market search is separate from the AI mode. Expand the Tradera section in **Settings**,
then enter the public App ID and protected App key. The connection test remains disabled until
both values are configured.

The app sends a bounded query to Tradera's fixed official REST v4 endpoint only when you request
comparables. Results are cached locally for 24 hours. Asking prices remain context; only approved
realized prices can anchor an evidence-based recommendation.

## Transient fallback

When Gemini or Ollama is selected, you can allow deterministic offline fallback for temporary
provider failures. Authentication, configuration, cancellation, and protected-storage errors do
not silently fall back. The active draft remains available when a provider call fails.

## Credential safety

- Use provider keys dedicated to this app when the provider supports it.
- Never paste a key into a GitHub issue, diagnostic attachment, project description, or listing.
- Revoke and replace a key if you believe it was exposed.
- Exported backups do not include secrets, so configure providers again on a new device.

Read [Privacy](../../PRIVACY.md) for the full data inventory.
