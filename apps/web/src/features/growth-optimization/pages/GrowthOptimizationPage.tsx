import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ContentGenerationWorkspace,
  GrowthOptimizationContentTaskInput,
  GrowthOptimizationPlan,
  GrowthOptimizationPlanConfirmInput,
  GrowthOptimizationPlanConfirmationResult,
  GrowthOptimizationPlanStatus,
  GrowthOptimizationReasonType,
  GrowthOptimizationWorkspace,
  OptimizationTask,
  OptimizationTaskStatus,
  OptimizationTaskUpdateInput,
  RetestPlanInput,
  SprintContentTaskDashboard,
  StandardAnswerAlignmentDashboard,
  VisibilitySprint
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getContentTypeDisplay, getOwnerDisplayName, getPlatformDisplay } from '../../../utils/displayLabels';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { buildSprintDiagnosisRows } from './growthSprintDiagnostics';

type PlanFormValues = GrowthOptimizationPlanConfirmInput & {
  publishingPlatformsText?: string;
};

const planStatusLabels: Record<GrowthOptimizationPlanStatus, string> = {
  draft: '待确认',
  confirmed: '已确认',
  in_progress: '处理中',
  ready_for_retest: '待再次监测',
  completed: '已完成'
};

const planStatusColors: Record<GrowthOptimizationPlanStatus, string> = {
  draft: 'gold',
  confirmed: 'blue',
  in_progress: 'purple',
  ready_for_retest: 'cyan',
  completed: 'green'
};

const taskStatusLabels: Record<OptimizationTaskStatus, string> = {
  todo: '待处理',
  doing: '处理中',
  review: '待审核',
  retest: '待再次监测',
  done: '已完成',
  reopened: '已重开'
};

const reasonLabels: Record<GrowthOptimizationReasonType, string> = {
  brand_not_mentioned: '没有出现',
  ranking_low: '排名偏低',
  value_prop_missing: '卖点缺失',
  competitor_stronger: '竞品更强',
  risk_expression: '风险表达',
  content_gap: '内容缺口',
  citation_gap: '引用缺口'
};

const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低'
} as const;

export function GrowthOptimizationPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [confirmingPlan, setConfirmingPlan] = useState<GrowthOptimizationPlan>();
  const [contentPlan, setContentPlan] = useState<GrowthOptimizationPlan>();
  const [retestTask, setRetestTask] = useState<OptimizationTask>();
  const [confirmForm] = Form.useForm<PlanFormValues>();
  const [contentForm] = Form.useForm<{ recommendationIndexes?: number[] }>();
  const [retestForm] = Form.useForm<RetestPlanInput>();

  const workspaceQuery = useQuery({
    queryKey: ['growth-optimization', activeBrandId],
    queryFn: () => apiGet<GrowthOptimizationWorkspace>(`/brands/${activeBrandId}/growth-optimization`)
  });
  const currentSprintQuery = useQuery({
    queryKey: ['visibility-sprint-current', activeBrandId],
    queryFn: () => apiGet<VisibilitySprint>(`/brands/${activeBrandId}/sprints/current`)
  });
  const workspace = workspaceQuery.data?.success ? workspaceQuery.data.data : null;
  const currentSprint = currentSprintQuery.data?.success ? currentSprintQuery.data.data : null;
  const alignmentQuery = useQuery({
    queryKey: ['visibility-sprint-alignment', activeBrandId, currentSprint?.sprintId],
    queryFn: () => apiGet<StandardAnswerAlignmentDashboard>(`/brands/${activeBrandId}/sprints/${currentSprint?.sprintId}/alignment`),
    enabled: Boolean(currentSprint?.sprintId)
  });
  const contentTasksQuery = useQuery({
    queryKey: ['visibility-sprint-content-tasks', activeBrandId, currentSprint?.sprintId],
    queryFn: () => apiGet<SprintContentTaskDashboard>(`/brands/${activeBrandId}/sprints/${currentSprint?.sprintId}/content-gaps/tasks`),
    enabled: Boolean(currentSprint?.sprintId)
  });
  const alignmentDashboard = alignmentQuery.data?.success ? alignmentQuery.data.data : null;
  const contentTaskDashboard = contentTasksQuery.data?.success ? contentTasksQuery.data.data : null;
  const sprintDiagnosisRows = useMemo(() => buildSprintDiagnosisRows(alignmentDashboard, contentTaskDashboard), [alignmentDashboard, contentTaskDashboard]);
  const plans = workspace?.plans ?? [];

  const planStats = useMemo(() => getPlanStatusCounts(plans), [plans]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['growth-optimization', activeBrandId] });

  useEffect(() => {
    if (!confirmingPlan) return;
    confirmForm.setFieldsValue({
      ownerId: confirmingPlan.ownerId,
      dueDate: confirmingPlan.dueDate,
      publishingPlatformsText: confirmingPlan.publishingPlatforms.join('、'),
      retestAt: confirmingPlan.retestAt
    });
  }, [confirmForm, confirmingPlan]);

  useEffect(() => {
    if (!contentPlan) return;
    contentForm.setFieldsValue({
      recommendationIndexes: contentPlan.contentRecommendations.map((_, index) => index)
    });
  }, [contentForm, contentPlan]);

  useEffect(() => {
    if (!retestTask) return;
    retestForm.setFieldsValue({
      sourceRunId: retestTask.sourceRunId,
      retestRunId: retestTask.sourceRunId,
      plannedAt: plans.find((plan) => plan.id === retestTask.growthOptimizationPlanId)?.retestAt,
      targetScore: 80,
      notes: '优化动作完成后，再测试品牌是否出现、排名是否提升、表达是否准确。'
    });
  }, [plans, retestForm, retestTask]);

  const generateMutation = useMutation({
    mutationFn: () => apiPost<GrowthOptimizationPlan>(`/brands/${activeBrandId}/growth-optimization/generate`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void invalidate();
        void messageApi.success('优化计划已生成');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const confirmMutation = useMutation({
    mutationFn: ({ planId, values }: { planId: string; values: GrowthOptimizationPlanConfirmInput }) => apiPost<GrowthOptimizationPlanConfirmationResult>(`/brands/${activeBrandId}/growth-optimization/plans/${planId}/confirm`, values),
    onSuccess: (response) => {
      if (response.success) {
        setConfirmingPlan(undefined);
        confirmForm.resetFields();
        void invalidate();
        void messageApi.success(`计划已确认，并生成 ${response.data.tasks.length} 个待办任务`);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const contentTaskMutation = useMutation({
    mutationFn: (values: GrowthOptimizationContentTaskInput) => apiPost<ContentGenerationWorkspace>(`/brands/${activeBrandId}/content/generation/growth-optimization/tasks`, values),
    onSuccess: (response) => {
      if (response.success) {
        setContentPlan(undefined);
        contentForm.resetFields();
        void invalidate();
        void messageApi.success(`已生成 ${response.data.tasks.length} 个内容任务`);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, values }: { taskId: string; values: OptimizationTaskUpdateInput }) => apiPatch<OptimizationTask>(`/brands/${activeBrandId}/tasks/${taskId}`, values),
    onSuccess: (response) => {
      if (response.success) {
        void invalidate();
        void messageApi.success('任务状态已更新');
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

  const handleConfirmPlan = (values: PlanFormValues) => {
    if (!confirmingPlan) return;
    confirmMutation.mutate({
      planId: confirmingPlan.id,
      values: {
        ownerId: values.ownerId,
        dueDate: values.dueDate,
        publishingPlatforms: splitPlatformText(values.publishingPlatformsText),
        retestAt: values.retestAt
      }
    });
  };

  const handleCreateContentTasks = (values: { recommendationIndexes?: number[] }) => {
    if (!contentPlan) return;
    contentTaskMutation.mutate({
      planId: contentPlan.id,
      recommendationIndexes: values.recommendationIndexes
    });
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={workspaceQuery.data} />
      <PageErrorAlert response={currentSprintQuery.data} />
      <PageErrorAlert response={alignmentQuery.data} />
      <PageErrorAlert response={contentTasksQuery.data} />
      <AutomationOperatorCard brandId={activeBrandId} source="growth_optimization" title="AI 自动生成内容和发布建议" compact />
      <Card
        title="优化计划"
        extra={<Button type="primary" loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>从监测结果生成计划</Button>}
      >
        <Typography.Paragraph>
          把首轮 AI 回复监测结果转成看得懂、能分工、能跟进的优化计划，明确原因、优先级、负责人、截止时间、发布平台、内容任务和再次监测时间。
        </Typography.Paragraph>
        <Alert
          type="info"
          showIcon
          message="确认计划后继续生成内容并安排再次监测"
          description="建议先确认负责人、截止时间、发布平台和再次监测时间，再批量生成公众号、小红书、官网 FAQ、短视频、平台介绍和图片创意任务。"
          style={{ marginBottom: 16 }}
        />
        <Space size={24} wrap>
          <Statistic title="全部计划" value={plans.length} />
          <Statistic title="待确认" value={planStats.draft} />
          <Statistic title="处理中" value={planStats.in_progress + planStats.confirmed} />
          <Statistic title="待再次监测" value={planStats.ready_for_retest} />
          <Statistic title="已完成" value={planStats.completed} />
        </Space>
      </Card>

      <Card title="标准答案与内容缺口诊断" loading={currentSprintQuery.isLoading || alignmentQuery.isLoading || contentTasksQuery.isLoading}>
        <Space direction="vertical" size={16} className="page-stack">
          <Alert
            type="info"
            showIcon
            message="对照真实回复、品牌标准答案和内容资产"
            description="这里用于判断 AI 真实回复缺了哪些品牌要点、哪些表达需要修正，以及是否已有内容资产可以支撑下一轮复测。"
          />
          <Space size={24} wrap>
            <Statistic title="真实回复" value={alignmentDashboard?.realAnswerCount ?? 0} />
            <Statistic title="已确认标准答案" value={alignmentDashboard?.approvedStandardAnswerCount ?? 0} />
            <Statistic title="需要补强" value={alignmentDashboard?.summary.needsAttentionCount ?? 0} />
            <Statistic title="内容任务" value={contentTaskDashboard?.totalTaskCount ?? 0} />
            <Statistic title="可审稿草稿" value={contentTaskDashboard?.reviewReadyTaskCount ?? 0} />
          </Space>
          <Table
            rowKey="questionId"
            size="small"
            dataSource={sprintDiagnosisRows}
            pagination={false}
            locale={{ emptyText: <EmptyState description="暂无标准答案对照数据，请先完成真实回复监测并生成标准答案。" /> }}
            columns={[
              { title: '监测问题', dataIndex: 'question', render: (value: string) => <Typography.Text>{value}</Typography.Text> },
              { title: '真实 AI 回复', dataIndex: 'realAnswerLabel' },
              { title: '品牌标准答案', dataIndex: 'standardAnswerLabel' },
              { title: '内容资产', dataIndex: 'contentAssetLabel' },
              { title: '诊断状态', render: (_, record) => <Tag color={record.statusColor}>{record.statusLabel}</Tag> },
              { title: '缺口类型', render: (_, record) => record.gapLabels.length > 0 ? <Space wrap>{record.gapLabels.map((label) => <Tag key={label}>{label}</Tag>)}</Space> : '-' },
              { title: '建议动作', dataIndex: 'recommendation' }
            ]}
          />
        </Space>
      </Card>

      {workspaceQuery.isLoading ? <Card loading /> : null}
      {!workspaceQuery.isLoading && plans.length === 0 ? <EmptyState description="还没有优化计划，请先完成首轮回复监测并生成计划。" actionLabel="生成计划" onAction={() => generateMutation.mutate()} /> : null}

      {plans.map((plan) => {
        const relatedTasks = getPlanTasks(plan, workspace?.relatedTasks ?? []);
        const progress = getPlanProgress(plan, relatedTasks);

        return (
          <Card
            key={plan.id}
            title={<Space><span>{plan.summary}</span><Tag color={planStatusColors[plan.status]}>{planStatusLabels[plan.status]}</Tag></Space>}
            extra={(
              <Space wrap>
                <Button size="small" onClick={() => setConfirmingPlan(plan)}>确认计划</Button>
                <Button size="small" disabled={plan.contentRecommendations.length === 0} onClick={() => setContentPlan(plan)}>生成内容待办</Button>
              </Space>
            )}
          >
            <Space direction="vertical" size={16} className="page-stack">
              <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
                <Descriptions.Item label="优先级">{priorityLabels[plan.priority]}</Descriptions.Item>
                <Descriptions.Item label="负责人">{getOwnerDisplayName(plan.ownerId)}</Descriptions.Item>
                <Descriptions.Item label="截止时间">{plan.dueDate}</Descriptions.Item>
                <Descriptions.Item label="再次监测时间">{plan.retestAt}</Descriptions.Item>
                <Descriptions.Item label="发布平台">{formatList(plan.publishingPlatforms)}</Descriptions.Item>
                <Descriptions.Item label="任务进度">{progress.done}/{progress.total}</Descriptions.Item>
              </Descriptions>

              <ReasonList plan={plan} />
              <ContentRecommendationList plan={plan} />
              <TaskTable
                tasks={relatedTasks}
                onComplete={(task) => updateTaskMutation.mutate({ taskId: task.id, values: { status: 'done', processingNote: task.processingNote || '优化动作已完成，等待再次监测确认效果。' } })}
                onRetest={(task) => setRetestTask(task)}
              />
            </Space>
          </Card>
        );
      })}

      <Modal title="确认优化计划" open={Boolean(confirmingPlan)} okText="确认并生成待办" cancelText="取消" onCancel={() => setConfirmingPlan(undefined)} onOk={() => confirmForm.submit()} confirmLoading={confirmMutation.isPending}>
        <Form form={confirmForm} layout="vertical" onFinish={handleConfirmPlan}>
          <Form.Item name="ownerId" label="负责人"><Input placeholder="负责人姓名" /></Form.Item>
          <Form.Item name="dueDate" label="截止时间" rules={[{ required: true, message: '请输入截止时间' }]}><Input placeholder="2026-07-10" /></Form.Item>
          <Form.Item name="publishingPlatformsText" label="发布平台" rules={[{ required: true, message: '请输入发布平台' }]}><Input placeholder="公众号、小红书、官网 FAQ" /></Form.Item>
          <Form.Item name="retestAt" label="再次监测时间" rules={[{ required: true, message: '请输入再次监测时间' }]}><Input placeholder="2026-07-17T00:00:00.000Z" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="生成内容待办" open={Boolean(contentPlan)} okText="生成" cancelText="取消" onCancel={() => setContentPlan(undefined)} onOk={() => contentForm.submit()} confirmLoading={contentTaskMutation.isPending}>
        {contentPlan?.contentRecommendations.length ? (
          <Form form={contentForm} layout="vertical" onFinish={handleCreateContentTasks}>
            <Form.Item name="recommendationIndexes" label="选择内容建议">
              <Select mode="multiple" options={contentPlan.contentRecommendations.map((item, index) => ({ value: index, label: `${item.title}（${item.targetPlatform}）` }))} />
            </Form.Item>
          </Form>
        ) : <Alert type="info" message="当前计划暂无内容建议" />}
      </Modal>

      <Modal title="安排再次监测" open={Boolean(retestTask)} okText="保存" cancelText="取消" onCancel={() => setRetestTask(undefined)} onOk={() => retestForm.submit()} confirmLoading={retestMutation.isPending}>
        <Form form={retestForm} layout="vertical" onFinish={(values) => retestTask && retestMutation.mutate({ taskId: retestTask.id, values })}>
          <Form.Item name="sourceRunId" label="原监测记录" rules={[{ required: true, message: '请输入原监测记录引用' }]}><Input /></Form.Item>
          <Form.Item name="retestRunId" label="再次监测记录"><Input placeholder="默认使用原监测记录" /></Form.Item>
          <Form.Item name="plannedAt" label="计划再次监测时间"><Input placeholder="2026-07-17T00:00:00.000Z" /></Form.Item>
          <Form.Item name="targetScore" label="目标分"><Input type="number" min={0} max={100} /></Form.Item>
          <Form.Item name="notes" label="监测说明"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function ReasonList({ plan }: { plan: GrowthOptimizationPlan }) {
  if (plan.reasons.length === 0) {
    return <Alert type="info" message="还没有明确原因，建议先补充监测结果解读。" />;
  }

  return (
    <Card size="small" title="为什么要优化">
      <Space direction="vertical" size={8} className="page-stack">
        {plan.reasons.map((reason, index) => (
          <div key={`${reason.type}-${index}`}>
            <Space wrap><Tag>{reasonLabels[reason.type]}</Tag><Typography.Text strong>{reason.title}</Typography.Text></Space>
            <Typography.Paragraph type="secondary">{reason.evidence}</Typography.Paragraph>
          </div>
        ))}
      </Space>
    </Card>
  );
}

function ContentRecommendationList({ plan }: { plan: GrowthOptimizationPlan }) {
  return (
    <Card size="small" title="建议写什么内容">
      {plan.contentRecommendations.length === 0 ? <EmptyState description="还没有内容建议。" /> : (
        <Table
          size="small"
          rowKey={(record, index) => `${record.title}-${index}`}
          pagination={false}
          dataSource={plan.contentRecommendations}
          columns={[
            { title: '内容类型', dataIndex: 'contentType', render: (value) => getContentTypeDisplay(value) },
            { title: '标题', dataIndex: 'title' },
            { title: '发布平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
            { title: '关键词', render: (_, record) => formatList(record.targetKeywords) },
            { title: '内容草稿', render: (_, record) => record.generationTaskId ? <Tag color="green">已生成</Tag> : <Tag>待生成</Tag> }
          ]}
        />
      )}
    </Card>
  );
}

function TaskTable({ tasks, onComplete, onRetest }: { tasks: OptimizationTask[]; onComplete: (task: OptimizationTask) => void; onRetest: (task: OptimizationTask) => void }) {
  return (
    <Card size="small" title="待办任务">
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={tasks}
        locale={{ emptyText: <EmptyState description="确认计划后会自动生成待办任务。" /> }}
        columns={[
          { title: '任务', dataIndex: 'title' },
          { title: '状态', render: (_, record) => <Tag>{taskStatusLabels[record.status]}</Tag> },
          { title: '负责人', dataIndex: 'ownerId', render: (value) => getOwnerDisplayName(value) },
          { title: '截止时间', dataIndex: 'dueDate', render: (value) => value || '-' },
          { title: '发布内容', dataIndex: 'contentLink', render: (value) => getContentLinkDisplay(value) },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button size="small" disabled={record.status === 'done'} onClick={() => onComplete(record)}>标记完成</Button>
                <Button size="small" disabled={!record.sourceRunId} onClick={() => onRetest(record)}>安排再次监测</Button>
              </Space>
            )
          }
        ]}
      />
    </Card>
  );
}

export function getPlanTasks(plan: GrowthOptimizationPlan, tasks: OptimizationTask[]): OptimizationTask[] {
  const planTaskIds = new Set(plan.taskIds);
  return tasks.filter((task) => task.growthOptimizationPlanId === plan.id || planTaskIds.has(task.id));
}

export function getPlanProgress(plan: GrowthOptimizationPlan, tasks: OptimizationTask[]) {
  const relatedTasks = getPlanTasks(plan, tasks);
  return {
    total: relatedTasks.length,
    done: relatedTasks.filter((task) => task.status === 'done').length
  };
}

export function getPlanStatusCounts(plans: GrowthOptimizationPlan[]): Record<GrowthOptimizationPlanStatus, number> {
  return plans.reduce<Record<GrowthOptimizationPlanStatus, number>>((counts, plan) => {
    counts[plan.status] += 1;
    return counts;
  }, { draft: 0, confirmed: 0, in_progress: 0, ready_for_retest: 0, completed: 0 });
}

export function splitPlatformText(value?: string): string[] {
  return (value ?? '').split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean);
}

export function formatList(values: string[]): string {
  return values.length > 0 ? values.join('、') : '-';
}

export function getContentLinkDisplay(value?: string): string {
  if (!value || value.trim().length === 0) return '-';
  if (/^https?:\/\//.test(value)) return value;
  return '已生成内容草稿';
}
