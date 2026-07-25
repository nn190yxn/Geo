import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OptimizationTask, OptimizationTaskInput, OptimizationTaskUpdateInput, RetestPlanInput, RetestResultInput, SprintRetestTrendDashboard, TaskBoardDashboard, VisibilitySprint } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getOwnerDisplayName, getPlatformDisplayName } from '../../../utils/displayLabels';
import { buildSprintTrendMetricRows, formatTrendMetricDelta, formatTrendMetricValue, getRetestCompletionRate, getRetestTrendStatusDisplay } from './sprintRetestTrend';

const statusLabels: Record<OptimizationTask['status'], string> = {
  todo: '待处理',
  doing: '处理中',
  review: '待审核',
  retest: '待再次监测',
  done: '已关闭',
  reopened: '已重开'
};

const statusColors: Record<OptimizationTask['status'], string> = {
  todo: 'default',
  doing: 'blue',
  review: 'gold',
  retest: 'purple',
  done: 'green',
  reopened: 'red'
};

export function TaskRetestPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<OptimizationTask>();
  const [retestTask, setRetestTask] = useState<OptimizationTask>();
  const [resultTask, setResultTask] = useState<OptimizationTask>();
  const [taskForm] = Form.useForm<OptimizationTaskInput>();
  const [editForm] = Form.useForm<OptimizationTaskUpdateInput>();
  const [retestForm] = Form.useForm<RetestPlanInput>();
  const [resultForm] = Form.useForm<RetestResultInput>();
  const boardQuery = useQuery({
    queryKey: ['task-board', activeBrandId],
    queryFn: () => apiGet<TaskBoardDashboard>(`/brands/${activeBrandId}/tasks`)
  });
  const board = boardQuery.data?.success ? boardQuery.data.data : null;
  const currentSprintQuery = useQuery({
    queryKey: ['current-sprint', activeBrandId],
    queryFn: () => apiGet<VisibilitySprint>(`/brands/${activeBrandId}/sprints/current`)
  });
  const currentSprint = currentSprintQuery.data?.success ? currentSprintQuery.data.data : null;
  const retestTrendQuery = useQuery({
    queryKey: ['sprint-retest-trend', activeBrandId, currentSprint?.sprintId],
    queryFn: () => apiGet<SprintRetestTrendDashboard>(`/brands/${activeBrandId}/sprints/${currentSprint?.sprintId}/retest-trend`),
    enabled: Boolean(currentSprint?.sprintId)
  });
  const retestTrend = retestTrendQuery.data?.success ? retestTrendQuery.data.data : null;
  const metricRows = currentSprint && retestTrend ? buildSprintTrendMetricRows(retestTrend.baselineMetricSummary, currentSprint.metricSummary) : [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['task-board', activeBrandId] });

  const createMutation = useMutation({
    mutationFn: (values: OptimizationTaskInput) => apiPost<OptimizationTask>(`/brands/${activeBrandId}/tasks`, values),
    onSuccess: (response) => {
      if (response.success) {
        setCreateOpen(false);
        taskForm.resetFields();
        void invalidate();
        void messageApi.success('优化任务已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: OptimizationTaskUpdateInput }) => apiPatch<OptimizationTask>(`/brands/${activeBrandId}/tasks/${taskId}`, values),
    onSuccess: (response) => {
      if (response.success) {
        setEditTask(undefined);
        editForm.resetFields();
        void invalidate();
        void messageApi.success('任务已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const retestMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: RetestPlanInput }) => apiPost<OptimizationTask>(`/brands/${activeBrandId}/tasks/${taskId}/retest`, values),
    onSuccess: (response) => {
      if (response.success) {
        setRetestTask(undefined);
        retestForm.resetFields();
        void invalidate();
        void messageApi.success('再次监测计划已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const resultMutation = useMutation({
    mutationFn: ({ taskId, recordId, values }: { taskId: string; recordId: string; values: RetestResultInput }) => apiPatch<OptimizationTask>(`/brands/${activeBrandId}/tasks/${taskId}/retest/${recordId}`, values),
    onSuccess: (response) => {
      if (response.success) {
        setResultTask(undefined);
        resultForm.resetFields();
        void invalidate();
        void messageApi.success('再次监测结果已保存');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={boardQuery.data} />
      <PageErrorAlert response={currentSprintQuery.data} />
      <PageErrorAlert response={retestTrendQuery.data} />
      <Card title="任务跟进" extra={<Button type="primary" onClick={() => setCreateOpen(true)}>新建任务</Button>}>
        <Typography.Paragraph>
          跟踪每个优化动作由谁负责、做到哪一步、关联哪条内容，以及下一次 AI 回复监测结果。
        </Typography.Paragraph>
        <Space size={24} wrap>
          {Object.entries(statusLabels).map(([status, label]) => (
            <Statistic key={status} title={label} value={board?.statusCounts[status as OptimizationTask['status']] ?? 0} />
          ))}
        </Space>
      </Card>

      <Card title="Sprint 复测趋势" loading={currentSprintQuery.isLoading || retestTrendQuery.isLoading}>
        {currentSprint && retestTrend ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space size={24} wrap>
              <Statistic title="计划复测任务" value={retestTrend.plannedTaskCount} />
              <Statistic title="已完成复测" value={retestTrend.completedRetestCount} />
              <Statistic title="改善任务" value={retestTrend.improvedRetestCount} />
              <Statistic title="完成率" value={getRetestCompletionRate(retestTrend)} suffix="%" />
            </Space>
            <Table
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={metricRows}
              columns={[
                { title: '指标', dataIndex: 'label' },
                { title: '基线', render: (_, record) => formatTrendMetricValue(record.baseline, record.kind) },
                { title: '当前', render: (_, record) => formatTrendMetricValue(record.current, record.kind) },
                { title: '变化', render: (_, record) => <Tag color={record.delta > 0 ? 'green' : record.delta < 0 ? 'red' : 'default'}>{formatTrendMetricDelta(record.delta, record.kind)}</Tag> }
              ]}
            />
            <Table
              rowKey={(record) => record.task.id}
              size="small"
              pagination={false}
              dataSource={retestTrend.items}
              locale={{ emptyText: <EmptyState description="内容发布后会在这里看到复测任务和趋势变化。" /> }}
              columns={[
                { title: '复测任务', render: (_, record) => record.task.title },
                { title: '状态', render: (_, record) => {
                  const display = getRetestTrendStatusDisplay(record.status);
                  return <Tag color={display.color}>{display.label}</Tag>;
                } },
                { title: '提及率变化', render: (_, record) => record.metricDelta ? formatTrendMetricDelta(record.metricDelta.mentionRate, 'rate') : '-' },
                { title: '排序改善', render: (_, record) => record.metricDelta?.rankImproved ? <Tag color="green">已改善</Tag> : '-' },
                { title: '表达准确率变化', render: (_, record) => record.metricDelta ? formatTrendMetricDelta(record.metricDelta.accuracyScore, 'rate') : '-' },
                { title: '结论', dataIndex: 'message' }
              ]}
            />
          </Space>
        ) : (
          <EmptyState description="当前品牌还没有可展示的 Sprint 复测趋势。" />
        )}
      </Card>

      <Table
        rowKey="id"
        loading={boardQuery.isLoading}
        dataSource={board?.tasks ?? []}
        locale={{ emptyText: <EmptyState description="暂无优化任务，请先新建一条任务。" actionLabel="新建任务" onAction={() => setCreateOpen(true)} /> }}
        columns={[
          { title: '任务标题', dataIndex: 'title' },
          { title: '状态', render: (_, record) => <Tag color={statusColors[record.status]}>{statusLabels[record.status]}</Tag> },
          { title: '优先级', dataIndex: 'priority', render: (value) => value || '-' },
          { title: '关联平台', dataIndex: 'relatedPlatformCode', render: (value) => value ? getPlatformDisplayName(value) : '-' },
          { title: '负责人', dataIndex: 'ownerId', render: (value) => getOwnerDisplayName(value) },
          { title: '截止日期', dataIndex: 'dueDate', render: (value) => value || '-' },
          { title: '监测来源', dataIndex: 'sourceRunId', render: (value) => value ? '已关联首轮监测' : '-' },
          { title: '再次监测记录', render: (_, record) => record.retestRecords.length },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => {
                  setEditTask(record);
                  editForm.setFieldsValue(record);
                }}>处理</Button>
                <Button size="small" onClick={() => setRetestTask(record)}>安排再次监测</Button>
                <Button size="small" disabled={record.retestRecords.length === 0} onClick={() => setResultTask(record)}>录入结果</Button>
              </Space>
            )
          }
        ]}
      />

      <Modal title="新建优化任务" open={createOpen} okText="保存" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => taskForm.submit()} confirmLoading={createMutation.isPending}>
        <Form form={taskForm} layout="vertical" initialValues={{ type: 'manual', priority: 'medium' }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}><Input /></Form.Item>
          <Form.Item name="type" label="任务类型"><Select options={taskTypeOptions} /></Form.Item>
          <Form.Item name="priority" label="优先级"><Select options={priorityOptions} /></Form.Item>
          <Form.Item name="sourceRunId" label="原监测记录"><Input placeholder="选择或粘贴监测记录引用" /></Form.Item>
          <Form.Item name="relatedPromptId" label="关联监测问题"><Input placeholder="选择或粘贴监测问题引用" /></Form.Item>
          <Form.Item name="relatedPlatformCode" label="关联平台"><Input placeholder="豆包 / DeepSeek / Kimi" /></Form.Item>
          <Form.Item name="optimizationUnitId" label="关联监测主题"><Input placeholder="选择或粘贴监测主题引用" /></Form.Item>
          <Form.Item name="ownerId" label="负责人"><Input placeholder="内测负责人" /></Form.Item>
          <Form.Item name="dueDate" label="截止日期"><Input placeholder="2026-07-10" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="处理任务" open={Boolean(editTask)} okText="保存" cancelText="取消" onCancel={() => setEditTask(undefined)} onOk={() => editForm.submit()} confirmLoading={updateMutation.isPending}>
        <Form form={editForm} layout="vertical" onFinish={(values) => editTask && updateMutation.mutate({ taskId: editTask.id, values })}>
          <Form.Item name="status" label="任务状态"><Select options={statusOptions} /></Form.Item>
          <Form.Item name="reviewStatus" label="审核状态"><Select allowClear options={[{ value: 'pending', label: '待审核' }, { value: 'approved', label: '已通过' }, { value: 'rejected', label: '已驳回' }]} /></Form.Item>
          <Form.Item name="contentLink" label="内容链接"><Input /></Form.Item>
          <Form.Item name="processingNote" label="处理说明"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="ownerId" label="负责人"><Input /></Form.Item>
          <Form.Item name="dueDate" label="截止日期"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="安排再次监测" open={Boolean(retestTask)} okText="保存" cancelText="取消" onCancel={() => setRetestTask(undefined)} onOk={() => retestForm.submit()} confirmLoading={retestMutation.isPending}>
        <Form form={retestForm} layout="vertical" initialValues={{ sourceRunId: retestTask?.sourceRunId, retestRunId: retestTask?.sourceRunId, targetScore: 80 }} onFinish={(values) => retestTask && retestMutation.mutate({ taskId: retestTask.id, values })}>
          <Form.Item name="sourceRunId" label="原监测记录" rules={[{ required: true, message: '请输入原监测记录引用' }]}><Input /></Form.Item>
          <Form.Item name="retestRunId" label="再次监测记录"><Input placeholder="默认使用原监测记录" /></Form.Item>
          <Form.Item name="plannedAt" label="计划再次监测时间"><Input placeholder="2026-07-10T00:00:00.000Z" /></Form.Item>
          <Form.Item name="targetScore" label="目标分"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="监测说明"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="录入再次监测结果" open={Boolean(resultTask)} okText="保存" cancelText="取消" onCancel={() => setResultTask(undefined)} onOk={() => resultForm.submit()} confirmLoading={resultMutation.isPending}>
        <Form form={resultForm} layout="vertical" initialValues={{ targetScore: resultTask?.retestRecords[0]?.targetScore ?? 80 }} onFinish={(values) => {
          const recordId = resultTask?.retestRecords[0]?.id;
          if (resultTask && recordId) resultMutation.mutate({ taskId: resultTask.id, recordId, values });
        }}>
          <Form.Item name="actualScore" label="实际分" rules={[{ required: true, message: '请输入实际分' }]}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="targetScore" label="目标分"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="notes" label="监测结论"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
const taskTypeOptions = [
  { value: 'manual', label: '手动任务' },
  { value: 'monitoring_issue', label: 'AI 回复监测问题' },
  { value: 'content_strategy', label: '内容策略' },
  { value: 'citation_issue', label: '引用问题' },
  { value: 'evaluation_issue', label: '评价问题' }
];
const priorityOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
];
