import { test, expect } from '@playwright/test';

async function finishOnboarding(page: import('@playwright/test').Page, mode = 'offline') {
  const dialog = page.getByRole('dialog', { name: /välkommen|welcome/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: new RegExp(mode, 'i') }).check();
  await dialog.getByRole('button', { name: /spara och börja|save and start/i }).click();
  await expect(dialog).toBeHidden();
}

test('loads guided workflow sections', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);

  await expect(page.getByRole('heading', { name: /swedish secondhand ai/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /analysera|analyze/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /jämförelser|comparables/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /inställningar|settings/i })).toBeVisible();
});

test('preserves a locked correction and prices only reviewed comparables', async ({ page }) => {
  await page.addInitScript(() => {
    const status = {
      gemini: { configured: true },
      tradera: { configured: false },
      encryptionAvailable: true,
      backend: 'test',
    };
    window.desktop = {
      platform: 'linux',
      secrets: {
        getStatus: async () => status,
        update: async () => status,
        delete: async () => status,
      },
      ai: {
        analyzeGemini: async () => ({
          text: JSON.stringify({
            title: 'Sony mirrorless camera',
            category: 'Electronics',
            brand: 'Sony',
            model: 'A6100',
            conditionGrade: 'good',
            confidence: 0.86,
          }),
        }),
        testGeminiConnection: async () => ({ connected: true }),
      },
      marketplace: {
        fetchTraderaComparables: async () => ({ configured: false, data: null }),
      },
    };
  });
  await page.goto('/');
  await finishOnboarding(page, 'gemini');

  await page.getByLabel(/beskriv varan|describe the item/i).fill('Sony camera in good condition');
  await page.getByRole('button', { name: /identifiera vara|identify item/i }).click();
  await expect(
    page.getByRole('heading', { name: /identifierad vara|detected item/i }),
  ).toBeVisible();

  const modelField = page
    .locator('.detected-item label.field')
    .filter({ hasText: /modell|model/i });
  await modelField.locator('input').first().fill('A6400');
  await modelField.locator('input').first().blur();
  await expect(modelField.locator('input[type="checkbox"]')).toBeChecked();

  await page.getByRole('button', { name: /jämförelser|comparables/i }).click();
  const form = page.locator('form.manual-comp');
  await form.getByLabel(/pristyp|price type/i).selectOption('realized');
  for (const [index, [title, price]] of [
    ['Sony A6400 camera Electronics', '5000'],
    ['Sony A6400 mirrorless Electronics', '5500'],
  ].entries()) {
    await form.getByPlaceholder(/titel|title/i).fill(title);
    await form.getByPlaceholder(/pris|price/i).fill(price);
    await form.getByRole('button', { name: /lägg till jämförelse|add comparable/i }).click();
    await expect(page.locator('.comparable-list > li')).toHaveCount(index + 1);
  }

  await page.getByRole('button', { name: /beräkna värde|estimate value/i }).click();
  await expect(page.getByText(/low-confidence/)).toBeVisible();
  await expect(page.locator('.valuation-box strong')).toHaveText(/5000 SEK|5500 SEK/);
});
