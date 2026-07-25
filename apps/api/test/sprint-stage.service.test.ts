import { describe, expect, it, vi } from 'vitest';
import { SprintStageService } from '../src/modules/sprints/sprint-stage.service';

const baseSprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'question_radar',
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
  relatedQuestionIds: ['question_1'],
  relatedTestPlanIds: ['plan_1'],
  relatedMonitoringRunIds: ['run_1'],
  relatedStandardAnswerIds: [],
  relatedContentTaskIds: [],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const run = {
  id: 'run_1',
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_1',
  intentId: 'intent_1',
  promptId: 'prompt_1',
  platformCode: 'doubao',
  status: 'completed',
  createdAt: '2026-07-11T00:00:00.000Z',
  promptText: '贵阳儿童运动推荐？',
  response: { id: 'response_1', runId: 'run_1', brandId: 'brand_demo', rawText: '真实回答', citations: [], respondedAt: '2026-07-11T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-07-11T00:00:00.000Z' }
} as const;

describe('SprintStageService', () => {
  it('keeps Sprint waiting on AI response monitoring when real answers are missing', () => {
    const service = new SprintStageService({} as never);

    expect(service.resolveNextState({ ...baseSprint, relatedMonitoringRunIds: ['run_missing'] }, [])).toMatchObject({
      status: 'waiting_confirmation',
      currentStep: 'ai_response_monitoring',
      steps: expect.arrayContaining([expect.objectContaining({ code: 'ai_response_monitoring', status: 'waiting_confirmation' })])
    });
  });

  it('moves to standard answer alignment after real answers exist', () => {
    const service = new SprintStageService({} as never);

    expect(service.resolveNextState(baseSprint, [run])).toMatchObject({
      status: 'waiting_confirmation',
      currentStep: 'standard_answer_alignment'
    });
  });

  it('marks Sprint completed when all aggregate links are present', () => {
    const service = new SprintStageService({} as never);

    expect(service.resolveNextState({
      ...baseSprint,
      metricSummary: { ...baseSprint.metricSummary, updatedAt: '2026-07-11T01:00:00.000Z' },
      relatedStandardAnswerIds: ['standard_1'],
      relatedContentTaskIds: ['content_1'],
      relatedPublishingRecordIds: ['publish_1'],
      relatedRetestTaskIds: ['retest_1']
    }, [run])).toMatchObject({ status: 'completed', currentStep: 'completed' });
  });

  it('persists resolved stage through PermissionsService', async () => {
    const permissions = {
      getVisibilitySprint: vi.fn().mockResolvedValue(baseSprint),
      listMonitoringRuns: vi.fn().mockResolvedValue([]),
      updateVisibilitySprintStep: vi.fn().mockImplementation((_userId, _brandId, _sprintId, input) => Promise.resolve({ ...baseSprint, ...input }))
    };
    const service = new SprintStageService(permissions as never);

    await expect(service.advanceSprint('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      status: 'waiting_confirmation',
      currentStep: 'ai_response_monitoring'
    });
    expect(permissions.updateVisibilitySprintStep).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', expect.objectContaining({ currentStep: 'ai_response_monitoring' }));
  });
});
