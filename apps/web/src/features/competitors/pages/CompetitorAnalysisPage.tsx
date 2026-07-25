import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Form, Input, InputNumber, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  CompetitorInput
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';

type CompetitorFormValues = Omit<CompetitorInput, 'aliases' | 'industryTags'> & {
  aliasesText?: string;
  industryTagsText?: string;
};

export function CompetitorAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
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
      <Card
        title="竞品分析"
        extra={(
          <Space>
            <Button onClick={openDiscoveryDrawer}>地图发现竞品</Button>
            <Button type="primary" onClick={openCreateModal}>新增竞品</Button>
          </Space>
        )}
      >
        <Typography.Paragraph>
          维护竞品档案，聚合同监测问题、同平台、同场景下的推荐顺序、压制情况和高风险场景。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Statistic title="竞品数量" value={dashboard?.competitors.length ?? 0} />
          <Statistic title="竞品提及率" value={dashboard?.mentionRate ?? 0} suffix="%" />
          <Statistic title="竞品压制率" value={dashboard?.suppressionRate ?? 0} suffix="%" />
          <Statistic title="平均排名差" value={dashboard?.averageRankGap ?? 0} />
          <Statistic title="高风险意图" value={dashboard?.highRiskIntents.length ?? 0} />
        </Space>
      </Card>

      <Card title="竞品档案" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={dashboard?.competitors ?? []}
          pagination={false}
          columns={[
            { title: '竞品名称', dataIndex: 'name' },
            { title: '别名', render: (_, record) => record.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>) },
            { title: '行业标签', render: (_, record) => record.industryTags.map((tag) => <Tag key={tag}>{tag}</Tag>) },
            { title: '确认标签', render: (_, record) => record.confirmationLabel ? <Tag color={getCompetitorLabelColor(record.confirmationLabel)}>{competitorLabelText[record.confirmationLabel]}</Tag> : '-' },
            { title: '最近校区距离', dataIndex: 'nearestCampusDistanceKm', render: (value) => typeof value === 'number' ? `${value} 公里` : '-' },
            { title: '来源', dataIndex: 'sourceProvider', render: (value) => value ? sourceProviderText[value as keyof typeof sourceProviderText] ?? value : '手动维护' },
            { title: '连续压制阈值', render: (_, record) => record.suppressionRule.consecutiveThreshold },
            { title: '操作', render: (_, record) => <Button size="small" onClick={() => openEditModal(record)}>编辑</Button> }
          ]}
        />
      </Card>

      <Card title="高风险意图" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="intentId"
          dataSource={dashboard?.highRiskIntents ?? []}
          pagination={false}
          columns={[
            { title: '用户场景', dataIndex: 'text' },
            { title: '被压制次数', dataIndex: 'suppressionCount' }
          ]}
        />
      </Card>

      <Card title="竞品对比明细" loading={dashboardQuery.isLoading}>
        <Table
          rowKey={(record) => `${record.runId}-${record.competitorName}`}
          dataSource={dashboard?.comparisons ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '竞品', dataIndex: 'competitorName' },
            { title: '平台', dataIndex: 'platformCode' },
            { title: '用户场景', dataIndex: 'intentText' },
            { title: '品牌排名', dataIndex: 'brandRank', render: (value) => value ?? '未提及' },
            { title: '竞品排名', dataIndex: 'competitorRank', render: (value) => value ?? '未提及' },
            { title: '排名差', dataIndex: 'rankGap', render: (value) => value ?? '-' },
            { title: '压制', dataIndex: 'suppressed', render: (value) => value ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
            { title: '推荐理由', dataIndex: 'recommendationReason' }
          ]}
        />
      </Card>

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
              { title: '状态', dataIndex: 'decisionStatus', render: (value) => decisionStatusText[value as keyof typeof decisionStatusText] ?? value },
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
    return '本次复用了相同城市、半径和关键词下的候选结果。勾选“重新从地图拉取”可以请求最新地图数据。';
  }
  if (run.providerStatus === 'configured' && run.sourceProvider === 'amap') {
    return '本次已连接高德地图服务端 POI，候选机构来自真实地图数据，并已过滤自有门店和弱相关机构。';
  }
  if (run.providerStatus === 'fallback') {
    return '当前使用内测候选源继续完成流程，可配置高德服务端 Key 后重新发现。';
  }
  if (run.providerStatus === 'rate_limited') {
    return '地图服务配额暂不可用，可稍后勾选“重新从地图拉取”再试。';
  }
  if (run.providerStatus === 'disabled') {
    return '地图服务当前已停用，系统会使用内测候选源保留人工筛选流程。';
  }
  return '地图服务请求失败时，系统会保留候选确认流程，方便继续人工筛选。';
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
