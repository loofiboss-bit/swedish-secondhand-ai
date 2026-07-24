import { useTranslation } from 'react-i18next';
import type {
  CategoryProfile,
  CategoryFactRequirement,
} from '@core/services/categoryProfileService';
import { isRequirementComplete } from '@core/services/categoryProfileService';
import type {
  ConditionGrade,
  LockableProductFactKey,
  ProductFactKey,
  ProductListFactKey,
  VerifiedProductFacts,
} from '@core/types';
import { ItemFactField } from './ItemFactField';
import { FactProvenance } from './FactProvenance';

interface ItemFactsReviewProps {
  facts: VerifiedProductFacts;
  profile: CategoryProfile;
  onFactChange: (key: ProductFactKey, value: string) => void;
  onListChange: (key: ProductListFactKey, value: string) => void;
  onAttributeChange: (key: string, value: string) => void;
  onTestedChange: (value: VerifiedProductFacts['testedStatus']['value']) => void;
  onAuthenticityChange: (value: VerifiedProductFacts['authenticityStatus']['value']) => void;
  onLockChange: (key: LockableProductFactKey, locked: boolean) => void;
}

const TEXT_FACTS = new Set<ProductFactKey>(['title', 'category', 'brand', 'model']);
const LIST_FACTS = new Set<ProductListFactKey>([
  'defects',
  'includedAccessories',
  'missingAccessories',
]);

export function ItemFactsReview({
  facts,
  profile,
  onFactChange,
  onListChange,
  onAttributeChange,
  onTestedChange,
  onAuthenticityChange,
  onLockChange,
}: ItemFactsReviewProps) {
  const { t } = useTranslation('common');
  const required = profile.facts.filter((requirement) => requirement.level === 'required');
  const recommended = profile.facts.filter((requirement) => requirement.level === 'recommended');
  const missingRequired = required.filter(
    (requirement) => !isRequirementComplete(facts, requirement.key),
  );
  const profiledKeys = new Set(profile.facts.map((requirement) => requirement.key));

  const renderRequirement = (requirement: CategoryFactRequirement) => {
    const label = t(`profileFact_${requirement.key.replace('.', '_')}`, {
      defaultValue: requirement.label,
    });
    const id = `fact-${requirement.key.replace('.', '-')}`;

    if (TEXT_FACTS.has(requirement.key as ProductFactKey)) {
      const key = requirement.key as ProductFactKey;
      const fact = facts[key];
      if (!('value' in fact)) return null;
      return (
        <ItemFactField
          key={requirement.key}
          id={id}
          label={label}
          value={String(fact.value)}
          source={fact.source}
          locked={fact.locked}
          onCommit={(value) => onFactChange(key, value)}
          onLock={(locked) => onLockChange(key, locked)}
        />
      );
    }

    if (requirement.key === 'conditionGrade') {
      return (
        <div className="review-fact" key={requirement.key} id={id}>
          <label className="field">
            <span>{label}</span>
            <select
              value={facts.conditionGrade.value}
              onChange={(event) => onFactChange('conditionGrade', event.target.value)}
            >
              {(['new', 'like_new', 'good', 'fair', 'poor', 'unknown'] as ConditionGrade[]).map(
                (condition) => (
                  <option key={condition} value={condition}>
                    {t(`condition_${condition}`)}
                  </option>
                ),
              )}
            </select>
          </label>
          <FactProvenance
            source={facts.conditionGrade.source}
            locked={facts.conditionGrade.locked}
            onLock={(locked) => onLockChange('conditionGrade', locked)}
          />
        </div>
      );
    }

    if (requirement.key === 'testedStatus') {
      return (
        <div className="review-fact" key={requirement.key} id={id}>
          <label className="field">
            <span>{label}</span>
            <select
              value={facts.testedStatus.value}
              onChange={(event) =>
                onTestedChange(event.target.value as VerifiedProductFacts['testedStatus']['value'])
              }
            >
              <option value="tested">{t('tested')}</option>
              <option value="untested">{t('untested')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </label>
          <FactProvenance
            source={facts.testedStatus.source}
            locked={facts.testedStatus.locked}
            onLock={(locked) => onLockChange('testedStatus', locked)}
          />
        </div>
      );
    }

    if (requirement.key === 'authenticityStatus') {
      return (
        <div className="review-fact" key={requirement.key} id={id}>
          <label className="field">
            <span>{label}</span>
            <select
              value={facts.authenticityStatus.value}
              onChange={(event) =>
                onAuthenticityChange(
                  event.target.value as VerifiedProductFacts['authenticityStatus']['value'],
                )
              }
            >
              <option value="verified">{t('authenticityVerified')}</option>
              <option value="unverified">{t('authenticityUnverified')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </label>
          <FactProvenance
            source={facts.authenticityStatus.source}
            locked={facts.authenticityStatus.locked}
            onLock={(locked) => onLockChange('authenticityStatus', locked)}
          />
        </div>
      );
    }

    if (requirement.key.startsWith('attributes.')) {
      const key = requirement.key.slice('attributes.'.length);
      return (
        <ItemFactField
          key={requirement.key}
          id={id}
          label={label}
          value={facts.attributes[key]?.value ?? ''}
          source={facts.attributes[key]?.source}
          locked={facts.attributes[key]?.locked}
          onCommit={(value) => onAttributeChange(key, value)}
        />
      );
    }

    if (LIST_FACTS.has(requirement.key as ProductListFactKey)) {
      const key = requirement.key as ProductListFactKey;
      return (
        <div className="review-fact" key={requirement.key} id={id}>
          <label className="field">
            <span>{label}</span>
            <input
              key={`${key}-${facts[key].value.join(',')}`}
              defaultValue={facts[key].value.join(', ')}
              onBlur={(event) => onListChange(key, event.target.value)}
              placeholder={t('commaSeparated')}
            />
          </label>
          <FactProvenance
            source={facts[key].source}
            locked={facts[key].locked}
            onLock={(locked) => onLockChange(key, locked)}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="item-fact-review">
      <details className="fact-section fact-section--required" open={missingRequired.length > 0}>
        <summary>
          <span>{t('requiredFacts')}</span>
          <small>
            {missingRequired.length > 0
              ? t('requiredFactsRemaining', { count: missingRequired.length })
              : t('allRequiredFactsComplete')}
          </small>
        </summary>
        <div className="fact-grid">{required.map(renderRequirement)}</div>
      </details>

      {recommended.length > 0 && (
        <details className="fact-section">
          <summary>
            <span>{t('recommendedFacts')}</span>
            <small>{t('optional')}</small>
          </summary>
          <div className="fact-grid">{recommended.map(renderRequirement)}</div>
        </details>
      )}

      <details className="fact-section">
        <summary>
          <span>{t('advancedReviewedFacts')}</span>
          <small>{t('optional')}</small>
        </summary>
        <div className="fact-grid">
          {!profiledKeys.has('testedStatus') &&
            renderRequirement({
              key: 'testedStatus',
              label: t('testedStatus'),
              level: 'recommended',
            })}
          {!profiledKeys.has('authenticityStatus') &&
            renderRequirement({
              key: 'authenticityStatus',
              label: t('authenticityStatus'),
              level: 'recommended',
            })}
          {(['defects', 'includedAccessories', 'missingAccessories'] as ProductListFactKey[])
            .filter((key) => !profiledKeys.has(key))
            .map((key) =>
              renderRequirement({
                key,
                label: t(key),
                level: 'recommended',
              }),
            )}
        </div>
      </details>
    </div>
  );
}
