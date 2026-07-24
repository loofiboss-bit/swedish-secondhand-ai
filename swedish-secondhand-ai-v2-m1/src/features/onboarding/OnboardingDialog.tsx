import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import type { AppSettings, SupportedLanguage } from '@core/types';

export function OnboardingDialog() {
  const { t } = useTranslation('common');
  const { settings, error, completeOnboarding } = useSettingsStore();
  const [language, setLanguage] = useState<SupportedLanguage>(settings.language);
  const [aiMode, setAiMode] = useState<AppSettings['aiMode']>('offline');
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const finish = async () => {
    setSaving(true);
    await completeOnboarding(language, aiMode, fallbackEnabled);
    await setAppLanguage(language);
    setSaving(false);
  };

  return (
    <div className="onboarding-overlay" role="presentation">
      <section
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <h2 id="onboarding-title" ref={titleRef} tabIndex={-1}>
          {t('onboardingTitle')}
        </h2>
        <p>{t('onboardingIntro')}</p>
        {error && (
          <p role="alert" className="inline-warning">
            {error}
          </p>
        )}

        <label className="field">
          <span>{t('language')}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
          >
            <option value="sv">Svenska</option>
            <option value="en">English</option>
          </select>
        </label>

        <fieldset>
          <legend>{t('aiMode')}</legend>
          {(['offline', 'ollama', 'gemini'] as const).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="onboarding-ai-mode"
                value={mode}
                checked={aiMode === mode}
                onChange={() => setAiMode(mode)}
              />{' '}
              {t(`aiMode_${mode}`)}
            </label>
          ))}
        </fieldset>

        <p className="privacy-summary">{t(`privacy_${aiMode}`)}</p>
        <p role="status">
          {t('providerStatus')}:{' '}
          {aiMode === 'gemini'
            ? settings.secretStatus.geminiConfigured
              ? t('configured')
              : t('notConfigured')
            : aiMode === 'ollama'
              ? t('providerLocalStatus')
              : t('providerOfflineReady')}
        </p>

        {aiMode !== 'offline' && (
          <label>
            <input
              type="checkbox"
              checked={fallbackEnabled}
              onChange={(event) => setFallbackEnabled(event.target.checked)}
            />{' '}
            {t('transientFallback')}
          </label>
        )}

        <p>{t('onboardingPrivacyConsent')}</p>
        <button type="button" onClick={() => void finish()} disabled={saving}>
          {saving ? t('savingDraft') : t('startUsingApp')}
        </button>
      </section>
    </div>
  );
}
