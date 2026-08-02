import { describe, expect, it, vi } from 'vitest';
import { SprintMetricsService } from '../src/modules/sprints/sprint-metrics.service';

const baseSprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'ai_response_monitoring',
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
  relatedQuestionIds: ['question_1', 'question_2', 'question_3'],
  relatedTestPlanIds: [],
  relatedMonitoringRunIds: ['run_1', 'run_2'],
  relatedStandardAnswerIds: ['standard_answer_1'],
  relatedContentTaskIds: ['content_task_1'],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const runDefaults = {
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_1',
  intentId: 'intent_1',
  promptId: 'prompt_1',
  platformCode: 'doubao',
  status: 'completed',
  createdAt: '2026-07-11T00:00:00.000Z',
  promptText: '贵阳儿童运动推荐？'
} as const;

describe('SprintMetricsService', () => {
  it('calculates Sprint metrics only from related real monitoring runs', () => {
    const service = new SprintMetricsService({} as never);
    const metrics = service.calculateMetricSummary({
      ...baseSprint,
      relatedMonitoringRunIds: [...baseSprint.relatedMonitoringRunIds, 'run_mock', 'run_empty']
    }, [
      {
        ...runDefaults,
        id: 'run_1',
        response: { id: 'response_1', runId: 'run_1', brandId: 'brand_demo', rawText: '提到追光小牛', citations: ['https://source.example'], respondedAt: '2026-07-11T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-07-11T00:00:00.000Z' },
        analysis: { id: 'analysis_1', responseId: 'response_1', runId: 'run_1', brandId: 'brand_demo', brandMentioned: true, brandRank: 1, sentiment: 'positive', accuracyScore: 90, citationScore: 80, platformEvaluation: '', recommendationReason: '', rankingReason: '', expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: '2026-07-11T00:00:00.000Z' }
      },
      {
        ...runDefaults,
        id: 'run_2',
        response: { id: 'response_2', runId: 'run_2', brandId: 'brand_demo', rawText: '竞品更靠前', citations: [], respondedAt: '2026-07-11T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-07-11T00:00:00.000Z' },
        analysis: { id: 'analysis_2', responseId: 'response_2', runId: 'run_2', brandId: 'brand_demo', brandMentioned: false, brandRank: null, sentiment: 'neutral', accuracyScore: 60, citationScore: 0, platformEvaluation: '', recommendationReason: '', rankingReason: '', expressionCompleteness: '', expressionDeviation: '', competitorMentions: [{ name: '竞品 A', rank: 1, sentiment: 'positive' }], reviewRequired: true, updatedAt: '2026-07-11T00:00:00.000Z' }
      },
      {
        ...runDefaults,
        id: 'run_unrelated',
        response: { id: 'response_3', runId: 'run_unrelated', brandId: 'brand_demo', rawText: '无关运行', citations: ['https://source.example'], respondedAt: '2026-07-11T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-07-11T00:00:00.000Z' },
        analysis: { id: 'analysis_3', responseId: 'response_3', runId: 'run_unrelated', brandId: 'brand_demo', brandMentioned: true, brandRank: 1, sentiment: 'positive', accuracyScore: 100, citationScore: 100, platformEvaluation: '', recommendationReason: '', rankingReason: '', expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: '2026-07-11T00:00:00.000Z' }
      },
      {
        ...runDefaults,
        id: 'run_mock',
        platformCode: 'mock_ai',
        response: { id: 'response_mock', runId: 'run_mock', brandId: 'brand_demo', rawText: '示例回答', citations: [], respondedAt: '2026-07-11T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-07-11T00:00:00.000Z' },
        analysis: { id: 'analysis_mock', responseId: 'response_mock', runId: 'run_mock', brandId: 'brand_demo', brandMentioned: true, brandRank: 1, sentiment: 'positive', accuracyScore: 100, citationScore: 100, platformEvaluation: '', recommendationReason: '', rankingReason: '', expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: '2026-07-11T00:00:00.000Z' }
      },
      {
        ...runDefaults,
        id: 'run_empty',
        response: { id: 'response_empty', runId: 'run_empty', brandId: 'brand_demo', rawText: '   ', citations: [], respondedAt: '2026-07-11T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-07-11T00:00:00.000Z' },
        analysis: { id: 'analysis_empty', responseId: 'response_empty', runId: 'run_empty', brandId: 'brand_demo', brandMentioned: true, brandRank: 1, sentiment: 'positive', accuracyScore: 100, citationScore: 100, platformEvaluation: '', recommendationReason: '', rankingReason: '', expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: '2026-07-11T00:00:00.000Z' }
      }
    ]);

    expect(metrics).toMatchObject({
      questionCoverageRate: 66.7,
      mentionRate: 50,
      recommendationRate: 50,
      firstRecommendationRate: 50,
      topThreeRate: 50,
      citationHitRate: 50,
      expressionAccuracyRate: 50,
      riskExpressionCount: 1,
      contentGapCount: 1,
      competitorSuppressionCount: 1,
      sampleSize: 2
    });
  });

  it('refreshes persisted Sprint metrics through PermissionsService', async () => {
    const permissions = {
      getVisibilitySprint: vi.fn().mockResolvedValue(baseSprint),
      listMonitoringRuns: vi.fn().mockResolvedValue([]),
      updateVisibilitySprintMetrics: vi.fn().mockImplementation((_userId, _brandId, _sprintId, input) => Promise.resolve({ ...baseSprint, metricSummary: input }))
    };
    const service = new SprintMetricsService(permissions as never);

    await expect(service.refreshSprintMetrics('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      metricSummary: { sampleSize: 0, mentionRate: 0 }
    });
    expect(permissions.updateVisibilitySprintMetrics).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', expect.objectContaining({ sampleSize: 0 }));
  });
});
