import type {
  AnalysisDiagnosisDashboard,
  AnalysisFinding,
  AnalysisFindingType,
  AnalysisRecommendedAction,
  BeginnerHomeDashboard,
  BeginnerHomeResultSummary,
  BrandId,
  BrandMediaAsset,
  BrandProfile,
  BrandPrompt,
  CitationSource,
  ContentAssetPageItem,
  ContentGenerationStatus,
  ContentGenerationTask,
  ContentOperationDashboard,
  ContentOperationTemplate,
  DashboardNextAction,
  MediaPlatformRule,
  MonitoringObjectDashboard,
  MonitoringObjectTask,
  MonitoringRunDetail,
  OptimizationTask,
  OptimizationUnit,
  OwnedMediaAccount,
  PublishingChannelStats,
  PublishingOperationDashboard,
  PublishingRecord,
  PublishingRecordPerformance,
  RetestRecord,
  SprintPublishingPreparationDashboard,
  SprintRetestTrendDashboard,
  UserIntent,
  VisibilitySprint,
} from '@geo-platform/shared-types';

const findingTypes: AnalysisFindingType[] = ['competitor', 'evaluation', 'citation', 'fact'];
const contentStatuses: ContentGenerationStatus[] = ['pending', 'running', 'completed', 'failed'];

type BeginnerHomeDashboardSource = {
  brandId: BrandId;
  profile?: BrandProfile;
  monitoringObjectCount: number;
  realResponseRuns: MonitoringRunDetail[];
  contentTasks: ContentGenerationTask[];
  publishingStats: PublishingChannelStats[];
  publishingPerformance: PublishingRecordPerformance[];
  analysisFindings: AnalysisFinding[];
  currentSprint?: VisibilitySprint;
};

type MonitoringObjectDashboardSource = {
  brandId: BrandId;
  optimizationUnits: OptimizationUnit[];
  intents: UserIntent[];
  prompts: BrandPrompt[];
  contentTasks: OptimizationTask[];
};

type ContentOperationDashboardSource = {
  brandId: BrandId;
  tasks: ContentGenerationTask[];
  templates: ContentOperationTemplate[];
  materials: BrandMediaAsset[];
  assets: ContentAssetPageItem[];
  publishingPreparation?: SprintPublishingPreparationDashboard;
  publishingStats: PublishingChannelStats[];
  retest?: SprintRetestTrendDashboard;
};

type PublishingOperationDashboardSource = {
  brandId: BrandId;
  accounts: OwnedMediaAccount[];
  platformRules: MediaPlatformRule[];
  records: PublishingRecord[];
  citations: CitationSource[];
  performance: PublishingRecordPerformance[];
  channelStats: PublishingChannelStats[];
  retest?: SprintRetestTrendDashboard;
};

function getLatestRetestRecord(records: RetestRecord[]): RetestRecord | undefined {
  return [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function getRetestStatus(task: OptimizationTask): MonitoringObjectTask['retestStatus'] {
  const latestRecord = getLatestRetestRecord(task.retestRecords);
  if (!latestRecord) return task.retestPlanAt ? 'planned' : 'not_planned';
  if (!latestRecord.completedAt) return 'planned';
  if (latestRecord.improved === true) return 'improved';
  if (latestRecord.improved === false) return 'not_improved';
  return 'completed';
}

function getNextAction(dashboard: Omit<BeginnerHomeDashboard, 'nextAction'>): DashboardNextAction {
  if (dashboard.profileCompleteness.completenessScore < 100) {
    return { actionType: 'complete_profile', label: '补充品牌资料', reason: '完整资料能提高监测和内容生成的准确性' };
  }
  if (dashboard.monitoringObjectCount === 0) {
    return { actionType: 'create_monitoring_object', label: '创建优化单元', reason: '先确定要持续观察的品牌、场景或竞品' };
  }
  if (dashboard.realResponseStatus.collected === 0) {
    return { actionType: 'collect_real_response', label: '开始 AI 回复监测', reason: '需要真实 AI 回复才能形成有效指标' };
  }
  if (Object.values(dashboard.contentTaskStatus).every((count) => count === 0)) {
    return { actionType: 'prepare_content', label: '准备优化内容', reason: '根据监测结果创建可发布的内容任务' };
  }
  if (dashboard.publishingStatus.publishedRecords === 0) {
    return { actionType: 'publish_content', label: '发布内容', reason: '把已准备内容发布到品牌媒体渠道' };
  }
  if (dashboard.analysisRisk.high > 0) {
    return { actionType: 'review_risk', label: '处理高风险问题', reason: '优先修正影响品牌表达的高风险问题' };
  }
  if (dashboard.publishingStatus.pendingRetestCount > 0) {
    return { actionType: 'schedule_retest', label: '安排再次监测', reason: '验证已发布内容是否改善 AI 回复表现' };
  }
  return { actionType: 'review_results', label: '查看最新结果', reason: '当前关键步骤已完成，可以查看最新趋势和机会' };
}

export function buildBeginnerHomeResultSummary(runs: MonitoringRunDetail[]): BeginnerHomeResultSummary {
  const analyzedRuns = runs.filter((run) => run.analysis);
  const validRanks = analyzedRuns
    .map((run) => run.analysis?.brandRank)
    .filter((rank): rank is number => typeof rank === 'number' && Number.isFinite(rank) && rank >= 1);
  const sampleSize = runs.length;
  const toRate = (count: number) => sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0;

  return {
    recommendationRate: toRate(validRanks.length),
    averageRank: validRanks.length > 0
      ? Math.round((validRanks.reduce((sum, rank) => sum + rank, 0) / validRanks.length) * 10) / 10
      : null,
    citationHitRate: toRate(runs.filter((run) => (run.response?.citations.length ?? 0) > 0 || (run.analysis?.citationScore ?? 0) > 0).length),
    pendingIssueCount: analyzedRuns.filter((run) => run.analysis?.reviewRequired).length,
    sampleSize,
    rankedSampleSize: validRanks.length
  };
}

export function buildBeginnerHomeDashboard(source: BeginnerHomeDashboardSource): BeginnerHomeDashboard {
  const realResponseRuns = source.realResponseRuns.filter((run) => run.brandId === source.brandId);
  const contentTasks = source.contentTasks.filter((task) => task.brandId === source.brandId);
  const publishingStats = source.publishingStats.filter((stats) => stats.brandId === source.brandId);
  const performance = source.publishingPerformance.filter((item) => item.brandId === source.brandId);
  const findings = source.analysisFindings.filter((finding) => finding.brandId === source.brandId);
  const contentTaskStatus = Object.fromEntries(
    contentStatuses.map((status) => [status, contentTasks.filter((task) => task.status === status).length]),
  ) as Record<ContentGenerationStatus, number>;
  const byType = Object.fromEntries(
    findingTypes.map((type) => [type, findings.filter((finding) => finding.type === type).length]),
  ) as Record<AnalysisFindingType, number>;
  const dashboard: Omit<BeginnerHomeDashboard, 'nextAction'> = {
    brandId: source.brandId,
    profileCompleteness:
      source.profile?.brandId === source.brandId
        ? { completenessScore: source.profile.completenessScore, missingFields: source.profile.missingFields }
        : { completenessScore: 0, missingFields: [] },
    monitoringObjectCount: Math.max(0, source.monitoringObjectCount),
    realResponseStatus: {
      total: realResponseRuns.length,
      collected: realResponseRuns.filter((run) => Boolean(run.response)).length,
      pending: realResponseRuns.filter((run) => run.status === 'pending' || run.status === 'running').length,
      reviewRequired: realResponseRuns.filter(
        (run) => run.status === 'review_required' || run.response?.parseStatus === 'review_required',
      ).length,
      failed: realResponseRuns.filter((run) => run.status === 'failed').length,
    },
    contentTaskStatus,
    publishingStatus: {
      totalRecords: publishingStats.reduce((sum, stats) => sum + stats.totalRecords, 0),
      publishedRecords: publishingStats.reduce((sum, stats) => sum + stats.publishedRecords, 0),
      failedRecords: publishingStats.reduce((sum, stats) => sum + stats.failedRecords, 0),
      citationCount: performance.reduce((sum, item) => sum + item.citationCount, 0),
      pendingRetestCount: performance.filter((item) => item.retestStatus === 'planned').length,
    },
    analysisRisk: {
      total: findings.length,
      high: findings.filter((finding) => finding.severity === 'high').length,
      byType,
    },
    resultSummary: buildBeginnerHomeResultSummary(realResponseRuns),
    currentSprint:
      source.currentSprint?.brandId === source.brandId
        ? {
            sprintId: source.currentSprint.sprintId,
            status: source.currentSprint.status,
            currentStep: source.currentSprint.currentStep,
            metricSummary: source.currentSprint.metricSummary,
            updatedAt: source.currentSprint.updatedAt,
          }
        : undefined,
  };
  return { ...dashboard, nextAction: getNextAction(dashboard) };
}

export function buildMonitoringObjectDashboard(source: MonitoringObjectDashboardSource): MonitoringObjectDashboard {
  const intents = source.intents.filter((intent) => intent.brandId === source.brandId);
  const prompts = source.prompts.filter((prompt) => prompt.brandId === source.brandId);
  const contentTasks = source.contentTasks.filter((task) => task.brandId === source.brandId);
  return {
    brandId: source.brandId,
    objects: source.optimizationUnits
      .filter((unit) => unit.brandId === source.brandId)
      .map((unit) => {
        const unitPrompts = prompts.filter((prompt) => prompt.optimizationUnitId === unit.id);
        const promptIds = new Set(unitPrompts.map((prompt) => prompt.id));
        return {
          optimizationUnit: {
            id: unit.id,
            name: unit.name,
            type: unit.type,
            priority: unit.priority,
            enabled: unit.enabled,
          },
          intents: intents
            .filter((intent) => intent.optimizationUnitId === unit.id)
            .map(({ id, category, text, monitoringFrequency, enabled, platformMetrics }) => ({
              id,
              category,
              text,
              monitoringFrequency,
              enabled,
              platformMetrics,
            })),
          prompts: unitPrompts.map(({ id, intentId, text, platformCodes, monitoringFrequency, enabled }) => ({
            id,
            intentId,
            text,
            platformCodes,
            monitoringFrequency,
            enabled,
          })),
          contentTasks: contentTasks
            .filter((task) => task.optimizationUnitId === unit.id || (task.relatedPromptId && promptIds.has(task.relatedPromptId)))
            .map(({ id, title, status, relatedPromptId, priority, retestRecords, ...task }) => ({
              id,
              title,
              status,
              relatedPromptId,
              priority,
              retestRecords,
              retestStatus: getRetestStatus({ id, title, status, relatedPromptId, priority, retestRecords, ...task }),
            })),
        };
      }),
  };
}

export function buildContentOperationDashboard(source: ContentOperationDashboardSource): ContentOperationDashboard {
  const retest = source.retest?.brandId === source.brandId ? source.retest : undefined;
  return {
    brandId: source.brandId,
    tasks: source.tasks.filter((task) => task.brandId === source.brandId),
    templates: source.templates,
    materials: source.materials.filter((material) => material.brandId === source.brandId),
    assets: source.assets.filter((asset) => asset.brandId === source.brandId),
    publishingPreparation:
      source.publishingPreparation?.brandId === source.brandId ? source.publishingPreparation : undefined,
    publishingStats: source.publishingStats.filter((stats) => stats.brandId === source.brandId),
    retest: retest
      ? {
          plannedTaskCount: retest.plannedTaskCount,
          completedRetestCount: retest.completedRetestCount,
          improvedRetestCount: retest.improvedRetestCount,
          items: retest.items.filter((item) => item.task.brandId === source.brandId),
          updatedAt: retest.updatedAt,
        }
      : undefined,
  };
}

export function buildPublishingOperationDashboard(source: PublishingOperationDashboardSource): PublishingOperationDashboard {
  return {
    brandId: source.brandId,
    accounts: source.accounts.filter((account) => account.brandId === source.brandId),
    platformRules: source.platformRules.filter((rule) => rule.brandId === source.brandId),
    records: source.records.filter((record) => record.brandId === source.brandId),
    citations: source.citations.filter((citation) => citation.brandId === source.brandId),
    performance: source.performance.filter((item) => item.brandId === source.brandId),
    channelStats: source.channelStats.filter((stats) => stats.brandId === source.brandId),
    pendingRetestItems:
      source.retest?.brandId === source.brandId
        ? source.retest.items.filter(
            (item) => item.task.brandId === source.brandId && (item.status === 'planned' || item.status === 'needs_follow_up'),
          )
        : [],
  };
}

export function buildAnalysisDiagnosisDashboard(brandId: BrandId, findings: AnalysisFinding[]): AnalysisDiagnosisDashboard {
  const scopedFindings = findings.filter((finding) => finding.brandId === brandId);
  const findingGroups = Object.fromEntries(
    findingTypes.map((type) => [type, scopedFindings.filter((finding) => finding.type === type)]),
  ) as Record<AnalysisFindingType, AnalysisFinding[]>;
  const recommendedActions = Array.from(
    new Map<string, AnalysisRecommendedAction>(
      scopedFindings.flatMap((finding) => finding.recommendedActions).map((action) => [
        `${action.actionType}:${action.label}:${action.targetId ?? ''}`,
        action,
      ]),
    ).values(),
  );
  return { brandId, findings: scopedFindings, findingGroups, recommendedActions };
}
