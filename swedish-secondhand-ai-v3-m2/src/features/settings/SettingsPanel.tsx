import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { SectionCard } from '@shared/components/SectionCard';

type ConnectionState = 'idle' | 'testing' | 'connected' | 'failed';

function ConnectionResult({ state }: { state: ConnectionState }) {
  const { t } = useTranslation('common');
  if (state === 'idle' || state === 'testing') return null;
  return (
    <span role="status" className={`connection-result connection-result--${state}`}>
      {state === 'connected' ? t('connectionSuccessful') : t('connectionFailedAction')}
    </span>
  );
}

export function SettingsPanel() {
  const { t } = useTranslation('common');
  const store = useSettingsStore();
  const { settings } = store;
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [ollamaBaseUrlInput, setOllamaBaseUrlInput] = useState(settings.ollamaBaseUrl ?? '');
  const [ollamaModelInput, setOllamaModelInput] = useState(settings.ollamaModel ?? '');
  const [traderaKeyInput, setTraderaKeyInput] = useState('');
  const [traderaAppIdInput, setTraderaAppIdInput] = useState(
    settings.traderaAppId ? String(settings.traderaAppId) : '',
  );
  const [syncedSettings, setSyncedSettings] = useState(settings);

  if (settings !== syncedSettings) {
    setSyncedSettings(settings);
    setGeminiKeyInput('');
    setTraderaKeyInput('');
    setOllamaBaseUrlInput(settings.ollamaBaseUrl ?? '');
    setOllamaModelInput(settings.ollamaModel ?? '');
    setTraderaAppIdInput(settings.traderaAppId ? String(settings.traderaAppId) : '');
  }

  return (
    <SectionCard title={t('settings')}>
      {store.error && (
        <p className="error" role="alert">
          {store.error}
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
              const language = event.target.value as 'sv' | 'en';
              void store.setLanguage(language);
              void setAppLanguage(language);
            }}
          >
            <option value="sv">Svenska</option>
            <option value="en">English</option>
          </select>
        </label>

        <div className="configuration-overview configuration-overview--compact">
          <article>
            <strong>{t('offlineReadyTitle')}</strong>
            <span>{t('providerOfflineReady')}</span>
          </article>
          <article>
            <strong>{t('enhancedAnalysisOptional')}</strong>
            <span>{t(`aiMode_${settings.aiMode}`)}</span>
          </article>
          <article>
            <strong>{t('traderaOptional')}</strong>
            <span>
              {settings.secretStatus.traderaConfigured && settings.traderaAppId
                ? t('configured')
                : t('notConfigured')}
            </span>
          </article>
        </div>

        <label className="field">
          <span>{t('aiMode')}</span>
          <select
            value={settings.aiMode}
            onChange={(event) =>
              void store.setAiMode(event.target.value as 'gemini' | 'ollama' | 'offline')
            }
          >
            <option value="offline">{t('aiMode_offline')}</option>
            <option value="gemini">{t('aiMode_gemini')}</option>
            <option value="ollama">{t('aiMode_ollama')}</option>
          </select>
        </label>

        {settings.aiMode === 'gemini' && (
          <div className="provider-settings" aria-label={t('aiMode_gemini')}>
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
                  const secret = geminiKeyInput;
                  setGeminiKeyInput('');
                  void store.setGeminiApiKey(secret);
                }}
                placeholder={settings.secretStatus.geminiConfigured ? t('secretSaved') : 'AIza...'}
                autoComplete="off"
              />
            </label>
            {settings.secretStatus.geminiConfigured && (
              <div className="connection-actions">
                <button
                  type="button"
                  onClick={() => void store.testGeminiConnection()}
                  disabled={store.connectionState === 'testing'}
                >
                  {store.connectionState === 'testing'
                    ? t('testingConnection')
                    : t('testGeminiConnection')}
                </button>
                <button type="button" onClick={() => void store.setGeminiApiKey('')}>
                  {t('removeSecret')}
                </button>
                <ConnectionResult state={store.connectionState} />
              </div>
            )}
          </div>
        )}

        {settings.aiMode === 'ollama' && (
          <div className="provider-settings" aria-label={t('aiMode_ollama')}>
            <label className="field">
              <span>{t('ollamaBaseUrl')}</span>
              <input
                type="url"
                value={ollamaBaseUrlInput}
                onChange={(event) => setOllamaBaseUrlInput(event.target.value)}
                onBlur={() => void store.setOllamaBaseUrl(ollamaBaseUrlInput)}
                placeholder="http://localhost:11434/v1"
              />
            </label>
            <label className="field">
              <span>{t('ollamaModel')}</span>
              <input
                value={ollamaModelInput}
                onChange={(event) => setOllamaModelInput(event.target.value)}
                onBlur={() => void store.setOllamaModel(ollamaModelInput)}
                placeholder="llava"
              />
            </label>
            <div className="connection-actions">
              <button
                type="button"
                onClick={() => void store.testOllamaConnection()}
                disabled={store.ollamaConnectionState === 'testing'}
              >
                {store.ollamaConnectionState === 'testing'
                  ? t('testingConnection')
                  : t('testOllamaConnection')}
              </button>
              <ConnectionResult state={store.ollamaConnectionState} />
            </div>
          </div>
        )}

        {settings.aiMode !== 'offline' && (
          <label>
            <input
              type="checkbox"
              checked={settings.fallbackEnabled}
              onChange={(event) => void store.setFallbackEnabled(event.target.checked)}
            />{' '}
            {t('transientFallback')}
          </label>
        )}

        <details className="provider-settings provider-settings--optional">
          <summary>{t('configureTradera')}</summary>
          <label className="field">
            <span>{t('traderaAppId')}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={traderaAppIdInput}
              onChange={(event) => setTraderaAppIdInput(event.target.value)}
              onBlur={() => {
                const parsed = Number(traderaAppIdInput);
                void store.setTraderaAppId(
                  Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined,
                );
              }}
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
                const secret = traderaKeyInput;
                setTraderaKeyInput('');
                void store.setTraderaApiKey(secret);
              }}
              autoComplete="off"
            />
          </label>
          <div className="connection-actions">
            <button
              type="button"
              onClick={() => void store.testTraderaConnection()}
              disabled={
                store.traderaConnectionState === 'testing' ||
                !settings.traderaAppId ||
                !settings.secretStatus.traderaConfigured
              }
            >
              {store.traderaConnectionState === 'testing'
                ? t('testingConnection')
                : t('testTraderaConnection')}
            </button>
            {settings.secretStatus.traderaConfigured && (
              <button type="button" onClick={() => void store.setTraderaApiKey('')}>
                {t('removeSecret')}
              </button>
            )}
            <ConnectionResult state={store.traderaConnectionState} />
          </div>
        </details>
        <p>{t('providerPrivacyNote')}</p>
      </div>
    </SectionCard>
  );
}
