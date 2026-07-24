import { test, expect, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

async function createProject(
  page: import('@playwright/test').Page,
  description: string,
  displayName = 'E2E test project',
) {
  await page.getByRole('button', { name: /ny vara|new item/i }).click();
  await page.getByRole('textbox', { name: /projektnamn|project name/i }).fill(displayName);
  await page.getByRole('textbox', { name: /beskrivning|description/i }).fill(description);
  await page.getByRole('button', { name: /skapa och fortsätt|create and continue/i }).click();
}

function workspaceTab(page: import('@playwright/test').Page, name: RegExp) {
  return page
    .getByRole('navigation', { name: /arbetsyta för vara|item workspace/i })
    .getByRole('button', { name });
}

async function expectNoSeriousAccessibilityViolations(page: import('@playwright/test').Page) {
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
}

async function directChildOverlapPairs(locator: Locator) {
  return locator.evaluate((element) => {
    const regions = Array.from(element.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .filter((child) => {
        const style = getComputedStyle(child);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((child) => ({
        name: child.className || child.tagName.toLowerCase(),
        rect: child.getBoundingClientRect(),
      }));

    return regions.flatMap((region, index) =>
      regions.slice(index + 1).flatMap((candidate) => {
        const horizontalIntersection =
          Math.min(region.rect.right, candidate.rect.right) -
          Math.max(region.rect.left, candidate.rect.left);
        const verticalIntersection =
          Math.min(region.rect.bottom, candidate.rect.bottom) -
          Math.max(region.rect.top, candidate.rect.top);
        return horizontalIntersection > 1 && verticalIntersection > 1
          ? [`${region.name}:${candidate.name}`]
          : [];
      }),
    );
  });
}

test('loads project home and opens an item workspace', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);

  await expect(page.getByRole('heading', { name: /swedish secondhand ai/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /från pryl|from item/i })).toBeVisible();
  await createProject(page, 'IKEA chair in good condition');
  await expect(page.getByRole('heading', { name: /^vara$|^item$/i })).toBeVisible();
  await expect(workspaceTab(page, /pris|price/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /nästa viktiga|next important/i })).toBeVisible();
});

test('rejects an unsupported quick-start image while keeping a valid image', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);
  await page.getByRole('button', { name: /ny vara|new item/i }).click();
  await page.getByRole('textbox', { name: /projektnamn|project name/i }).fill('Image intake');
  await page
    .getByRole('textbox', { name: /beskrivning|description/i })
    .fill('Sony camera in good condition');

  await page.getByLabel(/dra bilder hit|drop images here/i).setInputFiles([
    {
      name: 'unsupported.heic',
      mimeType: 'image/heic',
      buffer: Buffer.from('not-a-heic-image'),
    },
    {
      name: 'item.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    },
    {
      name: 'item-second.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    },
  ]);

  await expect(page.getByRole('alert')).toContainText(/unsupported\.heic/i);
  await expect(page.getByText(/2 av 6 bilder|2 of 6 images/i)).toBeVisible();
  await page.getByRole('button', { name: /skapa och fortsätt|create and continue/i }).click();
  await expect(page.getByRole('img', { name: /bild 1|image 1/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /bild 2|image 2/i })).toBeVisible();
  await expect(page.getByText(/låg upplösning|low resolution/i).first()).toBeVisible();
  await page
    .locator('.image-list > li')
    .first()
    .getByRole('button', { name: /ta bort|remove/i })
    .click();
  await expect(page.getByText(/1 av 6 bilder|1 of 6 images/i)).toBeVisible();
  await page.waitForTimeout(1_000);

  await page.reload();
  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await page.locator('.project-list__open').filter({ hasText: 'Image intake' }).click();
  await expect(page.getByText(/1 av 6 bilder|1 of 6 images/i)).toBeVisible();
  await expect(page.getByRole('img', { name: /bild 1|image 1/i })).toBeVisible();
  await expect(page.getByText(/låg upplösning|low resolution/i)).toBeVisible();
});

test('creates a copy-ready offline listing with the seller own price', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Clipboard unavailable in test');
        },
      },
    });
  });
  await page.goto('/');
  await finishOnboarding(page);
  await createProject(page, 'IKEA Poäng stol i bra skick');

  await page.getByRole('button', { name: /identifiera vara|identify item/i }).click();
  await page.getByRole('textbox', { name: /mått|dimensions/i }).fill('80 × 60 × 100 cm');
  await page.getByRole('textbox', { name: /mått|dimensions/i }).blur();
  await workspaceTab(page, /pris|price/i).click();
  await page.getByLabel(/ditt pris|your price/i).fill('650');
  await page.getByRole('button', { name: /använd mitt pris|use my price/i }).click();
  await expect(page.getByText(/ditt pris: 650 SEK|your price: 650 SEK/i)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);

  await workspaceTab(page, /annons|listing/i).click();
  await page
    .getByRole('button', { name: /uppdatera orörda fält|update untouched fields/i })
    .click();

  await expect(page.locator('.listing-editor')).toHaveCount(1);
  await page.getByRole('tab', { name: /vinted/i }).click();
  await expect(page.locator('.listing-editor input[type="number"]')).toHaveValue('650');
  const coach = page.getByRole('region', { name: /nästa viktiga|next important/i });
  await expect(coach).toContainText(/0 blockerare|0 blockers/i);
  const nextAction = await coach.locator('.coach-action strong').first().innerText();
  await expect(
    page.getByRole('button', { name: /kopiera färdig annons|copy ready listing/i }),
  ).toBeEnabled();
  await page.getByRole('button', { name: /kopiera färdig annons|copy ready listing/i }).click();
  await expect(page.getByRole('alert')).toContainText(
    /urklipp kunde inte användas|clipboard access failed/i,
  );
  await expect(
    page.getByRole('textbox', { name: /manuell kopiering|manual copying/i }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await expect(page.locator('.listing-editor')).not.toContainText(/confidence|konfidens|\bAI\b/i);

  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  const projectCard = page.locator('.project-list__open').filter({ hasText: 'E2E test project' });
  await expect(projectCard).toContainText(nextAction);
  await expect(projectCard).toContainText(/ready to copy|redo att kopiera/i);
  await expect(projectCard).toContainText(/vinted/i);

  await page.reload();
  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await page.locator('.project-list__open').filter({ hasText: 'E2E test project' }).click();
  await workspaceTab(page, /annons|listing/i).click();
  await expect(page.getByRole('tab', { name: /vinted/i })).toHaveAttribute('aria-selected', 'true');
});

test('supports keyboard focus, semantic navigation, zoom, and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expectNoSeriousAccessibilityViolations(page);
  await finishOnboarding(page);
  await expectNoSeriousAccessibilityViolations(page);

  const mainNavigation = page.getByRole('navigation', { name: /huvudnavigering|main navigation/i });
  await expect(mainNavigation).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  await createProject(page, 'IKEA chair in good condition');
  const projectNavigation = page.getByRole('navigation', {
    name: /arbetsyta för vara|item workspace/i,
  });
  const coach = page.getByRole('region', { name: /nästa viktiga|next important/i });
  await expect(projectNavigation).toBeVisible();
  await expect(coach).toBeVisible();
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

  await expect.poll(() => directChildOverlapPairs(page.locator('.app-header'))).toEqual([]);
  await expect.poll(() => directChildOverlapPairs(coach)).toEqual([]);
  await expect.poll(() => directChildOverlapPairs(page.locator('.item-intake-grid'))).toEqual([]);

  const fileInputFitsDropzone = await page
    .locator('.image-dropzone input[type="file"]')
    .evaluate((input) => {
      const inputRect = input.getBoundingClientRect();
      const dropzoneRect = input.parentElement?.getBoundingClientRect();
      return Boolean(
        dropzoneRect &&
        inputRect.left >= dropzoneRect.left - 1 &&
        inputRect.right <= dropzoneRect.right + 1,
      );
    });
  expect(fileInputFitsDropzone).toBe(true);

  await expectNoSeriousAccessibilityViolations(page);
});

test('keeps a failed autosave draft isolated until retry succeeds', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);
  await createProject(page, 'Alpha original description', 'Alpha project');
  await page.waitForTimeout(1_000);

  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await createProject(page, 'Beta original description', 'Beta project');
  await page.waitForTimeout(1_000);
  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await page.locator('.project-list__open').filter({ hasText: 'Alpha project' }).click();
  await expect(page.getByRole('heading', { name: 'Alpha project' })).toBeVisible();

  await page.evaluate(() => {
    type PatchedObjectStore = typeof IDBObjectStore.prototype & {
      __v4OriginalPut?: IDBObjectStore['put'];
    };
    const prototype = IDBObjectStore.prototype as PatchedObjectStore;
    Object.defineProperty(prototype, '__v4OriginalPut', {
      configurable: true,
      value: prototype.put,
    });
    prototype.put = (() => {
      throw new DOMException('Forced persistence failure', 'QuotaExceededError');
    }) as IDBObjectStore['put'];
  });

  const description = page.getByRole('textbox', {
    name: /varubeskrivning|item description/i,
  });
  await description.fill('Alpha unsaved edit');
  await expect(page.locator('.save-status')).toContainText(/kunde inte spara|could not save/i);
  await expect(
    page.getByRole('button', { name: /försök spara igen|try saving again/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await page.locator('.project-list__open').filter({ hasText: 'Beta project' }).click();
  await expect(page.getByRole('heading', { name: 'Alpha project' })).toBeVisible();
  await expect(description).toHaveValue('Alpha unsaved edit');

  await page.evaluate(() => {
    type PatchedObjectStore = typeof IDBObjectStore.prototype & {
      __v4OriginalPut?: IDBObjectStore['put'];
    };
    const prototype = IDBObjectStore.prototype as PatchedObjectStore;
    if (prototype.__v4OriginalPut) prototype.put = prototype.__v4OriginalPut;
    Reflect.deleteProperty(prototype, '__v4OriginalPut');
  });
  await page.getByRole('button', { name: /försök spara igen|try saving again/i }).click();
  await expect(page.locator('.save-status')).toContainText(/^sparad|^saved/i);

  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await page.locator('.project-list__open').filter({ hasText: 'Beta project' }).click();
  await expect(page.getByRole('heading', { name: 'Beta project' })).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: /varubeskrivning|item description/i }),
  ).toHaveValue('Beta original description');
  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();
  await page.locator('.project-list__open').filter({ hasText: 'Alpha project' }).click();
  await expect(
    page.getByRole('textbox', { name: /varubeskrivning|item description/i }),
  ).toHaveValue('Alpha unsaved edit');
});

test('searches, renames, archives, trashes, and restores a project safely', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);
  await createProject(page, 'Projekt för säker hantering');
  await page.getByRole('button', { name: /^projekt$|^projects$/i }).click();

  await page.getByLabel(/sök projekt|search projects/i).fill('E2E test');
  await expect(page.getByText('E2E test project').first()).toBeVisible();

  await page.getByRole('button', { name: /projektåtgärder|project actions/i }).click();
  await page.getByRole('menuitem', { name: /byt namn|rename/i }).click();
  const renameDialog = page.getByRole('dialog', { name: /byt projektnamn|rename project/i });
  await renameDialog.getByLabel(/projektnamn|project name/i).fill('Omdöpt projekt');
  await renameDialog.getByRole('button', { name: /spara namn|save name/i }).click();
  await page.getByLabel(/sök projekt|search projects/i).fill('');
  await expect(page.getByText('Omdöpt projekt').first()).toBeVisible();

  await page.getByRole('button', { name: /projektåtgärder|project actions/i }).click();
  await page.getByRole('menuitem', { name: /^arkivera$|^archive$/i }).click();
  await expect(page.getByText('Omdöpt projekt')).toBeHidden();
  await page.getByLabel(/visa arkiverade|show archived/i).check();
  await expect(page.getByText('Omdöpt projekt').first()).toBeVisible();

  await page.getByRole('button', { name: /projektåtgärder|project actions/i }).click();
  await page.getByRole('menuitem', { name: /flytta till papperskorgen|move to trash/i }).click();
  await expect(page.getByRole('status')).toContainText(/papperskorgen|trash/i);
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('button', { name: /ångra|undo/i }).click();
  await expect(page.getByText('Omdöpt projekt').first()).toBeVisible();
});

test('keeps the unsupported-data recovery view accessible', async ({ page }) => {
  await page.goto('/');
  await finishOnboarding(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('swedish-secondhand-ai-v2');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('project-records', 'readwrite');
          transaction
            .objectStore('project-records')
            .put({ schemaVersion: 999 }, 'meta:project-index-v4');
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
  );

  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: /projektdata behöver återställas|project data needs recovery/i,
    }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
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
  await expect(page.getByRole('heading', { name: /^bilder$|^photos$/i })).toBeVisible();
  await expect(page.getByText(/låg upplösning|low resolution/i)).toBeVisible();
  await page
    .getByRole('textbox', { name: /varubeskrivning|item description/i })
    .fill('Sony kamera i bra skick');
  await page.getByRole('button', { name: /identifiera vara|identify item/i }).click();
  await page.getByText(/granska analysunderlag|review analysis evidence/i).click();

  await expect(
    page.getByRole('heading', { name: /faktakandidater|fact candidates/i }),
  ).toBeVisible();
  await expect(page.getByText(/offline.*(hög|high)/i).first()).toBeVisible();
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
            category: 'Vintage wonder',
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
    .getByRole('textbox', { name: /varubeskrivning|item description/i })
    .fill('Sony camera in good condition');
  await page.getByRole('button', { name: /identifiera vara|identify item/i }).click();
  await expect(page.getByRole('heading', { name: /granska fakta|review facts/i })).toBeVisible();

  await page.getByText(/rekommenderade fakta|recommended facts/i).click();
  const modelField = page
    .locator('.detected-item .review-fact')
    .filter({ hasText: /modell|model/i });
  await modelField.locator('input').first().fill('A6400');
  await modelField.locator('input').first().blur();
  await modelField.getByText(/källa och låsning|source and lock/i).click();
  await expect(modelField.locator('input[type="checkbox"]')).toBeChecked();

  await workspaceTab(page, /pris|price/i).click();
  await page.getByText(/evidensbaserad värdering|evidence-based valuation/i).click();
  await expect(page.getByRole('heading', { name: /sökplan|search plan/i })).toBeVisible();
  const form = page.locator('form.manual-comp');
  await form.getByLabel(/pristyp|price type/i).selectOption('realized');
  for (const [index, [title, price]] of [
    ['Sony A6400 camera Vintage wonder', '5000'],
    ['Sony A6400 mirrorless Vintage wonder', '5500'],
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
  await page
    .getByRole('button', { name: /använd evidensbaserat pris|use evidence-based price/i })
    .click();

  await page.getByRole('button', { name: /jämför prisscenarier|compare price scenarios/i }).click();
  await expect(page.getByRole('heading', { name: /prisverkstad|pricing workshop/i })).toBeVisible();
  await expect(page.locator('.scenario-grid article')).toHaveCount(3);

  await workspaceTab(page, /annons|listing/i).click();
  await page
    .getByRole('button', { name: /uppdatera orörda fält|update untouched fields/i })
    .click();
  await expect(page.locator('.listing-editor')).toHaveCount(1);
  await expect(page.locator('.listing-editor')).not.toContainText('undefined');
  await expect(
    page.getByText(/rekommenderad kanal och strategi|recommended channel and strategy/i),
  ).toBeVisible();

  await page.getByRole('tab', { name: /tradera/i }).click();
  const traderaEditor = page.locator('.listing-editor');
  const titleInput = traderaEditor
    .locator('label')
    .filter({ hasText: /titel|title/i })
    .locator('input');
  await titleInput.fill('Min egen Sony A6400-rubrik');
  await page
    .getByRole('button', { name: /uppdatera orörda fält|update untouched fields/i })
    .click();
  await expect(titleInput).toHaveValue('Min egen Sony A6400-rubrik');
  await page.getByRole('button', { name: /ersätt även min text|replace my text too/i }).click();
  const replaceDialog = page.getByRole('dialog', {
    name: /ersätt dina redigerade annonsfält|replace your edited listing fields/i,
  });
  await expect(replaceDialog).toContainText(/titel|title/i);
  await replaceDialog.getByRole('button', { name: /avbryt|cancel/i }).click();
  await expect(titleInput).toHaveValue('Min egen Sony A6400-rubrik');
  await page.getByRole('button', { name: /ersätt även min text|replace my text too/i }).click();
  await page
    .getByRole('dialog', {
      name: /ersätt dina redigerade annonsfält|replace your edited listing fields/i,
    })
    .getByRole('button', { name: /ersätt listade fält|replace listed fields/i })
    .click();
  await expect(titleInput).not.toHaveValue('Min egen Sony A6400-rubrik');
  await expect(page.getByRole('heading', { name: /blockerare|blockers/i }).first()).toBeVisible();

  await workspaceTab(page, /klart|done/i).click();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByLabel(/annons-url|listing url/i).fill('https://www.blocket.se/annons/test');
  await page.getByLabel(/faktiskt utgångspris|actual starting price/i).fill('5500');
  await page.getByRole('button', { name: /markera som publicerad|mark as listed/i }).click();
  await expect(page.getByText(/publicerad|listed/i).first()).toBeVisible();

  await page.getByLabel(/verifierat slutpris|verified final price/i).fill('5200');
  await page.getByRole('button', { name: /markera såld|mark sold/i }).click();
  await expect(page.getByText(/såld för 5200 SEK|sold for 5200 SEK/i)).toBeVisible();

  await page.getByRole('button', { name: /inställningar|settings/i }).click();
  await expect(page.getByRole('heading', { name: /inställningar|settings/i })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});
