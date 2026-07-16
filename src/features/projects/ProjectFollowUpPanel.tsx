import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketplaceSite, ProjectSection } from '@core/types';
import { followUpService } from '@core/services/followUpService';
import { useProjectStore } from '@core/store/useProjectStore';
import { SectionCard } from '@shared/components/SectionCard';

interface ProjectFollowUpPanelProps {
  onNavigate: (section: ProjectSection, targetId?: string) => void;
}

export function ProjectFollowUpPanel({ onNavigate }: ProjectFollowUpPanelProps) {
  const { t } = useTranslation('common');
  const { activeProject, updateActiveOutcome, setActiveStatus } = useProjectStore();
  const today = new Date().toISOString().slice(0, 10);
  const [marketplace, setMarketplace] = useState<MarketplaceSite>('blocket');
  const [listedAt, setListedAt] = useState(today);
  const [listingUrl, setListingUrl] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [soldAt, setSoldAt] = useState(today);
  const actions = useMemo(
    () => followUpService.buildActions(activeProject?.outcome),
    [activeProject?.outcome],
  );
  if (!activeProject) return null;

  const outcome = activeProject.outcome;
  const publish = async (event: FormEvent) => {
    event.preventDefault();
    const price = Number(askingPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    await updateActiveOutcome({
      saleStatus: 'pending',
      marketplace,
      listedAt: `${listedAt}T12:00:00.000Z`,
      listingUrl: listingUrl.trim() || undefined,
      askingPriceSek: price,
    });
  };

  const markSold = async (event: FormEvent) => {
    event.preventDefault();
    const price = Number(soldPrice);
    if (!outcome?.listedAt || !Number.isFinite(price) || price <= 0) return;
    await updateActiveOutcome({
      ...outcome,
      saleStatus: 'sold',
      soldPriceSek: price,
      soldAt: `${soldAt}T12:00:00.000Z`,
      pausedAt: undefined,
    });
  };

  const pause = async () => {
    await updateActiveOutcome({
      ...(outcome ?? { saleStatus: 'pending' as const }),
      saleStatus: 'pending',
      pausedAt: new Date().toISOString(),
    });
    await setActiveStatus('paused');
  };

  return (
    <SectionCard title={t('projectSection_follow-up')}>
      {!outcome?.listedAt ? (
        <form className="follow-up-form" onSubmit={(event) => void publish(event)}>
          <h3>{t('recordPublication')}</h3>
          <label className="field">
            <span>{t('marketplace')}</span>
            <select
              value={marketplace}
              onChange={(event) => setMarketplace(event.target.value as MarketplaceSite)}
            >
              <option value="tradera">Tradera</option>
              <option value="blocket">Blocket</option>
              <option value="vinted">Vinted</option>
            </select>
          </label>
          <label className="field">
            <span>{t('publicationDate')}</span>
            <input
              type="date"
              max={today}
              value={listedAt}
              onChange={(event) => setListedAt(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>{t('listingUrlOptional')}</span>
            <input
              type="url"
              maxLength={2048}
              placeholder="https://"
              value={listingUrl}
              onChange={(event) => setListingUrl(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('actualAskingPrice')}</span>
            <input
              type="number"
              min={1}
              max={10_000_000}
              value={askingPrice}
              onChange={(event) => setAskingPrice(event.target.value)}
              required
            />
          </label>
          <button type="submit">{t('markProjectListed')}</button>
        </form>
      ) : (
        <>
          <dl className="publication-summary">
            <div>
              <dt>{t('marketplace')}</dt>
              <dd>{outcome.marketplace}</dd>
            </div>
            <div>
              <dt>{t('publicationDate')}</dt>
              <dd>{new Date(outcome.listedAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>{t('actualAskingPrice')}</dt>
              <dd>{outcome.askingPriceSek} SEK</dd>
            </div>
            <div>
              <dt>{t('projectStatusLabel')}</dt>
              <dd>{t(`projectStatus_${activeProject.status}`)}</dd>
            </div>
          </dl>
          {outcome.listingUrl && <p className="source-url">{outcome.listingUrl}</p>}

          {actions.length > 0 && (
            <section className="follow-up-actions" aria-labelledby="follow-up-actions-title">
              <h3 id="follow-up-actions-title">{t('dueFollowUpActions')}</h3>
              <ul>
                {actions.map((action) => (
                  <li key={action.id}>
                    <div>
                      <strong>{t(action.titleKey)}</strong>
                      <p>{t(action.reasonKey)}</p>
                      <small>
                        {t('recommendationBasis')}: {t(`basis_${action.basis}`)}
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          action.kind === 'photos'
                            ? 'item'
                            : action.kind === 'price'
                              ? 'market'
                              : 'listing',
                          action.kind === 'photos'
                            ? 'photo-checklist'
                            : action.kind === 'price'
                              ? 'valuation'
                              : 'listing-studio',
                        )
                      }
                    >
                      {t('openCoachAction')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {outcome.saleStatus === 'sold' ? (
            <p className="outcome-confirmed">
              {t('soldOutcomeSummary', {
                price: outcome.soldPriceSek,
                days: outcome.saleDurationDays,
              })}
            </p>
          ) : (
            <form className="follow-up-form" onSubmit={(event) => void markSold(event)}>
              <h3>{t('recordOutcome')}</h3>
              <label className="field">
                <span>{t('finalSoldPrice')}</span>
                <input
                  type="number"
                  min={1}
                  max={10_000_000}
                  value={soldPrice}
                  onChange={(event) => setSoldPrice(event.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>{t('soldDate')}</span>
                <input
                  type="date"
                  min={outcome.listedAt.slice(0, 10)}
                  max={today}
                  value={soldAt}
                  onChange={(event) => setSoldAt(event.target.value)}
                  required
                />
              </label>
              <div className="inline-actions">
                <button type="submit">{t('markSold')}</button>
                <button
                  type="button"
                  onClick={() =>
                    void updateActiveOutcome({
                      ...outcome,
                      saleStatus: 'not_sold',
                      pausedAt: new Date().toISOString(),
                    })
                  }
                >
                  {t('markNotSold')}
                </button>
                <button type="button" onClick={() => void pause()}>
                  {t('pauseProject')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <p className="privacy-summary">{t('followUpAdviceOnly')}</p>
    </SectionCard>
  );
}
