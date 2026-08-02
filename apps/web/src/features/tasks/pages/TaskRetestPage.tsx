import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { OptimizationTask, OptimizationTaskInput, OptimizationTaskUpdateInput, PublishingRecord, RetestPlanInput, RetestRecord, RetestResultInput, SprintRetestTrendDashboard, SprintRetestTrendItem, TaskBoardDashboard, VisibilitySprint } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { mergeUnifiedFilterQuery, readUnifiedFilterQuery, type UnifiedFilterValue } from '../../../app/filterQuery';
import { readWorkflowRouteContext, workflowStagePath, type WorkflowRouteContext } from '../../../app/routePaths';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { MetricSummaryGrid } from '../../../components/MetricSummaryGrid';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import { getQueryGroupWorkspaceState, type QueryWorkspaceResource, type WorkspaceViewState } from '../../../components/WorkspaceState';
import { getOwnerDisplayName } from '../../../utils/displayLabels';
import { buildSprintTrendMetricRows, formatTrendMetricDelta, formatTrendMetricValue, getRetestCompletionRate, getRetestTrendStatusDisplay } from './sprintRetestTrend';

const statusLabels: Record<OptimizationTask['status'], string> = {
  todo: '待处理',
  doing: '处理中',
  review: '待审核',
  retest: '待再次监测',
  done: '已关闭',
  reopened: '已重开'
};

export type RetestActionStatus = 'pending_action' | 'pending_retest' | 'improved' | 'follow_up';

export type TaskRetestOperationRow = {
  task: OptimizationTask;
  actionStatus: RetestActionStatus;
  publishingRecord?: PublishingRecord;
  latestRetestRecord?: RetestRecord;
  trendItem?: SprintRetestTrendItem;
  nextStep: string;
};

export const retestActionStatusLabels: Record<RetestActionStatus, string> = {
  pending_action: '待处理',
  pending_retest: '待复测',
  improved: '已改善',
  follow_up: '继续优化'
};

const retestActionStatusColors: Record<RetestActionStatus, string> = {
  pending_action: 'gold',
  pending_retest: 'purple',
  improved: 'green',
  follow_up: 'red'
};

const retestActionStatusOptions = Object.entries(retestActionStatusLabels).map(([value, label]) => ({ value: value as RetestActionStatus, label }));

export function readTaskRetestFilters(search: string): UnifiedFilterValue<RetestActionStatus> {
  return readUnifiedFilterQuery(search, { statuses: Object.keys(retestActionStatusLabels) as RetestActionStatus[] });
}

export function getTaskRetestFilterSearch(currentSearch: string, filters: UnifiedFilterValue<RetestActionStatus>): string {
  return mergeUnifiedFilterQuery(currentSearch, filters);
}

export function getTaskRetestOperationRows(tasks: OptimizationTask[], trendItems: SprintRetestTrendItem[] = []): TaskRetestOperationRow[] {
  const trendByTaskId = new Map(trendItems.map((item) => [item.task.id, item]));

  return tasks.map((task) => {
    const trendItem = trendByTaskId.get(task.id);
    const latestRetestRecord = trendItem?.latestRetestRecord ?? getLatestRetestRecord(task.retestRecords);
    const actionStatus = getRetestActionStatus(task, latestRetestRecord, trendItem);
    return {
      task,
      actionStatus,
      publishingRecord: trendItem?.publishingRecord,
      latestRetestRecord,
      trendItem,
      nextStep: getTaskRetestNextStep(task, actionStatus, latestRetestRecord)
    };
  });
}

export function getFilteredTaskRetestRows(rows: TaskRetestOperationRow[], filters: UnifiedFilterValue<RetestActionStatus>): TaskRetestOperationRow[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (filters.status !== 'all' && row.actionStatus !== filters.status) return false;
    if (!query) return true;
    return [
      row.task.title,
      row.task.processingNote,
      row.task.contentLink,
      row.publishingRecord?.title,
      row.publishingRecord?.accountName,
      row.publishingRecord?.publishedUrl,
      row.nextStep
    ].some((value) => value?.toLocaleLowerCase().includes(query));
  });
}

export function getRetestActionStatus(task: OptimizationTask, record?: RetestRecord, trendItem?: SprintRetestTrendItem): RetestActionStatus {
  if (trendItem?.status === 'improved' || record?.improved === true || record?.passed === true) return 'improved';
  if (task.status === 'reopened' || trendItem?.status === 'needs_follow_up' || (Boolean(record?.completedAt) && (record?.improved === false || record?.passed === false))) return 'follow_up';
  if (task.status === 'retest' || trendItem?.status === 'planned' || (record && !record.completedAt)) return 'pending_retest';
  return 'pending_action';
}

export function getTaskRetestNextStep(task: OptimizationTask, status: RetestActionStatus, record?: RetestRecord): string {
  if (status === 'improved') return '确认改善结果并关闭任务';
  if (status === 'follow_up') return record?.nextSuggestion || '继续优化后安排下一轮监测';
  if (status === 'pending_retest') return task.relatedPromptId ? '执行同题再次监测并录入结果' : '补充原监测问题后执行再次监测';
  if (task.status === 'review') return '完成审核并安排再次监测';
  return '完成优化处理并安排再次监测';
}

export function getRetestActionStatusDescription(status: RetestActionStatus): string {
  if (status === 'pending_action') return '完成当前优化动作';
  if (status === 'pending_retest') return '按原问题执行复测';
  if (status === 'improved') return '已有改善证据';
  return '需要进入下一轮优化';
}

export function getTaskRetestMonitoringPath(task: OptimizationTask, context: WorkflowRouteContext): string {
  const path = workflowStagePath('/monitoring', {
    ...context,
    taskId: task.id,
    optimizationUnitId: task.optimizationUnitId ?? context.optimizationUnitId,
    promptId: task.relatedPromptId ?? context.promptId,
    runId: task.sourceRunId ?? context.runId,
    platformCode: task.relatedPlatformCode ?? context.platformCode,
    mode: 'retest'
  });
  return `${path}#monitoring-runs-card`;
}

export function getTaskRetestPageState(loading: boolean, failed: boolean, totalCount: number): WorkspaceViewState {
  if (loading) return 'loading';
  if (failed) return 'error';
  return totalCount === 0 ? 'empty' : 'ready';
}

export function getRetestMetricComparison(row: TaskRetestOperationRow): string[] {
  const before = row.trendItem?.beforeMetrics ?? row.latestRetestRecord?.beforeMetrics;
  const after = row.trendItem?.afterMetrics ?? row.latestRetestRecord?.afterMetrics;
  if (!before || !after) return [];
  return [
    `提及率 ${formatTrendMetricValue(before.mentionRate, 'rate')} → ${formatTrendMetricValue(after.mentionRate, 'rate')}`,
    `品牌排名 ${before.brandRank ?? '未进入排名'} → ${after.brandRank ?? '未进入排名'}`,
    `表达准确率 ${formatTrendMetricValue(before.accuracyScore, 'rate')} → ${formatTrendMetricValue(after.accuracyScore, 'rate')}`
  ];
}

function getLatestRetestRecord(records: RetestRecord[]): RetestRecord | undefined {
  return [...records].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function getTaskRetestDateDisplay(value?: string): string {
  if (!value) return '待安排';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

export function TaskRetestPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const routeContext = readWorkflowRouteContext(location.search);
  const filters = readTaskRetestFilters(location.search);
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
  const supplementalResources: QueryWorkspaceResource[] = [
    { isLoading: currentSprintQuery.isLoading, response: currentSprintQuery.data }
  ];
  if (currentSprint?.sprintId) supplementalResources.push({ isLoading: retestTrendQuery.isLoading, response: retestTrendQuery.data });
  const pageState = boardQuery.data?.success
    ? getQueryGroupWorkspaceState([
      { isLoading: boardQuery.isLoading, response: boardQuery.data },
      ...supplementalResources
    ], (boardQuery.data.data.tasks.length ?? 0) > 0)
    : getQueryGroupWorkspaceState([{ isLoading: boardQuery.isLoading, response: boardQuery.data }], false);
  const retryPageQueries = () => Promise.all([
    boardQuery.refetch(),
    currentSprintQuery.refetch(),
    ...(currentSprint?.sprintId ? [retestTrendQuery.refetch()] : [])
  ]);
  const metricRows = currentSprint && retestTrend ? buildSprintTrendMetricRows(retestTrend.baselineMetricSummary, currentSprint.metricSummary) : [];
  const taskRows = getTaskRetestOperationRows(board?.tasks ?? [], retestTrend?.items ?? []);
  const filteredTaskRows = getFilteredTaskRetestRows(taskRows, filters);
  const actionStatusCounts = Object.keys(retestActionStatusLabels).reduce<Record<RetestActionStatus, number>>((counts, status) => {
    counts[status as RetestActionStatus] = taskRows.filter((row) => row.actionStatus === status).length;
    return counts;
  }, { pending_action: 0, pending_retest: 0, improved: 0, follow_up: 0 });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['task-board', activeBrandId] });
  const updateFilters = (value: UnifiedFilterValue<RetestActionStatus>) => {
    navigate({ pathname: location.pathname, search: getTaskRetestFilterSearch(location.search, value), hash: location.hash }, { replace: true });
  };

  useEffect(() => {
    if (routeContext.action !== 'create') return;
    taskForm.setFieldsValue({
      title: '发布后再次监测',
      type: 'monitoring_issue',
      sourceRunId: routeContext.runId,
      relatedPromptId: routeContext.promptId,
      relatedPlatformCode: routeContext.platformCode,
      priority: 'medium'
    });
    setCreateOpen(true);
  }, [routeContext.action, routeContext.platformCode, routeContext.promptId, routeContext.runId, taskForm]);

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
      <ManagementListPage<TaskRetestOperationRow>
        title="再次监测"
        description="按当前行动状态跟进发布后的同题监测，比较优化前后指标并确定下一步。"
        context={routeContext.publishingRecordId ? <Typography.Text type="secondary">已承接发布记录，可创建并安排对应的再次监测任务。</Typography.Text> : undefined}
        primaryAction={taskRows.length > 0 ? <Button type="primary" onClick={() => setCreateOpen(true)}>新建任务</Button> : undefined}
        summary={(
          <MetricSummaryGrid
            ariaLabel="再次监测行动状态"
            loading={boardQuery.isLoading}
            items={Object.entries(retestActionStatusLabels).map(([status, label]) => ({
              key: status,
              label,
              value: actionStatusCounts[status as RetestActionStatus],
              description: getRetestActionStatusDescription(status as RetestActionStatus)
            }))}
          />
        )}
        filters={(
          <UnifiedFilterBar
            value={filters}
            onChange={updateFilters}
            statusOptions={retestActionStatusOptions}
            searchPlaceholder="搜索原问题、发布记录、账号或下一步"
            resultCount={filteredTaskRows.length}
            totalCount={taskRows.length}
            showDateRange={false}
            showPlatform={false}
          />
        )}
        state={pageState}
        loadingState={null}
        partialState={(
          <PartialDataNotice
            message="复测趋势数据暂时缺失"
            description="任务列表仍可继续处理；重新加载可补齐 Sprint 指标和发布前后趋势。"
            action={<Button onClick={() => void retryPageQueries()}>重新加载缺失数据</Button>}
          />
        )}
        errorState={<RegionErrorState description="再次监测任务加载失败，请重新加载后继续处理。" onRetry={() => void retryPageQueries()} />}
        emptyState={<EmptyState title="还没有再次监测任务" description="发布内容后用于验证 AI 推荐表现的行动任务" reason="再次监测会关联原问题、发布记录和优化前后指标。" nextStep="创建第一条任务并安排同题监测。" actionLabel="新建任务" onAction={() => setCreateOpen(true)} />}
        tableTitle="行动任务"
        tableDescription="列表按待处理、待复测、已改善和继续优化组织，每行给出当前下一步。"
        tableAriaLabel="再次监测行动任务列表"
        tableProps={{
          rowKey: (row) => row.task.id,
          dataSource: filteredTaskRows,
          pagination: filteredTaskRows.length > 8 ? { pageSize: 8 } : false,
          locale: { emptyText: <EmptyState title="没有匹配的再次监测任务" description="当前筛选范围内的行动任务" reason="搜索词或行动状态未匹配现有任务。" nextStep="清空筛选后重新查看。" /> },
          columns: [
            {
              title: '原问题',
              render: (_, row) => (
                <Space direction="vertical" size={2}>
                  <Typography.Text strong>{row.task.title}</Typography.Text>
                  <Typography.Text type="secondary">{row.task.relatedPromptId ? '已关联原监测问题' : '待关联原监测问题'}</Typography.Text>
                </Space>
              )
            },
            {
              title: '来源发布记录',
              render: (_, row) => row.publishingRecord ? (
                <Space direction="vertical" size={2}>
                  <Typography.Text>{row.publishingRecord.title}</Typography.Text>
                  {row.publishingRecord.publishedUrl
                    ? <Typography.Link href={row.publishingRecord.publishedUrl} target="_blank" rel="noreferrer">查看发布内容</Typography.Link>
                    : <Typography.Text type="secondary">待补充真实发布链接</Typography.Text>}
                </Space>
              ) : <Typography.Text type="secondary">待关联发布记录</Typography.Text>
            },
            {
              title: '负责人 / 计划时间',
              render: (_, row) => (
                <Space direction="vertical" size={2}>
                  <Typography.Text>{getOwnerDisplayName(row.task.ownerId)}</Typography.Text>
                  <Typography.Text type="secondary">{getTaskRetestDateDisplay(row.latestRetestRecord?.plannedAt ?? row.task.retestPlanAt ?? row.task.dueDate)}</Typography.Text>
                </Space>
              )
            },
            {
              title: '前后指标',
              render: (_, row) => {
                const comparisons = getRetestMetricComparison(row);
                return comparisons.length > 0 ? (
                  <Space direction="vertical" size={2}>{comparisons.map((item) => <Typography.Text key={item}>{item}</Typography.Text>)}</Space>
                ) : <Typography.Text type="secondary">等待再次监测结果</Typography.Text>;
              }
            },
            {
              title: '状态与下一步',
              render: (_, row) => (
                <Space direction="vertical" size={2}>
                  <Tag color={retestActionStatusColors[row.actionStatus]}>{retestActionStatusLabels[row.actionStatus]}</Tag>
                  <Typography.Text type="secondary">{row.nextStep}</Typography.Text>
                </Space>
              )
            },
            {
              title: '操作',
              render: (_, row) => {
                const usesScheduleAction = row.actionStatus === 'pending_action' || row.actionStatus === 'follow_up';
                const canExecute = Boolean(row.task.relatedPromptId);
                return (
                  <ManagementRowActions
                    primaryActions={[
                      <Button key="process" size="small" onClick={() => {
                        setEditTask(row.task);
                        editForm.setFieldsValue(row.task);
                      }}>处理</Button>,
                      usesScheduleAction
                        ? <Button key="schedule" size="small" onClick={() => setRetestTask(row.task)}>{row.actionStatus === 'follow_up' ? '安排下一轮' : '安排再次监测'}</Button>
                        : <Button key="execute" size="small" disabled={!canExecute} onClick={() => navigate(getTaskRetestMonitoringPath(row.task, routeContext))}>{row.actionStatus === 'improved' ? '查看同题监测' : '执行再次监测'}</Button>
                    ]}
                    moreAction={(
                      <AccessibleDropdown
                        label={`任务“${row.task.title}”的更多操作`}
                        trigger={['click']}
                        menu={{
                          items: [
                            ...(usesScheduleAction ? [{ key: 'execute', label: '执行再次监测', disabled: !canExecute }] : [{ key: 'schedule', label: '安排再次监测' }]),
                            { key: 'result', label: '录入再次监测结果', disabled: row.task.retestRecords.length === 0 }
                          ],
                          onClick: ({ key }) => {
                            if (key === 'schedule') setRetestTask(row.task);
                            if (key === 'execute') navigate(getTaskRetestMonitoringPath(row.task, routeContext));
                            if (key === 'result') setResultTask(row.task);
                          }
                        }}
                      >
                        <Button size="small">更多</Button>
                      </AccessibleDropdown>
                    )}
                  />
                );
              }
            }
          ]
        }}
      />

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

      <Modal title="新建优化任务" open={createOpen} okText="保存" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => taskForm.submit()} confirmLoading={createMutation.isPending}>
        <Form form={taskForm} layout="vertical" initialValues={{ type: 'manual', priority: 'medium' }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}><Input /></Form.Item>
          <Form.Item name="type" label="任务类型"><Select options={taskTypeOptions} /></Form.Item>
          <Form.Item name="priority" label="优先级"><Select options={priorityOptions} /></Form.Item>
          <Form.Item name="sourceRunId" label="原监测记录"><Input placeholder="选择或粘贴监测记录引用" /></Form.Item>
          <Form.Item name="relatedPromptId" label="关联监测问题"><Input placeholder="选择或粘贴监测问题引用" /></Form.Item>
          <Form.Item name="relatedPlatformCode" label="关联平台"><Input placeholder="豆包 / DeepSeek / Kimi" /></Form.Item>
          <Form.Item name="optimizationUnitId" label="关联优化单元"><Input placeholder="选择或粘贴优化单元引用" /></Form.Item>
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
          <Form.Item name="plannedAt" label="计划再次监测时间"><Input placeholder="例如：2026-07-10 09:00" /></Form.Item>
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
