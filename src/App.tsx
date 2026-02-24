import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalyzePanel } from '@features/analyze/AnalyzePanel';
import { HistoryPanel } from '@features/history/HistoryPanel';
import { SettingsPanel } from '@features/settings/SettingsPanel';
import { TemplatesPanel } from '@features/templates/TemplatesPanel';
import { ValuationPanel } from '@features/valuation/ValuationPanel';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { setAppLanguage } from '@core/config/i18n';

export function App() {
  const { t } = useTranslation('common');
  const { settings, load } = useSettingsStore();
  const { error, loadManualComparables } = useValuationStore();

  useEffect(() => {
    void load();
    void loadManualComparables();
  }, [load, loadManualComparables]);

  useEffect(() => {
    void setAppLanguage(settings.language);
  }, [settings.language]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        <p>{t('subtitle')}</p>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <main className="app-grid">
        <AnalyzePanel />
        <ValuationPanel />
        <TemplatesPanel />
        <HistoryPanel />
        <SettingsPanel />
      </main>
    </div>
  );
}
