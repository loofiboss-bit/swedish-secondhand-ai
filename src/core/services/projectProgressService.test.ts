import { describe, expect, it } from 'vitest';
import type { ItemProject } from '@core/types';
import { calculateProjectProgress } from './projectProgressService';
import { listingTemplateService } from './listingTemplateService';

function project(overrides: Partial<ItemProject> = {}): ItemProject {
  return {
    schemaVersion: 4,
    id: 'project-1',
    displayName: 'Stol',
    title: 'Stol',
    status: 'draft',
    currentSection: 'item',
    createdAt: '2026-07-17T08:00:00.000Z',
    updatedAt: '2026-07-17T08:00:00.000Z',
    priceDecision: { kind: 'unset' },
    workspace: {
      version: 1,
      savedAt: '2026-07-17T08:00:00.000Z',
      currentStep: 'analyze',
      completedSteps: [],
      pricingStrategy: 'balanced',
      inputText: '',
      fingerprint: null,
      productFacts: null,
      traderaComps: [],
      manualComps: [],
      valuation: null,
      templates: [],
      mediaIds: [],
    },
    ...overrides,
  };
}

describe('calculateProjectProgress', () => {
  it('derives progress from project data without persisting workflow state', () => {
    expect(calculateProjectProgress(project())).toMatchObject({
      currentStep: 'item',
      completedSteps: [],
    });

    const ready = project({
      priceDecision: { kind: 'user_entered', amountSek: 500 },
      workspace: {
        ...project().workspace,
        productFacts: {
          schemaVersion: 2,
          title: { value: 'Stol', source: 'user', locked: true },
          category: { value: 'Furniture', source: 'user', locked: true },
          brand: { value: '', source: 'user', locked: false },
          model: { value: '', source: 'user', locked: false },
          conditionGrade: { value: 'good', source: 'user', locked: true },
          defects: { value: [], source: 'user', locked: true },
          includedAccessories: { value: [], source: 'user', locked: true },
          missingAccessories: { value: [], source: 'user', locked: true },
          testedStatus: { value: 'unknown', source: 'user', locked: true },
          authenticityStatus: { value: 'unknown', source: 'user', locked: true },
          attributes: {
            dimensions: { value: '80 × 70 × 90 cm', source: 'user', locked: true },
          },
        },
        templates: [
          {
            site: 'blocket',
            title: 'Stol',
            description: 'En stol i gott skick.',
            priceSuggestionSek: 500,
            shippingSuggestion: 'Hämtas',
            tags: ['stol'],
            disclaimer: '',
          },
        ],
      },
    });
    ready.workspace.listingDrafts = listingTemplateService.generateListingDrafts(
      ready.workspace.productFacts!,
      ready.priceDecision,
      0,
    );

    expect(calculateProjectProgress(ready)).toEqual({
      currentStep: 'complete',
      completedSteps: ['item', 'price', 'listing', 'complete'],
      itemReady: true,
      priceReady: true,
      listingReady: true,
      complete: true,
    });
  });
});
