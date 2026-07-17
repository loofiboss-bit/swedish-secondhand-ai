import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';

export function SummarySidebar() {
  const { t } = useTranslation('common');
  const { fingerprint, productFacts, traderaComps, manualComps, valuation, pricingStrategy } =
    useValuationStore();
  const { qualityReport, siteValidation } = useListingStore();

  const totalComps = traderaComps.length + manualComps.length;

  const qualityItems = useMemo(
    () => Object.values(qualityReport).sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0)),
    [qualityReport],
  );

  return (
    <aside className="summary-sidebar" aria-label={t('summary')}>
      <section>
        <h3>{t('summary')}</h3>
        <p>{productFacts?.title.value ?? fingerprint?.title ?? t('noItemYet')}</p>
      </section>

      <section>
        <h4>{t('pipelineStatus')}</h4>
        <ul>
          <li>
            {t('pricingStrategy')}: {t(`strategy_${pricingStrategy}`)}
          </li>
          <li>
            {t('comparablesCount')}: {totalComps}
          </li>
          <li>
            {t('recommended')}:{' '}
            {valuation?.status === 'insufficient-evidence'
              ? t('noNumericPrice')
              : valuation
                ? `${valuation.priceRecommendedSek} SEK`
                : '-'}
          </li>
          <li>
            {t('confidence')}: {valuation ? `${Math.round(valuation.confidence * 100)}%` : '-'}
          </li>
        </ul>
      </section>

      <section>
        <h4>{t('publishReadiness')}</h4>
        <ul>
          {qualityItems.length === 0 && <li>{t('noTemplatesYet')}</li>}
          {qualityItems.map((item) => {
            if (!item) return null;
            const blocking = siteValidation[item.site]?.blockingIssues ?? 0;
            return (
              <li key={item.site}>
                {t(`marketplace_${item.site}`)}: {item.score}/100{' '}
                {blocking > 0 ? `(${t('blockingIssueCount', { count: blocking })})` : ''}
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
