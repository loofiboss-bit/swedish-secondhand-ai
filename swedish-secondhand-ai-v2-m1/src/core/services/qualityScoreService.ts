import type { ListingTemplate, PolicyCheckResult, QualityScoreReport } from '@core/types';
import { clamp } from '@core/utils/json';
import { sitePolicyService } from './sitePolicyService';

const SWEDISH_HINTS = ['skick', 'hämtas', 'frakt', 'pris', 'säljes', 'varumärke'];

class QualityScoreService {
  private static instance: QualityScoreService;

  static getInstance(): QualityScoreService {
    if (!QualityScoreService.instance) {
      QualityScoreService.instance = new QualityScoreService();
    }
    return QualityScoreService.instance;
  }

  scoreTemplate(template: ListingTemplate): QualityScoreReport {
    const policy = sitePolicyService.validate(template.site, template);
    return this.scoreWithPolicy(template, policy);
  }

  suggestFixes(template: ListingTemplate): string[] {
    const policy = sitePolicyService.validate(template.site, template);
    return this.suggestFixesWithPolicy(template, policy);
  }

  scoreWithPolicy(template: ListingTemplate, policy: PolicyCheckResult): QualityScoreReport {
    let score = 100;
    const reasons: string[] = [];

    const errorCount = policy.issues.filter((issue) => issue.severity === 'error').length;
    const warningCount = policy.issues.filter((issue) => issue.severity === 'warning').length;

    score -= errorCount * 24;
    score -= warningCount * 10;

    if (template.description.length < 140) {
      score -= 8;
      reasons.push('Description is short for trust-building.');
    }

    const hasSwedishTone = SWEDISH_HINTS.some((hint) =>
      template.description.toLowerCase().includes(hint),
    );
    if (!hasSwedishTone) {
      score -= 6;
      reasons.push('Add Swedish market wording for better clarity.');
    }

    if (template.tags.length >= 3) {
      score += 2;
    }

    score = Math.round(clamp(score, 0, 100));

    const policyReasons = policy.issues.map((issue) => issue.message);
    const suggestions = this.suggestFixesWithPolicy(template, policy);

    return {
      site: template.site,
      score,
      publishReady: policy.blockingIssues === 0 && score >= 70,
      reasons: [...policyReasons, ...reasons],
      suggestions,
    };
  }

  private suggestFixesWithPolicy(template: ListingTemplate, policy: PolicyCheckResult): string[] {
    const fixes = policy.issues.map((issue) => issue.message);

    if (template.description.length < 140) {
      fixes.push('Add shipping, condition details, and included accessories in description.');
    }

    if (template.tags.length < 2) {
      fixes.push('Add category and brand tags to improve discovery.');
    }

    return [...new Set(fixes)].slice(0, 6);
  }
}

export const qualityScoreService = QualityScoreService.getInstance();
