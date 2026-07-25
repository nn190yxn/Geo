import { describe, expect, it, vi } from 'vitest';
import { SprintContentGapService } from '../src/modules/sprints/sprint-content-gap.service';

const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'gap_diagnosis',
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
  relatedContentTaskIds: [],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const baseStrategy = {
  id: 'strategy_1',
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_1',
  intentId: 'intent_1',
  type: 'gap',
  priority: 'high',
  suggestedTitle: '补强本地推荐内容',
  targetPlatform: 'wechat_official_account',
  targetKeywords: ['贵阳儿童运动'],
  relatedPromptIds: [],
  status: 'draft',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const alignmentDashboard = {
  brandId: 'brand_demo',
  sprintId: 'sprint_1',
  realAnswerCount: 1,
  approvedStandardAnswerCount: 1,
  summary: {
    totalQuestionCount: 1,
    alignedCount: 0,
    needsAttentionCount: 1,
    waitingRealAnswerCount: 0,
    waitingStandardAnswerCount: 0,
    citationGapCount: 1,
    riskExpressionCount: 1,
    competitorSuppressionCount: 0
  },
  items: [{
    questionId: 'question_1',
    question: '贵阳儿童运动推荐？',
    standardAnswerId: 'standard_answer_1',
    status: 'needs_attention',
    coverageScore: 33.3,
    accuracyScore: 65,
    keyPointsMatched: ['追光小牛'],
    keyPointsMissing: ['贵阳', '儿童运动成长课'],
    citationGap: true,
    riskExpression: true,
    competitorSuppression: false,
    recommendation: '补充引用证据；修正风险表达',
    responses: [{
      runId: 'run_1',
      responseId: 'response_1',
      platformCode: 'doubao',
      promptText: '贵阳儿童运动推荐？',
      rawExcerpt: '可以看追光小牛。',
      citations: [],
      brandMentioned: true,
      brandRank: 2,
      competitorMentions: []
    }],
    evidence: [
      { type: 'coverage', severity: 'high', label: '标准答案要点缺失', excerpt: '贵阳、儿童运动成长课' },
      { type: 'citation_gap', severity: 'medium', label: '引用证据不足', excerpt: '缺少可追溯引用' },
      { type: 'risk_expression', severity: 'high', label: '风险表达需要复核', excerpt: '需要复核课程承诺表达' }
    ]
  }],
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

function createPermissionsMock(overrides: Partial<{
  currentSprint: unknown;
  strategies: unknown[];
  generatedStrategies: unknown[];
  existingTaskWorkspace: unknown;
  workspaceByTaskId: Record<string, unknown>;
}> = {}) {
  return {
    getVisibilitySprint: vi.fn().mockResolvedValue(overrides.currentSprint ?? sprint),
    listContentStrategies: vi.fn().mockReturnValue(overrides.strategies ?? [baseStrategy]),
    generateContentStrategies: vi.fn().mockReturnValue(overrides.generatedStrategies ?? []),
    createContentStrategy: vi.fn().mockImplementation((_userId, brandId, input) => ({
      ...baseStrategy,
      id: 'strategy_gap_1',
      brandId,
      ...input
    })),
    createContentGenerationTask: vi.fn().mockImplementation((_userId, brandId, input) => ({
      brandId,
      currentTask: {
        id: 'generation_gap_1',
        brandId,
        strategyId: input.strategyId,
        targetPlatform: input.targetPlatform,
        contentType: input.contentType,
        contentTopic: input.contentTopic,
        targetKeywords: input.targetKeywords,
        referenceSources: input.referenceSources,
        status: 'completed',
        steps: [],
        createdAt: '2026-07-11T00:00:00.000Z',
        updatedAt: '2026-07-11T00:00:00.000Z'
      }
    })),
    getContentGenerationWorkspace: vi.fn().mockImplementation((_userId, _brandId, taskId) => {
      if (taskId && overrides.workspaceByTaskId?.[taskId]) return overrides.workspaceByTaskId[taskId];
      return overrides.existingTaskWorkspace ?? null;
    }),
    updateVisibilitySprintRelations: vi.fn().mockImplementation((_userId, _brandId, _sprintId, input) => Promise.resolve({ ...sprint, ...input }))
  };
}

function createAlignmentMock(dashboard: unknown = alignmentDashboard) {
  return {
    getAlignmentDashboard: vi.fn().mockResolvedValue(dashboard)
  };
}

describe('SprintContentGapService', () => {
  it('creates content strategies and generation tasks from alignment gaps', async () => {
    const permissions = createPermissionsMock();
    const service = new SprintContentGapService(permissions as never, createAlignmentMock() as never);

    await expect(service.generateContentGapTasks('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      createdTaskCount: 1,
      skippedQuestionCount: 0,
      tasks: [expect.objectContaining({
        questionId: 'question_1',
        contentStrategyId: 'strategy_gap_1',
        contentTaskId: 'generation_gap_1',
        sourceRunIds: ['run_1'],
        gapTypes: ['coverage', 'citation_gap', 'risk_expression']
      })],
      sprint: expect.objectContaining({ relatedContentTaskIds: ['generation_gap_1'] })
    });
    expect(permissions.createContentStrategy).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      type: 'authority_citation',
      priority: 'high',
      targetKeywords: expect.arrayContaining(['贵阳', '儿童运动成长课'])
    }));
    expect(permissions.createContentGenerationTask).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      strategyId: 'strategy_gap_1',
      targetPlatform: 'official_site',
      contentType: 'official_faq',
      referenceSources: expect.arrayContaining(['sprint_gap:sprint_1:question_1', 'standard_answer:standard_answer_1', 'monitoring_run:run_1'])
    }));
  });

  it('skips gap items when a Sprint content task already exists for the same question', async () => {
    const permissions = createPermissionsMock({
      currentSprint: { ...sprint, relatedContentTaskIds: ['generation_existing'] },
      existingTaskWorkspace: {
        currentTask: {
          id: 'generation_existing',
          referenceSources: ['sprint_gap:sprint_1:question_1']
        }
      }
    });
    const service = new SprintContentGapService(permissions as never, createAlignmentMock() as never);

    await expect(service.generateContentGapTasks('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      createdTaskCount: 0,
      skippedQuestionCount: 1,
      tasks: []
    });
    expect(permissions.createContentStrategy).not.toHaveBeenCalled();
    expect(permissions.createContentGenerationTask).not.toHaveBeenCalled();
  });

  it('returns null when no base content strategy can be resolved', async () => {
    const permissions = createPermissionsMock({ strategies: [], generatedStrategies: [] });
    const service = new SprintContentGapService(permissions as never, createAlignmentMock() as never);

    await expect(service.generateContentGapTasks('user_demo', 'brand_demo', 'sprint_1')).resolves.toBeNull();
  });

  it('builds Sprint content task dashboard with gap context and review-ready draft state', async () => {
    const permissions = createPermissionsMock({
      currentSprint: { ...sprint, relatedContentTaskIds: ['generation_gap_1'] },
      workspaceByTaskId: {
        generation_gap_1: {
          currentTask: {
            id: 'generation_gap_1',
            brandId: 'brand_demo',
            strategyId: 'strategy_gap_1',
            targetPlatform: 'official_site',
            contentType: 'official_faq',
            contentTopic: '补强“贵阳、儿童运动成长课”的 AI 可见性内容',
            targetKeywords: ['贵阳', '儿童运动成长课'],
            referenceSources: [
              'sprint_gap:sprint_1:question_1',
              'question:question_1',
              'standard_answer:standard_answer_1',
              'monitoring_run:run_1',
              'citation_gap:引用证据不足:缺少可追溯引用'
            ],
            retestAt: '2026-07-25T00:00:00.000Z',
            status: 'completed',
            steps: [],
            draftRef: 'version_1',
            createdAt: '2026-07-11T00:00:00.000Z',
            updatedAt: '2026-07-11T00:00:00.000Z'
          },
          currentVersion: {
            id: 'version_1',
            brandId: 'brand_demo',
            generationTaskId: 'generation_gap_1',
            title: '贵阳儿童运动成长课 FAQ',
            body: `${'追光小牛贵阳儿童运动成长课内容。'.repeat(40)}`,
            version: 1,
            exportFormat: 'markdown',
            createdAt: '2026-07-11T00:00:00.000Z',
            updatedAt: '2026-07-11T00:00:00.000Z'
          }
        }
      }
    });
    const service = new SprintContentGapService(permissions as never, createAlignmentMock() as never);

    await expect(service.getContentTaskDashboard('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      totalTaskCount: 1,
      reviewReadyTaskCount: 1,
      missingDraftTaskCount: 0,
      items: [expect.objectContaining({
        retestTarget: '2026-07-25T00:00:00.000Z',
        gapContext: expect.objectContaining({
          questionId: 'question_1',
          question: '贵阳儿童运动推荐？',
          standardAnswerId: 'standard_answer_1',
          sourceRunIds: ['run_1'],
          gapTypes: ['citation_gap', 'coverage', 'risk_expression'],
          recommendation: '补充引用证据；修正风险表达'
        }),
        draftReadiness: expect.objectContaining({ hasDraft: true, reviewReady: true })
      })]
    });
  });

  it('marks short drafts as not ready for review', async () => {
    const permissions = createPermissionsMock({
      currentSprint: { ...sprint, relatedContentTaskIds: ['generation_gap_1'] },
      workspaceByTaskId: {
        generation_gap_1: {
          currentTask: {
            id: 'generation_gap_1',
            brandId: 'brand_demo',
            strategyId: 'strategy_gap_1',
            targetPlatform: 'official_site',
            contentType: 'official_faq',
            targetKeywords: [],
            referenceSources: ['sprint_gap:sprint_1:question_1'],
            status: 'completed',
            steps: [],
            createdAt: '2026-07-11T00:00:00.000Z',
            updatedAt: '2026-07-11T00:00:00.000Z'
          },
          currentVersion: {
            id: 'version_1',
            brandId: 'brand_demo',
            generationTaskId: 'generation_gap_1',
            title: '短草稿',
            body: '内容太短。',
            version: 1,
            exportFormat: 'markdown',
            createdAt: '2026-07-11T00:00:00.000Z',
            updatedAt: '2026-07-11T00:00:00.000Z'
          }
        }
      }
    });
    const service = new SprintContentGapService(permissions as never, createAlignmentMock() as never);

    await expect(service.getContentTaskDashboard('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      reviewReadyTaskCount: 0,
      items: [expect.objectContaining({
        draftReadiness: expect.objectContaining({ hasDraft: true, reviewReady: false })
      })]
    });
  });
});
