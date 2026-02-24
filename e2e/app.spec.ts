import { test, expect } from '@playwright/test';

test('loads core sections', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /swedish secondhand ai/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /analysera|analyze/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /mallar|templates/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /inställningar|settings/i })).toBeVisible();
});
