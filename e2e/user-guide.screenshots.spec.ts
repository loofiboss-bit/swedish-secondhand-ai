import { expect, test } from '@playwright/test';

function workspaceTab(page: import('@playwright/test').Page, name: RegExp) {
  return page
    .getByRole('navigation', { name: /arbetsyta för vara|item workspace/i })
    .getByRole('button', { name });
}

test('capture v4 focused workspace screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    indexedDB.deleteDatabase('keyval-store');
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: /välkommen|welcome/i })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/01-overview.png', fullPage: true });

  await page.getByRole('button', { name: /börja offline|start offline/i }).click();
  await page.getByRole('button', { name: /ny vara|new item/i }).click();
  await page.getByRole('textbox', { name: /projektnamn|project name/i }).fill('IKEA Poäng stol');
  await page
    .getByRole('textbox', { name: /beskrivning|description/i })
    .fill('IKEA Poäng fåtölj i bra skick. Grå klädsel och inga stora skador.');
  await page.getByRole('button', { name: /skapa och fortsätt|create and continue/i }).click();
  await page.getByRole('button', { name: /identifiera vara|identify item/i }).click();
  await expect(page.getByRole('heading', { name: /granska fakta|review facts/i })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const keyElement of [
    page.getByRole('region', { name: /nästa viktiga|next important/i }),
    page.getByRole('heading', { name: /beskriv varan|describe the item/i }),
    page.getByRole('heading', { name: /^bilder$|^photos$/i }),
    page.getByText(/^obligatoriska fakta$|^required facts$/i),
  ]) {
    await expect(keyElement).toBeInViewport();
  }
  await page.screenshot({ path: 'docs/screenshots/02-analyze-detected-item.png', fullPage: true });

  await workspaceTab(page, /pris|price/i).click();
  await page.getByLabel(/ditt pris|your price/i).fill('650');
  await page.getByRole('button', { name: /använd mitt pris|use my price/i }).click();
  await expect(page.getByText(/ditt pris: 650 SEK|your price: 650 SEK/i)).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/03-valuation-result.png', fullPage: true });

  await workspaceTab(page, /annons|listing/i).click();
  await page
    .getByRole('button', { name: /uppdatera orörda fält|update untouched fields/i })
    .click();
  await expect(page.locator('.listing-editor')).toHaveCount(1);
  await page.screenshot({ path: 'docs/screenshots/04-templates-quality.png', fullPage: true });

  await workspaceTab(page, /klart|done/i).click();
  await expect(
    page.getByRole('heading', {
      name: /registrera manuell publicering|record manual publication/i,
    }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/05-review-history.png', fullPage: true });

  await page.keyboard.press('Control+KeyK');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/06-command-palette.png', fullPage: true });
});
