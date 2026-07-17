import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@core/config/i18n';
import { useSettingsStore } from '@core/store/useSettingsStore';
import type { SupportedLanguage } from '@core/types';

interface OnboardingDialogProps {
  onStarted: (withExample: boolean) => void;
}

export function OnboardingDialog({ onStarted }: OnboardingDialogProps) {
  const { t } = useTranslation('common');
  const { settings, error, completeOnboarding } = useSettingsStore();
  const [language, setLanguage] = useState<SupportedLanguage>(settings.language);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const startOffline = async (withExample: boolean) => {
    setSaving(true);
    await completeOnboarding(language, 'offline', false);
    if (!useSettingsStore.getState().settings.onboardingCompleted) {
      setSaving(false);
      return;
    }
    await setAppLanguage(language);
    setSaving(false);
    onStarted(withExample);
  };

  return (
    <section className="onboarding-start" aria-labelledby="onboarding-title">
      <div className="onboarding-start__intro">
        <p className="eyebrow">{t('onboardingEyebrow')}</p>
        <h2 id="onboarding-title" ref={titleRef} tabIndex={-1}>
          {t('onboardingTitle')}
        </h2>
        <p>{t('onboardingIntro')}</p>
      </div>

      {error && (
        <p role="alert" className="inline-warning">
          {error}
        </p>
      )}

      <label className="field onboarding-start__language">
        <span>{t('language')}</span>
        <select
          value={language}
          onChange={(event) => {
            const next = event.target.value as SupportedLanguage;
            setLanguage(next);
            void setAppLanguage(next);
          }}
        >
          <option value="sv">Svenska</option>
          <option value="en">English</option>
        </select>
      </label>

      <div className="configuration-overview" aria-label={t('configurationOverview')}>
        <article>
          <strong>{t('offlineReadyTitle')}</strong>
          <span>{t('offlineReadyDescription')}</span>
        </article>
        <article>
          <strong>{t('enhancedAnalysisOptional')}</strong>
          <span>{t('enhancedAnalysisDescription')}</span>
        </article>
        <article>
          <strong>{t('traderaOptional')}</strong>
          <span>{t('traderaOptionalDescription')}</span>
        </article>
      </div>

      <p className="privacy-summary">{t('privacy_offline')}</p>
      <div className="onboarding-start__actions">
        <button type="button" onClick={() => void startOffline(false)} disabled={saving}>
          {saving ? t('savingDraft') : t('startOffline')}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => void startOffline(true)}
          disabled={saving}
        >
          {t('tryExample')}
        </button>
      </div>
      <p>{t('onboardingPrivacyConsent')}</p>
    </section>
  );
}
