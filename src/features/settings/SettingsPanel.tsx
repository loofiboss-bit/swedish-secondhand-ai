import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { SectionCard } from '@shared/components/SectionCard';

export function SettingsPanel() {
  const { t } = useTranslation('common');
  const {
    settings,
    setLanguage,
    setGeminiApiKey,
    setAiProvider,
    setOllamaBaseUrl,
    setOllamaModel,
    setTraderaApiKey,
  } = useSettingsStore();

  const [geminiKeyInput, setGeminiKeyInput] = useState(settings.geminiApiKey);
  const [ollamaBaseUrlInput, setOllamaBaseUrlInput] = useState(settings.ollamaBaseUrl ?? '');
  const [ollamaModelInput, setOllamaModelInput] = useState(settings.ollamaModel ?? '');
  const [traderaKeyInput, setTraderaKeyInput] = useState(settings.traderaApiKey);

  useEffect(() => {
    setGeminiKeyInput(settings.geminiApiKey);
  }, [settings.geminiApiKey]);

  useEffect(() => {
    setOllamaBaseUrlInput(settings.ollamaBaseUrl ?? '');
  }, [settings.ollamaBaseUrl]);

  useEffect(() => {
    setOllamaModelInput(settings.ollamaModel ?? '');
  }, [settings.ollamaModel]);

  useEffect(() => {
    setTraderaKeyInput(settings.traderaApiKey);
  }, [settings.traderaApiKey]);

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
            value={geminiKeyInput}
            onChange={(event) => setGeminiKeyInput(event.target.value)}
            onBlur={() => {
              void setGeminiApiKey(geminiKeyInput);
            }}
            placeholder="AIza..."
          />
        </label>

        <label className="field">
          <span>{t('aiProvider')}</span>
          <select
            value={settings.aiProvider ?? 'gemini'}
            onChange={(event) => {
              void setAiProvider(event.target.value as 'gemini' | 'ollama');
            }}
          >
            <option value="gemini">{t('aiProviderGemini')}</option>
            <option value="ollama">{t('aiProviderOllama')}</option>
          </select>
        </label>

        <label className="field">
          <span>{t('ollamaBaseUrl')}</span>
          <input
            type="url"
            value={ollamaBaseUrlInput}
            onChange={(event) => setOllamaBaseUrlInput(event.target.value)}
            onBlur={() => {
              void setOllamaBaseUrl(ollamaBaseUrlInput);
            }}
            placeholder="http://localhost:11434/v1"
          />
        </label>

        <label className="field">
          <span>{t('ollamaModel')}</span>
          <input
            type="text"
            value={ollamaModelInput}
            onChange={(event) => setOllamaModelInput(event.target.value)}
            onBlur={() => {
              void setOllamaModel(ollamaModelInput);
            }}
            placeholder="llava"
          />
        </label>

        <label className="field">
          <span>{t('traderaKey')}</span>
          <input
            type="password"
            value={traderaKeyInput}
            onChange={(event) => setTraderaKeyInput(event.target.value)}
            onBlur={() => {
              void setTraderaApiKey(traderaKeyInput);
            }}
            placeholder="Tradera API key"
          />
        </label>
      </div>
    </SectionCard>
  );
}
