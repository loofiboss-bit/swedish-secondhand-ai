import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { historyService } from '@core/services/historyService';
import type { HistoryEntry, SaleStatus } from '@core/types';
import { SectionCard } from '@shared/components/SectionCard';

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function HistoryPanel() {
  const { t } = useTranslation('common');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soldPriceInput, setSoldPriceInput] = useState('');

  const deferredQuery = useDeferredValue(query);

  const loadEntries = async () => {
    const entries = await historyService.list(200);
    setHistory(entries);
    setSelectedId((current) => current ?? entries[0]?.id ?? null);
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void historyService.list(200).then((entries) => {
        if (!active) return;
        setHistory(entries);
        setSelectedId((current) => current ?? entries[0]?.id ?? null);
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    return history.filter((entry) => {
      const matchesStatus = statusFilter === 'all' || entry.saleStatus === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        entry.fingerprint.title.toLowerCase().includes(normalizedQuery) ||
        entry.fingerprint.brand.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [history, deferredQuery, statusFilter]);

  const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0] ?? null;

  const updateOutcome = async (status: SaleStatus) => {
    if (!selected) return;
    const soldPrice = Number(soldPriceInput);
    const nextPrice = Number.isFinite(soldPrice) && soldPrice > 0 ? soldPrice : undefined;
    await historyService.setSaleOutcome(selected.id, status, nextPrice);
    await loadEntries();
  };

  return (
    <SectionCard title={t('history')}>
      <div className="history-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchHistory')}
          aria-label={t('searchHistory')}
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as SaleStatus | 'all')}
        >
          <option value="all">{t('allStatuses')}</option>
          <option value="pending">{t('statusPending')}</option>
          <option value="sold">{t('statusSold')}</option>
          <option value="not_sold">{t('statusNotSold')}</option>
        </select>
      </div>

      <div className="history-layout">
        <ul className="history-list">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={`history-item-btn ${selected?.id === entry.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(entry.id)}
              >
                <h3>{entry.fingerprint.title}</h3>
                <p>
                  {entry.valuation.priceRecommendedSek} SEK (
                  {Math.round(entry.valuation.confidence * 100)}%)
                </p>
                <p>{formatDate(entry.createdAt)}</p>
                <p>
                  {t(
                    `status${
                      entry.saleStatus === 'not_sold'
                        ? 'NotSold'
                        : entry.saleStatus === 'sold'
                          ? 'Sold'
                          : 'Pending'
                    }`,
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <aside className="history-detail" aria-label={t('historyDetail')}>
            <h3>{selected.fingerprint.title}</h3>
            <p>
              {t('recommended')}: {selected.valuation.priceRecommendedSek} SEK
            </p>
            <p>
              {t('range')}: {selected.valuation.priceMinSek} - {selected.valuation.priceMaxSek} SEK
            </p>
            <p>{selected.valuation.rationale}</p>

            <label className="field">
              <span>{t('soldPriceOptional')}</span>
              <input
                type="number"
                min={1}
                value={soldPriceInput}
                onChange={(event) => setSoldPriceInput(event.target.value)}
                placeholder={t('priceSek')}
              />
            </label>

            <div className="inline-actions">
              <button type="button" onClick={() => void updateOutcome('sold')}>
                {t('markSold')}
              </button>
              <button type="button" onClick={() => void updateOutcome('not_sold')}>
                {t('markNotSold')}
              </button>
              <button type="button" onClick={() => void updateOutcome('pending')}>
                {t('markPending')}
              </button>
            </div>
          </aside>
        )}
      </div>
    </SectionCard>
  );
}
