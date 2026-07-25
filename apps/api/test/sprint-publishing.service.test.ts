import { describe, expect, it, vi } from 'vitest';
import { SprintPublishingService } from '../src/modules/sprints/sprint-publishing.service';

const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'publishing_preparation',
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
  relatedTestPlanIds: [],
  relatedMonitoringRunIds: ['run_1'],
  relatedStandardAnswerIds: ['standard_answer_1'],
  relatedContentTaskIds: ['generation_gap_1'],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const currentTask = {
  id: 'generation_gap_1',
  brandId: 'brand_demo',
  strategyId: 'strategy_gap_1',
  targetPlatform: 'official_site',
  contentType: 'official_faq',
  contentTopic: '补强本地推荐内容',
  targetKeywords: ['贵阳'],
  referenceSources: ['sprint_gap:sprint_1:question_1'],
  status: 'completed',
  steps: [],
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const currentVersion = {
  id: 'version_1',
  brandId: 'brand_demo',
  generationTaskId: 'generation_gap_1',
  title: '贵阳儿童运动成长课 FAQ',
  body: '追光小牛贵阳儿童运动成长课正文。',
  version: 1,
  exportFormat: 'markdown',
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
  status: 'pending',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

function createPermissionsMock(overrides: Partial<{
  currentSprint: unknown;
  dashboardRecords: unknown[];
  workspace: unknown;
  createdRecord: unknown;
}> = {}) {
  return {
    getVisibilitySprint: vi.fn().mockResolvedValue(overrides.currentSprint ?? sprint),
    getPublishingDashboard: vi.fn().mockReturnValue({
      brandId: 'brand_demo',
      platforms: [],
      accounts: [],
      records: overrides.dashboardRecords ?? []
    }),
    getContentGenerationWorkspace: vi.fn().mockReturnValue(overrides.workspace ?? {
      brandId: 'brand_demo',
      tasks: [currentTask],
      currentTask,
      currentVersion,
      versions: [currentVersion],
      exports: []
    }),
    createPublishingRecord: vi.fn().mockImplementation((_userId, brandId, input) => overrides.createdRecord ?? ({
      id: 'publish_created_1',
      brandId,
      contentAssetId: 'asset_created_1',
      generationTaskId: input.generationTaskId,
      versionId: input.versionId,
      title: input.title,
      body: input.body,
      platform: input.targetPlatform,
      status: input.status,
      createdAt: '2026-07-11T00:00:00.000Z',
      updatedAt: '2026-07-11T00:00:00.000Z'
    })),
    updateVisibilitySprintRelations: vi.fn().mockImplementation((_userId, _brandId, _sprintId, input) => Promise.resolve({ ...sprint, ...input }))
  };
}

describe('SprintPublishingService', () => {
  it('builds publishing preparation dashboard from Sprint content tasks and related records', async () => {
    const permissions = createPermissionsMock({
      currentSprint: { ...sprint, relatedPublishingRecordIds: ['publish_1'] },
      dashboardRecords: [publishingRecord]
    });
    const service = new SprintPublishingService(permissions as never);

    await expect(service.getPublishingPreparationDashboard('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      totalContentTaskCount: 1,
      preparedRecordCount: 1,
      pendingManualPublishCount: 1,
      items: [expect.objectContaining({
        targetPlatform: 'official_site',
        recommendedStatus: 'pending_manual_publish',
        publishingRecords: [expect.objectContaining({ id: 'publish_1', status: 'pending' })]
      })]
    });
  });

  it('creates draft publishing records and links them back to Sprint', async () => {
    const permissions = createPermissionsMock();
    const service = new SprintPublishingService(permissions as never);

    await expect(service.preparePublishingRecords('user_demo', 'brand_demo', 'sprint_1', { status: 'draft' })).resolves.toMatchObject({
      createdRecordCount: 1,
      skippedContentTaskCount: 0,
      records: [expect.objectContaining({ id: 'publish_created_1', status: 'draft', platform: 'official_site' })],
      sprint: expect.objectContaining({ relatedPublishingRecordIds: ['publish_created_1'] })
    });
    expect(permissions.createPublishingRecord).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      generationTaskId: 'generation_gap_1',
      versionId: 'version_1',
      targetPlatform: 'official_site',
      status: 'draft'
    }));
  });

  it('reuses existing publishing records instead of creating duplicates', async () => {
    const permissions = createPermissionsMock({ dashboardRecords: [publishingRecord] });
    const service = new SprintPublishingService(permissions as never);

    await expect(service.preparePublishingRecords('user_demo', 'brand_demo', 'sprint_1', { status: 'pending' })).resolves.toMatchObject({
      createdRecordCount: 0,
      records: [expect.objectContaining({ id: 'publish_1' })],
      sprint: expect.objectContaining({ relatedPublishingRecordIds: ['publish_1'] })
    });
    expect(permissions.createPublishingRecord).not.toHaveBeenCalled();
  });

  it('skips content tasks without draft body', async () => {
    const permissions = createPermissionsMock({
      workspace: {
        brandId: 'brand_demo',
        tasks: [currentTask],
        currentTask,
        versions: [],
        exports: []
      }
    });
    const service = new SprintPublishingService(permissions as never);

    await expect(service.preparePublishingRecords('user_demo', 'brand_demo', 'sprint_1', { status: 'pending' })).resolves.toMatchObject({
      createdRecordCount: 0,
      skippedContentTaskCount: 1,
      records: []
    });
  });
});
