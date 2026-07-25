import type { AnalysisResult, AnalysisResultInput } from '@geo-platform/shared-types';

export function applyAnalysisRuleGuard(llmInput: AnalysisResultInput, ruleResult: AnalysisResult): AnalysisResultInput {
  const guarded: AnalysisResultInput = {
    ...llmInput,
    citationScore: ruleResult.citationScore,
    reviewRequired: Boolean(llmInput.reviewRequired || ruleResult.reviewRequired)
  };

  if (!ruleResult.brandMentioned) {
    guarded.brandMentioned = false;
    guarded.brandRank = null;
    guarded.platformEvaluation = ruleResult.platformEvaluation;
    guarded.recommendationReason = ruleResult.recommendationReason;
    guarded.rankingReason = ruleResult.rankingReason;
    guarded.reviewRequired = true;
  }

  if (ruleResult.expressionDeviation.startsWith('需要你确认')) {
    guarded.expressionDeviation = ruleResult.expressionDeviation;
    guarded.reviewRequired = true;
  }

  if (ruleResult.sentiment === 'unknown') {
    guarded.sentiment = 'unknown';
    guarded.reviewRequired = true;
  }

  return guarded;
}
