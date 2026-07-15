import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { SectionCard } from '@shared/components/SectionCard';

export function SettingsPanel() {
  const { t } = useTranslation('common');
  const {
    settings,
    error,
    connectionState,
    setLanguage,
    setGeminiApiKey,
    setAiProvider,
    setOllamaBaseUrl,
    setOllamaModel,
    setTraderaApiKey,
    testGeminiConnection,
  } = useSettingsStore();

  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [ollamaBaseUrlInput, setOllamaBaseUrlInput] = useState(settings.ollamaBaseUrl ?? '');
  const [ollamaModelInput, setOllamaModelInput] = useState(settings.ollamaModel ?? '');
  const [traderaKeyInput, setTraderaKeyInput] = useState('');
  const [syncedSettings, setSyncedSettings] = useState(settings);

  if (settings !== syncedSettings) {
    setSyncedSettings(settings);
    setGeminiKeyInput('');
    setOllamaBaseUrlInput(settings.ollamaBaseUrl ?? '');
    setOllamaModelInput(settings.ollamaModel ?? '');
    setTraderaKeyInput('');
  }

  return (
    <SectionCard title={t('settings')}>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {settings.secretStatus.migrationStatus === 'failed' && (
        <p className="error" role="status">
          {t('secretMigrationFailed')}
        </p>
      )}
      {window.desktop && !settings.secretStatus.encryptionAvailable && (
        <p className="error" role="status">
          {t('secureStorageUnavailable')}
        </p>
      )}
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
          <span>
            {t('geminiKey')} —{' '}
            {settings.secretStatus.geminiConfigured ? t('configured') : t('notConfigured')}
          </span>
          <input
            type="password"
            value={geminiKeyInput}
            onChange={(event) => setGeminiKeyInput(event.target.value)}
            onBlur={() => {
              if (!geminiKeyInput.trim()) return;
              void setGeminiApiKey(geminiKeyInput).finally(() => setGeminiKeyInput(''));
            }}
            placeholder={settings.secretStatus.geminiConfigured ? t('secretSaved') : 'AIza...'}
            autoComplete="off"
          />
          {settings.secretStatus.geminiConfigured && (
            <div>
              <button
                type="button"
                onClick={() => void testGeminiConnection()}
                disabled={connectionState === 'testing'}
              >
                {connectionState === 'testing' ? t('testingConnection') : t('testConnection')}
              </button>{' '}
              <button type="button" onClick={() => void setGeminiApiKey('')}>
                {t('removeSecret')}
              </button>
              {connectionState !== 'idle' && connectionState !== 'testing' && (
                <span role="status">
                  {' '}
                  {connectionState === 'connected'
                    ? t('connectionSuccessful')
                    : t('connectionFailed')}
                </span>
              )}
            </div>
          )}
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
          <span>
            {t('traderaKey')} —{' '}
            {settings.secretStatus.traderaConfigured ? t('configured') : t('notConfigured')}
          </span>
          <input
            type="password"
            value={traderaKeyInput}
            onChange={(event) => setTraderaKeyInput(event.target.value)}
            onBlur={() => {
              if (!traderaKeyInput.trim()) return;
              void setTraderaApiKey(traderaKeyInput).finally(() => setTraderaKeyInput(''));
            }}
            placeholder={
              settings.secretStatus.traderaConfigured ? t('secretSaved') : 'Tradera API key'
            }
            autoComplete="off"
          />
          {settings.secretStatus.traderaConfigured && (
            <button type="button" onClick={() => void setTraderaApiKey('')}>
              {t('removeSecret')}
            </button>
          )}
        </label>
        <p>{t('providerPrivacyNote')}</p>
      </div>
    </SectionCard>
  );
}
