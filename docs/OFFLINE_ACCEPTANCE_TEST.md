# Guided Selling offline acceptance test

## Goal

From an empty profile, create a copy-ready offline listing with a seller-entered price in no more
than six primary actions. No account, network request, provider or secret is used. Completion time
may be recorded as usability data but never blocks a release.

## Script

1. Choose **Start offline**.
2. Choose **New item**, enter project name and description, then **Create and continue**.
3. Choose **Identify item** and review the required facts.
4. Open **Price**, enter **Your price**, then **Use my price**.
5. Open **Listing** and choose **Update untouched fields**.
6. Review the recommended marketplace and choose **Copy ready listing**.

## RC result — 2026-07-17

- Automated empty-profile browser acceptance: passed in the `own price` E2E scenario.
- Primary actions: six.
- Offline/provider-free: verified.
- Complete package contained the seller price and no confidence or AI claim: verified.
- Repeat the same functional path as a human smoke test before stable publication; elapsed time
  is informational only.

## v4 development result — 2026-07-24

- Automated empty-profile own-price path: passed locally with required category facts reviewed.
- Seller-entered price completed Price while comparable and valuation work remained optional.
- Ready-copy eligibility matched the coach, workspace tab, and project readiness model.
- Clipboard rejection exposed the manual-selection fallback without losing listing text.
- Human clean-install Windows and Linux results are not yet recorded; this is not release
  evidence.
