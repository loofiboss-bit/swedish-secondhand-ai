import { useTranslation } from 'react-i18next';
import type { AnalysisKnowledgeGap, FactCandidate } from '@core/types';

interface AnalysisEvidenceDrawerProps {
  candidates: FactCandidate[];
  knowledgeGaps: AnalysisKnowledgeGap[];
}

export function AnalysisEvidenceDrawer({ candidates, knowledgeGaps }: AnalysisEvidenceDrawerProps) {
  const { t } = useTranslation('common');
  if (candidates.length === 0 && knowledgeGaps.length === 0) return null;

  return (
    <details className="analysis-explanation evidence-drawer">
      <summary>
        {t('reviewAnalysisEvidence')} ({candidates.length + knowledgeGaps.length})
      </summary>
      {candidates.length > 0 && (
        <section className="fact-candidates" aria-labelledby="fact-candidates-title">
          <h4 id="fact-candidates-title">{t('factCandidatesTitle')}</h4>
          <p>{t('factCandidatesIntro')}</p>
          <ul>
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <strong>
                  {candidate.key}: {candidate.value}
                </strong>
                <span>
                  {t(`candidateSource_${candidate.source}`)} ·{' '}
                  {t(`uncertainty_${candidate.uncertainty}`)}
                </span>
                <small>
                  {candidate.references
                    .map((reference) =>
                      reference.kind === 'image'
                        ? t('imageReference', { count: Number(reference.index) + 1 })
                        : t('textReference'),
                    )
                    .join(', ')}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}
      {knowledgeGaps.length > 0 && (
        <section className="knowledge-gaps">
          <h4>{t('knowledgeGapsTitle')}</h4>
          <ul>
            {knowledgeGaps.map((gap) => (
              <li key={gap.key}>{t(gap.reasonKey)}</li>
            ))}
          </ul>
        </section>
      )}
    </details>
  );
}
