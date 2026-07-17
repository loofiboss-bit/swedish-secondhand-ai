import { test, expect } from '@playwright/test';

async function finishOnboarding(page: import('@playwright/test').Page, mode = 'offline') {
  const startPage = page.getByRole('heading', { name: /välkommen|welcome/i });
  await expect(startPage).toBeVisible();
  await page.getByRole('button', { name: /börja offline|start offline/i }).click();
  await expect(startPage).toBeHidden();
  if (mode !== 'offline') {
    await page.getByRole('button', { name: /inställningar|settings/i }).click();
    await page.getByRole('combobox', { name: /ai-läge|ai mode/i }).selectOption(mode);
    await page.getByRole('button', { name: /hem|home/i }).click();
  }
}

async function createProject(page: import('@playwright/test').Page, description: string) {
  await page.getByRole('button', { name: /ny vara|new item/i }).click();
  await page.getByRole('textbox', { name: /projektnamn|project name/i }).fill('E2E test project');
  await page.getByRole('textbox', { name: /beskrivning|description/i }).fill(description);
  await page.getByRole('button', { name: /skapa och fortsätt|create and continue/i }).click();
}

test('loads project home and opens an item workspace', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);

  await expect(page.getByRole('heading', { name: /swedish secondhand ai/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /från pryl|from item/i })).toBeVisible();
  await createProject(page, 'IKEA chair in good condition');
  await expect(page.getByRole('heading', { name: /analysera|analyze/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^pris$|^price$/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /nästa viktiga|next important/i })).toBeVisible();
});

test('supports keyboard focus, semantic navigation, zoom, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await finishOnboarding(page);

  const mainNavigation = page.getByRole('navigation', { name: /huvudnavigering|main navigation/i });
  await expect(mainNavigation).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  await createProject(page, 'IKEA chair in good condition');
  const projectNavigation = page.getByRole('navigation', {
    name: /arbetsyta för vara|item workspace/i,
  });
  await expect(projectNavigation).toBeVisible();
  await expect(projectNavigation.getByRole('button').first()).toHaveAttribute(
    'aria-current',
    'page',
  );

  const transitionDuration = await page
    .getByRole('button')
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expect(projectNavigation).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test('offline intake exposes conservative candidates and explicit knowledge gaps', async ({
  page,
}) => {
  await page.goto('/');
  await finishOnboarding(page);
  await createProject(page, 'Sony kamera i bra skick');
  await page.getByLabel(/ladda upp bilder|upload images/i).setInputFiles({
    name: 'item.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByRole('heading', { name: /bildcoach|photo coach/i })).toBeVisible();
  await expect(page.getByText(/låg upplösning|low resolution/i)).toBeVisible();
  await page
    .getByLabel(/beskriv varan|item description|describe the item/i)
    .fill('Sony kamera i bra skick');
  await page.getByRole('button', { name: /identifiera vara|identify item/i }).click();
  await page
    .getByText(/varför detta förslag|why this suggestion/i)
    .last()
    .click();

  await expect(
    page.getByRole('heading', { name: /faktakandidater|fact candidates/i }),
  ).toBeVisible();
  await expect(page.getByText(/offline.*osäkerhet|offline.*uncertainty/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /kunskapsluckor|knowledge gaps/i })).toBeVisible();
  await expect(page.getByText(/modellen kunde inte|model could not/i)).toBeVisible();
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
  await createProject(page, 'Sony camera in good condition');

  await page
    .getByLabel(/beskriv varan|item description|describe the item/i)
    .fill('Sony camera in good condition');
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

  await page.getByRole('button', { name: /^pris$|^price$/i }).click();
  await expect(page.getByRole('heading', { name: /sökplan|search plan/i })).toBeVisible();
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

  for (const checkbox of await page.locator('.comparable-list input[type="checkbox"]').all()) {
    await checkbox.check();
  }

  await page.getByRole('button', { name: /beräkna värde|^estimate(?: value)?$/i }).click();
  await expect(page.getByText(/begränsat underlag|limited evidence/i)).toBeVisible();
  await expect(page.locator('.valuation-box strong')).toHaveText(/5000 SEK|5500 SEK/);

  await page.getByRole('button', { name: /jämför prisscenarier|compare price scenarios/i }).click();
  await expect(page.getByRole('heading', { name: /prisverkstad|pricing workshop/i })).toBeVisible();
  await expect(page.locator('.scenario-grid article')).toHaveCount(3);

  await page.getByRole('button', { name: /^annons$|^listing$/i }).click();
  await page
    .getByRole('button', { name: /uppdatera orörda fält|update untouched fields/i })
    .click();
  await expect(page.locator('.listing-editor')).toHaveCount(3);
  await expect(
    page.getByRole('heading', { name: /rekommenderad kanal|recommended channel/i }),
  ).toBeVisible();

  const traderaEditor = page.locator('.listing-editor').filter({ hasText: 'TRADERA' });
  const titleInput = traderaEditor
    .locator('label')
    .filter({ hasText: /titel|title/i })
    .locator('input');
  await titleInput.fill('Min egen Sony A6400-rubrik');
  await page
    .getByRole('button', { name: /uppdatera orörda fält|update untouched fields/i })
    .click();
  await expect(titleInput).toHaveValue('Min egen Sony A6400-rubrik');
  await expect(traderaEditor.getByText(/din redigering|your edit/i).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /blockerare|blockers/i }).first()).toBeVisible();

  await page.getByRole('button', { name: /^klart$|^done$/i }).click();
  await page.getByLabel(/annons-url|listing url/i).fill('https://www.blocket.se/annons/test');
  await page.getByLabel(/faktiskt utgångspris|actual starting price/i).fill('5500');
  await page.getByRole('button', { name: /markera som publicerad|mark as listed/i }).click();
  await expect(page.getByText(/publicerad|listed/i).first()).toBeVisible();

  await page.getByLabel(/verifierat slutpris|verified final price/i).fill('5200');
  await page.getByRole('button', { name: /markera såld|mark sold/i }).click();
  await expect(page.getByText(/såld för 5200 SEK|sold for 5200 SEK/i)).toBeVisible();
});
