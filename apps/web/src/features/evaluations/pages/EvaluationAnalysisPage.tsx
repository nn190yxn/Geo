import { Button, Card, Statistic, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { BrandProfile, ContentStrategy, EvaluationDashboard, EvaluationIssue } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getPlatformDisplayName } from '../../../utils/displayLabels';
import { ManagementRowActions } from '../../../components/ManagementListPage';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { GuidedEmptyState, PartialDataNotice, pageStateActionMap } from '../../../components/PageState';
import { readWorkflowRouteContext, workflowStagePath, type WorkflowRouteContext } from '../../../app/routePaths';
import { AnalysisWorkbench } from '../../analysis/components/AnalysisWorkbench';
import { AnalysisScopeBar } from '../../analysis/components/AnalysisScopeBar';
import { clearAnalysisScopeQuery, mergeAnalysisScopeQuery, readAnalysisScopeQuery, type AnalysisScopeValue } from '../../analysis/analysisScopeQuery';

const issueTypeLabels: Record<EvaluationIssue['issueType'], string> = {
  misinformation: '错误信息',
  missing_selling_point: '缺失卖点',
  blocked_expression: '禁用表达',
  negative_expression: '负向表达',
  low_accuracy: '准确性偏低'
};

const severityLabels: Record<EvaluationIssue['severity'], string> = {
  high: '高',
  medium: '中',
  low: '低'
};

const statusLabels: Record<EvaluationIssue['status'], string> = {
  open: '待处理',
  strategy_created: '已建策略',
  knowledge_updated: '已更新品牌资料',
  resolved: '已解决'
};

export function EvaluationAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const dashboardQuery = useQuery({
    queryKey: ['evaluation-dashboard', activeBrandId],
    queryFn: () => apiGet<EvaluationDashboard>(`/brands/${activeBrandId}/evaluations`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const pageMode = getEvaluationAnalysisMode(location.pathname, dashboard);
  const isFactMode = pageMode.title === '事实分析';
  const analysisScope = readAnalysisScopeQuery(location.search, { statuses: Object.keys(statusLabels) as EvaluationIssue['status'][] });
  const scopedIssues = isFactMode ? getFactEvaluationIssues(dashboard?.issues ?? []) : dashboard?.issues ?? [];
  const issueRows = getFilteredEvaluationIssues(scopedIssues, analysisScope);
  const trendRows = getFilteredEvaluationTrend(dashboard?.trend ?? [], analysisScope);
  const issueTypeBreakdown = getEvaluationIssueBreakdown(issueRows);
  const analysisState = getEvaluationAnalysisState(dashboard);
  const workflowContext = readWorkflowRouteContext(location.search);
  const updateAnalysisScope = (value: typeof analysisScope) => navigate({ pathname: location.pathname, search: mergeAnalysisScopeQuery(location.search, value), hash: location.hash }, { replace: true });
  const createStrategyMutation = useMutation({
    mutationFn: (issueId: string) => apiPost<ContentStrategy>(`/brands/${activeBrandId}/evaluations/${issueId}/correction-strategy`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['evaluation-dashboard', activeBrandId] });
        void messageApi.success('修正内容策略已创建');
      }
    }
  });
  const updateKnowledgeMutation = useMutation({
    mutationFn: (issueId: string) => apiPost<BrandProfile>(`/brands/${activeBrandId}/evaluations/${issueId}/knowledge`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['evaluation-dashboard', activeBrandId] });
        void messageApi.success('品牌资料已更新');
      }
    }
  });

  return (
    <>
      {contextHolder}
      <AnalysisWorkbench
        title={pageMode.title}
        description={pageMode.description}
        findings={pageMode.findings}
        actions={pageMode.actions}
        loading={dashboardQuery.isLoading}
        state={dashboardQuery.isLoading ? 'loading' : dashboardQuery.data && !dashboardQuery.data.success ? 'error' : 'ready'}
        onRetry={() => void dashboardQuery.refetch()}
        scopeDescription={isFactMode
          ? '筛选条件用于查看指定范围内的事实趋势和证据。'
          : '筛选条件用于查看指定范围内的评价趋势和表达证据。'}
        notice={!dashboardQuery.isLoading && analysisState === 'insufficient' ? (
          <PartialDataNotice
            message={isFactMode ? '当前事实样本不足' : '当前评价样本不足'}
            description={`已采集 ${dashboard?.sampleCount ?? 0} 条真实回复，当前结论用于初步诊断。补充品牌事实、标准答案和可信资料后，可提高后续分析的准确性。`}
            action={<Button onClick={() => navigate(workflowStagePath('/brand-profile', workflowContext))}>{pageStateActionMap.supplementBrandProfile.label}</Button>}
          />
        ) : undefined}
        contentState={!dashboardQuery.isLoading && analysisState === 'empty' ? (
          <GuidedEmptyState
            title={isFactMode ? '还没有可分析的事实样本' : '还没有可分析的评价样本'}
            reason="当前品牌尚未采集带原始回答的真实 AI 回复。"
            impact={isFactMode ? '事实风险、失真信息和修正建议暂时无法生成。' : '评价趋势、表达问题和修正建议暂时无法生成。'}
            benefit="完成首轮监测后，可以从真实回答定位问题并进入资料、内容和复测工作流。"
            actionLabel={pageStateActionMap.startMonitoring.label}
            onAction={() => navigate(workflowStagePath('/monitoring', workflowContext))}
            supportingText="支持 API 自动监测、浏览器辅助监测和手动录入真实回复。"
          />
        ) : undefined}
        filters={(
          <AnalysisScopeBar
            value={analysisScope}
            onChange={updateAnalysisScope}
            onClear={() => navigate({ pathname: location.pathname, search: clearAnalysisScopeQuery(location.search), hash: location.hash }, { replace: true })}
            statusOptions={Object.entries(statusLabels).map(([value, label]) => ({ value: value as EvaluationIssue['status'], label }))}
            resultCount={issueRows.length}
            totalCount={dashboard?.issues.length ?? 0}
          />
        )}
        trend={(
          <Card size="small" title={isFactMode ? '事实准确性趋势' : '评价趋势'}>
            <Table
              rowKey="date"
              dataSource={trendRows}
              pagination={false}
              columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '样本数', dataIndex: 'sampleCount' },
                ...(!isFactMode ? [
                  { title: '正向表达率', dataIndex: 'positiveRate', render: (value: number) => `${value}%` },
                  { title: '中性表达率', dataIndex: 'neutralRate', render: (value: number) => `${value}%` },
                  { title: '负向表达率', dataIndex: 'negativeRate', render: (value: number) => `${value}%` }
                ] : []),
                { title: '准确表达率', dataIndex: 'accurateRate', render: (value) => `${value}%` }
              ]}
            />
          </Card>
        )}
        distribution={(
          <Card size="small" title={isFactMode ? '事实风险分布' : '表达问题分布'}>
            <Table
              rowKey="issueType"
              dataSource={issueTypeBreakdown}
              pagination={false}
              columns={[
                { title: '问题类型', render: (_, record) => issueTypeLabels[record.issueType] },
                { title: '数量', dataIndex: 'count' },
                { title: '占比', dataIndex: 'rate', render: (value) => `${value}%` }
              ]}
            />
          </Card>
        )}
        details={(
          <Table
            rowKey="id"
            dataSource={issueRows}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: isFactMode ? '风险类型' : '问题类型', render: (_, record) => <Tag>{issueTypeLabels[record.issueType]}</Tag> },
              { title: isFactMode ? '失真信息' : '原始回答片段', dataIndex: 'rawFragment', render: (value) => <Typography.Text ellipsis>{value}</Typography.Text> },
              ...(isFactMode ? [
                { title: '证据', render: (_: unknown, record: EvaluationIssue) => getFactEvidenceDisplay(record) },
                { title: '用户意图', render: (_: unknown, record: EvaluationIssue) => record.userIntent ?? record.promptText },
                { title: '可执行修正建议', render: (_: unknown, record: EvaluationIssue) => getFactSuggestedExpression(record) }
              ] : [
                { title: '正确表达建议', dataIndex: 'suggestedExpression' },
                { title: '关联平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
                { title: '关联监测问题', dataIndex: 'promptText' }
              ]),
              { title: '严重程度', render: (_, record) => <Tag color={record.severity === 'high' ? 'red' : record.severity === 'medium' ? 'orange' : undefined}>{severityLabels[record.severity]}</Tag> },
              { title: '状态', render: (_, record) => <Tag>{statusLabels[record.status]}</Tag> },
              {
                title: '操作',
                render: (_, record) => (
                  <EvaluationIssueActions
                    issue={record}
                    context={workflowContext}
                    onMutation={(type) => type === 'knowledge' ? updateKnowledgeMutation.mutate(record.id) : createStrategyMutation.mutate(record.id)}
                  />
                )
              }
            ]}
          />
        )}
      >
        {isFactMode ? (
          <>
            <Statistic title="事实风险" value={scopedIssues.length} suffix="项" />
            <Statistic title="高风险事实" value={scopedIssues.filter((issue) => issue.severity === 'high').length} suffix="项" />
            <Statistic title="受影响意图" value={getAffectedFactIntentCount(scopedIssues)} suffix="个" />
            <Statistic title="事实准确表达率" value={dashboard?.accurateRate ?? 0} suffix="%" />
          </>
        ) : (
          <>
            <Statistic title="正向表达率" value={dashboard?.positiveRate ?? 0} suffix="%" />
            <Statistic title="中性表达率" value={dashboard?.neutralRate ?? 0} suffix="%" />
            <Statistic title="负向表达率" value={dashboard?.negativeRate ?? 0} suffix="%" />
            <Statistic title="准确表达率" value={dashboard?.accurateRate ?? 0} suffix="%" />
          </>
        )}
      </AnalysisWorkbench>
    </>
  );
}

export function getEvaluationAnalysisMode(pathname: string, dashboard: EvaluationDashboard | null): { title: string; description: string; findings: string[]; actions: string[] } {
  const issues = dashboard?.issues ?? [];
  const issueCount = issues.length;
  const accuracy = dashboard?.accurateRate ?? 0;

  if (pathname === '/facts') {
    const factIssues = getFactEvaluationIssues(issues);
    const highRiskCount = factIssues.filter((issue) => issue.severity === 'high').length;
    return {
      title: '事实分析',
      description: '基于真实 AI 回复定位事实冲突、失真证据、受影响用户意图和可执行修正建议。',
      findings: dashboard ? [`发现 ${factIssues.length} 项事实风险，其中 ${highRiskCount} 项高风险`, `事实准确表达率 ${accuracy}%`, `${getAffectedFactIntentCount(factIssues)} 个用户意图受到影响`] : [],
      actions: ['补充品牌资料', '更新标准答案', '生成事实补强内容']
    };
  }

  return {
    title: '评价分析',
    description: '基于 AI 回复解读结果查看整体评价、准确表达和表达问题，并沉淀修正内容策略或品牌资料更新。',
    findings: dashboard ? [`正向表达率 ${dashboard.positiveRate}%`, `负向表达率 ${dashboard.negativeRate}%`, `${issueCount} 个表达问题待处理`] : [],
    actions: ['修正内容策略', '更新品牌资料', '创建再次监测']
  };
}

const factIssueTypes = new Set<EvaluationIssue['issueType']>(['misinformation', 'low_accuracy', 'blocked_expression']);

export function getFactEvaluationIssues(issues: EvaluationIssue[]): EvaluationIssue[] {
  return issues.filter((issue) => factIssueTypes.has(issue.issueType));
}

export function getAffectedFactIntentCount(issues: EvaluationIssue[]): number {
  return new Set(issues.map((issue) => issue.userIntent ?? issue.promptText).filter(Boolean)).size;
}

export function getFactEvidenceDisplay(issue: Pick<EvaluationIssue, 'platformCode' | 'promptText'>): string {
  return issue.promptText.trim()
    ? `${getPlatformDisplayName(issue.platformCode)} · ${issue.promptText.trim()}`
    : '事实依据缺失，请补充品牌资料或可信来源';
}

export function getFactSuggestedExpression(issue: Pick<EvaluationIssue, 'suggestedExpression'>): string {
  return issue.suggestedExpression.trim() || '补充事实依据后人工确认修正表达';
}

export function getEvaluationAnalysisState(dashboard: EvaluationDashboard | null): 'empty' | 'insufficient' | 'ready' {
  if (!dashboard || dashboard.sampleCount === 0) return 'empty';
  return dashboard.sampleCount < 3 ? 'insufficient' : 'ready';
}

type EvaluationIssueAction =
  | { kind: 'mutation'; type: 'strategy' | 'knowledge'; label: string }
  | { kind: 'link'; label: string; href: string };

type EvaluationActionIssue = Pick<EvaluationIssue, 'issueType'> & Partial<Pick<EvaluationIssue, 'promptText' | 'promptId' | 'runId' | 'platformCode'>>;

export function getEvaluationIssueActions(issue: EvaluationActionIssue, context: WorkflowRouteContext = {}): EvaluationIssueAction[] {
  const routeContext: WorkflowRouteContext = {
    ...context,
    question: issue.promptText ?? context.question,
    promptId: issue.promptId ?? context.promptId,
    runId: issue.runId ?? context.runId,
    platformCode: issue.platformCode ?? context.platformCode
  };
  if (issue.issueType === 'misinformation' || issue.issueType === 'low_accuracy') {
    return [
      { kind: 'mutation', type: 'knowledge', label: '更新标准答案' },
      { kind: 'link', label: '生成事实补强内容', href: workflowStagePath('/content-generation', routeContext) },
      { kind: 'link', label: '再次监测', href: workflowStagePath('/monitoring', routeContext) }
    ];
  }

  if (issue.issueType === 'negative_expression') {
    return [
      { kind: 'mutation', type: 'strategy', label: '事实澄清策略' },
      { kind: 'link', label: 'FAQ 补充', href: workflowStagePath('/content-generation', routeContext) },
      { kind: 'link', label: '复测任务', href: workflowStagePath('/monitoring', routeContext) }
    ];
  }

  return [
    { kind: 'mutation', type: 'strategy', label: '内容补强策略' },
    { kind: 'mutation', type: 'knowledge', label: '更新品牌资料' },
    { kind: 'link', label: '生成内容任务', href: workflowStagePath('/content-generation', routeContext) }
  ];
}

export function getFilteredEvaluationIssues(
  issues: EvaluationIssue[],
  scope: AnalysisScopeValue<EvaluationIssue['status']>
): EvaluationIssue[] {
  const search = scope.search.trim().toLowerCase();
  return issues.filter((issue) => {
    const createdDate = issue.createdAt.slice(0, 10);
    if (scope.from && createdDate < scope.from) return false;
    if (scope.to && createdDate > scope.to) return false;
    if (scope.platform !== 'all' && issue.platformCode !== scope.platform) return false;
    if (scope.status !== 'all' && issue.status !== scope.status) return false;
    return !search || [issue.rawFragment, issue.suggestedExpression, issue.promptText, issueTypeLabels[issue.issueType]]
      .some((value) => value.toLowerCase().includes(search));
  });
}

export function getFilteredEvaluationTrend(
  trend: EvaluationDashboard['trend'],
  scope: Pick<AnalysisScopeValue, 'from' | 'to'>
): EvaluationDashboard['trend'] {
  return trend.filter((point) => (!scope.from || point.date >= scope.from) && (!scope.to || point.date <= scope.to));
}

export function getEvaluationIssueBreakdown(issues: EvaluationIssue[]): EvaluationDashboard['issueTypeBreakdown'] {
  const counts = new Map<EvaluationIssue['issueType'], number>();
  for (const issue of issues) counts.set(issue.issueType, (counts.get(issue.issueType) ?? 0) + 1);
  return [...counts.entries()]
    .map(([issueType, count]) => ({ issueType, count, rate: issues.length === 0 ? 0 : Math.round((count / issues.length) * 100) }))
    .sort((left, right) => right.count - left.count || issueTypeLabels[left.issueType].localeCompare(issueTypeLabels[right.issueType], 'zh-CN'));
}

function EvaluationIssueActions({ issue, context, onMutation }: { issue: EvaluationIssue; context: WorkflowRouteContext; onMutation: (type: 'strategy' | 'knowledge') => void }) {
  const navigate = useNavigate();
  const actions = getEvaluationIssueActions(issue, context);
  const renderAction = (action: EvaluationIssueAction) => action.kind === 'mutation'
    ? <Button key={action.label} size="small" onClick={() => onMutation(action.type)}>{action.label}</Button>
    : <Button key={action.label} size="small" onClick={() => navigate(action.href)}>{action.label}</Button>;
  const overflowActions = actions.slice(2);
  const primaryActions = actions.slice(0, 2);

  return (
    <ManagementRowActions
      primaryActions={[renderAction(primaryActions[0]), renderAction(primaryActions[1])]}
      moreAction={overflowActions.length > 0 ? (
        <AccessibleDropdown
          label={`问题“${issue.promptText}”的更多操作`}
          trigger={['click']}
          menu={{
            items: overflowActions.map((action, index) => ({ key: String(index), label: action.label })),
            onClick: ({ key }) => {
              const action = overflowActions[Number(key)];
              if (!action) return;
              if (action.kind === 'mutation') onMutation(action.type);
               else navigate(action.href);
            }
          }}
        >
          <Button size="small">更多</Button>
        </AccessibleDropdown>
      ) : undefined}
    />
  );
}
