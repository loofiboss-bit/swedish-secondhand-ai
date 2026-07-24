import { useMemo } from 'react';
import { evaluateProjectReadiness } from '@core/services/projectReadinessService';
import { useListingStore } from './useListingStore';
import { useProjectStore } from './useProjectStore';
import { useValuationStore } from './useValuationStore';
import type { ProjectStatus } from '@core/types';

export function useActiveProjectReadiness(projectStatusOverride?: ProjectStatus) {
  const activeProject = useProjectStore((state) => state.activeProject);
  const facts = useValuationStore((state) => state.productFacts);
  const photos = useValuationStore((state) => state.photoAssessments);
  const traderaComps = useValuationStore((state) => state.traderaComps);
  const manualComps = useValuationStore((state) => state.manualComps);
  const valuation = useValuationStore((state) => state.valuation);
  const listingDrafts = useListingStore((state) => state.listingDrafts);
  const legacyListings = useListingStore((state) => state.templates);
  const selectedSite = useListingStore((state) => state.selectedSite);
  const sellPlan = useListingStore((state) => state.sellPlan);

  return useMemo(
    () =>
      evaluateProjectReadiness({
        facts,
        photos,
        comparables: [...traderaComps, ...manualComps],
        valuation,
        priceDecision: activeProject?.priceDecision ?? { kind: 'unset' },
        listingDrafts,
        legacyListings,
        selectedMarketplace: selectedSite === 'all' ? null : selectedSite,
        sellPlan,
        projectStatus: projectStatusOverride ?? activeProject?.status ?? 'draft',
        outcome: activeProject?.outcome,
      }),
    [
      activeProject?.outcome,
      activeProject?.priceDecision,
      activeProject?.status,
      facts,
      legacyListings,
      listingDrafts,
      manualComps,
      photos,
      selectedSite,
      sellPlan,
      traderaComps,
      valuation,
      projectStatusOverride,
    ],
  );
}
