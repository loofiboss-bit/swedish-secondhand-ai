import { create } from 'zustand';
import type {
  ListingTemplate,
  MarketplaceSite,
  PolicyCheckResult,
  QualityScoreReport,
} from '@core/types';
import { listingTemplateService } from '@core/services/listingTemplateService';
import { qualityScoreService } from '@core/services/qualityScoreService';
import { sitePolicyService } from '@core/services/sitePolicyService';

interface ListingState {
  templates: ListingTemplate[];
  selectedSite: MarketplaceSite | 'all';
  qualityReport: Partial<Record<MarketplaceSite, QualityScoreReport>>;
  siteValidation: Partial<Record<MarketplaceSite, PolicyCheckResult>>;
  setTemplates: (templates: ListingTemplate[]) => void;
  setSelectedSite: (site: MarketplaceSite | 'all') => void;
  exportCopyBundle: (site: MarketplaceSite) => string;
  hasBlockingIssues: () => boolean;
  clear: () => void;
  hydrateFromDraft: (templates: ListingTemplate[]) => void;
}

function buildAssessmentState(
  templates: ListingTemplate[],
): Pick<ListingState, 'qualityReport' | 'siteValidation'> {
  const qualityReport: Partial<Record<MarketplaceSite, QualityScoreReport>> = {};
  const siteValidation: Partial<Record<MarketplaceSite, PolicyCheckResult>> = {};

  for (const template of templates) {
    const policy = sitePolicyService.validate(template.site, template);
    const quality = qualityScoreService.scoreWithPolicy(template, policy);
    qualityReport[template.site] = quality;
    siteValidation[template.site] = policy;
  }

  return { qualityReport, siteValidation };
}

export const useListingStore = create<ListingState>((set, get) => ({
  templates: [],
  selectedSite: 'all',
  qualityReport: {},
  siteValidation: {},
  setTemplates: (templates) => {
    const assessment = buildAssessmentState(templates);
    set({ templates, ...assessment });
  },
  setSelectedSite: (selectedSite) => set({ selectedSite }),
  exportCopyBundle: (site) => {
    const template = get().templates.find((item) => item.site === site);
    return template ? listingTemplateService.exportCopyBundle(template) : '';
  },
  hasBlockingIssues: () =>
    Object.values(get().siteValidation).some((result) => (result?.blockingIssues ?? 0) > 0),
  clear: () =>
    set({
      templates: [],
      selectedSite: 'all',
      qualityReport: {},
      siteValidation: {},
    }),
  hydrateFromDraft: (templates) => {
    const assessment = buildAssessmentState(templates);
    set({ templates, ...assessment });
  },
}));
