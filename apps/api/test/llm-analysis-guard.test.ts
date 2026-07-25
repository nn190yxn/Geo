import { describe, expect, it } from 'vitest';
import type { AnalysisResult, AnalysisResultInput } from '@geo-platform/shared-types';
import { applyAnalysisRuleGuard } from '../src/modules/monitoring/llm-analysis-guard';

describe('applyAnalysisRuleGuard', () => {
  it('keeps rule result when brand is not mentioned', () => {
    const guarded = applyAnalysisRuleGuard(
      {
        brandMentioned: true,
        brandRank: 1,
        sentiment: 'positive',
        accuracyScore: 90,
        citationScore: 100,
        platformEvaluation: 'LLM 认为品牌已出现',
        recommendationReason: 'LLM 推荐理由',
        rankingReason: 'LLM 排名理由',
        expressionCompleteness: 'LLM 完整度',
        expressionDeviation: '暂未识别到表达偏差',
        competitorMentions: [],
        reviewRequired: false
      },
      createRuleResult({ brandMentioned: false, brandRank: null })
    );

    expect(guarded).toMatchObject({
      brandMentioned: false,
      brandRank: null,
      platformEvaluation: '有没有出现：未提及品牌。整体判断：需要你确认。',
      recommendationReason: '推荐理由：暂未识别到明确推荐理由。',
      rankingReason: '排第几：暂未识别到品牌推荐顺序。',
      citationScore: 25,
      reviewRequired: true
    });
  });

  it('keeps high-risk expression detection from rule result', () => {
    const guarded = applyAnalysisRuleGuard(createLLMInput(), createRuleResult({ expressionDeviation: '需要你确认：命中高风险或禁用表达：保证长高' }));

    expect(guarded.expressionDeviation).toBe('需要你确认：命中高风险或禁用表达：保证长高');
    expect(guarded.reviewRequired).toBe(true);
  });

  it('keeps objective citation score from rule result', () => {
    const guarded = applyAnalysisRuleGuard({ ...createLLMInput(), citationScore: 100 }, createRuleResult({ citationScore: 0, reviewRequired: false }));

    expect(guarded.citationScore).toBe(0);
  });
});

function createLLMInput(): AnalysisResultInput {
  return {
    brandMentioned: true,
    brandRank: 1,
    sentiment: 'positive',
    accuracyScore: 90,
    citationScore: 100,
    platformEvaluation: 'LLM 判断品牌已出现',
    recommendationReason: 'LLM 推荐理由',
    rankingReason: 'LLM 排名理由',
    expressionCompleteness: 'LLM 完整度',
    expressionDeviation: '暂未识别到表达偏差',
    competitorMentions: [],
    reviewRequired: false
  };
}

function createRuleResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: 'analysis_1',
    responseId: 'response_1',
    runId: 'run_1',
    brandId: 'brand_demo',
    brandMentioned: true,
    brandRank: 1,
    sentiment: 'positive',
    accuracyScore: 80,
    citationScore: 25,
    platformEvaluation: '有没有出现：未提及品牌。整体判断：需要你确认。',
    recommendationReason: '推荐理由：暂未识别到明确推荐理由。',
    rankingReason: '排第几：暂未识别到品牌推荐顺序。',
    expressionCompleteness: '说得准不准：准确分 80。',
    expressionDeviation: '暂未识别到表达偏差',
    competitorMentions: [],
    reviewRequired: true,
    updatedAt: '2026-07-07T00:00:00.000Z',
    ...overrides
  };
}
