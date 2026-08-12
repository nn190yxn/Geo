import { describe, expect, it } from 'vitest';

import type {
  AIResponse,
  AnalysisResult,
  AnalysisFinding,
  AutomationConfirmation,
  BeginnerHomeDashboard,
  BrandProfile,
  CitationSource,
  ContentGenerationTask,
  MediaPlatformRule,
  MonitoringRunDetail,
  OptimizationTask,
  OptimizationUnit,
  OwnedMediaAccount,
  PublishingChannelStats,
  PublishingRecord,
  PublishingRecordPerformance,
  ReportDashboard,
  SprintRetestTrendDashboard,
  UserIntent,
  BrandPrompt,
} from '@geo-platform/shared-types';
import {
  buildAnalysisDiagnosisDashboard,
  buildBrandActionDashboard,
  buildBeginnerHomeDashboard,
  buildBeginnerHomeResultSummary,
  buildContentOperationDashboard,
  buildMonitoringObjectDashboard,
  buildPublishingOperationDashboard,
} from '../src/modules/dashboards/dashboard.mapper';

const brandId = 'brand-a';
const otherBrandId = 'brand-b';
const now = '2026-07-14T10:00:00.000Z';

function createFinding(type: AnalysisFinding['type'], id = `finding-${type}`, ownerBrandId = brandId): AnalysisFinding {
  return {
    id,
    brandId: ownerBrandId,
    type,
    title: `${type} finding`,
    evidence: ['真实 AI 回复证据'],
    severity: type === 'competitor' ? 'high' : 'medium',
    recommendedActions: [{ actionType: 'create_task', label: '创建优化任务', targetId: 'target-1' }],
  };
}

function createContentTask(ownerBrandId = brandId): ContentGenerationTask {
  return {
    id: `content-${ownerBrandId}`,
    brandId: ownerBrandId,
    strategyId: 'strategy-1',
    targetPlatform: 'doubao',
    contentType: 'website_faq',
    targetKeywords: ['GEO'],
    referenceSources: ['knowledge-1'],
    status: 'completed',
    steps: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createRun(ownerBrandId = brandId): MonitoringRunDetail {
  const response: AIResponse = {
    id: `response-${ownerBrandId}`,
    runId: `run-${ownerBrandId}`,
    brandId: ownerBrandId,
    rawText: '真实 AI 回复',
    citations: [],
    platformCode: 'doubao',
    modelName: 'unknown',
    collectionMethod: 'unknown',
    searchEnabled: null,
    market: 'unknown',
    language: 'unknown',
    evidenceLevel: 'unknown',
    manualConfirmed: null,
    baselineVersion: 'unknown',
    respondedAt: now,
    parseStatus: 'parsed',
    createdAt: now,
  };
  return {
    id: response.runId,
    brandId: ownerBrandId,
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    promptId: 'prompt-1',
    promptText: '推荐一个品牌',
    platformCode: 'doubao',
    modelName: 'unknown',
    collectionMethod: 'unknown',
    searchEnabled: null,
    market: 'unknown',
    language: 'unknown',
    evidenceLevel: 'unknown',
    manualConfirmed: null,
    baselineVersion: 'unknown',
    status: 'completed',
    createdAt: now,
    response,
  };
}

function createBeginnerDashboard(): BeginnerHomeDashboard {
  return buildBeginnerHomeDashboard({
    brandId,
    profile: { brandId, completenessScore: 100, missingFields: [] } as BrandProfile,
    monitoringObjectCount: 1,
    realResponseRuns: [],
    contentTasks: [],
    publishingStats: [],
    publishingPerformance: [],
    analysisFindings: [],
  });
}

function createActionSource(overrides: Partial<Parameters<typeof buildBrandActionDashboard>[0]> = {}): Parameters<typeof buildBrandActionDashboard>[0] {
  const analyzedRun = createRun();
  analyzedRun.analysis = {} as AnalysisResult;
  return {
    brandId,
    beginnerHome: createBeginnerDashboard(),
    profile: { brandId, completenessScore: 100, missingFields: [] } as BrandProfile,
    optimizationUnits: [{ id: 'unit-1', brandId, priority: 'high' } as OptimizationUnit],
    monitoringRuns: [analyzedRun],
    contentTasks: [],
    publishingRecords: [],
    optimizationTasks: [],
    pendingConfirmations: [],
    now: new Date(now),
    ...overrides,
  };
}

describe('dashboard mappers', () => {
  it('仅用真实回复分析计算首页四项摘要', () => {
    const rankedRun = createRun();
    rankedRun.response = { ...rankedRun.response!, citations: [{ id: 'citation-1' } as CitationSource] };
    rankedRun.analysis = {
      brandRank: 2,
      citationScore: 0,
      reviewRequired: true,
    } as AnalysisResult;
    const unrankedRun = createRun();
    unrankedRun.id = 'run-unranked';
    unrankedRun.analysis = {
      brandRank: null,
      citationScore: 80,
      reviewRequired: false,
    } as AnalysisResult;

    expect(buildBeginnerHomeResultSummary([rankedRun, unrankedRun])).toEqual({
      recommendationRate: 50,
      averageRank: 2,
      citationHitRate: 100,
      pendingIssueCount: 1,
      sampleSize: 2,
      rankedSampleSize: 1,
    });
    expect(buildBeginnerHomeResultSummary([])).toEqual({
      recommendationRate: 0,
      averageRank: null,
      citationHitRate: 0,
      pendingIssueCount: 0,
      sampleSize: 0,
      rankedSampleSize: 0,
    });
  });

  it('聚合新手首页并过滤其他品牌数据', () => {
    const profile = {
      brandId,
      completenessScore: 100,
      missingFields: [],
    } as BrandProfile;
    const stats: PublishingChannelStats = {
      brandId,
      platform: 'wechat',
      totalRecords: 2,
      draftRecords: 0,
      pendingRecords: 0,
      publishedRecords: 2,
      failedRecords: 0,
    };
    const performance: PublishingRecordPerformance = {
      brandId,
      recordId: 'record-1',
      sourceStatus: 'linked',
      citationCount: 3,
      relatedIntentCount: 1,
      retestStatus: 'planned',
      nextSuggestion: '安排再次监测',
    };

    const dashboard = buildBeginnerHomeDashboard({
      brandId,
      profile,
      monitoringObjectCount: 1,
      realResponseRuns: [createRun(), createRun(otherBrandId)],
      contentTasks: [createContentTask(), createContentTask(otherBrandId)],
      publishingStats: [stats, { ...stats, brandId: otherBrandId }],
      publishingPerformance: [performance, { ...performance, brandId: otherBrandId }],
      analysisFindings: [createFinding('competitor'), createFinding('fact', 'foreign-finding', otherBrandId)],
    });

    expect(dashboard.realResponseStatus).toMatchObject({ total: 1, collected: 1 });
    expect(dashboard.contentTaskStatus.completed).toBe(1);
    expect(dashboard.publishingStatus).toMatchObject({ totalRecords: 2, citationCount: 3, pendingRetestCount: 1 });
    expect(dashboard.analysisRisk).toMatchObject({ total: 1, high: 1 });
    expect(dashboard.resultSummary).toMatchObject({ sampleSize: 1, recommendationRate: 0, averageRank: null });
    expect(dashboard.nextAction.actionType).toBe('review_risk');
  });

  it('按优化单元关联意图、问题、内容任务和最新复测状态', () => {
    const unit = {
      id: 'unit-1',
      brandId,
      name: '品牌推荐',
      type: 'brand',
      priority: 'high',
      enabled: true,
    } as OptimizationUnit;
    const intent = {
      id: 'intent-1',
      brandId,
      optimizationUnitId: unit.id,
      category: 'brand_awareness',
      text: '用户需要品牌推荐',
      monitoringFrequency: 'weekly',
      enabled: true,
      platformMetrics: [{
        platformCode: 'doubao',
        promptText: '推荐一个品牌',
        recommendationScore: 80,
        averageRank: 2,
        evaluation: '表现稳定',
        citationRate: 0.5,
      }],
    } as UserIntent;
    const prompt = {
      id: 'prompt-1',
      brandId,
      optimizationUnitId: unit.id,
      intentId: intent.id,
      text: '推荐一个品牌',
      platformCodes: ['doubao'],
      monitoringFrequency: 'weekly',
      enabled: true,
    } as BrandPrompt;
    const task = {
      id: 'task-1',
      brandId,
      title: '补充品牌内容',
      status: 'retest',
      relatedPromptId: prompt.id,
      retestRecords: [
        { id: 'old', updatedAt: '2026-07-13T10:00:00.000Z', completedAt: now, improved: false },
        { id: 'latest', updatedAt: now, completedAt: now, improved: true },
      ],
    } as OptimizationTask;

    const dashboard = buildMonitoringObjectDashboard({
      brandId,
      optimizationUnits: [unit],
      intents: [intent],
      prompts: [prompt],
      contentTasks: [task],
    });

    expect(dashboard.objects).toHaveLength(1);
    expect(dashboard.objects[0]?.intents[0]?.platformMetrics[0]).toMatchObject({
      recommendationScore: 80,
      averageRank: 2,
      citationRate: 0.5,
    });
    expect(dashboard.objects[0]?.contentTasks[0]?.retestStatus).toBe('improved');
  });

  it('映射内容、发布和四类分析页面数据', () => {
    const record = { id: 'record-1', brandId, contentAssetId: 'asset-1' } as PublishingRecord;
    const account = { id: 'account-1', brandId } as OwnedMediaAccount;
    const rule = { brandId, platform: 'wechat' } as MediaPlatformRule;
    const citation = { id: 'citation-1', brandId, contentAssetId: record.contentAssetId } as CitationSource;
    const performance = { brandId, recordId: record.id } as PublishingRecordPerformance;
    const channelStats = { brandId, platform: 'wechat' } as PublishingChannelStats;
    const retest = {
      brandId,
      items: [
        { task: { id: 'task-planned', brandId } as OptimizationTask, status: 'planned' },
        { task: { id: 'task-done', brandId } as OptimizationTask, status: 'completed' },
      ],
    } as SprintRetestTrendDashboard;

    const contentDashboard = buildContentOperationDashboard({
      brandId,
      tasks: [createContentTask(), createContentTask(otherBrandId)],
      templates: [{ contentType: 'website_faq', title: '官网 FAQ', targetPlatforms: ['website'] }],
      materials: [],
      assets: [],
      publishingStats: [channelStats],
      retest,
    });
    const publishingDashboard = buildPublishingOperationDashboard({
      brandId,
      accounts: [account],
      platformRules: [rule],
      records: [record],
      citations: [citation],
      performance: [performance],
      channelStats: [channelStats],
      retest,
    });
    const findings = (['competitor', 'evaluation', 'citation', 'fact'] as const).map((type) => createFinding(type));
    const analysisDashboard = buildAnalysisDiagnosisDashboard(brandId, [
      ...findings,
      createFinding('fact', 'foreign-finding', otherBrandId),
    ]);

    expect(contentDashboard.tasks).toHaveLength(1);
    expect(contentDashboard.templates[0]?.title).toBe('官网 FAQ');
    expect(publishingDashboard).toMatchObject({ brandId, accounts: [account], citations: [citation] });
    expect(publishingDashboard.pendingRetestItems.map((item) => item.task.id)).toEqual(['task-planned']);
    expect(Object.values(analysisDashboard.findingGroups).map((group) => group.length)).toEqual([1, 1, 1, 1]);
    expect(analysisDashboard.recommendedActions).toHaveLength(1);
  });

  it('将资料阻断置顶并严格过滤品牌且最多返回三项待办', () => {
    const tasks = Array.from({ length: 5 }, (_, index) => ({
      id: `task-${index}`,
      brandId: index === 4 ? otherBrandId : brandId,
      title: `任务 ${index}`,
      type: 'manual',
      status: 'todo',
      priority: 'medium',
      retestRecords: [],
      createdAt: now,
      updatedAt: now,
    })) as OptimizationTask[];
    const dashboard = buildBrandActionDashboard(createActionSource({
      profile: { brandId, completenessScore: 50, missingFields: ['intro'] } as BrandProfile,
      optimizationTasks: tasks,
    }));

    expect(dashboard.primaryAction).toMatchObject({ id: 'blocker:brand-profile', category: 'data_blocker' });
    expect(dashboard.primaryAction.blocker).toMatchObject({ reason: '品牌资料不完整', recoveryAction: '补齐并确认品牌核心资料' });
    expect(dashboard.todos).toHaveLength(3);
    expect(dashboard.todos.every((item) => item.id !== 'task-4')).toBe(true);
  });

  it('按待确认、执行状态、到期、业务价值和稳定 ID 排序', () => {
    const confirmation = {
      confirmationId: 'confirm-1',
      packageId: 'package-1',
      brandId,
      type: 'analysis_review',
      status: 'pending',
      title: '确认分析结论',
      impact: '影响后续内容',
      recommendation: '人工确认',
      evidenceSummary: '一条证据',
      payload: { runId: 'run-1', promptId: 'prompt-1' },
    } as AutomationConfirmation;
    const tasks = [
      { id: 'task-z', status: 'todo', priority: 'high', dueDate: '2026-07-16T00:00:00.000Z' },
      { id: 'task-b', status: 'doing', priority: 'low', dueDate: '2026-07-20T00:00:00.000Z' },
      { id: 'task-a', status: 'doing', priority: 'low', dueDate: '2026-07-20T00:00:00.000Z' },
    ].map((task) => ({
      ...task,
      brandId,
      title: task.id,
      type: 'manual',
      retestRecords: [],
      createdAt: now,
      updatedAt: now,
    })) as OptimizationTask[];
    const dashboard = buildBrandActionDashboard(createActionSource({ pendingConfirmations: [confirmation], optimizationTasks: tasks }));

    expect(dashboard.primaryAction.id).toBe('confirmation:confirm-1');
    expect(dashboard.primaryAction.context).toMatchObject({ runId: 'run-1', promptId: 'prompt-1' });
    expect(dashboard.todos.map((item) => item.id)).toEqual(['task:task-a', 'task:task-b', 'task:task-z']);
  });

  it('覆盖待监测、待发布、待复测和全部完成状态', () => {
    const noSample = buildBrandActionDashboard(createActionSource({ monitoringRuns: [] }));
    const pendingAnalysisRun = createRun();
    const pendingAnalysis = buildBrandActionDashboard(createActionSource({ monitoringRuns: [pendingAnalysisRun] }));
    const completedContent = createContentTask();
    const publish = buildBrandActionDashboard(createActionSource({ contentTasks: [completedContent] }));
    const publishedRecord = {
      id: 'record-1',
      brandId,
      contentAssetId: 'asset-1',
      generationTaskId: completedContent.id,
      title: '已发布内容',
      body: '正文',
      platform: 'wechat',
      status: 'published',
      createdAt: now,
      updatedAt: now,
    } as PublishingRecord;
    const retest = buildBrandActionDashboard(createActionSource({ contentTasks: [completedContent], publishingRecords: [publishedRecord] }));
    const completed = buildBrandActionDashboard(createActionSource());

    expect(noSample.primaryAction.id).toBe('execution:start-monitoring');
    expect(pendingAnalysis.primaryAction).toMatchObject({ id: `execution:monitoring:${pendingAnalysisRun.id}`, label: '完成真实回复分析' });
    expect(publish.primaryAction.id).toBe(`publish:${completedContent.id}`);
    expect(retest.primaryAction.id).toBe('retest:record-1');
    expect(completed.primaryAction.id).toBe('review:latest-results');
  });

  it('持续推荐内容生成和已创建发布记录的权威下一步', () => {
    const pendingContent = createContentTask();
    pendingContent.status = 'running';
    const content = buildBrandActionDashboard(createActionSource({ contentTasks: [pendingContent] }));
    const pendingPublishing = {
      id: 'record-pending',
      brandId,
      contentAssetId: 'asset-1',
      generationTaskId: pendingContent.id,
      versionId: 'version-1',
      title: '待发布内容',
      body: '正文',
      platform: 'wechat',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    } as PublishingRecord;
    pendingContent.status = 'completed';
    const publishing = buildBrandActionDashboard(createActionSource({
      contentTasks: [pendingContent],
      publishingRecords: [pendingPublishing],
    }));

    expect(content.primaryAction).toMatchObject({ id: `content:${pendingContent.id}`, targetPath: '/content-generation' });
    expect(publishing.primaryAction).toMatchObject({
      id: 'publishing:record-pending',
      targetPath: '/publishing',
      context: { generationTaskId: pendingContent.id, versionId: 'version-1', publishingRecordId: 'record-pending', tab: 'records' },
    });
  });

  it('发布来源失败时不根据缺失记录生成待发布动作', () => {
    const dashboard = buildBrandActionDashboard(createActionSource({
      contentTasks: [createContentTask()],
      sourceFailures: ['publishingDashboard'],
    }));

    expect(dashboard.primaryAction.id).toBe('review:latest-results');
    expect(dashboard.sourceFailures).toEqual(['publishingDashboard']);
  });

  it('优先使用冻结报告范围生成最近样本和周期效果', () => {
    const olderRun = createRun();
    olderRun.id = 'run-frozen';
    olderRun.createdAt = '2026-07-10T00:00:00.000Z';
    const newerRun = createRun();
    newerRun.id = 'run-newer';
    newerRun.createdAt = '2026-07-14T00:00:00.000Z';
    const reportDashboard = {
      brandId,
      reports: [{
        id: 'report-1',
        brandId,
        type: 'weekly',
        title: '周期报告',
        periodStart: '2026-07-07',
        periodEnd: '2026-07-13',
        status: 'generated',
        content: '',
        dataGaps: [],
        createdBy: 'user-a',
        createdAt: now,
        snapshot: {
          brand: { brandId, name: '品牌 A', industry: '软件', status: 'active' },
          scope: {
            brandId,
            periodStart: '2026-07-07',
            periodEnd: '2026-07-13',
            validSampleCount: 1,
            recordIds: { monitoringRunIds: ['run-frozen'] },
            sampleSummary: { lastSampleAt: '2026-07-10T00:00:00.000Z' },
          },
          effectEvidence: [{ brandId, evidenceStatus: 'complete' }],
        },
      }],
    } as ReportDashboard;
    const dashboard = buildBrandActionDashboard(createActionSource({ monitoringRuns: [olderRun, newerRun], reportDashboard }));

    expect(dashboard.latestValidSample?.runId).toBe('run-frozen');
    expect(dashboard.periodEffect).toMatchObject({ status: 'complete', validSampleCount: 1, evidenceCount: 1 });
  });
});
