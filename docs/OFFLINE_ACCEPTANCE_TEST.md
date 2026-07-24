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
6. Review the recommended marketplace and choose **Copy structured package**.

## RC result — 2026-07-17

- Automated empty-profile browser acceptance: passed in the `own price` E2E scenario.
- Primary actions: six.
- Offline/provider-free: verified.
- Complete package contained the seller price and no confidence or AI claim: verified.
- Repeat the same functional path as a human smoke test before publication; elapsed time is
  informational only.
