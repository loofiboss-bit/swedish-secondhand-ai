import { test, expect } from '@playwright/test';

test('loads guided workflow sections', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /swedish secondhand ai/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /analysera|analyze/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /jämförelser|comparables/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /inställningar|settings/i })).toBeVisible();
});
