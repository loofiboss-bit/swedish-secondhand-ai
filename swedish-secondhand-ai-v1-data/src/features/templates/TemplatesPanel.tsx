import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketplaceSite } from '@core/types';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { SectionCard } from '@shared/components/SectionCard';

export function TemplatesPanel() {
  const { t } = useTranslation('common');
  const { templates, qualityReport, siteValidation, exportCopyBundle, hasBlockingIssues } =
    useListingStore();
  const { generateTemplates } = useValuationStore();
  const { stepErrors, setCurrentStep } = useWorkflowStore();
  const [copiedSite, setCopiedSite] = useState<string | null>(null);

  const handleCopy = async (site: MarketplaceSite, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSite(site);
    setTimeout(() => setCopiedSite(null), 1200);
  };

  const blocked = hasBlockingIssues();

  return (
    <SectionCard
      title={t('templates')}
      action={
        <button type="button" onClick={() => generateTemplates()}>
          {t('generateTemplates')}
        </button>
      }
    >
      {(stepErrors.templates || stepErrors.review) && (
        <p className="inline-warning" role="alert">
          {stepErrors.templates || stepErrors.review}
        </p>
      )}

      {blocked && <p className="inline-warning">{t('reviewBlocked')}</p>}
      {blocked && (
        <div className="inline-actions">
          <button type="button" onClick={() => setCurrentStep('price')}>
            {t('fixPriceStep')}
          </button>
          <button type="button" onClick={() => setCurrentStep('templates')}>
            {t('fixTemplateStep')}
          </button>
        </div>
      )}

      <div className="templates-grid">
        {templates.map((template) => {
          const quality = qualityReport[template.site];
          const policy = siteValidation[template.site];

          return (
            <article key={template.site} className="template-card">
              <header>
                <h3>{template.site.toUpperCase()}</h3>
                <span className="score-badge">{quality?.score ?? 0}/100</span>
              </header>

              <p>
                <strong>{template.title}</strong>
              </p>
              <p>{template.description}</p>
              <p>{template.priceSuggestionSek} SEK</p>

              <div className="template-actions">
                <button
                  type="button"
                  disabled={(policy?.blockingIssues ?? 0) > 0}
                  onClick={() =>
                    void handleCopy(
                      template.site,
                      `${template.title}\n\n${template.description}\n\n${template.disclaimer}`,
                    )
                  }
                >
                  {copiedSite === template.site ? t('copied') : t('copy')}
                </button>
                <button
                  type="button"
                  disabled={(policy?.blockingIssues ?? 0) > 0}
                  onClick={() => void handleCopy(template.site, exportCopyBundle(template.site))}
                >
                  {t('copyBundle')}
                </button>
              </div>

              {!!policy?.issues.length && (
                <ul className="template-issues">
                  {policy.issues.map((issue, index) => (
                    <li key={`${issue.constraintId}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              )}

              {!!quality?.suggestions.length && (
                <ul className="template-suggestions">
                  {quality.suggestions.map((suggestion, index) => (
                    <li key={`${template.site}-fix-${index}`}>{suggestion}</li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}
