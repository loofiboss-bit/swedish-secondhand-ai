import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketplaceSite, MarketPriceKind, PricingStrategy } from '@core/types';
import { askingPriceRange } from '@core/services/marketIntelligenceService';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { SectionCard } from '@shared/components/SectionCard';

const DEFAULT_SITE: MarketplaceSite = 'blocket';

export function ValuationPanel() {
  const { t } = useTranslation('common');
  const {
    loading,
    error,
    valuation,
    pricingStrategy,
    traderaComps,
    manualComps,
    comparableQueryPlan,
    valuationScenarios,
    setPricingStrategy,
    fetchTraderaComparables,
    updateComparableQuery,
    setComparableQueryEnabled,
    regenerateComparableQueryPlan,
    addManualComparable,
    removeManualComparable,
    setComparableIncluded,
    estimateValue,
    compareScenarios,
    saveToHistory,
  } = useValuationStore();
  const { stepErrors } = useWorkflowStore();

  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualSite, setManualSite] = useState<MarketplaceSite>(DEFAULT_SITE);
  const [manualPriceKind, setManualPriceKind] = useState<MarketPriceKind>('unknown');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualUrl, setManualUrl] = useState('');
  const [priceKindFilter, setPriceKindFilter] = useState<'all' | MarketPriceKind>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'tradera' | 'manual'>('all');

  const allComparables = useMemo(
    () => [...traderaComps, ...manualComps],
    [traderaComps, manualComps],
  );
  const visibleComparables = useMemo(
    () =>
      allComparables.filter(
        (comparable) =>
          (priceKindFilter === 'all' || comparable.priceKind === priceKindFilter) &&
          (sourceFilter === 'all' || comparable.source === sourceFilter),
      ),
    [allComparables, priceKindFilter, sourceFilter],
  );
  const activeAskingRange = useMemo(() => askingPriceRange(allComparables), [allComparables]);

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
      soldAt: `${manualDate}T12:00:00.000Z`,
      priceKind: manualPriceKind,
      marketState:
        manualPriceKind === 'realized'
          ? 'sold'
          : manualPriceKind === 'asking'
            ? 'active'
            : 'unknown',
      observedAt: new Date().toISOString(),
      conditionHint: 'User provided',
      url: manualUrl.trim(),
      hitType: 'manual',
      queryVariantIds: [],
      similarityScore: 0.6,
      sourceQuality: 0.55,
    });

    setManualTitle('');
    setManualPrice('');
    setManualUrl('');
  };

  return (
    <SectionCard title={t('estimate')}>
      {(error || stepErrors.comparables || stepErrors.price) && (
        <p className="inline-warning" role="alert">
          {stepErrors.comparables || stepErrors.price || error}
        </p>
      )}

      <label className="field">
        <span>{t('pricingStrategy')}</span>
        <select
          value={pricingStrategy}
          onChange={(event) => setPricingStrategy(event.target.value as PricingStrategy)}
        >
          <option value="fast_sale">{t('strategyFastSale')}</option>
          <option value="balanced">{t('strategyBalanced')}</option>
          <option value="max_value">{t('strategyMaxValue')}</option>
        </select>
      </label>

      {comparableQueryPlan && (
        <section className="query-plan" aria-labelledby="query-plan-title">
          <header>
            <div>
              <h3 id="query-plan-title">{t('comparableQueryPlan')}</h3>
              <p>{t('comparableQueryPlanIntro')}</p>
            </div>
            <button type="button" onClick={regenerateComparableQueryPlan}>
              {t('regenerateQueryPlan')}
            </button>
          </header>
          {comparableQueryPlan.variants.map((variant) => (
            <label className="query-variant" key={variant.id}>
              <input
                type="checkbox"
                checked={variant.enabled}
                onChange={(event) => setComparableQueryEnabled(variant.id, event.target.checked)}
              />
              <span>{t(`queryType_${variant.type}`)}</span>
              <input
                value={variant.query}
                maxLength={160}
                onChange={(event) => updateComparableQuery(variant.id, event.target.value)}
                aria-label={`${t(`queryType_${variant.type}`)} ${variant.id}`}
              />
            </label>
          ))}
        </section>
      )}

      <div className="inline-actions">
        <button type="button" onClick={() => void fetchTraderaComparables()} disabled={loading}>
          {t('fetchTradera')}
        </button>
        <button type="button" onClick={() => void estimateValue()} disabled={loading}>
          {t('estimate')}
        </button>
        <button type="button" onClick={() => void compareScenarios()} disabled={loading}>
          {t('compareScenarios')}
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
        <label className="field">
          <span>{t('priceKind')}</span>
          <select
            value={manualPriceKind}
            onChange={(event) => setManualPriceKind(event.target.value as MarketPriceKind)}
          >
            <option value="unknown">{t('priceKindUnknown')}</option>
            <option value="asking">{t('priceKindAsking')}</option>
            <option value="realized">{t('priceKindRealized')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('observationDate')}</span>
          <input
            type="date"
            value={manualDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setManualDate(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>{t('sourceUrlOptional')}</span>
          <input
            type="url"
            value={manualUrl}
            maxLength={2048}
            placeholder="https://"
            onChange={(event) => setManualUrl(event.target.value)}
          />
        </label>
        <button type="submit">{t('addComp')}</button>
      </form>

      {activeAskingRange && (
        <aside className="asking-range" aria-label={t('askingPriceContext')}>
          <strong>{t('askingPriceContext')}</strong>
          <span>
            {activeAskingRange.minSek}–{activeAskingRange.maxSek} SEK · {t('median')}:{' '}
            {activeAskingRange.medianSek} SEK · {activeAskingRange.count} {t('observations')}
          </span>
          <small>{t('askingPriceNeverAnchors')}</small>
        </aside>
      )}

      <div className="comparable-filters">
        <label>
          {t('priceKind')}
          <select
            value={priceKindFilter}
            onChange={(event) => setPriceKindFilter(event.target.value as 'all' | MarketPriceKind)}
          >
            <option value="all">{t('allPriceKinds')}</option>
            <option value="realized">{t('priceKindRealized')}</option>
            <option value="asking">{t('priceKindAsking')}</option>
            <option value="unknown">{t('priceKindUnknown')}</option>
          </select>
        </label>
        <label>
          {t('source')}
          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value as 'all' | 'tradera' | 'manual')
            }
          >
            <option value="all">{t('allSources')}</option>
            <option value="tradera">Tradera</option>
            <option value="manual">{t('manual')}</option>
          </select>
        </label>
      </div>

      <ul className="comparable-list" id="comparables" tabIndex={-1}>
        {visibleComparables.map((comp) => {
          const approved =
            comp.priceKind === 'realized' &&
            comp.decision?.included === true &&
            comp.decision.decidedBy === 'user';
          return (
            <li key={comp.id}>
              <label>
                <input
                  type="checkbox"
                  checked={approved}
                  disabled={comp.priceKind !== 'realized'}
                  onChange={(event) => setComparableIncluded(comp.id, event.target.checked)}
                />{' '}
                [{comp.site}] {comp.title} - {Math.round(comp.priceSek)} SEK (
                {Math.round((comp.relevance?.score ?? comp.sourceQuality) * 100)}%)
              </label>
              <small>
                {t('hitType')}: {t(`queryType_${comp.hitType ?? 'manual'}`)} · {t('priceKind')}:{' '}
                {t(
                  `priceKind${(comp.priceKind ?? 'unknown')[0].toUpperCase()}${(comp.priceKind ?? 'unknown').slice(1)}`,
                )}
              </small>
              <small>
                {t('observedAt')}: {new Date(comp.observedAt ?? comp.soldAt).toLocaleDateString()} ·{' '}
                {t('source')}: {comp.source}
                {comp.cacheAgeMs !== undefined &&
                  ` · ${t('cacheAge')}: ${Math.max(0, Math.round(comp.cacheAgeMs / 60_000))} min`}
              </small>
              {comp.queryVariantIds && comp.queryVariantIds.length > 0 && (
                <small>
                  {t('queryProvenance')}: {comp.queryVariantIds.join(', ')}
                </small>
              )}
              {comp.url && <small className="source-url">{comp.url}</small>}
              <strong className={approved ? 'effect-included' : 'effect-context'}>
                {approved ? t('valuationEffectIncluded') : t('valuationEffectExcluded')}
              </strong>
              <small>
                {comp.decision?.reason ?? t('comparablePendingReview')} — {t('weight')}:{' '}
                {(comp.relevance?.weight ?? comp.sourceQuality).toFixed(2)}
              </small>
              {comp.relevance && <small>{comp.relevance.reason}</small>}
              <input
                aria-label={`${t('comparableReason')}: ${comp.title}`}
                defaultValue={comp.decision?.reason ?? ''}
                onBlur={(event) =>
                  setComparableIncluded(
                    comp.id,
                    comp.decision?.included ?? true,
                    event.target.value,
                  )
                }
                placeholder={t('comparableReason')}
              />
              {comp.source === 'manual' && (
                <button type="button" onClick={() => void removeManualComparable(comp.id)}>
                  {t('remove')}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {valuationScenarios.length > 0 && (
        <section className="scenario-workshop" aria-labelledby="scenario-title">
          <h3 id="scenario-title">{t('scenarioWorkshop')}</h3>
          <div className="scenario-grid">
            {valuationScenarios.map((scenario) => (
              <article key={scenario.strategy}>
                <h4>
                  {t(
                    `strategy${scenario.strategy === 'fast_sale' ? 'FastSale' : scenario.strategy === 'max_value' ? 'MaxValue' : 'Balanced'}`,
                  )}
                </h4>
                {scenario.result.status === 'insufficient-evidence' ? (
                  <p>{t('noNumericPrice')}</p>
                ) : (
                  <strong>{scenario.result.priceRecommendedSek} SEK</strong>
                )}
                <p>{scenario.result.status}</p>
                <ul>
                  {scenario.result.adjustments.map((adjustment) => (
                    <li key={adjustment.id}>
                      {adjustment.label}: {adjustment.amountSek > 0 ? '+' : ''}
                      {adjustment.amountSek} SEK ({adjustment.factor.toFixed(2)}×)
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {valuation && (
        <div
          className="valuation-box"
          id="valuation"
          tabIndex={-1}
          aria-label={t('valuationResult')}
        >
          <h3>{t('valuationResult')}</h3>
          <p>
            {t('valuationStatus')}: {valuation.status}
          </p>
          {valuation.status === 'insufficient-evidence' ? (
            <p role="status">{valuation.action}</p>
          ) : (
            <>
              <p>
                {t('range')}: {valuation.priceMinSek} - {valuation.priceMaxSek} SEK
              </p>
              <p>
                {t('recommended')}: <strong>{valuation.priceRecommendedSek} SEK</strong>
              </p>
              {valuation.status === 'low-confidence' && <p role="status">{valuation.action}</p>}
            </>
          )}
          <p>
            {t('confidence')}: {Math.round(valuation.confidence * 100)}%
          </p>
          <p>
            {t('rationale')}: {valuation.rationale}
          </p>
          <ul className="confidence-breakdown">
            <li>
              {t('factorSimilarity')}: {valuation.confidenceBreakdown.similarity}
            </li>
            <li>
              {t('factorSampleSize')}: {valuation.confidenceBreakdown.sampleSize}
            </li>
            <li>
              {t('factorSourceQuality')}: {valuation.confidenceBreakdown.sourceQuality}
            </li>
            <li>
              {t('factorCalibration')}: {valuation.confidenceBreakdown.calibration}
            </li>
          </ul>
          {valuation.adjustments.length > 0 && (
            <>
              <h4>{t('visibleAdjustments')}</h4>
              <ul>
                {valuation.adjustments.map((adjustment) => (
                  <li key={adjustment.id}>
                    {adjustment.label}: {adjustment.amountSek > 0 ? '+' : ''}
                    {adjustment.amountSek} SEK — {adjustment.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}
