import { describe, expect, it, vi } from 'vitest';
import { SprintRetestService } from '../src/modules/sprints/sprint-retest.service';

const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'retest_and_trend',
  steps: [],
  metricSummary: {
    questionCoverageRate: 100,
    mentionRate: 30,
    recommendationRate: 20,
    firstRecommendationRate: 10,
    topThreeRate: 20,
    citationHitRate: 15,
    expressionAccuracyRate: 70,
    riskExpressionCount: 1,
    contentGapCount: 2,
    competitorSuppressionCount: 1,
    sampleSize: 3,
    updatedAt: '2026-07-11T01:00:00.000Z'
  },
  relatedQuestionIds: ['question_1'],
  relatedTestPlanIds: [],
  relatedMonitoringRunIds: ['run_1'],
  relatedStandardAnswerIds: ['standard_answer_1'],
  relatedContentTaskIds: ['generation_gap_1'],
  relatedPublishingRecordIds: ['publish_1'],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const publishingRecord = {
  id: 'publish_1',
  brandId: 'brand_demo',
  contentAssetId: 'asset_1',
  generationTaskId: 'generation_gap_1',
  versionId: 'version_1',
  title: '贵阳儿童运动成长课 FAQ',
  body: '追光小牛贵阳儿童运动成长课正文。',
  platform: 'official_site',
  status: 'published',
  publishedUrl: 'https://brand.example/articles/supercalf-faq',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const retestTask = {
  id: 'task_retest_1',
  brandId: 'brand_demo',
  title: '复测发布内容：贵阳儿童运动成长课 FAQ',
  type: 'monitoring_issue',
  status: 'retest',
  sourceRunId: 'run_1',
  relatedPlatformCode: 'official_site',
  dueDate: '2026-07-25T00:00:00.000Z',
  priority: 'high',
  contentLink: 'https://brand.example/articles/supercalf-faq',
  retestRecords: [],
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const completedRetestTask = {
  ...retestTask,
  retestRecords: [{
    id: 'retest_1',
    taskId: 'task_retest_1',
    sourceRunId: 'run_1',
    retestRunId: 'run_2',
    plannedAt: '2026-07-25T00:00:00.000Z',
    completedAt: '2026-07-26T00:00:00.000Z',
    targetScore: 80,
    actualScore: 86,
    passed: true,
    improved: true,
    beforeMetrics: { mentionRate: 30, brandRank: 4, accuracyScore: 70 },
    afterMetrics: { mentionRate: 60, brandRank: 2, accuracyScore: 86 },
    metricDelta: { mentionRate: 30, rankImproved: true, accuracyScore: 16 },
    createdAt: '2026-07-25T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z'
  }]
} as const;

function createPermissionsMock(overrides: Partial<{
  currentSprint: unknown;
  records: unknown[];
  tasks: unknown[];
  createdTask: unknown;
}> = {}) {
  return {
    getVisibilitySprint: vi.fn().mockResolvedValue(overrides.currentSprint ?? sprint),
    getTaskBoard: vi.fn().mockReturnValue({ brandId: 'brand_demo', tasks: overrides.tasks ?? [], statusCounts: { todo: 0, doing: 0, review: 0, retest: 0, done: 0, reopened: 0 } }),
    getPublishingDashboard: vi.fn().mockReturnValue({ brandId: 'brand_demo', platforms: [], accounts: [], records: overrides.records ?? [publishingRecord] }),
    createOptimizationTask: vi.fn().mockImplementation((_userId, brandId, input) => overrides.createdTask ?? ({
      id: 'task_retest_1',
      brandId,
      ...input,
      status: 'todo',
      retestRecords: [],
      createdAt: '2026-07-11T00:00:00.000Z',
      updatedAt: '2026-07-11T00:00:00.000Z'
    })),
    updateOptimizationTask: vi.fn().mockImplementation((_userId, _brandId, taskId, input) => ({ ...retestTask, id: taskId, ...input })),
    updateVisibilitySprintRelations: vi.fn().mockImplementation((_userId, _brandId, _sprintId, input) => Promise.resolve({ ...sprint, ...input }))
  };
}

describe('SprintRetestService', () => {
  it('creates retest tasks from published Sprint records and links them back to Sprint', async () => {
    const permissions = createPermissionsMock();
    const service = new SprintRetestService(permissions as never);

    await expect(service.createRetestPlan('user_demo', 'brand_demo', 'sprint_1', { plannedAt: '2026-07-25T00:00:00.000Z', targetScore: 80 })).resolves.toMatchObject({
      createdTaskCount: 1,
      skippedPublishingRecordCount: 0,
      tasks: [expect.objectContaining({ id: 'task_retest_1', status: 'retest', contentLink: publishingRecord.publishedUrl })],
      sprint: expect.objectContaining({ relatedRetestTaskIds: ['task_retest_1'] })
    });
    expect(permissions.createOptimizationTask).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      title: '复测发布内容：贵阳儿童运动成长课 FAQ',
      sourceRunId: 'run_1',
      relatedPlatformCode: 'official_site',
      dueDate: '2026-07-25T00:00:00.000Z'
    }));
  });

  it('skips draft publishing records when creating retest plans', async () => {
    const permissions = createPermissionsMock({ records: [{ ...publishingRecord, status: 'draft', publishedUrl: undefined }] });
    const service = new SprintRetestService(permissions as never);

    await expect(service.createRetestPlan('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      createdTaskCount: 0,
      skippedPublishingRecordCount: 1,
      tasks: []
    });
    expect(permissions.createOptimizationTask).not.toHaveBeenCalled();
  });

  it('builds trend dashboard from linked retest tasks and completed records', async () => {
    const permissions = createPermissionsMock({ currentSprint: { ...sprint, relatedRetestTaskIds: ['task_retest_1'] }, tasks: [completedRetestTask] });
    const service = new SprintRetestService(permissions as never);

    await expect(service.getRetestTrendDashboard('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      plannedTaskCount: 1,
      completedRetestCount: 1,
      improvedRetestCount: 1,
      baselineMetricSummary: expect.objectContaining({ mentionRate: 30, sampleSize: 3 }),
      items: [expect.objectContaining({
        status: 'improved',
        beforeMetrics: { mentionRate: 30, brandRank: 4, accuracyScore: 70 },
        afterMetrics: { mentionRate: 60, brandRank: 2, accuracyScore: 86 },
        metricDelta: { mentionRate: 30, rankImproved: true, accuracyScore: 16 }
      })]
    });
  });
});
