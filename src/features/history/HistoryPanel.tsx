import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { historyService } from '@core/services/historyService';
import type { HistoryEntry } from '@core/types';
import { SectionCard } from '@shared/components/SectionCard';

export function HistoryPanel() {
  const { t } = useTranslation('common');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    void historyService.list().then((entries) => setHistory(entries));
  }, []);

  return (
    <SectionCard title={t('history')}>
      <ul className="history-list">
        {history.map((entry) => (
          <li key={entry.id}>
            <h3>{entry.fingerprint.title}</h3>
            <p>
              {entry.valuation.priceRecommendedSek} SEK (
              {Math.round(entry.valuation.confidence * 100)}%)
            </p>
            <p>{new Date(entry.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
