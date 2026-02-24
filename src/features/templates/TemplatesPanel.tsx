import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useListingStore } from '@core/store/useListingStore';
import { useValuationStore } from '@core/store/useValuationStore';
import { SectionCard } from '@shared/components/SectionCard';

export function TemplatesPanel() {
  const { t } = useTranslation('common');
  const { templates } = useListingStore();
  const { generateTemplates } = useValuationStore();
  const [copiedSite, setCopiedSite] = useState<string | null>(null);

  const handleCopy = async (text: string, site: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSite(site);
    setTimeout(() => setCopiedSite(null), 1200);
  };

  return (
    <SectionCard
      title={t('templates')}
      action={
        <button type="button" onClick={() => generateTemplates()}>
          {t('generateTemplates')}
        </button>
      }
    >
      <div className="templates-grid">
        {templates.map((template) => (
          <article key={template.site} className="template-card">
            <header>
              <h3>{template.site.toUpperCase()}</h3>
              <button
                type="button"
                onClick={() =>
                  void handleCopy(`${template.title}\n\n${template.description}`, template.site)
                }
              >
                {copiedSite === template.site ? t('copied') : t('copy')}
              </button>
            </header>
            <p>
              <strong>{template.title}</strong>
            </p>
            <p>{template.description}</p>
            <p>{template.priceSuggestionSek} SEK</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
