import { useTranslation } from 'react-i18next';
import type { FactSource } from '@core/types';

interface FactProvenanceProps {
  source?: FactSource;
  locked?: boolean;
  onLock?: (locked: boolean) => void;
}

export function FactProvenance({ source, locked, onLock }: FactProvenanceProps) {
  const { t } = useTranslation('common');
  const visible = Boolean(source && (source !== 'user' || locked));
  if (!visible || !source) return null;

  return (
    <details className="fact-explanation">
      <summary>{t('factProvenance')}</summary>
      <p>
        {t('factSource')}: {t(`factSource_${source}`)}
      </p>
      {onLock && (
        <label>
          <input
            type="checkbox"
            checked={Boolean(locked)}
            onChange={(event) => onLock(event.target.checked)}
          />{' '}
          {t('lockFact')}
        </label>
      )}
    </details>
  );
}
