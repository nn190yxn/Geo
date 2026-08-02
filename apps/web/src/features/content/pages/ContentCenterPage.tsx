import { Button, Card, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { ContentAsset, ContentAssetInput, ContentAssetPageItem, ContentAssetPublishStatus, ContentAssetReviewStatus, ContentAssetStatus, ContentCenterDashboard, ContentOperationDashboard, ContentStrategy } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { monitoringPath, publishingPath } from '../../../app/routePaths';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { EmptyState, GuidedEmptyState, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getContentTypeDisplay, getPlatformDisplay, getStatusDisplay } from '../../../utils/displayLabels';

type AssetFormValues = Omit<ContentAssetInput, 'targetKeywords'> & {
  targetKeywordsText?: string;
};

const strategyTypeLabels: Record<ContentStrategy['type'], string> = {
  gap: '内容缺口',
  correction: '信息修正',
  enhancement: '关键词增强',
  authority_citation: '权威引用',
  competitor_response: '竞品回应'
};

const priorityLabels: Record<ContentStrategy['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export function ContentCenterPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ContentAsset>();
  const [assetForm] = Form.useForm<AssetFormValues>();
  const [assetFilters, setAssetFilters] = useState<ContentAssetManagementFilters>(defaultContentAssetFilters);
  const dashboardQuery = useQuery({
    queryKey: ['content-center', activeBrandId],
    queryFn: () => apiGet<ContentCenterDashboard>(`/brands/${activeBrandId}/content`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const operationQuery = useQuery({
    queryKey: ['content-operation-dashboard', activeBrandId],
    queryFn: () => apiGet<ContentOperationDashboard>(`/brands/${activeBrandId}/dashboards/content-operation`)
  });
  const operationDashboard = operationQuery.data?.success ? operationQuery.data.data : null;
  const assets = operationDashboard?.assets ?? [];
  const filteredAssets = getFilteredContentAssets(assets, assetFilters);
  const assetFilterOptions = useMemo(() => ({
    types: getUniqueAssetOptions(assets, 'type'),
    platforms: getUniqueAssetOptions(assets, 'platform')
  }), [assets]);
  const assetListState = operationQuery.isLoading
    ? 'loading'
    : operationQuery.data && !operationQuery.data.success
      ? 'error'
      : dashboardQuery.isLoading || (dashboardQuery.data && !dashboardQuery.data.success)
        ? 'partial'
      : assets.length === 0
        ? 'empty'
        : 'ready';
  const dashboardFailed = Boolean(dashboardQuery.data && !dashboardQuery.data.success);
  const saveAssetMutation = useMutation({
    mutationFn: (values: AssetFormValues) => {
      const payload = toAssetPayload(values);
      return editingAsset
        ? apiPatch<ContentAsset>(`/brands/${activeBrandId}/content/assets/${editingAsset.id}`, payload)
        : apiPost<ContentAsset>(`/brands/${activeBrandId}/content/assets`, payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setAssetModalOpen(false);
        setEditingAsset(undefined);
        assetForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['content-center', activeBrandId] });
        void queryClient.invalidateQueries({ queryKey: ['content-operation-dashboard', activeBrandId] });
        void messageApi.success('内容资产已保存');
      }
    }
  });
  const generateStrategiesMutation = useMutation({
    mutationFn: () => apiPost<ContentStrategy[]>(`/brands/${activeBrandId}/content/strategies/generate`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['content-center', activeBrandId] });
        void messageApi.success(`已生成 ${response.data.length} 条内容策略`);
      }
    }
  });

  const openAssetModal = (asset?: ContentAsset) => {
    setEditingAsset(asset);
    assetForm.setFieldsValue(asset ? {
      title: asset.title,
      type: asset.type,
      platform: asset.platform,
      url: asset.url,
      targetKeywordsText: asset.targetKeywords.join('\n'),
      reuseOfAssetId: asset.reuseOfAssetId,
      brandAdaptation: asset.brandAdaptation,
      status: asset.status,
      publishedAt: asset.publishedAt
    } : { status: 'draft' });
    setAssetModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <ManagementListPage<ContentAssetPageItem>
        title="内容资产"
        description="统一管理内容类型、渠道、审核、发布和再次监测状态，并将资产继续交接到优化与发布流程。"
        primaryAction={assets.length > 0 ? <Button type="primary" onClick={() => openAssetModal()}>新建内容资产</Button> : undefined}
        secondaryActions={<Button loading={generateStrategiesMutation.isPending} onClick={() => generateStrategiesMutation.mutate()}>生成内容策略</Button>}
        summary={(
          <Space size={24} wrap>
            <Statistic title="关键词覆盖率" value={dashboard ? dashboard.coverage.keywordCoverageRate : '-'} suffix={dashboard ? '%' : undefined} />
            <Statistic title="未覆盖关键词" value={dashboard ? dashboard.coverage.uncoveredKeywords.length : '-'} />
            <Statistic title="已发布资产" value={assets.filter((asset) => asset.publishStatus === 'published').length} />
            <Statistic title="已安排复测" value={assets.filter((asset) => Boolean(asset.retestPlanId)).length} />
          </Space>
        )}
        filters={(
          <UnifiedFilterBar
            value={{ search: assetFilters.search, platform: 'all', status: assetFilters.status }}
            onChange={(value) => setAssetFilters((current) => ({ ...current, search: value.search, status: value.status as ContentAssetStatus | 'all' }))}
            onClear={() => setAssetFilters(defaultContentAssetFilters)}
            statusOptions={contentAssetStatusOptions}
            searchPlaceholder="搜索标题、关键词、来源或用户意图"
            resultCount={filteredAssets.length}
            totalCount={assets.length}
            showDateRange={false}
            showPlatform={false}
            hasAdditionalFilters={hasAdditionalContentAssetFilters(assetFilters)}
            extraFilters={(
              <>
                <Select aria-label="内容类型筛选" value={assetFilters.type} options={[{ value: 'all', label: '全部类型' }, ...assetFilterOptions.types]} onChange={(type) => setAssetFilters((current) => ({ ...current, type }))} />
                <Select aria-label="发布平台筛选" value={assetFilters.platform} options={[{ value: 'all', label: '全部平台' }, ...assetFilterOptions.platforms]} onChange={(platform) => setAssetFilters((current) => ({ ...current, platform }))} />
                <Select aria-label="审核状态筛选" value={assetFilters.reviewStatus} options={contentAssetReviewFilterOptions} onChange={(reviewStatus) => setAssetFilters((current) => ({ ...current, reviewStatus }))} />
                <Select aria-label="发布状态筛选" value={assetFilters.publishStatus} options={contentAssetPublishFilterOptions} onChange={(publishStatus) => setAssetFilters((current) => ({ ...current, publishStatus }))} />
                <Select aria-label="复测状态筛选" value={assetFilters.retestStatus} options={contentAssetRetestFilterOptions} onChange={(retestStatus) => setAssetFilters((current) => ({ ...current, retestStatus }))} />
              </>
            )}
          />
        )}
        state={assetListState}
        loadingState={null}
        partialState={(
          <PartialDataNotice
            message={dashboardFailed ? '内容策略数据暂时缺失' : '内容策略数据仍在加载'}
            description="内容资产和当前筛选已保留，策略数据就绪后会补齐覆盖率与建议。"
            action={dashboardFailed ? <Button onClick={() => void dashboardQuery.refetch()}>重新加载策略数据</Button> : undefined}
          />
        )}
        errorState={<RegionErrorState description="内容资产聚合状态加载失败，请重新加载后继续管理。" onRetry={() => void operationQuery.refetch()} />}
        emptyState={<GuidedEmptyState title="还没有内容资产" reason="当前品牌尚未沉淀可编辑、发布和复测的内容。" impact="内容优化、渠道发布和再次监测缺少交接对象。" benefit="创建后可统一管理内容状态并进入完整运营闭环。" actionLabel="创建第一条内容资产" onAction={() => openAssetModal()} />}
        tableTitle="资产列表"
        tableDescription="每条资产保留继续编辑、发布准备和再次监测三条连续动作。"
        tableAriaLabel="内容资产管理列表"
        tableProps={{
          rowKey: 'id',
          dataSource: filteredAssets,
          pagination: filteredAssets.length > 8 ? { pageSize: 8 } : false,
          locale: { emptyText: <EmptyState title="没有匹配的内容资产" description="当前筛选条件下的内容资产" reason="类型、平台或状态组合未匹配现有记录。" nextStep="清空部分筛选后重新查看。" /> },
          columns: [
            { title: '内容资产', render: (_, record) => <Space direction="vertical" size={2}><Typography.Text strong>{record.title}</Typography.Text><Typography.Text type="secondary">{record.userIntent || record.brandAdaptation || '待补充用户意图'}</Typography.Text></Space> },
            { title: '类型', dataIndex: 'type', render: (value) => getContentTypeDisplay(value) },
            { title: '平台', dataIndex: 'platform', render: (value) => getPlatformDisplay(value) },
            { title: '审核状态', dataIndex: 'reviewStatus', render: (value) => <Tag color={contentAssetReviewColors[value as ContentAssetReviewStatus]}>{contentAssetReviewLabels[value as ContentAssetReviewStatus]}</Tag> },
            { title: '发布状态', dataIndex: 'publishStatus', render: (value) => <Tag color={contentAssetPublishColors[value as ContentAssetPublishStatus]}>{contentAssetPublishLabels[value as ContentAssetPublishStatus]}</Tag> },
            { title: '再次监测', render: (_, record) => <Tag color={record.retestPlanId ? 'green' : 'default'}>{record.retestPlanId ? '已安排' : '待安排'}</Tag> },
            { title: '发布统计', render: (_, record) => `${record.publishingStats.publishedRecords}/${record.publishingStats.totalRecords} 已发布` },
            {
              title: '操作',
              render: (_, record) => (
                <ManagementRowActions
                  primaryActions={[
                    <Button key="edit" size="small" onClick={() => openAssetModal(record)}>继续编辑</Button>,
                    <Button key="publish" size="small" onClick={() => navigate(publishingPath({ tab: 'records' }))}>发布准备</Button>
                  ]}
                  moreAction={<Button size="small" onClick={() => navigate(monitoringPath({ question: record.targetKeywords[0] }, 'test-question-candidate-card'))}>再次监测</Button>}
                />
              )
            }
          ]
        }}
      />

      {dashboard ? <Card title="策略建议">
        <Table
          rowKey={(record) => `${record.type}-${record.intentId}-${record.targetPlatform}`}
          dataSource={dashboard?.suggestions ?? []}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '策略类型', render: (_, record) => <Tag>{strategyTypeLabels[record.type]}</Tag> },
            { title: '建议标题', dataIndex: 'suggestedTitle' },
            { title: '目标平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
            { title: '目标关键词', render: (_, record) => record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) },
            { title: '优先级', render: (_, record) => <Tag color={record.priority === 'high' ? 'red' : record.priority === 'medium' ? 'orange' : undefined}>{priorityLabels[record.priority]}</Tag> },
            { title: '生成原因', dataIndex: 'reason' }
          ]}
        />
      </Card> : null}

      {dashboard ? <Card title="内容策略列表">
        <Table
          rowKey="id"
          dataSource={dashboard?.strategies ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '策略类型', render: (_, record) => <Tag>{strategyTypeLabels[record.type]}</Tag> },
            { title: '建议标题', dataIndex: 'suggestedTitle' },
            { title: '目标平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
            { title: '目标关键词', render: (_, record) => record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) },
            { title: '优先级', render: (_, record) => <Tag color={record.priority === 'high' ? 'red' : record.priority === 'medium' ? 'orange' : undefined}>{priorityLabels[record.priority]}</Tag> },
            { title: '状态', dataIndex: 'status', render: (value) => getStatusDisplay(value) }
          ]}
        />
      </Card> : null}

      <Modal
        title={editingAsset ? '编辑内容资产' : '新建内容资产'}
        open={assetModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveAssetMutation.isPending}
        onCancel={() => setAssetModalOpen(false)}
        onOk={() => assetForm.submit()}
      >
        <Form form={assetForm} layout="vertical" onFinish={(values) => saveAssetMutation.mutate(values)}>
          <Form.Item name="title" label="内容标题" rules={[{ required: true, message: '请输入内容标题' }]}><Input /></Form.Item>
          <Form.Item name="type" label="内容类型" rules={[{ required: true, message: '请输入内容类型' }]}><Input placeholder="官网页面 / 案例文章 / 社交平台图文" /></Form.Item>
          <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: '请输入发布平台' }]}><Input placeholder="官网 / 公众号 / 媒体平台" /></Form.Item>
          <Form.Item name="url" label="内容链接" rules={[{ required: true, message: '请输入内容链接' }]}><Input /></Form.Item>
          <Form.Item name="targetKeywordsText" label="目标关键词"><Input.TextArea rows={3} placeholder="一行一个关键词" /></Form.Item>
          <Form.Item name="brandAdaptation" label="品牌适配说明"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="status" label="内容状态"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'archived', label: '归档' }]} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function toAssetPayload(values: AssetFormValues): ContentAssetInput {
  return {
    ...values,
    targetKeywords: values.targetKeywordsText?.split('\n').map((item) => item.trim()).filter(Boolean) ?? []
  };
}

export type ContentAssetManagementFilters = {
  search: string;
  type: string;
  platform: string;
  status: ContentAssetStatus | 'all';
  reviewStatus: ContentAssetReviewStatus | 'all';
  publishStatus: ContentAssetPublishStatus | 'all';
  retestStatus: 'all' | 'planned' | 'unplanned';
};

const defaultContentAssetFilters: ContentAssetManagementFilters = {
  search: '',
  type: 'all',
  platform: 'all',
  status: 'all',
  reviewStatus: 'all',
  publishStatus: 'all',
  retestStatus: 'all'
};

const contentAssetStatusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' }
] as const;

const contentAssetReviewLabels: Record<ContentAssetReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  needs_revision: '需修改'
};

const contentAssetReviewColors: Record<ContentAssetReviewStatus, string> = {
  pending: 'orange',
  approved: 'green',
  needs_revision: 'red'
};

const contentAssetPublishLabels: Record<ContentAssetPublishStatus, string> = {
  not_started: '未开始',
  draft: '发布草稿',
  pending: '待发布',
  published: '已发布',
  failed: '发布失败'
};

const contentAssetPublishColors: Record<ContentAssetPublishStatus, string> = {
  not_started: 'default',
  draft: 'blue',
  pending: 'orange',
  published: 'green',
  failed: 'red'
};

const contentAssetReviewFilterOptions = [
  { value: 'all', label: '全部审核状态' },
  ...Object.entries(contentAssetReviewLabels).map(([value, label]) => ({ value, label }))
];

const contentAssetPublishFilterOptions = [
  { value: 'all', label: '全部发布状态' },
  ...Object.entries(contentAssetPublishLabels).map(([value, label]) => ({ value, label }))
];

const contentAssetRetestFilterOptions = [
  { value: 'all', label: '全部复测状态' },
  { value: 'planned', label: '已安排复测' },
  { value: 'unplanned', label: '待安排复测' }
];

function getUniqueAssetOptions(assets: ContentAssetPageItem[], field: 'type' | 'platform') {
  return [...new Set(assets.map((asset) => asset[field]).filter(Boolean))]
    .map((value) => ({ value, label: field === 'type' ? getContentTypeDisplay(value) : getPlatformDisplay(value) }));
}

export function hasAdditionalContentAssetFilters(filters: ContentAssetManagementFilters): boolean {
  return filters.type !== 'all'
    || filters.platform !== 'all'
    || filters.reviewStatus !== 'all'
    || filters.publishStatus !== 'all'
    || filters.retestStatus !== 'all';
}

export function getFilteredContentAssets(assets: ContentAssetPageItem[], filters: ContentAssetManagementFilters): ContentAssetPageItem[] {
  const search = filters.search.trim().toLocaleLowerCase();

  return assets.filter((asset) => {
    const searchableValues = [
      asset.title,
      asset.type,
      asset.platform,
      asset.userIntent ?? '',
      asset.brandAdaptation ?? '',
      ...asset.targetKeywords,
      ...asset.sourceReferences.map((source) => source.title)
    ];
    const matchesSearch = search.length === 0 || searchableValues.some((value) => value.toLocaleLowerCase().includes(search));
    const matchesType = filters.type === 'all' || asset.type === filters.type;
    const matchesPlatform = filters.platform === 'all' || asset.platform === filters.platform;
    const matchesStatus = filters.status === 'all' || asset.status === filters.status;
    const matchesReview = filters.reviewStatus === 'all' || asset.reviewStatus === filters.reviewStatus;
    const matchesPublish = filters.publishStatus === 'all' || asset.publishStatus === filters.publishStatus;
    const matchesRetest = filters.retestStatus === 'all'
      || (filters.retestStatus === 'planned' ? Boolean(asset.retestPlanId) : !asset.retestPlanId);
    return matchesSearch && matchesType && matchesPlatform && matchesStatus && matchesReview && matchesPublish && matchesRetest;
  });
}
