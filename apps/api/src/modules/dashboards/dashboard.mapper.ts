import type {
  AnalysisDiagnosisDashboard,
  AnalysisFinding,
  AnalysisFindingType,
  AnalysisRecommendedAction,
  AutomationConfirmation,
  BrandActionContext,
  BrandActionDashboard,
  BrandActionItem,
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
  ReportDashboard,
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

type BrandActionDashboardSource = {
  brandId: BrandId;
  beginnerHome: BeginnerHomeDashboard;
  profile?: BrandProfile;
  optimizationUnits: OptimizationUnit[];
  monitoringRuns: MonitoringRunDetail[];
  contentTasks: ContentGenerationTask[];
  publishingRecords: PublishingRecord[];
  optimizationTasks: OptimizationTask[];
  pendingConfirmations: AutomationConfirmation[];
  currentSprint?: VisibilitySprint;
  reportDashboard?: ReportDashboard;
  sourceFailures?: string[];
  now?: Date;
};

type RankedBrandAction = BrandActionItem & { executionRank: number };

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

const sprintStageLabels: Record<VisibilitySprint['currentStep'], string> = {
  question_radar: '问题雷达',
  ai_response_monitoring: 'AI 回复监测',
  standard_answer_alignment: '标准答案校准',
  gap_diagnosis: '差距诊断',
  content_asset_generation: '内容资产生成',
  publishing_preparation: '发布准备',
  retest_and_trend: '再次监测与趋势',
  completed: '结果复盘',
};

const categoryRanks: Record<BrandActionItem['category'], number> = {
  data_blocker: 0,
  manual_confirmation: 1,
  execution: 2,
  retest: 3,
  review: 4,
};

const businessValueRanks: Record<BrandActionItem['expectedBusinessValue'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function buildBrandActionDashboard(source: BrandActionDashboardSource): BrandActionDashboard {
  const now = source.now ?? new Date();
  const nowIso = now.toISOString();
  const profile = source.profile?.brandId === source.brandId ? source.profile : undefined;
  const optimizationUnits = source.optimizationUnits.filter((item) => item.brandId === source.brandId);
  const monitoringRuns = source.monitoringRuns.filter((item) => item.brandId === source.brandId);
  const realResponseRuns = monitoringRuns.filter((run) => run.platformCode !== 'mock_ai' && Boolean(run.response?.rawText.trim()));
  const validRuns = realResponseRuns.filter((run) => Boolean(run.analysis));
  const contentTasks = source.contentTasks.filter((item) => item.brandId === source.brandId);
  const publishingRecords = source.publishingRecords.filter((item) => item.brandId === source.brandId);
  const optimizationTasks = source.optimizationTasks.filter((item) => item.brandId === source.brandId);
  const pendingConfirmations = source.pendingConfirmations.filter(
    (item) => item.brandId === source.brandId && item.status === 'pending',
  );
  const currentSprint = source.currentSprint?.brandId === source.brandId ? source.currentSprint : undefined;
  const failedSources = new Set(source.sourceFailures ?? []);
  const candidates: RankedBrandAction[] = [];

  if (!failedSources.has('profile') && (!profile || profile.completenessScore < 100)) {
    const missingFields = profile?.missingFields ?? [];
    candidates.push({
      id: 'blocker:brand-profile',
      category: 'data_blocker',
      label: '补充品牌资料',
      reason: missingFields.length > 0 ? `还有 ${missingFields.length} 项关键资料待补充` : '品牌资料尚未达到可执行标准',
      targetPath: '/brand-profile',
      context: {},
      expectedBusinessValue: 'high',
      executionRank: 0,
      blocker: {
        reason: '品牌资料不完整',
        impactScope: '监测问题、分析结论和内容生成',
        recoveryAction: '补齐并确认品牌核心资料',
      },
    });
  }

  for (const confirmation of pendingConfirmations) {
    const target = getConfirmationTarget(confirmation);
    candidates.push({
      id: `confirmation:${confirmation.confirmationId}`,
      category: 'manual_confirmation',
      label: confirmation.title,
      reason: confirmation.recommendation || confirmation.impact,
      targetPath: target.targetPath,
      context: target.context,
      expectedBusinessValue: 'high',
      executionRank: 0,
    });
  }

  if (!failedSources.has('optimizationUnits') && optimizationUnits.length === 0) {
    candidates.push({
      id: 'execution:create-optimization-unit',
      category: 'execution',
      label: '创建优化单元',
      reason: '确定需要持续观察的品牌问题和业务场景',
      targetPath: '/optimization-units',
      context: { action: 'create' },
      expectedBusinessValue: 'high',
      executionRank: 0,
    });
  }

  if (!failedSources.has('optimizationUnits') && !failedSources.has('monitoringRuns') && optimizationUnits.length > 0 && validRuns.length === 0) {
    const eligibleRuns = monitoringRuns.filter((run) => run.platformCode !== 'mock_ai');
    const collectingRun = eligibleRuns.find((run) => run.status === 'pending' || run.status === 'running');
    const unanalyzedRun = realResponseRuns.find((run) => !run.analysis);
    const run = collectingRun ?? unanalyzedRun;
    candidates.push({
      id: run ? `execution:monitoring:${run.id}` : 'execution:start-monitoring',
      category: 'execution',
      label: collectingRun ? '查看真实回复采集进度' : unanalyzedRun ? '完成真实回复分析' : '开始真实回复监测',
      reason: collectingRun ? '首轮样本正在采集' : unanalyzedRun ? '已有回复等待形成可用分析' : '需要真实 AI 回复才能形成有效指标',
      targetPath: '/monitoring',
      context: run ? getRunContext(run) : { optimizationUnitId: optimizationUnits[0]?.id },
      expectedBusinessValue: 'high',
      executionRank: collectingRun ? 1 : unanalyzedRun ? 2 : 0,
    });
  }

  for (const task of optimizationTasks.filter((item) => ['todo', 'doing', 'reopened', 'review'].includes(item.status))) {
    candidates.push({
      id: `task:${task.id}`,
      category: 'execution',
      label: task.title,
      reason: getTaskReason(task),
      targetPath: '/tasks',
      context: {
        taskId: task.id,
        optimizationUnitId: task.optimizationUnitId,
        promptId: task.relatedPromptId,
        runId: task.sourceRunId,
        platformCode: task.relatedPlatformCode,
      },
      expectedBusinessValue: task.priority ?? 'medium',
      dueAt: task.dueDate,
      executionRank: getTaskExecutionRank(task.status),
    });
  }

  if (!failedSources.has('contentWorkspace')) {
    for (const task of contentTasks.filter((item) => item.status !== 'completed')) {
      candidates.push({
        id: `content:${task.id}`,
        category: 'execution',
        label: task.status === 'failed' ? '处理内容生成失败' : task.status === 'running' ? '查看内容生成进度' : '开始生成优化内容',
        reason: task.errorMessage || (task.contentTopic ? `继续处理“${task.contentTopic}”` : '完成内容生成后进入发布流程'),
        targetPath: '/content-generation',
        context: { taskId: task.id, generationTaskId: task.id },
        expectedBusinessValue: 'high',
        dueAt: task.retestAt,
        executionRank: task.status === 'failed' ? 0 : task.status === 'running' ? 1 : 2,
      });
    }

    if (!failedSources.has('publishingDashboard')) {
      for (const task of contentTasks.filter((item) => item.status === 'completed')) {
        if (publishingRecords.some((record) => record.generationTaskId === task.id)) continue;
        candidates.push({
          id: `publish:${task.id}`,
          category: 'execution',
          label: '发布已完成内容',
          reason: task.contentTopic ? `“${task.contentTopic}”已完成并等待发布` : '内容已完成并等待进入发布流程',
          targetPath: '/publishing',
          context: { generationTaskId: task.id, tab: 'records' },
          expectedBusinessValue: 'high',
          dueAt: task.retestAt,
          executionRank: 3,
        });
      }
    }
  }

  if (!failedSources.has('publishingDashboard')) {
    for (const record of publishingRecords.filter((item) => item.status !== 'published')) {
      candidates.push({
        id: `publishing:${record.id}`,
        category: 'execution',
        label: record.status === 'failed' ? '处理发布失败' : ['queued', 'publishing'].includes(record.status) ? '查看发布进度' : '完成内容发布',
        reason: record.errorMessage || `“${record.title}”当前处于待发布流程`,
        targetPath: '/publishing',
        context: {
          generationTaskId: record.generationTaskId,
          versionId: record.versionId,
          publishingRecordId: record.id,
          platformCode: record.platform,
          tab: 'records',
        },
        expectedBusinessValue: 'high',
        executionRank: record.status === 'failed' ? 0 : ['queued', 'publishing'].includes(record.status) ? 1 : record.status === 'pending' ? 2 : 3,
      });
    }
  }

  const hasRetestTask = optimizationTasks.some((task) => task.status === 'retest' || task.retestRecords.some((record) => !record.completedAt));
  if (!failedSources.has('publishingDashboard') && !hasRetestTask) {
    for (const record of publishingRecords.filter((item) => item.status === 'published')) {
      candidates.push({
        id: `retest:${record.id}`,
        category: 'retest',
        label: '安排发布后再次监测',
        reason: `验证“${record.title}”发布后的品牌表现变化`,
        targetPath: '/tasks',
        context: {
          generationTaskId: record.generationTaskId,
          publishingRecordId: record.id,
          platformCode: record.platform,
          mode: 'retest',
          action: 'create',
        },
        expectedBusinessValue: 'high',
        executionRank: 0,
      });
    }
  }

  if (candidates.length === 0) {
    candidates.push({
      id: 'review:latest-results',
      category: 'review',
      label: '复盘本周期结果',
      reason: '当前执行项已完成，可以查看最新效果和下一轮机会',
      targetPath: '/reports',
      context: {},
      expectedBusinessValue: 'medium',
      executionRank: 0,
    });
  }

  const sortedActions = candidates.sort((left, right) => compareBrandActions(left, right, now));
  const primaryAction = stripActionRank(sortedActions[0]);
  const latestReport = getLatestSingleBrandReport(source.reportDashboard, source.brandId);
  const latestValidSample = getLatestValidSample(validRuns, latestReport?.snapshot.scope.recordIds.monitoringRunIds, latestReport?.snapshot.scope.sampleSummary.lastSampleAt);
  const periodEffect = getPeriodEffect(latestReport, currentSprint);

  return {
    brandId: source.brandId,
    beginnerHome: source.beginnerHome,
    currentStage: currentSprint
      ? { code: currentSprint.currentStep, label: sprintStageLabels[currentSprint.currentStep], status: currentSprint.status }
      : failedSources.has('profile') || profile?.completenessScore === 100
        ? { code: 'monitoring_setup', label: '监测准备', status: 'ready' }
        : { code: 'profile_setup', label: '品牌资料准备', status: 'blocked' },
    primaryAction,
    todos: sortedActions.slice(1, 4).map(stripActionRank),
    latestValidSample,
    periodEffect,
    sourceFailures: [...new Set(source.sourceFailures ?? [])].sort(),
    updatedAt: nowIso,
  };
}

function compareBrandActions(left: RankedBrandAction, right: RankedBrandAction, now: Date): number {
  const categoryDifference = categoryRanks[left.category] - categoryRanks[right.category];
  if (categoryDifference !== 0) return categoryDifference;
  const executionDifference = left.executionRank - right.executionRank;
  if (executionDifference !== 0) return executionDifference;
  const dueDifference = getDueRank(left.dueAt, now) - getDueRank(right.dueAt, now);
  if (dueDifference !== 0) return dueDifference;
  const valueDifference = businessValueRanks[left.expectedBusinessValue] - businessValueRanks[right.expectedBusinessValue];
  if (valueDifference !== 0) return valueDifference;
  return left.id.localeCompare(right.id);
}

function getDueRank(dueAt: string | undefined, now: Date): number {
  if (!dueAt) return Number.MAX_SAFE_INTEGER;
  const dueTime = Date.parse(dueAt);
  if (!Number.isFinite(dueTime)) return Number.MAX_SAFE_INTEGER;
  return dueTime <= now.getTime() ? dueTime - now.getTime() : dueTime;
}

function stripActionRank({ executionRank: _executionRank, ...action }: RankedBrandAction): BrandActionItem {
  return action;
}

function getTaskExecutionRank(status: OptimizationTask['status']): number {
  return status === 'reopened' ? 0 : status === 'doing' ? 1 : status === 'review' ? 2 : 3;
}

function getTaskReason(task: OptimizationTask): string {
  if (task.status === 'reopened') return '再次监测未达到目标，需要继续处理';
  if (task.status === 'doing') return '任务正在执行，继续完成当前处理';
  if (task.status === 'review') return '任务已进入审核阶段';
  return task.dueDate ? `计划于 ${task.dueDate.slice(0, 10)} 前完成` : '任务已就绪，等待开始执行';
}

function getRunContext(run: MonitoringRunDetail): BrandActionContext {
  return {
    question: run.promptText,
    optimizationUnitId: run.optimizationUnitId,
    intentId: run.intentId,
    promptId: run.promptId,
    runId: run.id,
    platformCode: run.platformCode,
  };
}

function getConfirmationTarget(confirmation: AutomationConfirmation): Pick<BrandActionItem, 'targetPath' | 'context'> {
  const payload = confirmation.payload;
  const context: BrandActionContext = {
    question: readPayloadString(payload, 'question'),
    optimizationUnitId: readPayloadString(payload, 'optimizationUnitId'),
    intentId: readPayloadString(payload, 'intentId'),
    promptId: readPayloadString(payload, 'promptId'),
    runId: readPayloadString(payload, 'runId'),
    taskId: readPayloadString(payload, 'taskId'),
    generationTaskId: readPayloadString(payload, 'generationTaskId'),
    publishingRecordId: readPayloadString(payload, 'publishingRecordId'),
    platformCode: readPayloadString(payload, 'platformCode'),
  };
  if (confirmation.type === 'publishing_suggestion') return { targetPath: '/publishing', context };
  if (confirmation.type === 'content_review' || confirmation.type === 'platform_rewrite_review') {
    return { targetPath: '/content-generation', context };
  }
  if (confirmation.type === 'analysis_review') return { targetPath: '/growth-optimization', context };
  return { targetPath: '/monitoring', context };
}

function readPayloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getLatestSingleBrandReport(reportDashboard: ReportDashboard | undefined, brandId: BrandId) {
  const reports = reportDashboard ? [...(reportDashboard.latest ? [reportDashboard.latest] : []), ...reportDashboard.reports] : [];
  return [...new Map(reports.map((report) => [report.id, report])).values()]
    .filter((report) => report.brandId === brandId && report.status === 'generated' && 'scope' in report.snapshot && report.snapshot.scope.brandId === brandId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] as
      | (ReportDashboard['reports'][number] & { snapshot: Extract<ReportDashboard['reports'][number]['snapshot'], { scope: unknown }> })
      | undefined;
}

function getLatestValidSample(runs: MonitoringRunDetail[], frozenRunIds: string[] | undefined, frozenSampleAt: string | undefined) {
  const frozenRuns = frozenRunIds?.length ? runs.filter((run) => frozenRunIds.includes(run.id)) : runs;
  const latest = [...frozenRuns].sort((left, right) => getRunTime(right).localeCompare(getRunTime(left)))[0];
  const fallbackRunId = frozenRunIds?.[frozenRunIds.length - 1];
  if (!latest && fallbackRunId && frozenSampleAt) return { runId: fallbackRunId, sampledAt: frozenSampleAt };
  if (!latest) return undefined;
  return {
    runId: latest.id,
    sampledAt: latest.response?.respondedAt ?? latest.createdAt,
    question: latest.promptText,
    platformCode: latest.platformCode,
    optimizationUnitId: latest.optimizationUnitId,
    intentId: latest.intentId,
    promptId: latest.promptId,
  };
}

function getRunTime(run: MonitoringRunDetail): string {
  return run.response?.respondedAt ?? run.createdAt;
}

function getPeriodEffect(
  report: ReturnType<typeof getLatestSingleBrandReport>,
  currentSprint: VisibilitySprint | undefined,
): BrandActionDashboard['periodEffect'] {
  if (!report) {
    return currentSprint
      ? { status: 'pending', validSampleCount: currentSprint.metricSummary.sampleSize, evidenceCount: 0, summary: '本周期仍在执行，效果证据正在积累' }
      : { status: 'unavailable', validSampleCount: 0, evidenceCount: 0, summary: '完成首轮监测后可查看本周期效果' };
  }
  const evidence = report.snapshot.effectEvidence.filter((item) => item.brandId === report.brandId);
  const validSampleCount = report.snapshot.scope.validSampleCount;
  const status = evidence.length > 0 && evidence.every((item) => item.evidenceStatus === 'complete')
    ? 'complete'
    : validSampleCount > 0 || evidence.length > 0
      ? 'partial'
      : 'pending';
  return {
    status,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    validSampleCount,
    evidenceCount: evidence.length,
    summary: status === 'complete' ? '本周期效果已有完整再次监测证据' : status === 'partial' ? '本周期已有部分效果证据' : '本周期效果证据正在积累',
  };
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
