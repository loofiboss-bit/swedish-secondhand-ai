import { useState } from 'react';
import type { HTMLInputTypeAttribute } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { SectionCard } from '@shared/components/SectionCard';

interface PersistedInputProps {
  savedValue: string;
  type: HTMLInputTypeAttribute;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
}

function getValueRevision(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${value.length}:${hash >>> 0}`;
}

function PersistedInput({ savedValue, type, placeholder, onSave }: PersistedInputProps) {
  const [value, setValue] = useState(savedValue);

  return (
    <input
      type={type}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void onSave(value)}
      placeholder={placeholder}
    />
  );
}

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
          <PersistedInput
            key={getValueRevision(settings.geminiApiKey)}
            type="password"
            savedValue={settings.geminiApiKey}
            onSave={setGeminiApiKey}
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
          <PersistedInput
            key={getValueRevision(settings.ollamaBaseUrl ?? '')}
            type="url"
            savedValue={settings.ollamaBaseUrl ?? ''}
            onSave={setOllamaBaseUrl}
            placeholder="http://localhost:11434/v1"
          />
        </label>

        <label className="field">
          <span>{t('ollamaModel')}</span>
          <PersistedInput
            key={getValueRevision(settings.ollamaModel ?? '')}
            type="text"
            savedValue={settings.ollamaModel ?? ''}
            onSave={setOllamaModel}
            placeholder="llava"
          />
        </label>

        <label className="field">
          <span>{t('traderaKey')}</span>
          <PersistedInput
            key={getValueRevision(settings.traderaApiKey)}
            type="password"
            savedValue={settings.traderaApiKey}
            onSave={setTraderaApiKey}
            placeholder="Tradera API key"
          />
        </label>
      </div>
    </SectionCard>
  );
}
