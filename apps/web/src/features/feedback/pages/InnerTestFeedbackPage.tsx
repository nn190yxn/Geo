import { Button, Card, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InnerTestFeedback, InnerTestFeedbackDashboard, InnerTestFeedbackInput, InnerTestFeedbackStatus, InnerTestFeedbackUpdateInput } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
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

export function InnerTestFeedbackPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<InnerTestFeedback>();
  const [createForm] = Form.useForm<InnerTestFeedbackInput>();
  const [updateForm] = Form.useForm<FeedbackUpdateFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['inner-test-feedback', activeBrandId],
    queryFn: () => apiGet<InnerTestFeedbackDashboard>(`/brands/${activeBrandId}/inner-test-feedback`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
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
    updateForm.setFieldsValue({ status: record.status, resolutionNote: record.resolutionNote });
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={dashboardQuery.data} />
      <Card title="内测反馈" extra={<Button type="primary" onClick={() => setCreateOpen(true)}>记录反馈</Button>}>
        <Typography.Paragraph>
          收集内测过程中发现的页面问题、模块问题、流程卡点和配置疑问，便于统一跟进处理状态。
        </Typography.Paragraph>
        <Space size={24} wrap>
          {feedbackStatuses.map((status) => <Statistic key={status} title={feedbackStatusLabels[status]} value={dashboard?.statusCounts[status] ?? 0} />)}
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={dashboardQuery.isLoading}
        dataSource={dashboard?.records ?? []}
        locale={{ emptyText: <EmptyState description="暂无内测反馈。" actionLabel="记录反馈" onAction={() => setCreateOpen(true)} /> }}
        columns={[
          { title: '页面', dataIndex: 'page' },
          { title: '模块', dataIndex: 'module' },
          { title: '问题类型', dataIndex: 'type', render: (value) => <Tag>{getFeedbackTypeLabel(value)}</Tag> },
          { title: '问题描述', dataIndex: 'description', render: (value) => <Typography.Text ellipsis>{value}</Typography.Text> },
          { title: '状态', dataIndex: 'status', render: (value) => <Tag color={feedbackStatusColors[value as InnerTestFeedbackStatus]}>{getFeedbackStatusLabel(value)}</Tag> },
          { title: '处理说明', dataIndex: 'resolutionNote', render: (value) => value || '-' },
          { title: '记录时间', dataIndex: 'createdAt' },
          { title: '操作', render: (_, record) => <Button size="small" onClick={() => openUpdateModal(record)}>更新状态</Button> }
        ]}
      />

      <Modal title="记录内测反馈" open={createOpen} okText="保存" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()} confirmLoading={createMutation.isPending}>
        <Form form={createForm} layout="vertical" initialValues={{ type: 'usability' }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="page" label="页面" rules={[{ required: true, message: '请输入页面' }]}><Input placeholder="例如：写内容、AI 回复监测、发布记录" /></Form.Item>
          <Form.Item name="module" label="模块" rules={[{ required: true, message: '请输入模块' }]}><Input placeholder="例如：内容编辑器、监测问题池、确认抽屉" /></Form.Item>
          <Form.Item name="type" label="问题类型"><Select options={feedbackTypeOptions} /></Form.Item>
          <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请输入问题描述' }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="更新反馈状态" open={Boolean(editingFeedback)} okText="保存" cancelText="取消" onCancel={() => setEditingFeedback(undefined)} onOk={() => updateForm.submit()} confirmLoading={updateMutation.isPending}>
        <Form form={updateForm} layout="vertical" onFinish={(values) => editingFeedback && updateMutation.mutate({ feedbackId: editingFeedback.id, values })}>
          <Form.Item name="status" label="处理状态"><Select options={feedbackStatusOptions} /></Form.Item>
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

const feedbackStatuses: InnerTestFeedbackStatus[] = ['open', 'triaged', 'in_progress', 'resolved'];
const feedbackTypeOptions = Object.entries(feedbackTypeLabels).map(([value, label]) => ({ value, label }));
const feedbackStatusOptions = Object.entries(feedbackStatusLabels).map(([value, label]) => ({ value, label }));
