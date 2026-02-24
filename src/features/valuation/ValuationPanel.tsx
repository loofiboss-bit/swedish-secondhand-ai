import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useValuationStore } from '@core/store/useValuationStore';
import { SectionCard } from '@shared/components/SectionCard';
import type { MarketplaceSite } from '@core/types';

const DEFAULT_SITE: MarketplaceSite = 'blocket';

export function ValuationPanel() {
  const { t } = useTranslation('common');
  const {
    loading,
    valuation,
    traderaComps,
    manualComps,
    fetchTraderaComparables,
    addManualComparable,
    removeManualComparable,
    estimateValue,
    saveToHistory,
  } = useValuationStore();

  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualSite, setManualSite] = useState<MarketplaceSite>(DEFAULT_SITE);

  const allComparables = useMemo(
    () => [...traderaComps, ...manualComps],
    [traderaComps, manualComps],
  );

  const submitManualComp = async (event: FormEvent) => {
    event.preventDefault();
    const numericPrice = Number(manualPrice);
    if (!manualTitle.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      return;
    }

    await addManualComparable({
      site: manualSite,
      title: manualTitle.trim(),
      priceSek: numericPrice,
      soldAt: new Date().toISOString(),
      conditionHint: 'User provided',
      url: '',
      similarityScore: 0.6,
    });

    setManualTitle('');
    setManualPrice('');
  };

  return (
    <SectionCard title={t('estimate')}>
      <div className="inline-actions">
        <button type="button" onClick={() => void fetchTraderaComparables()} disabled={loading}>
          {t('fetchTradera')}
        </button>
        <button type="button" onClick={() => void estimateValue()} disabled={loading}>
          {t('estimate')}
        </button>
        <button type="button" onClick={() => void saveToHistory()} disabled={loading}>
          {t('saveHistory')}
        </button>
      </div>

      <form className="manual-comp" onSubmit={(event) => void submitManualComp(event)}>
        <h3>{t('manualComps')}</h3>
        <input
          value={manualTitle}
          onChange={(event) => setManualTitle(event.target.value)}
          placeholder={t('title')}
        />
        <input
          value={manualPrice}
          onChange={(event) => setManualPrice(event.target.value)}
          type="number"
          min={1}
          placeholder={t('priceSek')}
        />
        <select
          value={manualSite}
          onChange={(event) => setManualSite(event.target.value as MarketplaceSite)}
        >
          <option value="blocket">Blocket</option>
          <option value="vinted">Vinted</option>
          <option value="tradera">Tradera</option>
        </select>
        <button type="submit">{t('addComp')}</button>
      </form>

      <ul className="comparable-list">
        {allComparables.map((comp) => (
          <li key={comp.id}>
            <span>
              [{comp.site}] {comp.title} - {Math.round(comp.priceSek)} SEK
            </span>
            {comp.source === 'manual' && (
              <button type="button" onClick={() => void removeManualComparable(comp.id)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {valuation && (
        <div className="valuation-box" aria-label={t('valuationResult')}>
          <h3>{t('valuationResult')}</h3>
          <p>
            {t('range')}: {valuation.priceMinSek} - {valuation.priceMaxSek} SEK
          </p>
          <p>
            {t('recommended')}: <strong>{valuation.priceRecommendedSek} SEK</strong>
          </p>
          <p>
            {t('confidence')}: {Math.round(valuation.confidence * 100)}%
          </p>
          <p>
            {t('rationale')}: {valuation.rationale}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
