import { expect, test } from '@playwright/test';

test('capture user guide screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    try {
      indexedDB.deleteDatabase('keyval-store');
    } catch {
      // ignore cleanup issues
    }
  });
  await page.reload();
  await page.waitForTimeout(1200);

  const discardDraftButton = page.getByRole('button', { name: /Förkasta|Discard/i });
  if (await discardDraftButton.isVisible().catch(() => false)) {
    await discardDraftButton.click();
    await page.waitForTimeout(300);
  }

  const analyzeStepButton = page.getByRole('button', { name: /Analysera|Analyze/i }).first();
  if (await analyzeStepButton.isVisible().catch(() => false)) {
    await analyzeStepButton.click();
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: 'docs/screenshots/01-overview.png', fullPage: true });

  await page
    .getByPlaceholder(/IKEA Poang|Ex:/i)
    .fill('IKEA Poang fåtölj i bra skick. Grå klädsel, inga stora skador, säljes pga flytt.');
  await page.getByRole('button', { name: /Identifiera vara|Identify item/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'docs/screenshots/02-analyze-detected-item.png', fullPage: true });

  await page
    .getByRole('button', { name: /Jämförelser|Comparables/i })
    .first()
    .click();
  await page
    .getByRole('button', { name: /Hämta Tradera-jämförelser|Fetch Tradera comparables/i })
    .click();
  await page.getByRole('button', { name: /Beräkna värde|Estimate/i }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'docs/screenshots/03-valuation-result.png', fullPage: true });

  await page
    .getByRole('button', { name: /Skapa mallar|Generate templates/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'TRADERA' })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/04-templates-quality.png', fullPage: true });

  await page
    .getByRole('button', { name: /Granska|Review/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Historik|History/i })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screenshots/05-review-history.png', fullPage: true });

  await page.keyboard.press('Control+KeyK');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/06-command-palette.png', fullPage: true });
});
