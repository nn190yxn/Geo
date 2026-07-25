import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SprintsController } from '../src/modules/sprints/sprints.controller';

const request = { context: { userId: 'user_demo' } } as never;
const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'draft',
  currentStep: 'question_radar',
  steps: [{ code: 'question_radar', status: 'pending', title: '问题意图雷达', message: '筛选问题', relatedEntityIds: [] }],
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
  relatedQuestionIds: [],
  relatedTestPlanIds: [],
  relatedMonitoringRunIds: [],
  relatedStandardAnswerIds: [],
  relatedContentTaskIds: [],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

const contentTaskDashboard = {
  brandId: 'brand_demo',
  sprintId: 'sprint_1',
  totalTaskCount: 1,
  reviewReadyTaskCount: 1,
  missingDraftTaskCount: 0,
  items: [{
    contentTask: {
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
    },
    gapContext: {
      questionId: 'question_1',
      question: '贵阳儿童运动推荐？',
      standardAnswerId: 'standard_answer_1',
      sourceRunIds: ['run_1'],
      gapTypes: ['citation_gap'],
      evidenceSummaries: ['引用证据不足：缺少可追溯引用'],
      recommendation: '补充引用证据'
    },
    retestTarget: '2026-07-25T00:00:00.000Z',
    draftReadiness: {
      hasDraft: true,
      bodyLength: 800,
      reviewReady: true,
      message: '正文草稿已达到可审稿长度，进入发布前人工确认。'
    }
  }],
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

function createPermissionsServiceMock() {
  return {
    listVisibilitySprints: vi.fn().mockResolvedValue([sprint]),
    getVisibilitySprint: vi.fn().mockResolvedValue(sprint),
    getCurrentVisibilitySprint: vi.fn().mockResolvedValue(sprint),
    createVisibilitySprint: vi.fn().mockImplementation((_userId, brandId, input) => Promise.resolve({ ...sprint, brandId, ...input })),
    updateVisibilitySprintStep: vi.fn().mockImplementation((_userId, _brandId, _sprintId, input) => Promise.resolve({ ...sprint, ...input }))
  };
}

function createMetricsServiceMock() {
  return {
    refreshSprintMetrics: vi.fn().mockResolvedValue({ ...sprint, metricSummary: { ...sprint.metricSummary, sampleSize: 2, mentionRate: 50 } })
  };
}

function createQuestionRadarServiceMock() {
  return {
    getQuestionRadar: vi.fn().mockResolvedValue({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      totalQuestionCount: 1,
      inSprintQuestionCount: 1,
      dedupedInSprintQuestionCount: 1,
      duplicateInSprintQuestionCount: 0,
      items: [{
        questionId: 'question_1',
        sprintId: 'sprint_1',
        brandId: 'brand_demo',
        question: '贵阳儿童运动推荐？',
        normalizedQuestion: '贵阳儿童运动推荐',
        intentLabel: '本地推荐',
        intentType: 'location',
        purposes: ['brand_mentioned'],
        platformCoverage: ['doubao'],
        businessValue: '高转化意图',
        priority: 'high',
        status: 'in_sprint',
        sprintAssociation: { inSprint: true, relation: 'selected_for_sprint', duplicateInSprint: false },
        createdAt: '2026-07-11T00:00:00.000Z',
        updatedAt: '2026-07-11T00:00:00.000Z'
      }]
    })
  };
}

function createStandardAnswerServiceMock() {
  return {
    listStandardAnswers: vi.fn().mockResolvedValue([standardAnswer]),
    generateStandardAnswers: vi.fn().mockResolvedValue([standardAnswer]),
    approveStandardAnswer: vi.fn().mockResolvedValue({ ...standardAnswer, status: 'approved', reviewedBy: 'user_demo' })
  };
}

function createAlignmentServiceMock() {
  return {
    getAlignmentDashboard: vi.fn().mockResolvedValue({
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
        riskExpressionCount: 0,
        competitorSuppressionCount: 0
      },
      items: [{
        questionId: 'question_1',
        question: '贵阳儿童运动推荐？',
        standardAnswerId: 'standard_answer_1',
        status: 'needs_attention',
        coverageScore: 50,
        accuracyScore: 70,
        keyPointsMatched: ['追光小牛'],
        keyPointsMissing: ['贵阳'],
        citationGap: true,
        riskExpression: false,
        competitorSuppression: false,
        recommendation: '补充引用证据',
        responses: [],
        evidence: []
      }],
      updatedAt: '2026-07-11T00:00:00.000Z'
    })
  };
}

function createContentGapServiceMock() {
  return {
    generateContentGapTasks: vi.fn().mockResolvedValue({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      createdTaskCount: 1,
      skippedQuestionCount: 0,
      tasks: [{
        questionId: 'question_1',
        question: '贵阳儿童运动推荐？',
        standardAnswerId: 'standard_answer_1',
        contentStrategyId: 'strategy_gap_1',
        contentTaskId: 'generation_gap_1',
        sourceRunIds: ['run_1'],
        gapTypes: ['citation_gap'],
        recommendation: '补充引用证据'
      }],
      sprint: { ...sprint, relatedContentTaskIds: ['generation_gap_1'] }
    }),
    getContentTaskDashboard: vi.fn().mockResolvedValue(contentTaskDashboard)
  };
}

function createStageServiceMock() {
  return {
    advanceSprint: vi.fn().mockResolvedValue({ ...sprint, status: 'waiting_confirmation', currentStep: 'ai_response_monitoring' })
  };
}

function createPublishingServiceMock() {
  return {
    getPublishingPreparationDashboard: vi.fn().mockResolvedValue({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      totalContentTaskCount: 1,
      preparedRecordCount: 1,
      pendingManualPublishCount: 1,
      publishedRecordCount: 0,
      failedRecordCount: 0,
      items: [{
        contentTask: contentTaskDashboard.items[0].contentTask,
        publishingRecords: [{ id: 'publish_1', status: 'pending' }],
        targetPlatform: 'official_site',
        recommendedStatus: 'pending_manual_publish',
        message: '已进入待人工发布状态，请在目标平台完成发布并回填结果。'
      }],
      updatedAt: '2026-07-11T00:00:00.000Z'
    }),
    preparePublishingRecords: vi.fn().mockResolvedValue({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      createdRecordCount: 1,
      skippedContentTaskCount: 0,
      records: [{ id: 'publish_1', status: 'draft', platform: 'official_site' }],
      sprint: { ...sprint, relatedPublishingRecordIds: ['publish_1'] }
    })
  };
}

function createRetestServiceMock() {
  return {
    createRetestPlan: vi.fn().mockResolvedValue({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      createdTaskCount: 1,
      skippedPublishingRecordCount: 0,
      tasks: [{ id: 'task_retest_1', status: 'retest' }],
      sprint: { ...sprint, relatedRetestTaskIds: ['task_retest_1'] }
    }),
    getRetestTrendDashboard: vi.fn().mockResolvedValue({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      plannedTaskCount: 1,
      completedRetestCount: 1,
      improvedRetestCount: 1,
      baselineMetricSummary: { ...sprint.metricSummary, mentionRate: 30, sampleSize: 3 },
      items: [{
        task: { id: 'task_retest_1', status: 'retest' },
        status: 'improved',
        beforeMetrics: { mentionRate: 30, brandRank: 4, accuracyScore: 70 },
        afterMetrics: { mentionRate: 60, brandRank: 2, accuracyScore: 86 },
        metricDelta: { mentionRate: 30, rankImproved: true, accuracyScore: 16 },
        message: '复测结果有改善，可进入趋势记录和下一轮扩展。'
      }],
      updatedAt: '2026-07-11T00:00:00.000Z'
    })
  };
}

function createController(
  permissions = createPermissionsServiceMock(),
  radar = createQuestionRadarServiceMock(),
  standardAnswer = createStandardAnswerServiceMock(),
  alignment = createAlignmentServiceMock(),
  contentGap = createContentGapServiceMock(),
  metrics = createMetricsServiceMock(),
  publishing = createPublishingServiceMock(),
  retest = createRetestServiceMock(),
  stage = createStageServiceMock()
) {
  return new SprintsController(permissions as never, radar as never, standardAnswer as never, alignment as never, contentGap as never, metrics as never, publishing as never, retest as never, stage as never);
}

const standardAnswer = {
  answerId: 'standard_answer_1',
  brandId: 'brand_demo',
  questionId: 'question_1',
  question: '贵阳儿童运动推荐？',
  answer: '追光小牛适合贵阳儿童运动成长需求。',
  keyPoints: ['追光小牛', '贵阳'],
  evidence: [{ label: '品牌档案', sourceType: 'brand_profile', sourceId: 'brand_demo', excerpt: '贵阳 5 家校区' }],
  status: 'ready_for_review',
  createdBy: 'user_demo',
  createdAt: '2026-07-11T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z'
} as const;

describe('SprintsController', () => {
  it('returns Sprint list, current Sprint and detail with ApiResponse wrapper', async () => {
    const permissions = createPermissionsServiceMock();
    const controller = createController(permissions);

    await expect(controller.listSprints(request, 'brand_demo')).resolves.toEqual({ success: true, data: [sprint] });
    await expect(controller.getCurrentSprint(request, 'brand_demo')).resolves.toEqual({ success: true, data: sprint });
    await expect(controller.getSprint(request, 'brand_demo', 'sprint_1')).resolves.toEqual({ success: true, data: sprint });
  });

  it('creates Sprint with trimmed title and goal', async () => {
    const permissions = createPermissionsServiceMock();
    const controller = createController(permissions);

    await expect(
      controller.createSprint(request, 'brand_demo', {
        title: ' 新 Sprint ',
        goal: ' 跑通一轮 ',
        status: 'running',
        currentStep: 'ai_response_monitoring'
      })
    ).resolves.toMatchObject({
      success: true,
      data: { title: '新 Sprint', goal: '跑通一轮', status: 'running', currentStep: 'ai_response_monitoring' }
    });
    expect(permissions.createVisibilitySprint).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({ title: '新 Sprint', goal: '跑通一轮' }));
  });

  it('starts and stops Sprint by updating aggregate status', async () => {
    const permissions = createPermissionsServiceMock();
    const controller = createController(permissions);

    await expect(controller.startSprint(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({ success: true, data: { status: 'running' } });
    await expect(controller.stopSprint(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({ success: true, data: { status: 'stopped' } });
    expect(permissions.updateVisibilitySprintStep).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', expect.objectContaining({ status: 'running', currentStep: 'question_radar' }));
    expect(permissions.updateVisibilitySprintStep).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', expect.objectContaining({ status: 'stopped', currentStep: 'question_radar' }));
  });

  it('refreshes Sprint metrics through metrics service', async () => {
    const permissions = createPermissionsServiceMock();
    const metrics = createMetricsServiceMock();
    const controller = createController(permissions, createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), createContentGapServiceMock(), metrics);

    await expect(controller.refreshMetrics(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: { metricSummary: expect.objectContaining({ sampleSize: 2, mentionRate: 50 }) }
    });
    expect(metrics.refreshSprintMetrics).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('rejects invalid create payload and inaccessible Sprint resources', async () => {
    const permissions = createPermissionsServiceMock();
    permissions.getVisibilitySprint.mockResolvedValueOnce(null);
    permissions.listVisibilitySprints.mockResolvedValueOnce(null);
    const controller = createController(permissions);

    await expect(controller.createSprint(request, 'brand_demo', { title: '', goal: '目标' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.listSprints(request, 'missing_brand')).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.getSprint(request, 'brand_demo', 'missing_sprint')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('advances Sprint through stage service', async () => {
    const permissions = createPermissionsServiceMock();
    const stage = createStageServiceMock();
    const controller = createController(permissions, createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), createContentGapServiceMock(), createMetricsServiceMock(), createPublishingServiceMock(), createRetestServiceMock(), stage);

    await expect(controller.advanceSprint(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: { status: 'waiting_confirmation', currentStep: 'ai_response_monitoring' }
    });
    expect(stage.advanceSprint).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('returns question radar dashboard through question radar service', async () => {
    const permissions = createPermissionsServiceMock();
    const radar = createQuestionRadarServiceMock();
    const controller = createController(permissions, radar);

    await expect(controller.getQuestionRadar(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: {
        sprintId: 'sprint_1',
        items: [expect.objectContaining({ intentLabel: '本地推荐', platformCoverage: ['doubao'], status: 'in_sprint' })]
      }
    });
    expect(radar.getQuestionRadar).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('lists, generates and approves standard answers through standard answer service', async () => {
    const standardAnswers = createStandardAnswerServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), standardAnswers);

    await expect(controller.listStandardAnswers(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: [expect.objectContaining({ answerId: 'standard_answer_1', status: 'ready_for_review' })]
    });
    await expect(controller.generateStandardAnswers(request, 'brand_demo', 'sprint_1', { questionIds: [' question_1 '] })).resolves.toMatchObject({
      success: true,
      data: [expect.objectContaining({ answerId: 'standard_answer_1' })]
    });
    await expect(controller.approveStandardAnswer(request, 'brand_demo', 'sprint_1', 'standard_answer_1')).resolves.toMatchObject({
      success: true,
      data: { status: 'approved', reviewedBy: 'user_demo' }
    });
    expect(standardAnswers.generateStandardAnswers).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', { questionIds: ['question_1'] });
    expect(standardAnswers.approveStandardAnswer).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', 'standard_answer_1');
  });

  it('returns standard answer alignment dashboard through alignment service', async () => {
    const alignment = createAlignmentServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), alignment);

    await expect(controller.getAlignmentDashboard(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: {
        sprintId: 'sprint_1',
        summary: expect.objectContaining({ needsAttentionCount: 1, citationGapCount: 1 }),
        items: [expect.objectContaining({ status: 'needs_attention', keyPointsMissing: ['贵阳'] })]
      }
    });
    expect(alignment.getAlignmentDashboard).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('generates content gap tasks through content gap service', async () => {
    const contentGap = createContentGapServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), contentGap);

    await expect(controller.generateContentGapTasks(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: {
        createdTaskCount: 1,
        tasks: [expect.objectContaining({ questionId: 'question_1', contentTaskId: 'generation_gap_1' })],
        sprint: { relatedContentTaskIds: ['generation_gap_1'] }
      }
    });
    expect(contentGap.generateContentGapTasks).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('returns content gap task dashboard through content gap service', async () => {
    const contentGap = createContentGapServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), contentGap);

    await expect(controller.getContentTaskDashboard(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: {
        sprintId: 'sprint_1',
        totalTaskCount: 1,
        reviewReadyTaskCount: 1,
        items: [expect.objectContaining({
          gapContext: expect.objectContaining({ questionId: 'question_1', gapTypes: ['citation_gap'] }),
          retestTarget: '2026-07-25T00:00:00.000Z',
          draftReadiness: expect.objectContaining({ reviewReady: true })
        })]
      }
    });
    expect(contentGap.getContentTaskDashboard).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('returns NotFound when content gap task dashboard is unavailable', async () => {
    const contentGap = createContentGapServiceMock();
    contentGap.getContentTaskDashboard.mockResolvedValueOnce(null);
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), contentGap);

    await expect(controller.getContentTaskDashboard(request, 'brand_demo', 'missing_sprint')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns publishing preparation dashboard through publishing service', async () => {
    const publishing = createPublishingServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), createContentGapServiceMock(), createMetricsServiceMock(), publishing);

    await expect(controller.getPublishingPreparationDashboard(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: {
        sprintId: 'sprint_1',
        preparedRecordCount: 1,
        pendingManualPublishCount: 1,
        items: [expect.objectContaining({ recommendedStatus: 'pending_manual_publish', targetPlatform: 'official_site' })]
      }
    });
    expect(publishing.getPublishingPreparationDashboard).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });

  it('creates Sprint publishing preparation records through publishing service', async () => {
    const publishing = createPublishingServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), createContentGapServiceMock(), createMetricsServiceMock(), publishing);

    await expect(controller.preparePublishingRecords(request, 'brand_demo', 'sprint_1', { contentTaskIds: [' generation_gap_1 '], status: 'pending' })).resolves.toMatchObject({
      success: true,
      data: {
        createdRecordCount: 1,
        records: [expect.objectContaining({ id: 'publish_1', status: 'draft' })],
        sprint: { relatedPublishingRecordIds: ['publish_1'] }
      }
    });
    expect(publishing.preparePublishingRecords).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', { contentTaskIds: ['generation_gap_1'], status: 'pending' });
  });

  it('creates Sprint retest plan through retest service', async () => {
    const retest = createRetestServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), createContentGapServiceMock(), createMetricsServiceMock(), createPublishingServiceMock(), retest);

    await expect(controller.createRetestPlan(request, 'brand_demo', 'sprint_1', { publishingRecordIds: [' publish_1 '], plannedAt: ' 2026-07-25T00:00:00.000Z ', targetScore: 80 })).resolves.toMatchObject({
      success: true,
      data: {
        createdTaskCount: 1,
        tasks: [expect.objectContaining({ id: 'task_retest_1', status: 'retest' })],
        sprint: { relatedRetestTaskIds: ['task_retest_1'] }
      }
    });
    expect(retest.createRetestPlan).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', { publishingRecordIds: ['publish_1'], plannedAt: '2026-07-25T00:00:00.000Z', targetScore: 80 });
  });

  it('returns Sprint retest trend dashboard through retest service', async () => {
    const retest = createRetestServiceMock();
    const controller = createController(createPermissionsServiceMock(), createQuestionRadarServiceMock(), createStandardAnswerServiceMock(), createAlignmentServiceMock(), createContentGapServiceMock(), createMetricsServiceMock(), createPublishingServiceMock(), retest);

    await expect(controller.getRetestTrendDashboard(request, 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      success: true,
      data: {
        plannedTaskCount: 1,
        completedRetestCount: 1,
        improvedRetestCount: 1,
        items: [expect.objectContaining({ status: 'improved', metricDelta: { mentionRate: 30, rankImproved: true, accuracyScore: 16 } })]
      }
    });
    expect(retest.getRetestTrendDashboard).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1');
  });
});
