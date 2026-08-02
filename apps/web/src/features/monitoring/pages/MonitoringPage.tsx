import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Steps, Table, Tabs, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import { hasRealMonitoringResponseSample, type MonitoringRunDetail, type MonitoringRunStatus, type PlatformConfig, type TestPlan } from '@geo-platform/shared-types';
import { apiGet } from '../../../api/http';
import { mergeUnifiedFilterQuery, readUnifiedFilterQuery } from '../../../app/filterQuery';
import { growthOptimizationPath, readWorkflowRouteContext } from '../../../app/routePaths';
import { InsightDetailSection, InsightOverview, type InsightTone } from '../../../components/InsightOverview';
import { MetricSummaryGrid } from '../../../components/MetricSummaryGrid';
import { PlatformSwitch } from '../../../components/PlatformSwitch';
import { ProductPage } from '../../../components/ProductPage';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getPlatformDisplayName, type AIPlatformFilterValue } from '../../../utils/displayLabels';
import { BusinessEmptyState, PageSkeleton, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { getQueryGroupWorkspaceState } from '../../../components/WorkspaceState';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { GeoMetricDashboardCard } from '../components/GeoMetricDashboardCard';
import { ManualTestEntryCard } from '../components/ManualTestEntryCard';
import { buildMonitoringRecoveryItems, MonitoringRecoverySummary, type MonitoringRecoveryTarget } from '../components/MonitoringRecoverySummary';
import { MonitoringRunsCard } from '../components/MonitoringRunsCard';
import { PlatformConfigCard } from '../components/PlatformConfigCard';
import { TestQuestionCandidateCard } from '../components/TestQuestionCandidateCard';

export function MonitoringPage() {
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const location = useLocation();
  const navigate = useNavigate();
  const routeContext = readWorkflowRouteContext(location.search);
  const platform = readUnifiedFilterQuery(location.search).platform;
  const [activeSection, setActiveSection] = useState<MonitoringSection>(() => getInitialMonitoringSection(location.hash));
  const plansQuery = useQuery({
    queryKey: ['test-plans', activeBrandId],
    queryFn: () => apiGet<TestPlan[]>(`/brands/${activeBrandId}/test-plans`)
  });
  const runsQuery = useQuery({
    queryKey: ['monitoring-runs', activeBrandId],
    queryFn: () => apiGet<MonitoringRunDetail[]>(`/brands/${activeBrandId}/monitoring-runs`)
  });
  const platformsQuery = useQuery({
    queryKey: ['platform-configs'],
    queryFn: () => apiGet<PlatformConfig[]>('/platforms')
  });
  const plans = plansQuery.data?.success ? plansQuery.data.data : [];
  const runs = runsQuery.data?.success ? runsQuery.data.data : [];
  const platforms = platformsQuery.data?.success ? platformsQuery.data.data : [];
  const pageState = getQueryGroupWorkspaceState([
    { isLoading: plansQuery.isLoading, response: plansQuery.data },
    { isLoading: runsQuery.isLoading, response: runsQuery.data },
    { isLoading: platformsQuery.isLoading, response: platformsQuery.data }
  ], true);
  const retryPageQueries = () => Promise.all([
    plansQuery.refetch(),
    runsQuery.refetch(),
    platformsQuery.refetch()
  ]);
  const pendingRuns = useMemo(() => getPendingRealResponseRuns(runs), [runs]);
  const overview = useMemo(() => buildMonitoringOverview(runs, platform), [runs, platform]);
  const recoveryItems = useMemo(() => {
    const scopedRuns = platform === 'all' ? runs : runs.filter((run) => run.platformCode === platform);
    const scopedPlatforms = platform === 'all' ? platforms : platforms.filter((item) => item.platformCode === platform);
    const scopedPlans = platform === 'all' ? plans : plans
      .filter((plan) => plan.platformCodes.includes(platform))
      .map((plan) => ({
        ...plan,
        connectionSummary: plan.connectionSummary.filter((connection) => connection.platformCode === platform)
      }));

    return buildMonitoringRecoveryItems({
      plans: scopedPlans,
      runs: scopedRuns,
      platforms: scopedPlatforms,
      realSampleCount: overview.sampleCount,
      platformScope: platform === 'all' ? '全部平台' : getPlatformDisplayName(platform)
    });
  }, [overview.sampleCount, plans, platform, platforms, runs]);
  const openSection = (section: MonitoringSection, sectionId?: string) => {
    setActiveSection(section);
    if (sectionId) {
      requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
  const scrollToMonitoringRuns = () => {
    openSection('responses', 'monitoring-runs-card');
  };
  const scrollToQuestionCandidates = () => {
    openSection('questions', 'test-question-candidate-card');
  };
  const scrollToManualEntry = () => {
    openSection('execution', 'manual-test-entry');
  };
  const updatePlatform = (nextPlatform: AIPlatformFilterValue) => {
    const filter = readUnifiedFilterQuery(location.search);
    void navigate({
      pathname: location.pathname,
      search: mergeUnifiedFilterQuery(location.search, { ...filter, platform: nextPlatform }),
      hash: location.hash
    }, { replace: true });
  };
  const openRecoveryTarget = (target: MonitoringRecoveryTarget) => {
    const sectionIds: Partial<Record<MonitoringRecoveryTarget, string>> = {
      questions: 'test-question-candidate-card',
      execution: 'manual-test-entry',
      responses: 'monitoring-runs-card',
      tools: 'platform-config-card'
    };
    openSection(target, sectionIds[target]);
  };

  useEffect(() => {
    const sectionId = location.hash.slice(1);
    if (sectionId) {
      setActiveSection(getInitialMonitoringSection(location.hash));
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  return (
    <ProductPage
      title="AI 回复监测"
      description="先判断品牌在真实 AI 回复中的推荐表现，再按平台、监测问题和原始回复逐层核对证据。"
      primaryAction={<Button type="primary" onClick={scrollToQuestionCandidates}>开始监测</Button>}
      secondaryActions={(
        <Space wrap>
          <Button onClick={scrollToManualEntry}>手动录入</Button>
          <Button onClick={() => openSection('tools', 'platform-config-card')}>平台配置</Button>
        </Space>
      )}
      state={pageState}
      loadingState={<PageSkeleton rows={6} />}
      partialState={(
        <PartialDataNotice
          message="部分监测数据暂时缺失"
          description="已保留可用的监测结论和操作；重新加载可补齐计划、回复或平台状态。"
          action={<Button onClick={() => void retryPageQueries()}>重新加载缺失数据</Button>}
        />
      )}
      errorState={(
        <RegionErrorState
          title="AI 回复监测暂时无法加载"
          description="监测计划、真实回复和平台状态均未成功返回，请重新加载。"
          onRetry={() => void retryPageQueries()}
        />
      )}
    >
      {routeContext.question ? (
        <Alert
          type="info"
          showIcon
          message={`正在查看：${routeContext.question}`}
          description="下方监测记录保留当前品牌上下文，可继续查看真实回复、排名、引用和待复核状态。"
        />
      ) : null}
      <InsightOverview
        title={overview.title}
        description={overview.description}
        findings={overview.findings}
        tone={overview.tone}
        toneLabel={overview.toneLabel}
        actions={overview.sampleCount > 0 ? (
          <Space wrap>
            <Button onClick={scrollToMonitoringRuns}>查看回复证据</Button>
            <Button onClick={() => navigate(growthOptimizationPath(routeContext, 'standard-answer-diagnosis'))}>创建优化或内容任务</Button>
          </Space>
        ) : undefined}
      />
      <MetricSummaryGrid items={overview.metrics} columns={4} loading={runsQuery.isLoading} ariaLabel="AI 回复监测关键指标" />
      <PlatformSwitch value={platform} onChange={updatePlatform} ariaLabel="切换监测分析平台" />
      <MonitoringRecoverySummary items={recoveryItems} platforms={platforms} onAction={openRecoveryTarget} />
      <InsightDetailSection
        title="平台回复分布"
        description="当前分析范围内各平台的真实回复、品牌提及和待确认情况。"
        resultCount={overview.platformBreakdown.length}
      >
        <Table
          rowKey="platformCode"
          size="small"
          pagination={false}
          dataSource={overview.platformBreakdown}
          locale={{ emptyText: '当前平台范围还没有真实 AI 回复' }}
          columns={platformBreakdownColumns}
        />
      </InsightDetailSection>
      <Tabs
        activeKey={activeSection}
        onChange={(key) => setActiveSection(key as MonitoringSection)}
        items={[
          {
            key: 'questions',
            label: '监测主题与问题',
            children: <TestQuestionCandidateCard brandId={activeBrandId} actionType="default" />
          },
          {
            key: 'execution',
            label: `计划执行${pendingRuns.length > 0 ? ` (${pendingRuns.length})` : ''}`,
            children: (
              <Space direction="vertical" size={16} className="page-stack">
                <MonitoringPlanGuideCard
                  plans={plans}
                  runs={runs}
                  pendingRuns={pendingRuns}
                  loading={plansQuery.isLoading || runsQuery.isLoading}
                  onCreatePlan={scrollToQuestionCandidates}
                  onOpenManualEntry={scrollToManualEntry}
                  onOpenRuns={scrollToMonitoringRuns}
                />
                <PendingRealResponseQueueCard pendingRuns={pendingRuns} loading={runsQuery.isLoading} onOpenManualEntry={scrollToManualEntry} />
                <ManualTestEntryCard brandId={activeBrandId} />
              </Space>
            )
          },
          {
            key: 'responses',
            label: `回复明细 (${overview.sampleCount})`,
            children: (
              <MonitoringRunsCard
                brandId={activeBrandId}
                initialPromptId={routeContext.promptId}
                initialMode={routeContext.mode}
                platformCode={platform}
                createActionType="default"
                routeContext={routeContext}
              />
            )
          },
          {
            key: 'tools',
            label: '高级工具',
            children: (
              <Space direction="vertical" size={16} className="page-stack">
                <GeoMetricDashboardCard brandId={activeBrandId} onStartTest={scrollToQuestionCandidates} />
                <AutomationOperatorCard brandId={activeBrandId} source="monitoring" title="AI 回复监测与运营" compact secondaryAction />
                <div id="platform-config-card"><PlatformConfigCard actionType="default" /></div>
              </Space>
            )
          }
        ]}
      />
    </ProductPage>
  );
}

type MonitoringSection = 'questions' | 'execution' | 'responses' | 'tools';

type MonitoringOverviewRun = Pick<MonitoringRunDetail, 'platformCode' | 'response' | 'analysis'>;

export type MonitoringOverview = ReturnType<typeof buildMonitoringOverview>;

export function buildMonitoringOverview(runs: MonitoringOverviewRun[], platform: AIPlatformFilterValue) {
  const realRuns = runs.filter(isRealAIResponseRun).filter((run) => platform === 'all' || run.platformCode === platform);
  const mentionedCount = realRuns.filter((run) => run.analysis?.brandMentioned).length;
  const top3Count = realRuns.filter((run) => typeof run.analysis?.brandRank === 'number' && run.analysis.brandRank <= 3).length;
  const citedCount = realRuns.filter((run) => (run.response?.citations.length ?? 0) > 0).length;
  const reviewCount = realRuns.filter((run) => run.analysis?.reviewRequired).length;
  const percent = (count: number) => realRuns.length > 0 ? Math.round((count / realRuns.length) * 100) : 0;
  const mentionRate = percent(mentionedCount);
  const top3Rate = percent(top3Count);
  const citationRate = percent(citedCount);
  const platformBreakdown = Array.from(new Set(realRuns.map((run) => run.platformCode))).map((platformCode) => {
    const platformRuns = realRuns.filter((run) => run.platformCode === platformCode);
    return {
      platformCode,
      sampleCount: platformRuns.length,
      mentionRate: Math.round((platformRuns.filter((run) => run.analysis?.brandMentioned).length / platformRuns.length) * 100),
      reviewCount: platformRuns.filter((run) => run.analysis?.reviewRequired).length
    };
  });

  let title = '等待首批真实 AI 回复';
  let description = '选择监测主题和问题后开始监测，系统会按真实回复更新推荐表现。';
  let tone: InsightTone = 'neutral';
  let toneLabel = '待采集';
  if (realRuns.length > 0) {
    title = reviewCount > 0 ? `${reviewCount} 条回复需要优先确认` : `品牌在 ${mentionRate}% 的真实回复中被提及`;
    description = `当前范围包含 ${realRuns.length} 条真实回复，Top 3 推荐率为 ${top3Rate}%，引用命中率为 ${citationRate}%。`;
    tone = reviewCount > 0 ? 'warning' : mentionRate >= 60 ? 'success' : 'warning';
    toneLabel = reviewCount > 0 ? '待处理' : mentionRate >= 60 ? '表现稳定' : '需要优化';
  }

  return {
    title,
    description,
    tone,
    toneLabel,
    sampleCount: realRuns.length,
    findings: realRuns.length === 0
      ? ['指标只统计真实 AI 回复、浏览器辅助结果和手动录入回复。']
      : [
          `${mentionedCount} 条回复提及品牌，${top3Count} 条进入前三推荐。`,
          reviewCount > 0 ? `${reviewCount} 条回复存在风险表达或待判断信息。` : '当前已解读回复没有待人工确认项。'
        ],
    metrics: [
      { key: 'sample', label: '真实回复', value: realRuns.length, description: platform === 'all' ? '全部平台样本' : `${getPlatformDisplayName(platform)}样本` },
      { key: 'mention', label: '品牌提及率', value: mentionRate, suffix: '%', description: `${mentionedCount} 条提及品牌` },
      { key: 'top3', label: 'Top 3 推荐率', value: top3Rate, suffix: '%', description: `${top3Count} 条进入前三` },
      { key: 'citation', label: '引用命中率', value: citationRate, suffix: '%', description: `${citedCount} 条包含引用` }
    ],
    platformBreakdown
  };
}

function getInitialMonitoringSection(hash: string): MonitoringSection {
  if (hash === '#manual-test-entry') return 'execution';
  if (hash === '#monitoring-runs-card') return 'responses';
  return 'questions';
}

const platformBreakdownColumns = [
  { title: 'AI 平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
  { title: '真实回复', dataIndex: 'sampleCount' },
  { title: '品牌提及率', dataIndex: 'mentionRate', render: (value: number) => `${value}%` },
  { title: '待确认', dataIndex: 'reviewCount', render: (value: number) => value > 0 ? <Tag color="orange">{value} 条</Tag> : <Tag color="green">已处理</Tag> }
];

function MonitoringPlanGuideCard({
  plans,
  runs,
  pendingRuns,
  loading,
  onCreatePlan,
  onOpenManualEntry,
  onOpenRuns
}: {
  plans: TestPlan[];
  runs: MonitoringRunDetail[];
  pendingRuns: MonitoringRunDetail[];
  loading: boolean;
  onCreatePlan: () => void;
  onOpenManualEntry: () => void;
  onOpenRuns: () => void;
}) {
  const completedRuns = getCompletedRealResponseCount(runs);
  const platformCount = new Set(plans.flatMap((plan) => plan.platformCodes)).size;

  return (
    <Card title="创建 AI 回复监测计划" loading={loading}>
      <Space direction="vertical" size={16} className="page-stack">
        <Alert
          type="info"
          showIcon
          message="按可信来源完成监测"
          description="先选优化单元和用户意图，再确认监测问题、AI 平台和监测方式。自动监测、浏览器辅助监测和手动录入都会保存真实 AI 回复；缺少真实回复的项目会进入待补充队列。"
        />
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}><Statistic title="监测计划" value={plans.length} /></Col>
          <Col xs={12} md={6}><Statistic title="覆盖平台" value={platformCount} /></Col>
          <Col xs={12} md={6}><Statistic title="已有真实回复" value={completedRuns} /></Col>
          <Col xs={12} md={6}><Statistic title="待补充真实回复" value={pendingRuns.length} /></Col>
        </Row>
        <Steps
          size="small"
          current={getMonitoringCurrentStep(plans.length, runs.length, pendingRuns.length)}
          items={[
            { title: '选优化单元', description: '确定本轮优化主题' },
            { title: '选用户意图', description: '确认用户真实问题' },
            { title: '选监测问题', description: '生成或勾选问题' },
            { title: '选平台', description: '豆包、Kimi 等平台' },
            { title: '选方式', description: '自动、浏览器辅助或手动录入' }
          ]}
        />
        <Row gutter={[12, 12]}>
          {monitoringWizardCards.map((card) => (
            <Col key={card.title} xs={24} md={8}>
              <div className="geo-diagnostic-card">
                <Space direction="vertical" size={4} className="page-stack">
                  <Typography.Text strong>{card.title}</Typography.Text>
                  <Typography.Text type="secondary">{card.description}</Typography.Text>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
        <Space wrap>
          <Button onClick={onCreatePlan}>选择监测问题</Button>
          <Button onClick={onOpenRuns}>查看监测记录</Button>
          <Button disabled={pendingRuns.length === 0} onClick={onOpenManualEntry}>补充真实回复</Button>
        </Space>
      </Space>
    </Card>
  );
}

function PendingRealResponseQueueCard({
  pendingRuns,
  loading,
  onOpenManualEntry
}: {
  pendingRuns: MonitoringRunDetail[];
  loading: boolean;
  onOpenManualEntry: () => void;
}) {
  return (
    <Card title="待补充真实回复" extra={<Button disabled={pendingRuns.length === 0} onClick={onOpenManualEntry}>去手动录入</Button>}>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={pendingRuns}
        pagination={pendingRuns.length > 5 ? { pageSize: 5 } : false}
        locale={{ emptyText: <BusinessEmptyState title="真实回复队列已处理完" missing="需要补录的 AI 原始回答" reason="当前监测记录都已有可用于分析的真实 AI 回复。" nextStep="继续新建监测计划，或查看已有监测记录。" actionLabel="查看监测记录" onAction={() => document.getElementById('monitoring-runs-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} /> }}
        columns={[
          { title: '监测问题', dataIndex: 'promptText', render: (value: string) => <Typography.Text ellipsis>{value || '待补充问题'}</Typography.Text> },
          { title: '平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
          { title: '当前状态', dataIndex: 'status', render: (value: MonitoringRunStatus) => <Tag color={pendingStatusColors[value]}>{pendingStatusLabels[value]}</Tag> },
          { title: '补充方式', render: (_, record) => <Typography.Text type="secondary">{getPendingRunAction(record)}</Typography.Text> }
        ]}
      />
    </Card>
  );
}

type PendingRealResponseRunInput = Pick<MonitoringRunDetail, 'response' | 'status' | 'retryStatus'>;

type RealResponseRunInput = Pick<MonitoringRunDetail, 'platformCode' | 'response'>;

export function isRealAIResponseRun(run: RealResponseRunInput) {
  return hasRealMonitoringResponseSample(run);
}

export function getCompletedRealResponseCount<TRun extends RealResponseRunInput>(runs: TRun[]) {
  return runs.filter(isRealAIResponseRun).length;
}

export function getPendingRealResponseRuns<TRun extends PendingRealResponseRunInput>(runs: TRun[]) {
  return runs.filter((run) => !run.response && (run.status === 'review_required' || run.status === 'failed' || run.retryStatus === 'retry_pending'));
}

export function getMonitoringCurrentStep(planCount: number, runCount: number, pendingCount: number) {
  if (pendingCount > 0) return 4;
  if (runCount > 0) return 4;
  if (planCount > 0) return 3;
  return 2;
}

export function getPendingRunAction(run: PendingRealResponseRunInput) {
  if (run.retryStatus === 'retry_pending') return '自动监测稍后再试，也可以先手动录入真实回复。';
  if (run.status === 'failed') return '自动监测未成功，请改用手动录入或浏览器辅助监测。';
  return '打开对应 AI 平台复制原始回复，再粘贴到手动录入。';
}

const pendingStatusLabels: Record<MonitoringRunStatus, string> = {
  pending: '待开始',
  running: '监测中',
  completed: '已完成',
  failed: '未成功',
  review_required: '待手动录入'
};

const pendingStatusColors: Record<MonitoringRunStatus, string> = {
  pending: 'default',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  review_required: 'orange'
};

const monitoringWizardCards = [
  { title: '优化单元', description: '选择希望 AI 推荐的产品、服务或业务主题。' },
  { title: '用户意图', description: '确认客户可能向 AI 提出的真实问题。' },
  { title: '监测问题', description: '生成或勾选会实际发送到 AI 平台的问题。' },
  { title: 'AI 平台', description: '覆盖豆包、Kimi、DeepSeek、通义千问和阶跃星辰。' },
  { title: '监测方式', description: '按平台状态选择自动监测、浏览器辅助监测或手动录入。' },
  { title: '监测频率', description: '为日常、每周、每月或手动复测设置节奏。' }
];
