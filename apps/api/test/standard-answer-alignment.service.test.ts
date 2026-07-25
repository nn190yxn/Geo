import { describe, expect, it, vi } from 'vitest';
import { StandardAnswerAlignmentService } from '../src/modules/sprints/standard-answer-alignment.service';

const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'standard_answer_alignment',
  steps: [],
  metricSummary: {
    questionCoverageRate: 0,
    mentionRate: 0,
    recommendationRate: 0,
    firstRecommendationRate: 0,
    topThreeRate: 0,
    citationHitRate: 0,
    expressionAccuracyRate: 0,
    riskExpressionCount: 0,
    contentGapCount: 0,
    competitorSuppressionCount: 0,
    sampleSize: 0
  },
  relatedQuestionIds: ['question_1', 'question_2'],
  relatedTestPlanIds: [],
  relatedMonitoringRunIds: ['run_1', 'run_2'],
  relatedStandardAnswerIds: ['standard_answer_1'],
  relatedContentTaskIds: [],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const standardAnswer = {
  answerId: 'standard_answer_1',
  brandId: 'brand_demo',
  questionId: 'question_1',
  question: '贵阳儿童运动推荐？',
  answer: '追光小牛在贵阳提供儿童运动成长课程。',
  keyPoints: ['追光小牛', '贵阳', '儿童运动成长课'],
  evidence: [{ label: '品牌档案', sourceType: 'brand_profile', sourceId: 'brand_demo', excerpt: '贵阳 5 家校区' }],
  status: 'approved',
  reviewedBy: 'user_demo',
  reviewedAt: '2026-07-11T00:00:00.000Z',
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const candidates = [
  {
    id: 'question_1',
    brandId: 'brand_demo',
    themeId: 'theme_1',
    question: '贵阳儿童运动推荐？',
    purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao'],
    priority: 'high',
    estimatedValue: '本地高转化意图',
    editable: true,
    status: 'selected',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  },
  {
    id: 'question_2',
    brandId: 'brand_demo',
    themeId: 'theme_1',
    question: '贵阳少儿体能课怎么选？',
    purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao'],
    priority: 'medium',
    estimatedValue: '品类决策意图',
    editable: true,
    status: 'selected',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z'
  }
] as const;

const runDefaults = {
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_1',
  intentId: 'intent_1',
  promptId: 'question_1',
  platformCode: 'doubao',
  status: 'completed',
  createdAt: '2026-07-11T00:00:00.000Z',
  promptText: '贵阳儿童运动推荐？'
} as const;

const riskyRun = {
  ...runDefaults,
  id: 'run_1',
  response: {
    id: 'response_1',
    runId: 'run_1',
    brandId: 'brand_demo',
    rawText: '可以看追光小牛，也可以看竞品 A。',
    citations: [],
    respondedAt: '2026-07-11T00:00:00.000Z',
    parseStatus: 'parsed',
    createdAt: '2026-07-11T00:00:00.000Z'
  },
  analysis: {
    id: 'analysis_1',
    responseId: 'response_1',
    runId: 'run_1',
    brandId: 'brand_demo',
    brandMentioned: true,
    brandRank: 2,
    sentiment: 'neutral',
    accuracyScore: 65,
    citationScore: 0,
    platformEvaluation: '需要复核课程承诺表达',
    recommendationReason: '',
    rankingReason: '',
    expressionCompleteness: '',
    expressionDeviation: '没有说明贵阳门店和儿童运动成长课',
    competitorMentions: [{ name: '竞品 A', rank: 1, sentiment: 'positive' }],
    reviewRequired: true,
    updatedAt: '2026-07-11T00:00:00.000Z'
  }
} as const;

function createPermissionsMock(overrides: Partial<{
  currentSprint: unknown;
  runs: unknown[];
  answers: unknown[];
  questionCandidates: unknown[];
}> = {}) {
  return {
    getVisibilitySprint: vi.fn().mockResolvedValue(overrides.currentSprint ?? sprint),
    listMonitoringRuns: vi.fn().mockResolvedValue(overrides.runs ?? [riskyRun]),
    listBrandStandardAnswers: vi.fn().mockResolvedValue(overrides.answers ?? [standardAnswer]),
    listTestQuestionCandidates: vi.fn().mockResolvedValue(overrides.questionCandidates ?? candidates)
  };
}

describe('StandardAnswerAlignmentService', () => {
  it('builds explainable alignment dashboard from real answers and approved standard answers', async () => {
    const service = new StandardAnswerAlignmentService(createPermissionsMock() as never);

    await expect(service.getAlignmentDashboard('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      realAnswerCount: 1,
      approvedStandardAnswerCount: 1,
      summary: {
        totalQuestionCount: 2,
        alignedCount: 0,
        needsAttentionCount: 1,
        waitingRealAnswerCount: 0,
        waitingStandardAnswerCount: 1,
        citationGapCount: 1,
        riskExpressionCount: 1,
        competitorSuppressionCount: 1
      },
      items: [
        expect.objectContaining({
          questionId: 'question_1',
          status: 'needs_attention',
          keyPointsMatched: ['追光小牛'],
          keyPointsMissing: ['贵阳', '儿童运动成长课'],
          citationGap: true,
          riskExpression: true,
          competitorSuppression: true,
          evidence: expect.arrayContaining([
            expect.objectContaining({ type: 'citation_gap' }),
            expect.objectContaining({ type: 'risk_expression' }),
            expect.objectContaining({ type: 'competitor_suppression' })
          ])
        }),
        expect.objectContaining({ questionId: 'question_2', status: 'waiting_standard_answer' })
      ]
    });
  });

  it('waits for real answers when an approved standard answer exists without monitoring responses', async () => {
    const service = new StandardAnswerAlignmentService(createPermissionsMock({ runs: [] }) as never);

    await expect(service.getAlignmentDashboard('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      realAnswerCount: 0,
      items: expect.arrayContaining([expect.objectContaining({ questionId: 'question_1', status: 'waiting_real_answer' })])
    });
  });

  it('marks aligned answers when true responses cover the approved standard answer', () => {
    const service = new StandardAnswerAlignmentService({} as never);
    const alignedRun = {
      ...riskyRun,
      response: {
        ...riskyRun.response,
        rawText: '追光小牛在贵阳提供儿童运动成长课，适合本地家庭了解。',
        citations: ['https://brand.example/source']
      },
      analysis: {
        ...riskyRun.analysis,
        brandRank: 1,
        accuracyScore: 90,
        citationScore: 80,
        expressionDeviation: '',
        competitorMentions: [],
        reviewRequired: false
      }
    };

    expect(service.buildItems(sprint as never, [alignedRun as never], [standardAnswer as never], candidates as never)[0]).toMatchObject({
      status: 'aligned',
      coverageScore: 100,
      accuracyScore: 90,
      citationGap: false,
      riskExpression: false,
      competitorSuppression: false
    });
  });
});
