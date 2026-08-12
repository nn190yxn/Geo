import { Button, Form, Input, Modal, Statistic, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { CitationAbsorptionEvidence, CitationDashboard, CitationSource, ContentAsset, ContentAssetInput, ContentStrategy } from '@geo-platform/shared-types';
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

type AssetFormValues = Omit<ContentAssetInput, 'targetKeywords'> & {
  targetKeywordsText?: string;
};

const sourceTypeLabels: Record<CitationSource['sourceType'], string> = {
  official_site: '官网',
  media: '媒体',
  social: '社媒',
  encyclopedia: '百科',
  third_party: '第三方平台'
};

const authorityLabels: Record<CitationSource['authorityLevel'], string> = {
  high: '高',
  medium: '中',
  low: '低',
  unknown: '未知'
};

export function CitationAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedCitation, setSelectedCitation] = useState<CitationSource>();
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetForm] = Form.useForm<AssetFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['citation-dashboard', activeBrandId],
    queryFn: () => apiGet<CitationDashboard>(`/brands/${activeBrandId}/citations`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const analysisScope = readAnalysisScopeQuery(location.search, { statuses: ['linked', 'unlinked'] as const });
  const citationRows = getFilteredCitationSources(dashboard?.sources ?? [], analysisScope);
  const analysisState = getCitationAnalysisState(dashboard);
  const workflowContext = readWorkflowRouteContext(location.search);
  const updateAnalysisScope = (value: typeof analysisScope) => navigate({ pathname: location.pathname, search: mergeAnalysisScopeQuery(location.search, value), hash: location.hash }, { replace: true });
  const bindAssetMutation = useMutation({
    mutationFn: (values: AssetFormValues) => {
      return apiPost<ContentAsset>(`/brands/${activeBrandId}/citations/${selectedCitation?.id}/content-asset`, toAssetPayload(values));
    },
    onSuccess: (response) => {
      if (response.success) {
        setAssetModalOpen(false);
        setSelectedCitation(undefined);
        assetForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['citation-dashboard', activeBrandId] });
        void messageApi.success('内容资产已绑定');
      }
    }
  });
  const createStrategyMutation = useMutation({
    mutationFn: (citationId: string) => apiPost<ContentStrategy>(`/brands/${activeBrandId}/citations/${citationId}/enhancement-strategy`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void messageApi.success('引用增强策略已创建');
      }
    }
  });
  const analyzeAbsorptionMutation = useMutation({
    mutationFn: (citationId: string) => apiPost<CitationSource>(`/brands/${activeBrandId}/citations/${citationId}/absorption`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['citation-dashboard', activeBrandId] })
  });
  const reviewAbsorptionMutation = useMutation({
    mutationFn: ({ citationId, evidenceId }: { citationId: string; evidenceId: string }) => apiPost<CitationSource>(`/brands/${activeBrandId}/citations/${citationId}/absorption/${encodeURIComponent(evidenceId)}/review`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['citation-dashboard', activeBrandId] })
  });

  const openAssetModal = (citation: CitationSource) => {
    setSelectedCitation(citation);
    assetForm.setFieldsValue({
      title: citation.title,
      type: citation.sourceType,
      platform: citation.sourceType,
      url: citation.url,
      status: 'published'
    });
    setAssetModalOpen(true);
  };

  return (
    <>
      {contextHolder}
      <AnalysisWorkbench
        title="信源分析"
        description="查看真实 AI 回复引用了哪些来源，并找出需要补充的品牌内容。"
        findings={getCitationAnalysisFindings(dashboard)}
        actions={['分析答案吸收', '复核冲突证据', '创建信源优化任务']}
        loading={dashboardQuery.isLoading}
        state={dashboardQuery.isLoading ? 'loading' : dashboardQuery.data && !dashboardQuery.data.success ? 'error' : 'ready'}
        onRetry={() => void dashboardQuery.refetch()}
        scopeDescription="筛选条件用于查看指定范围内的引用证据；顶部指标展示品牌整体表现。"
        notice={!dashboardQuery.isLoading && analysisState === 'insufficient' ? (
          <PartialDataNotice
            message="当前信源样本不足"
            description={`已采集 ${dashboard?.sampleCount ?? 0} 条真实回复，当前结论用于初步诊断。补充可引用的官网事实、FAQ 和权威资料后，可提高下一轮信源判断的稳定性。`}
            action={<Button onClick={() => navigate(workflowStagePath('/brand-profile', workflowContext))}>{pageStateActionMap.supplementBrandProfile.label}</Button>}
          />
        ) : undefined}
        contentState={!dashboardQuery.isLoading && analysisState === 'empty' ? (
          <GuidedEmptyState
            title="还没有可分析的真实引用样本"
            reason="当前品牌尚未采集带原始回答的真实 AI 回复。"
            impact="引用率、官网引用率和权威来源占比暂时无法计算。"
            benefit="完成首轮监测后，可以定位 AI 实际采用的来源并创建信源优化任务。"
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
            statusOptions={[{ value: 'linked', label: '已绑定资产' }, { value: 'unlinked', label: '待绑定资产' }]}
            resultCount={citationRows.length}
            totalCount={dashboard?.sources.length ?? 0}
          />
        )}
        trend={(
          <Table
            rowKey="date"
            dataSource={dashboard?.trend ?? []}
            pagination={false}
            columns={[
              { title: '日期', dataIndex: 'date' },
              { title: '真实回复', dataIndex: 'sampleCount' },
              { title: '有引用回复', dataIndex: 'citedSampleCount' },
              { title: '引用率', dataIndex: 'citationRate', render: (value) => `${value}%` },
               { title: '引用次数', dataIndex: 'citationCount' },
              { title: '内容资产绑定率', dataIndex: 'contentCitationRate', render: (value) => `${value}%` }
            ]}
          />
        )}
        distribution={(
          <Table
            rowKey="sourceType"
            dataSource={dashboard?.sourceTypeBreakdown ?? []}
            pagination={false}
            columns={[
               { title: '来源类型', render: (_, record) => sourceTypeLabels[record.sourceType] },
               { title: '引用次数', dataIndex: 'citationCount' },
              { title: '占比', dataIndex: 'rate', render: (value) => `${value}%` }
            ]}
          />
        )}
        details={(
          <Table
            rowKey="id"
            dataSource={citationRows}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: '来源标题', render: (_, record) => getCitationSourceTitle(record) },
              { title: '来源平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
              { title: '来源地址', render: (_, record) => <Typography.Text copyable={Boolean(record.url.trim())} ellipsis>{getCitationSourceUrl(record)}</Typography.Text> },
              { title: '来源类型', render: (_, record) => <Tag>{sourceTypeLabels[record.sourceType]}</Tag> },
               { title: '权威等级', render: (_, record) => <Tag color={record.authorityLevel === 'high' ? 'green' : undefined}>{authorityLabels[record.authorityLevel]}</Tag> },
               { title: '引用次数', dataIndex: 'citationCount' },
               { title: '答案吸收', render: (_, record) => <AbsorptionEvidence evidence={record.absorptionEvidence ?? []} onReview={(evidenceId) => reviewAbsorptionMutation.mutate({ citationId: record.id, evidenceId })} /> },
               { title: '证据分析', render: (_, record) => <Button size="small" onClick={() => analyzeAbsorptionMutation.mutate(record.id)}>分析答案吸收</Button> },
               { title: '关联监测问题', dataIndex: 'promptText' },
              {
                title: '操作',
                render: (_, record) => (
                  <CitationSourceActions
                    source={record}
                    context={workflowContext}
                    onBind={() => openAssetModal(record)}
                    onEnhance={() => createStrategyMutation.mutate(record.id)}
                  />
                )
              }
            ]}
          />
        )}
      >
         <Statistic title="引用率" value={dashboard?.citationRate ?? 0} suffix="%" />
         <Statistic title="引用广度" value={dashboard?.citationBreadthRate ?? 0} suffix="%" />
         <Statistic title="答案吸收深度" value={dashboard?.answerAbsorptionDepth ?? 0} suffix="%" />
         <Statistic title="待人工复核" value={dashboard?.pendingReviewCount ?? 0} />
        <Statistic title="官网引用率" value={dashboard?.officialCitationRate ?? 0} suffix="%" />
        <Statistic title="权威来源占比" value={dashboard?.authoritySourceRate ?? 0} suffix="%" />
      </AnalysisWorkbench>

      <Modal
        title="绑定内容资产"
        open={assetModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={bindAssetMutation.isPending}
        onCancel={() => setAssetModalOpen(false)}
        onOk={() => assetForm.submit()}
      >
        <Form form={assetForm} layout="vertical" onFinish={(values) => bindAssetMutation.mutate(values)}>
          <Form.Item name="title" label="内容标题" rules={[{ required: true, message: '请输入内容标题' }]}><Input /></Form.Item>
          <Form.Item name="type" label="内容类型"><Input /></Form.Item>
          <Form.Item name="platform" label="发布平台"><Input /></Form.Item>
          <Form.Item name="url" label="内容链接" rules={[{ required: true, message: '请输入内容链接' }]}><Input /></Form.Item>
          <Form.Item name="targetKeywordsText" label="目标关键词"><Input.TextArea rows={3} placeholder="一行一个关键词" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function getCitationAnalysisFindings(dashboard: CitationDashboard | null): string[] {
  if (!dashboard) return [];

  const findings = [`真实回复引用率 ${dashboard.citationRate}%（${dashboard.citedSampleCount}/${dashboard.sampleCount}）`];
  if (dashboard.officialCitationRate > 0) findings.push(`官网引用率 ${dashboard.officialCitationRate}%`);
  if (dashboard.authoritySourceRate > 0) findings.push(`权威来源占比 ${dashboard.authoritySourceRate}%`);
  findings.push(`已识别 ${dashboard.totalCitations} 次引用，其中 ${dashboard.contentCitationRate}% 已绑定内容资产`);
  return findings;
}

export function getCitationAnalysisState(dashboard: CitationDashboard | null): 'empty' | 'insufficient' | 'ready' {
  if (!dashboard || dashboard.sampleCount === 0) return 'empty';
  return dashboard.sampleCount < 3 ? 'insufficient' : 'ready';
}

export function getCitationSourceTitle(source: Pick<CitationSource, 'title'>): string {
  return source.title.trim() || '未识别来源';
}

export function getCitationSourceUrl(source: Pick<CitationSource, 'url'>): string {
  return source.url.trim() || '来源地址待补充';
}

type CitationActionSource = Pick<CitationSource, 'sourceType' | 'citationCount'> & Partial<Pick<CitationSource, 'promptText' | 'promptId' | 'runId' | 'platformCode'>>;

export function getCitationSourceActions(source: CitationActionSource, context: WorkflowRouteContext = {}): Array<{ label: string; href: string }> {
  const highFrequency = source.citationCount >= 3;
  const routeContext: WorkflowRouteContext = {
    ...context,
    question: source.promptText ?? context.question,
    promptId: source.promptId ?? context.promptId,
    runId: source.runId ?? context.runId,
    platformCode: source.platformCode ?? context.platformCode
  };
  if (source.sourceType === 'official_site') {
    return [
      { label: highFrequency ? '创建官网页建议' : '补充官网 FAQ', href: workflowStagePath('/content-generation', routeContext) },
      { label: '再次监测', href: workflowStagePath('/monitoring', routeContext) }
    ];
  }

  if (source.sourceType === 'media' || source.sourceType === 'third_party') {
    return [
      { label: highFrequency ? '创建评测页建议' : '创建媒体稿建议', href: workflowStagePath('/content-generation', routeContext) },
      { label: '查看发布统计', href: workflowStagePath('/publishing', routeContext) }
    ];
  }

  return [
    { label: '创建问答内容建议', href: workflowStagePath('/content-generation', routeContext) },
    { label: '再次监测', href: workflowStagePath('/monitoring', routeContext) }
  ];
}

export function getFilteredCitationSources(
  sources: CitationSource[],
  scope: AnalysisScopeValue<'linked' | 'unlinked'>
): CitationSource[] {
  const search = scope.search.trim().toLowerCase();
  return sources.filter((source) => {
    const citedDate = source.citedAt.slice(0, 10);
    if (scope.from && citedDate < scope.from) return false;
    if (scope.to && citedDate > scope.to) return false;
    if (scope.platform !== 'all' && source.platformCode !== scope.platform) return false;
    if (scope.status === 'linked' && !source.contentAssetId) return false;
    if (scope.status === 'unlinked' && source.contentAssetId) return false;
    return !search || [source.title, source.url, source.promptText, sourceTypeLabels[source.sourceType]]
      .some((value) => value.toLowerCase().includes(search));
  });
}

function CitationSourceActions({ source, context, onBind, onEnhance }: { source: CitationSource; context: WorkflowRouteContext; onBind: () => void; onEnhance: () => void }) {
  const navigate = useNavigate();
  const overflowActions = getCitationSourceActions(source, context);
  return (
    <ManagementRowActions
      primaryActions={[
        <Button key="asset" size="small" onClick={onBind}>{source.contentAssetId ? '更新资产' : '绑定资产'}</Button>,
        <Button key="strategy" size="small" onClick={onEnhance}>创建信源优化任务</Button>
      ]}
      moreAction={overflowActions.length > 0 ? (
        <AccessibleDropdown
          label={`引用来源“${getCitationSourceTitle(source)}”的更多操作`}
          menu={{
            items: overflowActions.map((action, index) => ({ key: String(index), label: action.label })),
            onClick: ({ key }) => {
              const action = overflowActions[Number(key)];
              if (action) navigate(action.href);
            }
          }}
          trigger={['click']}
        >
          <Button size="small">更多</Button>
        </AccessibleDropdown>
      ) : undefined}
    />
  );
}

function AbsorptionEvidence({ evidence, onReview }: { evidence: CitationAbsorptionEvidence[]; onReview: (evidenceId: string) => void }) {
  if (!evidence.length) return <Typography.Text type="secondary">尚未分析</Typography.Text>;
  return <div>{evidence.slice(0, 2).map((item) => <div key={item.id}><Tag color={item.outcome === 'supports' ? 'green' : item.outcome === 'conflicts' ? 'red' : undefined}>{item.outcome}</Tag><Typography.Text>{item.confidence}%</Typography.Text>{item.reviewStatus === 'pending_review' ? <Button type="link" size="small" onClick={() => onReview(item.id)}>人工复核</Button> : null}</div>)}</div>;
}

function toAssetPayload(values: AssetFormValues): ContentAssetInput {
  return {
    ...values,
    targetKeywords: values.targetKeywordsText?.split('\n').map((item) => item.trim()).filter(Boolean) ?? []
  };
}
