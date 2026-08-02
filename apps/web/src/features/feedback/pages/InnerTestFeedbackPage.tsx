import { Button, Form, Input, Modal, Select, Space, Statistic, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InnerTestFeedback, InnerTestFeedbackDashboard, InnerTestFeedbackInput, InnerTestFeedbackSeverity, InnerTestFeedbackStatus, InnerTestFeedbackUpdateInput, InnerTestFeedbackType } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { EmptyState, GuidedEmptyState, PageSkeleton, RegionErrorState } from '../../../components/PageState';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import { useBrandContextStore } from '../../../stores/brandContextStore';

type FeedbackUpdateFormValues = InnerTestFeedbackUpdateInput;

export const feedbackTypeLabels: Record<InnerTestFeedback['type'], string> = {
  usability: '不好用',
  bug: '功能异常',
  copy: '文案问题',
  data: '数据问题',
  workflow: '流程问题',
  configuration: '配置问题',
  other: '其他问题'
};

export const feedbackStatusLabels: Record<InnerTestFeedbackStatus, string> = {
  open: '待处理',
  triaged: '已确认',
  in_progress: '处理中',
  resolved: '已解决'
};

const feedbackStatusColors: Record<InnerTestFeedbackStatus, string> = {
  open: 'gold',
  triaged: 'blue',
  in_progress: 'purple',
  resolved: 'green'
};

export const feedbackSeverityLabels: Record<InnerTestFeedbackSeverity, string> = {
  high: '严重',
  medium: '一般',
  low: '轻微'
};

const feedbackSeverityColors: Record<InnerTestFeedbackSeverity, string> = {
  high: 'red',
  medium: 'gold',
  low: 'blue'
};

export type FeedbackFilters = {
  search: string;
  status: InnerTestFeedbackStatus | 'all';
  type: InnerTestFeedbackType | 'all';
  severity: InnerTestFeedbackSeverity | 'all';
  page: string | 'all';
  from?: string;
  to?: string;
};

export function InnerTestFeedbackPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<InnerTestFeedback>();
  const [filters, setFilters] = useState<FeedbackFilters>(defaultFeedbackFilters);
  const [createForm] = Form.useForm<InnerTestFeedbackInput>();
  const [updateForm] = Form.useForm<FeedbackUpdateFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['inner-test-feedback', activeBrandId],
    queryFn: () => apiGet<InnerTestFeedbackDashboard>(`/brands/${activeBrandId}/inner-test-feedback`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const records = dashboard?.records ?? [];
  const filteredRecords = getFilteredFeedbackRecords(records, filters);
  const pageOptions = Array.from(new Set(records.map((record) => record.page))).sort((first, second) => first.localeCompare(second, 'zh-CN'));
  const listState = dashboardQuery.isLoading
    ? 'loading'
    : dashboardQuery.isError || (dashboardQuery.data && !dashboardQuery.data.success)
      ? 'error'
      : records.length === 0
        ? 'empty'
        : 'ready';
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['inner-test-feedback', activeBrandId] });

  const createMutation = useMutation({
    mutationFn: (values: InnerTestFeedbackInput) => apiPost<InnerTestFeedback>(`/brands/${activeBrandId}/inner-test-feedback`, values),
    onSuccess: (response) => {
      if (response.success) {
        setCreateOpen(false);
        createForm.resetFields();
        void invalidate();
        void messageApi.success('内测反馈已记录');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ feedbackId, values }: { feedbackId: string; values: InnerTestFeedbackUpdateInput }) => apiPatch<InnerTestFeedback>(`/brands/${activeBrandId}/inner-test-feedback/${feedbackId}`, values),
    onSuccess: (response) => {
      if (response.success) {
        setEditingFeedback(undefined);
        updateForm.resetFields();
        void invalidate();
        void messageApi.success('反馈状态已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openUpdateModal = (record: InnerTestFeedback) => {
    setEditingFeedback(record);
    updateForm.setFieldsValue({ status: record.status, severity: record.severity, resolutionNote: record.resolutionNote });
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <ManagementListPage<InnerTestFeedback>
        title="内测反馈"
        description="统一记录页面问题、严重程度、处理状态和解决说明，让内测问题具有清晰的处理轨迹。"
        context={<Tag>当前品牌：{activeBrandId}</Tag>}
        primaryAction={records.length > 0 ? <Button type="primary" onClick={() => setCreateOpen(true)}>记录反馈</Button> : undefined}
        summary={<Space size={24} wrap>{feedbackStatuses.map((status) => <Statistic key={status} title={feedbackStatusLabels[status]} value={dashboard?.statusCounts[status] ?? 0} />)}</Space>}
        filters={(
          <UnifiedFilterBar
            value={{ search: filters.search, platform: 'all', status: filters.status, from: filters.from, to: filters.to }}
            onChange={(value) => setFilters((current) => ({ ...current, search: value.search, status: value.status as InnerTestFeedbackStatus | 'all', from: value.from, to: value.to }))}
            onClear={() => setFilters(defaultFeedbackFilters)}
            statusOptions={feedbackStatusOptions}
            searchPlaceholder="搜索问题描述、模块或处理记录"
            resultCount={filteredRecords.length}
            totalCount={records.length}
            showPlatform={false}
            hasAdditionalFilters={filters.type !== 'all' || filters.severity !== 'all' || filters.page !== 'all'}
            extraFilters={(
              <>
                <Select aria-label="反馈类型筛选" value={filters.type} options={[{ value: 'all', label: '全部类型' }, ...feedbackTypeOptions]} onChange={(type) => setFilters((current) => ({ ...current, type }))} />
                <Select aria-label="严重程度筛选" value={filters.severity} options={[{ value: 'all', label: '全部严重程度' }, ...feedbackSeverityOptions]} onChange={(severity) => setFilters((current) => ({ ...current, severity }))} />
                <Select aria-label="页面筛选" value={filters.page} options={[{ value: 'all', label: '全部页面' }, ...pageOptions.map((page) => ({ value: page, label: page }))]} onChange={(page) => setFilters((current) => ({ ...current, page }))} />
              </>
            )}
          />
        )}
        state={listState}
        loadingState={<PageSkeleton rows={4} />}
        errorState={<RegionErrorState description="内测反馈加载失败，请重新加载后继续跟进。" onRetry={() => void dashboardQuery.refetch()} />}
        emptyState={<GuidedEmptyState title="还没有内测反馈" reason="当前品牌尚未记录试用过程中的页面、数据或流程问题。" impact="产品问题缺少统一入口和处理轨迹。" benefit="记录后可按严重程度分级并持续跟进解决状态。" actionLabel="记录第一条反馈" onAction={() => setCreateOpen(true)} />}
        tableTitle="反馈处理记录"
        tableDescription="按反馈类型、页面、严重程度和状态查看问题及最新处理说明。"
        tableAriaLabel="内测反馈处理记录列表"
        tableProps={{
          rowKey: 'id',
          dataSource: filteredRecords,
          pagination: filteredRecords.length > 8 ? { pageSize: 8 } : false,
          locale: { emptyText: <EmptyState title="没有匹配的反馈" description="当前筛选条件下的内测反馈" reason="页面、类型、严重程度、状态或时间范围未匹配已有记录。" nextStep="清空部分筛选后重新查看。" /> },
          columns: [
            { title: '反馈问题', render: (_, record) => <Space direction="vertical" size={2}><Typography.Text strong ellipsis>{record.description}</Typography.Text><Typography.Text type="secondary">{record.module}</Typography.Text></Space> },
            { title: '页面', dataIndex: 'page' },
            { title: '反馈类型', dataIndex: 'type', render: (value) => <Tag>{getFeedbackTypeLabel(value)}</Tag> },
            { title: '严重程度', dataIndex: 'severity', render: (value) => <Tag color={feedbackSeverityColors[value as InnerTestFeedbackSeverity]}>{getFeedbackSeverityLabel(value)}</Tag> },
            { title: '状态', dataIndex: 'status', render: (value) => <Tag color={feedbackStatusColors[value as InnerTestFeedbackStatus]}>{getFeedbackStatusLabel(value)}</Tag> },
            { title: '处理记录', render: (_, record) => <Space direction="vertical" size={2}><Typography.Text>{record.resolutionNote || '等待确认处理方案'}</Typography.Text><Typography.Text type="secondary">更新于 {formatFeedbackDate(record.updatedAt)}</Typography.Text></Space> },
            { title: '操作', render: (_, record) => <ManagementRowActions primaryActions={[<Button key="update" size="small" onClick={() => openUpdateModal(record)}>更新处理记录</Button>]} /> }
          ]
        }}
      />

      <Modal title="记录内测反馈" open={createOpen} okText="保存" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} confirmLoading={createMutation.isPending}>
        <Form form={createForm} layout="vertical" initialValues={{ type: 'usability', severity: 'medium' }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="page" label="页面" rules={[{ required: true, message: '请输入页面' }]}><Input placeholder="例如：写内容、AI 回复监测、发布记录" /></Form.Item>
          <Form.Item name="module" label="模块" rules={[{ required: true, message: '请输入模块' }]}><Input placeholder="例如：内容编辑器、监测问题池、确认抽屉" /></Form.Item>
          <Form.Item name="type" label="问题类型"><Select options={feedbackTypeOptions} /></Form.Item>
          <Form.Item name="severity" label="严重程度"><Select options={feedbackSeverityOptions} /></Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="更新反馈状态" open={Boolean(editingFeedback)} okText="保存" cancelText="取消" onCancel={() => setEditingFeedback(undefined)} onOk={() => updateForm.submit()} confirmLoading={updateMutation.isPending}>
        <Form form={updateForm} layout="vertical" onFinish={(values) => editingFeedback && updateMutation.mutate({ feedbackId: editingFeedback.id, values })}>
          <Form.Item name="status" label="处理状态"><Select options={feedbackStatusOptions} /></Form.Item>
          <Form.Item name="severity" label="严重程度"><Select options={feedbackSeverityOptions} /></Form.Item>
          <Form.Item name="resolutionNote" label="处理说明"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

export function getFeedbackTypeLabel(value?: string): string {
  return feedbackTypeLabels[value as InnerTestFeedback['type']] ?? '其他问题';
}

export function getFeedbackStatusLabel(value?: string): string {
  return feedbackStatusLabels[value as InnerTestFeedbackStatus] ?? '待处理';
}

export function getFeedbackSeverityLabel(value?: string): string {
  return feedbackSeverityLabels[value as InnerTestFeedbackSeverity] ?? '一般';
}

export const defaultFeedbackFilters: FeedbackFilters = { search: '', status: 'all', type: 'all', severity: 'all', page: 'all' };

export function getFilteredFeedbackRecords(records: InnerTestFeedback[], filters: FeedbackFilters): InnerTestFeedback[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const searchableText = `${record.description} ${record.module} ${record.page} ${record.resolutionNote ?? ''}`.toLocaleLowerCase();
    const createdDate = record.createdAt.slice(0, 10);
    return (!search || searchableText.includes(search))
      && (filters.status === 'all' || record.status === filters.status)
      && (filters.type === 'all' || record.type === filters.type)
      && (filters.severity === 'all' || record.severity === filters.severity)
      && (filters.page === 'all' || record.page === filters.page)
      && (!filters.from || createdDate >= filters.from)
      && (!filters.to || createdDate <= filters.to);
  });
}

function formatFeedbackDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

const feedbackStatuses: InnerTestFeedbackStatus[] = ['open', 'triaged', 'in_progress', 'resolved'];
const feedbackTypeOptions = Object.entries(feedbackTypeLabels).map(([value, label]) => ({ value, label }));
const feedbackStatusOptions = Object.entries(feedbackStatusLabels).map(([value, label]) => ({ value, label }));
const feedbackSeverityOptions = Object.entries(feedbackSeverityLabels).map(([value, label]) => ({ value, label }));
