import { create } from 'zustand';
import type {
  ListingTemplate,
  ListingDraftFieldKey,
  ListingReadinessIssue,
  MarketplaceListingDraft,
  MarketplaceSite,
  PolicyCheckResult,
  QualityScoreReport,
  SellPlan,
  SellerTimePreference,
} from '@core/types';
import { listingTemplateService } from '@core/services/listingTemplateService';
import { qualityScoreService } from '@core/services/qualityScoreService';
import { sitePolicyService } from '@core/services/sitePolicyService';
import { listingReadinessService } from '@core/services/listingReadinessService';

interface ListingState {
  templates: ListingTemplate[];
  listingDrafts: MarketplaceListingDraft[];
  sellerTimePreference: SellerTimePreference;
  sellPlan: SellPlan | null;
  selectedSite: MarketplaceSite | 'all';
  qualityReport: Partial<Record<MarketplaceSite, QualityScoreReport>>;
  siteValidation: Partial<Record<MarketplaceSite, PolicyCheckResult>>;
  setTemplates: (templates: ListingTemplate[]) => void;
  setListingDrafts: (drafts: MarketplaceListingDraft[]) => void;
  updateListingField: (
    site: MarketplaceSite,
    field: ListingDraftFieldKey,
    value: string | number | string[],
  ) => void;
  moveImage: (site: MarketplaceSite, imageIndex: number, direction: -1 | 1) => void;
  setCoverImage: (site: MarketplaceSite, imageIndex: number) => void;
  getReadiness: (site: MarketplaceSite) => ListingReadinessIssue[];
  setSellPlan: (preference: SellerTimePreference, plan: SellPlan) => void;
  setSelectedSite: (site: MarketplaceSite | 'all') => void;
  exportCopyBundle: (site: MarketplaceSite) => string;
  hasBlockingIssues: () => boolean;
  clear: () => void;
  hydrateFromDraft: (
    templates: ListingTemplate[],
    drafts?: MarketplaceListingDraft[],
    preference?: SellerTimePreference,
    sellPlan?: SellPlan,
  ) => void;
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
  listingDrafts: [],
  sellerTimePreference: 'balanced',
  sellPlan: null,
  selectedSite: 'all',
  qualityReport: {},
  siteValidation: {},
  setTemplates: (templates) => {
    const assessment = buildAssessmentState(templates);
    const listingDrafts = templates.map((template) =>
      listingTemplateService.draftFromLegacyTemplate(template),
    );
    set({ templates, listingDrafts, ...assessment });
  },
  setListingDrafts: (listingDrafts) => {
    const templates = listingDrafts.map((draft) => listingTemplateService.toTemplate(draft));
    set({ listingDrafts, templates, ...buildAssessmentState(templates) });
  },
  updateListingField: (site, field, value) => {
    const listingDrafts = get().listingDrafts.map((draft) =>
      draft.site === site
        ? {
            ...draft,
            updatedAt: new Date().toISOString(),
            fields: {
              ...draft.fields,
              [field]: { value, origin: 'user' as const, userEdited: true },
            },
          }
        : draft,
    ) as MarketplaceListingDraft[];
    get().setListingDrafts(listingDrafts);
  },
  moveImage: (site, imageIndex, direction) => {
    const listingDrafts = get().listingDrafts.map((draft) => {
      if (draft.site !== site) return draft;
      const current = draft.imageOrder.indexOf(imageIndex);
      const target = current + direction;
      if (current < 0 || target < 0 || target >= draft.imageOrder.length) return draft;
      const imageOrder = [...draft.imageOrder];
      [imageOrder[current], imageOrder[target]] = [imageOrder[target], imageOrder[current]];
      return { ...draft, imageOrder, updatedAt: new Date().toISOString() };
    });
    get().setListingDrafts(listingDrafts);
  },
  setCoverImage: (site, imageIndex) => {
    const listingDrafts = get().listingDrafts.map((draft) =>
      draft.site === site && draft.imageOrder.includes(imageIndex)
        ? { ...draft, coverImageIndex: imageIndex, updatedAt: new Date().toISOString() }
        : draft,
    );
    get().setListingDrafts(listingDrafts);
  },
  getReadiness: (site) => {
    const draft = get().listingDrafts.find((candidate) => candidate.site === site);
    return draft ? listingReadinessService.assess(draft) : [];
  },
  setSellPlan: (sellerTimePreference, sellPlan) =>
    set({ sellerTimePreference, sellPlan, selectedSite: sellPlan.marketplace }),
  setSelectedSite: (selectedSite) => set({ selectedSite }),
  exportCopyBundle: (site) => {
    const draft = get().listingDrafts.find((item) => item.site === site);
    return draft ? listingTemplateService.exportStructuredCopyPackage(draft) : '';
  },
  hasBlockingIssues: () =>
    get().listingDrafts.some((draft) =>
      listingReadinessService.assess(draft).some((issue) => issue.severity === 'blocker'),
    ),
  clear: () =>
    set({
      templates: [],
      listingDrafts: [],
      sellerTimePreference: 'balanced',
      sellPlan: null,
      selectedSite: 'all',
      qualityReport: {},
      siteValidation: {},
    }),
  hydrateFromDraft: (templates, drafts, sellerTimePreference = 'balanced', sellPlan) => {
    const listingDrafts =
      drafts ??
      templates.map((template) => listingTemplateService.draftFromLegacyTemplate(template));
    const normalizedTemplates = listingDrafts.map((draft) =>
      listingTemplateService.toTemplate(draft),
    );
    const assessment = buildAssessmentState(normalizedTemplates);
    set({
      templates: normalizedTemplates,
      listingDrafts,
      sellerTimePreference,
      sellPlan: sellPlan ?? null,
      ...assessment,
    });
  },
}));
