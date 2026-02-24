import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { SectionCard } from '@shared/components/SectionCard';

export function SettingsPanel() {
  const { t } = useTranslation('common');
  const { settings, setLanguage, setGeminiApiKey, setTraderaApiKey } = useSettingsStore();

  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [traderaKeyInput, setTraderaKeyInput] = useState('');

  return (
    <SectionCard title={t('settings')}>
      <div className="settings-grid">
        <label className="field">
          <span>{t('language')}</span>
          <select
            value={settings.language}
            onChange={(event) => {
              const lang = event.target.value as 'sv' | 'en';
              void setLanguage(lang);
              void setAppLanguage(lang);
            }}
          >
            <option value="sv">Svenska</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="field">
          <span>{t('geminiKey')}</span>
          <input
            type="password"
            defaultValue={settings.geminiApiKey}
            onChange={(event) => setGeminiKeyInput(event.target.value)}
            onBlur={(event) => {
              const value = geminiKeyInput || event.target.value;
              void setGeminiApiKey(value);
              setGeminiKeyInput('');
            }}
            placeholder="AIza..."
          />
        </label>

        <label className="field">
          <span>{t('traderaKey')}</span>
          <input
            type="password"
            defaultValue={settings.traderaApiKey}
            onChange={(event) => setTraderaKeyInput(event.target.value)}
            onBlur={(event) => {
              const value = traderaKeyInput || event.target.value;
              void setTraderaApiKey(value);
              setTraderaKeyInput('');
            }}
            placeholder="Tradera API key"
          />
        </label>
      </div>
    </SectionCard>
  );
}
