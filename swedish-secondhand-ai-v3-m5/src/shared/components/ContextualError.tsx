import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppErrorCode } from '@core/types';

export function ContextualError({ code }: { code: AppErrorCode | null | undefined }) {
  const { t } = useTranslation('common');
  const [dismissedCode, setDismissedCode] = useState<AppErrorCode | null>(null);
  if (!code || dismissedCode === code) return null;
  return (
    <aside className="contextual-error" role="alert">
      <div>
        <strong>{t(`errorTitle_${code}`)}</strong>
        <p>{t(`errorExplanation_${code}`)}</p>
        <small>{t(`errorAction_${code}`)}</small>
      </div>
      <button type="button" onClick={() => setDismissedCode(code)} aria-label={t('dismissError')}>
        ×
      </button>
    </aside>
  );
}
