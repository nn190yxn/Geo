import { describe, expect, it } from 'vitest';

import type {
  AIResponse,
  AnalysisResult,
  AnalysisFinding,
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
  SprintRetestTrendDashboard,
  UserIntent,
  BrandPrompt,
} from '@geo-platform/shared-types';
import {
  buildAnalysisDiagnosisDashboard,
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
    status: 'completed',
    createdAt: now,
    response,
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
});
