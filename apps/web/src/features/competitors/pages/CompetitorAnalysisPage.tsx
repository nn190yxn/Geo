import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Form, Input, InputNumber, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type {
  Competitor,
  CompetitorCandidate,
  CompetitorCandidateConfirmationResult,
  CompetitorCandidateDecisionInput,
  CompetitorConfirmationLabel,
  CompetitorDashboard,
  CompetitorDiscoveryCandidatesQuery,
  CompetitorDiscoveryRun,
  CompetitorDiscoveryRunInput,
  CompetitorInput,
  ContentGenerationWorkspace
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getPlatformDisplayName } from '../../../utils/displayLabels';
import { readWorkflowRouteContext, workflowStagePath, type WorkflowRouteContext } from '../../../app/routePaths';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { EmptyState } from '../../../components/PageState';
import { AnalysisWorkbench } from '../../analysis/components/AnalysisWorkbench';
import { AnalysisScopeBar } from '../../analysis/components/AnalysisScopeBar';
import { clearAnalysisScopeQuery, mergeAnalysisScopeQuery, readAnalysisScopeQuery, type AnalysisScopeValue } from '../../analysis/analysisScopeQuery';

type CompetitorFormValues = Omit<CompetitorInput, 'aliases' | 'industryTags'> & {
  aliasesText?: string;
  industryTagsText?: string;
};

export function CompetitorAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const location = useLocation();
  const navigate = useNavigate();
  const pageMode = getCompetitorPageMode(location.pathname);
  const [modalOpen, setModalOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [discoveryFilter, setDiscoveryFilter] = useState<NonNullable<CompetitorDiscoveryCandidatesQuery['filter']>>('all');
  const [activeDiscoveryRun, setActiveDiscoveryRun] = useState<CompetitorDiscoveryRun>();
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor>();
  const [form] = Form.useForm<CompetitorFormValues>();
  const [discoveryForm] = Form.useForm<CompetitorDiscoveryFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['competitor-dashboard', activeBrandId],
    queryFn: () => apiGet<CompetitorDashboard>(`/brands/${activeBrandId}/competitors/analysis`)
  });
  const candidatesQuery = useQuery({
    queryKey: ['competitor-discovery-candidates', activeBrandId, activeDiscoveryRun?.runId, discoveryFilter],
    queryFn: () => apiGet<CompetitorCandidate[]>(`/brands/${activeBrandId}/competitors/discovery-runs/${activeDiscoveryRun?.runId}/candidates?filter=${discoveryFilter}`),
    enabled: Boolean(activeBrandId && activeDiscoveryRun?.runId)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const analysisScope = readAnalysisScopeQuery(location.search, { statuses: ['suppressed', 'clear'] as const });
  const comparisonRows = getFilteredCompetitorComparisons(dashboard?.comparisons ?? [], analysisScope);
  const scopeSummary = getCompetitorScopeSummary(comparisonRows);
  const platformMatrixRows = getCompetitorPlatformMatrix(comparisonRows);
  const trendRows = getCompetitorTrend(comparisonRows);
  const riskIntentRows = getCompetitorRiskIntents(comparisonRows);
  const workflowContext = readWorkflowRouteContext(location.search);
  const updateAnalysisScope = (value: typeof analysisScope) => navigate({ pathname: location.pathname, search: mergeAnalysisScopeQuery(location.search, value), hash: location.hash }, { replace: true });
  const saveMutation = useMutation({
    mutationFn: (values: CompetitorFormValues) => {
      const payload = toCompetitorPayload(values);
      return editingCompetitor
        ? apiPatch<Competitor>(`/brands/${activeBrandId}/competitors/${editingCompetitor.id}`, payload)
        : apiPost<Competitor>(`/brands/${activeBrandId}/competitors`, payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setModalOpen(false);
        setEditingCompetitor(undefined);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['competitor-dashboard', activeBrandId] });
        void messageApi.success('竞品档案已保存');
      }
    }
  });
  const discoveryMutation = useMutation({
    mutationFn: (values: CompetitorDiscoveryFormValues) => apiPost<CompetitorDiscoveryRun>(`/brands/${activeBrandId}/competitors/discovery-runs`, toDiscoveryPayload(values)),
    onSuccess: (response) => {
      if (response.success) {
        setActiveDiscoveryRun(response.data);
        setDiscoveryFilter('all');
        void messageApi.success(response.data.status === 'completed' ? '已生成竞品候选' : response.data.failureReason ?? '发现任务需要补充信息');
      }
    }
  });
  const decisionMutation = useMutation({
    mutationFn: ({ candidateId, input }: { candidateId: string; input: CompetitorCandidateDecisionInput }) => (
      apiPatch<CompetitorCandidateConfirmationResult>(`/brands/${activeBrandId}/competitors/candidates/${candidateId}/decision`, input)
    ),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['competitor-discovery-candidates', activeBrandId, activeDiscoveryRun?.runId] });
        void queryClient.invalidateQueries({ queryKey: ['competitor-dashboard', activeBrandId] });
        void messageApi.success(response.data.competitor ? '已加入竞品档案' : '候选已排除');
      }
    }
  });
  const opportunityTaskMutation = useMutation({
    mutationFn: (promptId: string) => apiPost<ContentGenerationWorkspace>(`/brands/${activeBrandId}/competitors/opportunities/${promptId}/content-task`, {}),
    onSuccess: (response, promptId) => {
      if (!response.success) return;
      void messageApi.success('已创建竞品机会内容任务');
      navigate(workflowStagePath('/content-generation', { ...workflowContext, promptId, taskId: response.data.currentTask?.id }));
    }
  });

  const openCreateModal = () => {
    setEditingCompetitor(undefined);
    form.resetFields();
    form.setFieldsValue({ suppressionRule: { consecutiveThreshold: 2 } });
    setModalOpen(true);
  };

  const openDiscoveryDrawer = () => {
    discoveryForm.setFieldsValue({ city: '贵阳', campusRadiusKm: 5, keywordsText: '儿童体能、少儿跑酷、儿童运动、体适能、快乐体操、篮球培训、儿童运动馆', forceRefresh: false });
    setDiscoveryOpen(true);
  };

  const decideCandidate = (candidate: CompetitorCandidate, label: CompetitorConfirmationLabel) => {
    decisionMutation.mutate({
      candidateId: candidate.candidateId,
      input: {
        label,
        excludedReason: label === 'excluded' ? '人工判断暂不纳入儿童运动竞品' : undefined
      }
    });
  };

  const openEditModal = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    form.setFieldsValue({
      name: competitor.name,
      aliasesText: competitor.aliases.join('\n'),
      website: competitor.website,
      industryTagsText: competitor.industryTags.join('\n'),
      comparisonNote: competitor.comparisonNote,
      suppressionRule: competitor.suppressionRule
    });
    setModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      {pageMode === 'profile' ? (
        <CompetitorProfileManagement
          dashboard={dashboard}
          loading={dashboardQuery.isLoading}
          failed={Boolean(dashboardQuery.data && !dashboardQuery.data.success)}
          onCreate={openCreateModal}
          onDiscover={openDiscoveryDrawer}
          onEdit={openEditModal}
          onDecide={decideCandidate}
        />
      ) : (
      <AnalysisWorkbench
        title="竞品分析"
        description="聚合同监测问题、同平台、同用户意图下的推荐顺序、压制情况和高风险场景。"
        findings={getCompetitorAnalysisFindings(dashboard, comparisonRows)}
        actions={['更新竞品资料', '生成内容策略', '创建再次监测']}
        extra={<Button onClick={() => navigate({ pathname: '/competitor-profile', search: location.search, hash: location.hash })}>管理竞品资料</Button>}
        loading={dashboardQuery.isLoading}
        state={dashboardQuery.isLoading ? 'loading' : dashboardQuery.data && !dashboardQuery.data.success ? 'error' : 'ready'}
        onRetry={() => void dashboardQuery.refetch()}
        scopeDescription="竞品提及率保留品牌整体真实样本口径；推荐排名、压制风险、平台矩阵、趋势和证据明细使用当前筛选范围。"
        filters={(
          <AnalysisScopeBar
            value={analysisScope}
            onChange={updateAnalysisScope}
            onClear={() => navigate({ pathname: location.pathname, search: clearAnalysisScopeQuery(location.search), hash: location.hash }, { replace: true })}
            statusOptions={[{ value: 'suppressed', label: '发生压制' }, { value: 'clear', label: '未压制' }]}
            optimizationUnitOptions={getCompetitorOptimizationUnitOptions(dashboard?.comparisons ?? [])}
            intentOptions={getCompetitorIntentOptions(dashboard?.comparisons ?? [])}
            resultCount={comparisonRows.length}
            totalCount={dashboard?.comparisons.length ?? 0}
          />
        )}
        trend={(
          <Card size="small" title="竞品趋势">
            <Table
              rowKey="date"
              dataSource={trendRows}
              pagination={false}
              columns={[
                { title: '日期', dataIndex: 'date' },
                { title: '对比样本', dataIndex: 'sampleCount' },
                { title: '品牌平均推荐排名', dataIndex: 'averageBrandRank', render: (value) => value === null ? '未提及' : `第 ${value} 名` },
                { title: '压制风险', dataIndex: 'suppressionRate', render: (value) => `${value}%` }
              ]}
            />
          </Card>
        )}
        distribution={(
          <Space direction="vertical" size={16} className="full-width">
          <Card size="small" title="AI 平台矩阵">
            <Table
              rowKey="platformCode"
              dataSource={platformMatrixRows}
              pagination={false}
              columns={[
                { title: 'AI 平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
                { title: '对比样本', dataIndex: 'sampleCount' },
                { title: '品牌平均推荐排名', dataIndex: 'averageBrandRank', render: (value) => value === null ? '未提及' : `第 ${value} 名` },
                { title: '压制样本', dataIndex: 'suppressedCount' },
                { title: '压制风险', dataIndex: 'suppressionRate', render: (value) => `${value}%` }
              ]}
            />
          </Card>
          <Card size="small" title="已确认竞品的前三可比平台">
            <Table
              rowKey={(record) => `${record.competitorName}-${record.market}`}
              dataSource={dashboard?.topPlatformsByCompetitor ?? []}
              pagination={false}
              locale={{ emptyText: '确认竞品并积累真实样本后生成平台强度' }}
              columns={[
                { title: '竞品', dataIndex: 'competitorName' },
                { title: '市场', dataIndex: 'market' },
                { title: '前三平台', dataIndex: 'platforms', render: (platforms: NonNullable<CompetitorDashboard['topPlatformsByCompetitor']>[number]['platforms']) => platforms.map((platform) => `${getPlatformDisplayName(platform.platformCode)} ${platform.mentionRate}%（${platform.mentionSampleCount}/${platform.comparableSampleCount}）`).join('；') }
              ]}
            />
          </Card>
          </Space>
        )}
        details={(
          <Space direction="vertical" size={16} className="full-width">
            <Card size="small" title="问题机会">
              <Table
                rowKey="promptId"
                dataSource={dashboard?.questionOpportunities ?? []}
                pagination={false}
                locale={{ emptyText: '当前没有满足判定条件的竞品失守或品牌独占问题' }}
                columns={[
                  { title: '问题', dataIndex: 'promptText' },
                  { title: '机会', dataIndex: 'type', render: (value) => <Tag color={value === 'competitor_loss' ? 'red' : 'green'}>{value === 'competitor_loss' ? '竞品失守' : '品牌独占'}</Tag> },
                  { title: '品牌提及率', dataIndex: 'brandMentionRate', render: (value) => `${value}%` },
                  { title: '已确认竞品', dataIndex: 'confirmedCompetitorNames', render: (names: string[]) => names.length > 0 ? names.join('、') : '均未出现' },
                  { title: '样本', dataIndex: 'sampleCount' },
                  { title: '操作', render: (_, record) => <Button size="small" loading={opportunityTaskMutation.isPending} onClick={() => opportunityTaskMutation.mutate(record.promptId)}>创建内容任务</Button> }
                ]}
              />
            </Card>
            <Card size="small" title="高风险用户意图">
              <Table
                rowKey="intentId"
                dataSource={riskIntentRows}
                pagination={false}
                columns={[
                  { title: '用户意图', dataIndex: 'text' },
                  { title: '被压制次数', dataIndex: 'suppressionCount' }
                ]}
              />
            </Card>
            <Card size="small" title="竞品对比证据">
              <Table
                rowKey={(record) => `${record.runId}-${record.competitorName}`}
                dataSource={comparisonRows}
                pagination={{ pageSize: 8 }}
                columns={[
                  { title: '竞品', dataIndex: 'competitorName' },
                  { title: '平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
                  { title: '用户意图', dataIndex: 'intentText' },
                  { title: '品牌排名', dataIndex: 'brandRank', render: (value) => value ?? '未提及' },
                  { title: '竞品排名', dataIndex: 'competitorRank', render: (value) => value ?? '未提及' },
                  { title: '排名差', dataIndex: 'rankGap', render: (value) => value ?? '-' },
                  { title: '压制', dataIndex: 'suppressed', render: (value) => value ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
                  { title: '推荐理由', dataIndex: 'recommendationReason' },
                  { title: '操作', render: (_, record) => <CompetitorComparisonActions record={record} context={workflowContext} /> }
                ]}
              />
            </Card>
          </Space>
        )}
      >
        <Statistic title="竞品提及率" value={dashboard?.mentionRate ?? 0} suffix="%" />
        <Statistic title="品牌平均推荐排名" value={scopeSummary.averageBrandRank ?? '暂无排名'} suffix={scopeSummary.averageBrandRank === null ? undefined : '名'} />
        <Statistic title="竞品压制风险" value={scopeSummary.suppressionRate} suffix="%" />
      </AnalysisWorkbench>
      )}

      <Modal
        title={editingCompetitor ? '编辑竞品' : '新增竞品'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="name" label="竞品名称" rules={[{ required: true, message: '请输入竞品名称' }]}><Input /></Form.Item>
          <Form.Item name="aliasesText" label="别名"><Input.TextArea rows={3} placeholder="一行一个别名" /></Form.Item>
          <Form.Item name="website" label="官网"><Input /></Form.Item>
          <Form.Item name="industryTagsText" label="行业标签"><Input.TextArea rows={3} placeholder="一行一个标签" /></Form.Item>
          <Form.Item name="comparisonNote" label="对比说明"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name={['suppressionRule', 'consecutiveThreshold']} label="连续压制阈值">
            <InputNumber min={2} max={10} className="full-width" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="地图发现竞品"
        open={discoveryOpen}
        width={920}
        onClose={() => setDiscoveryOpen(false)}
      >
        <Space direction="vertical" size={16} className="page-stack">
          <Typography.Paragraph>
            按经营城市全城筛选，并把校区周边 3 到 8 公里机构标记为重点候选。
          </Typography.Paragraph>
          <Form form={discoveryForm} layout="inline" onFinish={(values) => discoveryMutation.mutate(values)}>
            <Form.Item name="city" label="经营城市" rules={[{ required: true, message: '请输入经营城市' }]}><Input placeholder="贵阳" /></Form.Item>
            <Form.Item name="campusRadiusKm" label="校区半径"><InputNumber min={3} max={8} addonAfter="公里" /></Form.Item>
            <Form.Item name="keywordsText" label="关键词"><Input className="competitor-keywords-input" /></Form.Item>
            <Form.Item name="forceRefresh" valuePropName="checked"><Checkbox>重新从地图拉取</Checkbox></Form.Item>
            <Button type="primary" htmlType="submit" loading={discoveryMutation.isPending}>开始发现</Button>
          </Form>

          {activeDiscoveryRun ? (
            <Card size="small">
              <Alert
                type={activeDiscoveryRun.providerStatus === 'configured' ? 'success' : activeDiscoveryRun.providerStatus === 'fallback' ? 'info' : 'warning'}
                showIcon
                message={activeDiscoveryRun.providerMessage}
                description={getProviderStatusDescription(activeDiscoveryRun)}
                className="competitor-provider-alert"
              />
              <Space size={24} wrap>
                <Statistic title="发现城市" value={activeDiscoveryRun.city} />
                <Statistic title="候选数量" value={activeDiscoveryRun.candidateCount} />
                <Statistic title="重点半径" value={activeDiscoveryRun.campusRadiusKm} suffix="公里" />
                <Statistic title="任务状态" value={activeDiscoveryRun.status === 'completed' ? '已完成' : '需补充'} />
                <Statistic title="数据来源" value={sourceProviderText[activeDiscoveryRun.sourceProvider]} />
                <Statistic title="缓存状态" value={activeDiscoveryRun.cacheHit ? '已复用' : '新发现'} />
              </Space>
            </Card>
          ) : null}

          <Space>
            <Typography.Text>候选筛选</Typography.Text>
            <Select value={discoveryFilter} options={candidateFilterOptions} onChange={setDiscoveryFilter} className="competitor-filter-select" />
          </Space>

          <Table
            rowKey="candidateId"
            loading={candidatesQuery.isLoading}
            dataSource={candidatesQuery.data?.success ? candidatesQuery.data.data : []}
            pagination={{ pageSize: 6 }}
            columns={[
              { title: '候选机构', dataIndex: 'name', render: (value, record) => <Space direction="vertical" size={2}><Typography.Text strong>{value}</Typography.Text><Typography.Text type="secondary">{record.address}</Typography.Text></Space> },
              { title: '建议标签', dataIndex: 'suggestedLabel', render: (value: CompetitorConfirmationLabel) => <Tag color={getCompetitorLabelColor(value)}>{competitorLabelText[value]}</Tag> },
              { title: '匹配分', dataIndex: 'score', render: (value) => `${value} 分` },
              { title: '距离', dataIndex: 'distanceToNearestCampusKm', render: (value, record) => typeof value === 'number' ? <Tag color={record.isCampusFocus ? 'green' : undefined}>{value} 公里</Tag> : '-' },
              { title: '命中关键词', render: (_, record) => record.matchedKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) },
              { title: '匹配理由', render: (_, record) => record.matchReasons.join('；') },
              { title: '证据状态', dataIndex: 'lifecycleStatus', render: (value, record) => <Space direction="vertical" size={2}><Tag>{lifecycleStatusText[value as keyof typeof lifecycleStatusText] ?? value}</Tag><Typography.Text type="secondary">{record.evidenceSampleIds.length} 条 AI 样本</Typography.Text></Space> },
              {
                title: '操作',
                render: (_, record) => (
                  <Space wrap>
                    <Button size="small" disabled={record.decisionStatus === 'confirmed'} loading={decisionMutation.isPending} onClick={() => decideCandidate(record, record.suggestedLabel)}>按建议确认</Button>
                    <Button size="small" disabled={record.decisionStatus === 'confirmed'} onClick={() => decideCandidate(record, 'direct_competitor')}>直接竞品</Button>
                    <Button size="small" disabled={record.decisionStatus === 'confirmed'} onClick={() => decideCandidate(record, 'national_benchmark')}>标杆品牌</Button>
                    <Button size="small" danger disabled={record.decisionStatus === 'excluded'} onClick={() => decideCandidate(record, 'excluded')}>排除</Button>
                  </Space>
                )
              }
            ]}
          />
        </Space>
      </Drawer>
    </Space>
  );
}

type CompetitorPageMode = 'profile' | 'analysis';

export function getCompetitorPageMode(pathname: string): CompetitorPageMode {
  return pathname === '/competitor-profile' ? 'profile' : 'analysis';
}

export function CompetitorProfileManagement({
  dashboard,
  loading,
  failed,
  onCreate,
  onDiscover,
  onEdit,
  onDecide
}: {
  dashboard: CompetitorDashboard | null;
  loading: boolean;
  failed: boolean;
  onCreate: () => void;
  onDiscover: () => void;
  onEdit: (competitor: Competitor) => void;
  onDecide: (candidate: CompetitorCandidate, label: CompetitorConfirmationLabel) => void;
}) {
  const competitors = dashboard?.competitors ?? [];
  const candidates = dashboard?.candidates ?? [];
  const state = loading ? 'loading' : failed ? 'error' : competitors.length === 0 ? 'empty' : 'ready';

  return (
    <Space direction="vertical" size={16} className="full-width">
    <ManagementListPage<Competitor>
      title="竞品信息"
      description="维护需要持续对照的直接竞品、标杆品牌和地图发现对象，为后续排名与压制分析提供统一档案。"
      primaryAction={competitors.length > 0 ? <Button type="primary" onClick={onCreate}>新增竞品</Button> : undefined}
      secondaryActions={<Button onClick={onDiscover}>地图发现竞品</Button>}
      summary={(
        <Space size={24} wrap>
          <Statistic title="竞品档案" value={competitors.length} />
          <Statistic title="直接竞品" value={competitors.filter((item) => item.confirmationLabel === 'direct_competitor').length} />
          <Statistic title="标杆品牌" value={competitors.filter((item) => item.confirmationLabel === 'national_benchmark').length} />
          <Statistic title="样本确认候选" value={(dashboard?.candidates ?? []).filter((item) => item.lifecycleStatus === 'sample_confirmed').length} />
          <Statistic title="用户确认候选" value={(dashboard?.candidates ?? []).filter((item) => item.lifecycleStatus === 'user_confirmed').length} />
        </Space>
      )}
      tableTitle="竞品档案列表"
      tableDescription="名称、分类、来源和压制规则集中维护；排名与风险结论请前往竞品分析。"
      state={state}
      emptyState={(
        <EmptyState
          title="还没有竞品档案"
          description="直接竞品、行业标杆及其别名和对比说明"
          reason="竞品档案用于识别 AI 回复中的竞品提及、排名差和连续压制。"
          nextStep="新增一个已知竞品，或从地图发现候选。"
          actionLabel="新增竞品"
          onAction={onCreate}
        />
      )}
      tableProps={{
        rowKey: 'id',
        dataSource: competitors,
        pagination: false,
        columns: [
          { title: '竞品名称', dataIndex: 'name' },
          { title: '竞品分类', render: (_, record) => record.confirmationLabel ? <Tag color={getCompetitorLabelColor(record.confirmationLabel)}>{competitorLabelText[record.confirmationLabel]}</Tag> : <Tag>待分类</Tag> },
          { title: '别名', render: (_, record) => record.aliases.length > 0 ? record.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>) : '-' },
          { title: '行业标签', render: (_, record) => record.industryTags.length > 0 ? record.industryTags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-' },
          { title: '资料来源', dataIndex: 'sourceProvider', render: (value) => value ? sourceProviderText[value as keyof typeof sourceProviderText] ?? value : '手动维护' },
          { title: '压制提醒', render: (_, record) => `连续 ${record.suppressionRule.consecutiveThreshold} 次` },
          { title: '操作', render: (_, record) => <Button size="small" onClick={() => onEdit(record)}>编辑资料</Button> }
        ]
      }}
    />
    <Card size="small" title="竞品候选证据生命周期" extra={<Button onClick={onDiscover}>发现更多候选</Button>}>
      <Table
        rowKey="candidateId"
        dataSource={candidates}
        pagination={{ pageSize: 8 }}
        locale={{ emptyText: '地图发现或真实 AI 回复命中后，候选及证据会显示在这里' }}
        columns={[
          { title: '候选机构', dataIndex: 'name' },
          { title: '来源', render: (_, record) => `${sourceProviderText[record.sourceProvider]} · ${record.city}` },
          { title: '证据状态', dataIndex: 'lifecycleStatus', render: (value, record) => <Space direction="vertical" size={2}><Tag>{lifecycleStatusText[value as keyof typeof lifecycleStatusText] ?? value}</Tag><Typography.Text type="secondary">{record.evidenceSampleIds.length} 条 AI 样本</Typography.Text></Space> },
          { title: '关联证据', render: (_, record) => record.evidenceSampleIds.length > 0 ? record.evidenceSampleIds.join('、') : '等待真实回复命中' },
          {
            title: '操作',
            render: (_, record) => record.lifecycleStatus === 'user_confirmed' || record.lifecycleStatus === 'excluded'
              ? <Typography.Text type="secondary">{record.lifecycleStatus === 'user_confirmed' ? '已确认' : '已排除'}</Typography.Text>
              : <Space wrap><Button size="small" onClick={() => onDecide(record, record.suggestedLabel)}>按建议确认</Button><Button size="small" onClick={() => onDecide(record, 'national_benchmark')}>设为标杆</Button><Button size="small" danger onClick={() => onDecide(record, 'excluded')}>排除</Button></Space>
          }
        ]}
      />
    </Card>
    </Space>
  );
}

export function getCompetitorAnalysisFindings(dashboard: CompetitorDashboard | null, rows = dashboard?.comparisons ?? []): string[] {
  if (!dashboard) return [];

  const summary = getCompetitorScopeSummary(rows);
  const riskIntents = getCompetitorRiskIntents(rows);
  const findings = [`竞品提及率 ${dashboard.mentionRate}%`];
  if (summary.averageBrandRank !== null) findings.push(`品牌平均推荐排名第 ${summary.averageBrandRank} 名`);
  if (summary.suppressionRate > 0) findings.push(`当前范围竞品压制风险 ${summary.suppressionRate}%`);
  if (riskIntents.length > 0) findings.push(`${riskIntents.length} 个用户意图需要优先处理`);
  return findings;
}

type CompetitorActionRecord = Pick<CompetitorDashboard['comparisons'][number], 'suppressed' | 'rankGap'> & Partial<Pick<CompetitorDashboard['comparisons'][number], 'promptText' | 'optimizationUnitId' | 'intentId' | 'promptId' | 'runId' | 'platformCode'>>;

export function getCompetitorComparisonActions(record: CompetitorActionRecord, context: WorkflowRouteContext = {}): Array<{ label: string; href: string }> {
  const routeContext: WorkflowRouteContext = {
    ...context,
    question: record.promptText ?? context.question,
    optimizationUnitId: record.optimizationUnitId ?? context.optimizationUnitId,
    intentId: record.intentId ?? context.intentId,
    promptId: record.promptId ?? context.promptId,
    runId: record.runId ?? context.runId,
    platformCode: record.platformCode ?? context.platformCode
  };
  const actions = [
    { label: '创建竞品改进任务', href: workflowStagePath('/tasks', { ...routeContext, action: 'create' }) },
    { label: '生成竞品回应内容', href: workflowStagePath('/content-generation', routeContext) },
    { label: '再次监测', href: workflowStagePath('/monitoring', routeContext) }
  ];

  if (record.suppressed || (typeof record.rankGap === 'number' && record.rankGap > 0)) {
    return [{ label: '生成对比内容', href: workflowStagePath('/content-generation', routeContext) }, ...actions];
  }

  return actions;
}

export function getFilteredCompetitorComparisons(
  rows: CompetitorDashboard['comparisons'],
  scope: AnalysisScopeValue<'suppressed' | 'clear'>
): CompetitorDashboard['comparisons'] {
  const search = scope.search.trim().toLowerCase();
  return rows.filter((row) => {
    const capturedDate = row.capturedAt.slice(0, 10);
    if (scope.from && capturedDate < scope.from) return false;
    if (scope.to && capturedDate > scope.to) return false;
    if (scope.platform !== 'all' && row.platformCode !== scope.platform) return false;
    if (scope.optimizationUnitId && row.optimizationUnitId !== scope.optimizationUnitId) return false;
    if (scope.intentId && row.intentId !== scope.intentId) return false;
    if (scope.status === 'suppressed' && !row.suppressed) return false;
    if (scope.status === 'clear' && row.suppressed) return false;
    return !search || [row.competitorName, row.promptText, row.intentText, row.recommendationReason].some((value) => value?.toLowerCase().includes(search));
  }).sort((left, right) => Number(right.suppressed) - Number(left.suppressed) || Math.abs(right.rankGap ?? 0) - Math.abs(left.rankGap ?? 0));
}

export function getCompetitorScopeSummary(rows: CompetitorDashboard['comparisons']): { sampleCount: number; averageBrandRank: number | null; suppressionRate: number } {
  const samples = getCompetitorRunSamples(rows);
  const ranked = samples.map((sample) => sample.brandRank).filter((value): value is number => value !== null);
  return {
    sampleCount: samples.length,
    averageBrandRank: ranked.length === 0 ? null : roundToOneDecimal(ranked.reduce((sum, value) => sum + value, 0) / ranked.length),
    suppressionRate: samples.length === 0 ? 0 : Math.round((samples.filter((sample) => sample.suppressed).length / samples.length) * 100)
  };
}

export function getCompetitorPlatformMatrix(rows: CompetitorDashboard['comparisons']) {
  const groups = new Map<string, CompetitorDashboard['comparisons']>();
  for (const row of rows) groups.set(row.platformCode, [...(groups.get(row.platformCode) ?? []), row]);
  return [...groups.entries()].map(([platformCode, platformRows]) => {
    const summary = getCompetitorScopeSummary(platformRows);
    return {
      platformCode,
      sampleCount: summary.sampleCount,
      averageBrandRank: summary.averageBrandRank,
      suppressedCount: getCompetitorRunSamples(platformRows).filter((sample) => sample.suppressed).length,
      suppressionRate: summary.suppressionRate
    };
  }).sort((left, right) => right.suppressionRate - left.suppressionRate || left.platformCode.localeCompare(right.platformCode));
}

export function getCompetitorTrend(rows: CompetitorDashboard['comparisons']) {
  const groups = new Map<string, CompetitorDashboard['comparisons']>();
  for (const row of rows) {
    const date = row.capturedAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), row]);
  }
  return [...groups.entries()].map(([date, dateRows]) => ({ date, ...getCompetitorScopeSummary(dateRows) })).sort((left, right) => left.date.localeCompare(right.date));
}

export function getCompetitorRiskIntents(rows: CompetitorDashboard['comparisons']) {
  const groups = new Map<string, { intentId: string; text: string; suppressionCount: number }>();
  for (const row of rows.filter((item) => item.suppressed)) {
    const current = groups.get(row.intentId);
    groups.set(row.intentId, { intentId: row.intentId, text: row.intentText, suppressionCount: (current?.suppressionCount ?? 0) + 1 });
  }
  return [...groups.values()].sort((left, right) => right.suppressionCount - left.suppressionCount);
}

function getCompetitorRunSamples(rows: CompetitorDashboard['comparisons']) {
  const samples = new Map<string, { brandRank: number | null; suppressed: boolean }>();
  for (const row of rows) {
    const current = samples.get(row.runId);
    samples.set(row.runId, { brandRank: current?.brandRank ?? row.brandRank, suppressed: Boolean(current?.suppressed || row.suppressed) });
  }
  return [...samples.values()];
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function CompetitorComparisonActions({ record, context }: { record: CompetitorDashboard['comparisons'][number]; context: WorkflowRouteContext }) {
  const navigate = useNavigate();
  const actions = getCompetitorComparisonActions(record, context);
  const primaryActions = actions.slice(0, 2);
  return (
    <ManagementRowActions
      primaryActions={[
        <Button key={primaryActions[0].label} size="small" onClick={() => navigate(primaryActions[0].href)}>{primaryActions[0].label}</Button>,
        <Button key={primaryActions[1].label} size="small" onClick={() => navigate(primaryActions[1].href)}>{primaryActions[1].label}</Button>
      ]}
      moreAction={actions.length > 2 ? (
        <AccessibleDropdown
          label={`竞品“${record.competitorName}”的更多操作`}
          menu={{
            items: actions.slice(2).map((action, index) => ({ key: String(index), label: action.label })),
            onClick: ({ key }) => {
              const action = actions.slice(2)[Number(key)];
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

function getCompetitorOptimizationUnitOptions(rows: CompetitorDashboard['comparisons']) {
  return [...new Set(rows.map((row) => row.optimizationUnitId).filter(Boolean))]
    .map((value, index) => ({ value, label: `优化单元 ${index + 1}` }));
}

function getCompetitorIntentOptions(rows: CompetitorDashboard['comparisons']) {
  return [...new Map(rows.map((row) => [row.intentId, row.intentText] as const)).entries()]
    .filter(([value]) => Boolean(value))
    .map(([value, label]) => ({ value, label }));
}

type CompetitorDiscoveryFormValues = {
  city?: string;
  campusRadiusKm?: number;
  keywordsText?: string;
  forceRefresh?: boolean;
};

function toCompetitorPayload(values: CompetitorFormValues): CompetitorInput {
  return {
    name: values.name,
    aliases: splitLines(values.aliasesText),
    website: values.website,
    industryTags: splitLines(values.industryTagsText),
    comparisonNote: values.comparisonNote,
    suppressionRule: values.suppressionRule
  };
}

function splitLines(value?: string): string[] {
  return value?.split('\n').map((item) => item.trim()).filter(Boolean) ?? [];
}

export function toDiscoveryPayload(values: CompetitorDiscoveryFormValues): CompetitorDiscoveryRunInput {
  return {
    city: values.city?.trim(),
    campusRadiusKm: values.campusRadiusKm,
    keywords: splitKeywordText(values.keywordsText),
    forceRefresh: values.forceRefresh
  };
}

export function getProviderStatusDescription(run: Pick<CompetitorDiscoveryRun, 'providerStatus' | 'cacheHit' | 'sourceProvider'>): string {
  if (run.cacheHit) {
    return '已显示相同城市、范围和关键词下的最近结果；需要最新数据时可重新发现。';
  }
  if (run.providerStatus === 'configured' && run.sourceProvider === 'amap') {
    return '候选机构来自高德地图，并已过滤自有门店和弱相关机构。';
  }
  if (run.providerStatus === 'fallback') {
    return '地图数据暂时不可用，当前候选仅供人工筛选；恢复连接后可重新发现。';
  }
  if (run.providerStatus === 'rate_limited') {
    return '地图服务配额暂不可用，可稍后勾选“重新从地图拉取”再试。';
  }
  if (run.providerStatus === 'disabled') {
    return '地图发现当前已停用，仍可手动添加和筛选竞品。';
  }
  return '地图数据暂时无法获取，仍可继续手动添加和筛选竞品。';
}

export function splitKeywordText(value?: string): string[] {
  return value?.split(/\n|、|,|，/).map((item) => item.trim()).filter(Boolean) ?? [];
}

const competitorLabelText: Record<CompetitorConfirmationLabel, string> = {
  direct_competitor: '直接竞品',
  indirect_competitor: '间接竞品',
  local_alternative: '本地替代机构',
  national_benchmark: '全国标杆品牌',
  excluded: '排除'
};

const sourceProviderText = {
  amap: '高德地图候选',
  tencent: '腾讯位置服务候选',
  baidu: '百度地图候选',
  manual: '人工录入'
};

const decisionStatusText = {
  pending: '待确认',
  confirmed: '已确认',
  excluded: '已排除'
};

const lifecycleStatusText = {
  candidate: '候选',
  sample_confirmed: '样本确认',
  user_confirmed: '用户确认',
  excluded: '已排除'
};

const candidateFilterOptions: Array<{ value: NonNullable<CompetitorDiscoveryCandidatesQuery['filter']>; label: string }> = [
  { value: 'all', label: '全部候选' },
  { value: 'campus_focus', label: '校区周边重点' },
  { value: 'direct_competitor', label: '建议直接竞品' },
  { value: 'national_benchmark', label: '建议标杆品牌' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'excluded', label: '已排除' }
];

export function getCompetitorLabelColor(label: CompetitorConfirmationLabel): string {
  const colors: Record<CompetitorConfirmationLabel, string> = {
    direct_competitor: 'red',
    indirect_competitor: 'orange',
    local_alternative: 'gold',
    national_benchmark: 'blue',
    excluded: 'default'
  };
  return colors[label];
}
