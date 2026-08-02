import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type {
  AnalysisDiagnosisDashboard,
  AnalysisFinding,
  AnalysisRecommendedAction,
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
  PublishingRecord,
  SprintContentTaskDashboard,
  StandardAnswerAlignmentDashboard,
  VisibilitySprint
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { readWorkflowRouteContext, workflowStagePath } from '../../../app/routePaths';
import { InsightDetailSection, InsightOverview } from '../../../components/InsightOverview';
import { EmptyState, PageSkeleton, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { ProductPage, ProductPageSection } from '../../../components/ProductPage';
import { getQueryGroupWorkspaceState, type QueryWorkspaceResource } from '../../../components/WorkspaceState';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getContentTypeDisplay, getOwnerDisplayName, getPlatformDisplay } from '../../../utils/displayLabels';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { clearAnalysisScopeQuery, mergeAnalysisScopeQuery, readAnalysisScopeQuery, type AnalysisScopeValue } from '../../analysis/analysisScopeQuery';
import { AnalysisScopeBar } from '../../analysis/components/AnalysisScopeBar';
import { buildSprintDiagnosisRows } from './growthSprintDiagnostics';
import { AnalysisFindingCards } from './AnalysisFindingCards';

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
  const location = useLocation();
  const routeContext = readWorkflowRouteContext(location.search);
  const navigate = useNavigate();
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
  const diagnosisQuery = useQuery({
    queryKey: ['analysis-diagnosis-dashboard', activeBrandId],
    queryFn: () => apiGet<AnalysisDiagnosisDashboard>(`/brands/${activeBrandId}/dashboards/analysis-diagnosis`)
  });
  const currentSprintQuery = useQuery({
    queryKey: ['visibility-sprint-current', activeBrandId],
    queryFn: () => apiGet<VisibilitySprint>(`/brands/${activeBrandId}/sprints/current`)
  });
  const workspace = workspaceQuery.data?.success ? workspaceQuery.data.data : null;
  const diagnosis = diagnosisQuery.data?.success ? diagnosisQuery.data.data : null;
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
  const pageResources: QueryWorkspaceResource[] = [
    { isLoading: workspaceQuery.isLoading, response: workspaceQuery.data },
    { isLoading: diagnosisQuery.isLoading, response: diagnosisQuery.data },
    { isLoading: currentSprintQuery.isLoading, response: currentSprintQuery.data }
  ];
  if (currentSprint?.sprintId) {
    pageResources.push(
      { isLoading: alignmentQuery.isLoading, response: alignmentQuery.data },
      { isLoading: contentTasksQuery.isLoading, response: contentTasksQuery.data }
    );
  }
  const pageState = getQueryGroupWorkspaceState(pageResources, true);
  const retryPageQueries = () => Promise.all([
    workspaceQuery.refetch(),
    diagnosisQuery.refetch(),
    currentSprintQuery.refetch(),
    ...(currentSprint?.sprintId ? [alignmentQuery.refetch(), contentTasksQuery.refetch()] : [])
  ]);
  const sprintDiagnosisRows = useMemo(() => buildSprintDiagnosisRows(alignmentDashboard, contentTaskDashboard), [alignmentDashboard, contentTaskDashboard]);
  const plans = workspace?.plans ?? [];
  const analysisScope = readAnalysisScopeQuery(location.search, { statuses: Object.keys(planStatusLabels) as GrowthOptimizationPlanStatus[] });
  const filteredPlans = useMemo(() => getFilteredGrowthOptimizationPlans(plans, workspace?.relatedTasks ?? [], analysisScope), [analysisScope, plans, workspace?.relatedTasks]);
  const filteredFindings = useMemo(() => getFilteredAnalysisFindings(diagnosis?.findings ?? [], analysisScope), [analysisScope, diagnosis?.findings]);
  const updateAnalysisScope = (value: typeof analysisScope) => navigate({ pathname: location.pathname, search: mergeAnalysisScopeQuery(location.search, value), hash: location.hash }, { replace: true });

  const planStats = useMemo(() => getPlanStatusCounts(filteredPlans), [filteredPlans]);

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
        const taskId = response.data.tasks[0]?.id;
        const planId = contentPlan?.id;
        setContentPlan(undefined);
        contentForm.resetFields();
        void invalidate();
        void messageApi.success(`已生成 ${response.data.tasks.length} 个内容任务`);
        if (taskId) navigate(workflowStagePath('/content-generation', { ...routeContext, planId, taskId }));
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

  const openFindingAction = (finding: AnalysisFinding, action: AnalysisRecommendedAction) => {
    navigate(getAnalysisFindingActionPath(finding, action, routeContext));
  };

  const openFindingTask = (finding: AnalysisFinding) => {
    navigate(workflowStagePath('/tasks', {
      ...routeContext,
      optimizationUnitId: finding.optimizationUnitId ?? routeContext.optimizationUnitId,
      platformCode: finding.platformCode ?? routeContext.platformCode,
      taskId: finding.relatedTaskId,
      action: 'open'
    }));
  };

  useEffect(() => {
    const sectionId = location.hash.slice(1);
    if (sectionId) {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  return (
    <ProductPage
      title="优化建议"
      description="把真实 AI 回复中的优先问题转成可确认、可分工、可复测的优化计划。"
      primaryAction={<Button type="primary" loading={generateMutation.isPending} onClick={() => generateMutation.mutate()}>从监测结果生成计划</Button>}
      className="analysis-workbench"
      state={pageState}
      loadingState={<PageSkeleton rows={6} />}
      partialState={(
        <PartialDataNotice
          message="部分诊断数据暂时缺失"
          description="已保留可用计划、诊断和 Sprint 数据；重新加载可补齐缺失区域。"
          action={<Button onClick={() => void retryPageQueries()}>重新加载缺失数据</Button>}
        />
      )}
      errorState={(
        <RegionErrorState
          title="优化建议数据暂时无法加载"
          description="优化计划与诊断数据均未成功返回，请重新加载。"
          onRetry={() => void retryPageQueries()}
        />
      )}
    >
      {contextHolder}
      {routeContext.question ? (
        <Alert
          type="info"
          showIcon
          message={`正在分析：${routeContext.question}`}
          description="下方诊断与计划保留当前品牌上下文，可继续确认修正项或生成内容任务。"
        />
      ) : null}
      <AutomationOperatorCard brandId={activeBrandId} source="growth_optimization" title="AI 自动生成内容和发布建议" compact />

      <ProductPageSection title="分析范围" description="时间和计划状态作用于计划证据，AI 平台和优化单元同步收窄统一诊断结论。" className="analysis-scope-section">
        <AnalysisScopeBar
          value={analysisScope}
          onChange={updateAnalysisScope}
          onClear={() => navigate({ pathname: location.pathname, search: clearAnalysisScopeQuery(location.search), hash: location.hash }, { replace: true })}
          statusOptions={Object.entries(planStatusLabels).map(([value, label]) => ({ value: value as GrowthOptimizationPlanStatus, label }))}
          optimizationUnitOptions={getGrowthOptimizationUnitOptions(workspace?.relatedTasks ?? [])}
          resultCount={filteredPlans.length + filteredFindings.length}
          totalCount={plans.length + (diagnosis?.findings.length ?? 0)}
        />
      </ProductPageSection>

      <InsightOverview
        title={filteredPlans.length > 0 ? `${filteredPlans.length} 个优化计划进入当前分析范围` : '当前范围内还没有优化计划'}
        description="先确认负责人、截止时间、发布渠道和再次监测时间，再继续生成内容待办。"
        findings={[
          `${planStats.draft} 个计划待确认`,
          `${planStats.in_progress + planStats.confirmed} 个计划处理中`,
          `${planStats.ready_for_retest} 个计划待再次监测`
        ]}
        tone={planStats.draft + planStats.ready_for_retest > 0 ? 'warning' : 'neutral'}
        toneLabel={planStats.draft + planStats.ready_for_retest > 0 ? '需要处理' : '持续观察'}
      >
        <Space size={24} wrap>
          <Statistic title="当前计划" value={filteredPlans.length} />
          <Statistic title="待确认" value={planStats.draft} />
          <Statistic title="处理中" value={planStats.in_progress + planStats.confirmed} />
          <Statistic title="待再次监测" value={planStats.ready_for_retest} />
          <Statistic title="已完成" value={planStats.completed} />
        </Space>
      </InsightOverview>

      <InsightDetailSection title="统一诊断结论" description="将竞品、评价、信源和事实分析归并为可直接进入任务闭环的优先结论。" resultCount={filteredFindings.length}>
        <Card loading={diagnosisQuery.isLoading}>
          <AnalysisFindingCards findings={filteredFindings} onAction={openFindingAction} onOpenTask={openFindingTask} />
        </Card>
      </InsightDetailSection>

      <InsightDetailSection title="趋势与分布" description="对照真实回复、品牌标准答案和内容资产，判断当前缺口分布。">
      <Card
        id="standard-answer-diagnosis"
        title="标准答案与内容缺口诊断"
        extra={<Button size="small" onClick={() => navigate(workflowStagePath('/brand-profile', routeContext))}>更新标准答案依据</Button>}
        loading={currentSprintQuery.isLoading || alignmentQuery.isLoading || contentTasksQuery.isLoading}
      >
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
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <EmptyState title="还没有标准答案对照数据" description="真实 AI 回复、品牌标准答案和内容资产的对照关系" reason="对照数据用于判断表达缺口、事实偏差和内容补强优先级。" nextStep="完成真实回复监测，并生成或确认品牌标准答案。" /> }}
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
      </InsightDetailSection>

      <InsightDetailSection title="优化计划" description="按优先问题、原因证据、推荐动作、关联内容和复测状态推进每个计划。" resultCount={filteredPlans.length}>
      <div id="optimization-plans" className="page-stack">
      {workspaceQuery.isLoading ? <Card loading /> : null}
      {!workspaceQuery.isLoading && filteredPlans.length === 0 ? <EmptyState title="当前范围内还没有优化计划" description="基于真实回复诊断生成的内容、资料和复测行动" reason="当前筛选范围尚未匹配优化计划。" nextStep="清空部分筛选，或从监测结果生成计划。" actionLabel={plans.length === 0 ? '生成计划' : undefined} onAction={plans.length === 0 ? () => generateMutation.mutate() : undefined} /> : null}

      {filteredPlans.map((plan) => {
        const relatedTasks = getPlanTasks(plan, workspace?.relatedTasks ?? []);
        const progress = getPlanProgress(plan, relatedTasks);

        return (
          <Card
            key={plan.id}
            title={<Space><span>{plan.summary}</span><Tag color={planStatusColors[plan.status]}>{planStatusLabels[plan.status]}</Tag></Space>}
          >
            <Space direction="vertical" size={16} className="page-stack">
              <Card size="small" title="优先问题">
              <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
                <Descriptions.Item label="优先级">{priorityLabels[plan.priority]}</Descriptions.Item>
                <Descriptions.Item label="计划状态"><Tag color={planStatusColors[plan.status]}>{planStatusLabels[plan.status]}</Tag></Descriptions.Item>
                <Descriptions.Item label="负责人">{getOwnerDisplayName(plan.ownerId)}</Descriptions.Item>
                <Descriptions.Item label="截止时间">{plan.dueDate}</Descriptions.Item>
                <Descriptions.Item label="发布平台">{formatList(plan.publishingPlatforms)}</Descriptions.Item>
                <Descriptions.Item label="任务进度">{progress.done}/{progress.total}</Descriptions.Item>
              </Descriptions>
              </Card>

              <ReasonList plan={plan} />
              <PlanRecommendedActions
                plan={plan}
                tasks={relatedTasks}
                onConfirm={() => setConfirmingPlan(plan)}
                onCreateContent={() => setContentPlan(plan)}
                onUpdateStandardAnswer={() => navigate({ pathname: location.pathname, search: location.search, hash: '#standard-answer-diagnosis' })}
                onPreparePublishing={() => navigate(workflowStagePath('/publishing', { ...routeContext, planId: plan.id, tab: 'records' }))}
                onRetest={(task) => task ? setRetestTask(task) : navigate(workflowStagePath('/tasks', { ...routeContext, planId: plan.id, runId: plan.sourceRunIds[0], action: 'create' }))}
              />
              <ContentRecommendationList plan={plan} publishingRecords={workspace?.relatedPublishingRecords ?? []} />
              <TaskTable
                tasks={relatedTasks}
                onComplete={(task) => updateTaskMutation.mutate({ taskId: task.id, values: { status: 'done', processingNote: task.processingNote || '优化动作已完成，等待再次监测确认效果。' } })}
                onRetest={(task) => setRetestTask(task)}
              />
            </Space>
          </Card>
        );
      })}
      </div>
      </InsightDetailSection>

      <Modal title="确认优化计划" open={Boolean(confirmingPlan)} okText="确认并生成待办" cancelText="取消" onCancel={() => setConfirmingPlan(undefined)} onOk={() => confirmForm.submit()} confirmLoading={confirmMutation.isPending}>
        <Form form={confirmForm} layout="vertical" onFinish={handleConfirmPlan}>
          <Form.Item name="ownerId" label="负责人"><Input placeholder="负责人姓名" /></Form.Item>
          <Form.Item name="dueDate" label="截止时间" rules={[{ required: true, message: '请输入截止时间' }]}><Input placeholder="2026-07-10" /></Form.Item>
          <Form.Item name="publishingPlatformsText" label="发布平台" rules={[{ required: true, message: '请输入发布平台' }]}><Input placeholder="公众号、小红书、官网 FAQ" /></Form.Item>
          <Form.Item name="retestAt" label="再次监测时间" rules={[{ required: true, message: '请输入再次监测时间' }]}><Input placeholder="例如：2026-07-17 09:00" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="生成内容待办" open={Boolean(contentPlan)} okText="生成" cancelText="取消" onCancel={() => setContentPlan(undefined)} onOk={() => contentForm.submit()} confirmLoading={contentTaskMutation.isPending}>
        {contentPlan?.contentRecommendations.length ? (
          <Form form={contentForm} layout="vertical" onFinish={handleCreateContentTasks}>
            <Form.Item name="recommendationIndexes" label="选择内容建议">
              <Select mode="multiple" options={contentPlan.contentRecommendations.map((item, index) => ({ value: index, label: `${item.title}（${getPlatformDisplay(item.targetPlatform)}）` }))} />
            </Form.Item>
          </Form>
        ) : <Alert type="info" message="当前计划暂无内容建议" />}
      </Modal>

      <Modal title="安排再次监测" open={Boolean(retestTask)} okText="保存" cancelText="取消" onCancel={() => setRetestTask(undefined)} onOk={() => retestForm.submit()} confirmLoading={retestMutation.isPending}>
        <Form form={retestForm} layout="vertical" onFinish={(values) => retestTask && retestMutation.mutate({ taskId: retestTask.id, values })}>
          <Form.Item name="sourceRunId" label="原监测记录" rules={[{ required: true, message: '请输入原监测记录引用' }]}><Input /></Form.Item>
          <Form.Item name="retestRunId" label="再次监测记录"><Input placeholder="默认使用原监测记录" /></Form.Item>
          <Form.Item name="plannedAt" label="计划再次监测时间"><Input placeholder="例如：2026-07-17 09:00" /></Form.Item>
          <Form.Item name="targetScore" label="目标分"><Input type="number" min={0} max={100} /></Form.Item>
          <Form.Item name="notes" label="监测说明"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </ProductPage>
  );
}

function ReasonList({ plan }: { plan: GrowthOptimizationPlan }) {
  if (plan.reasons.length === 0) {
    return <Alert type="info" message="还没有明确原因，建议先补充监测结果解读。" />;
  }

  return (
    <Card size="small" title="原因证据">
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

function PlanRecommendedActions({
  plan,
  tasks,
  onConfirm,
  onCreateContent,
  onUpdateStandardAnswer,
  onPreparePublishing,
  onRetest
}: {
  plan: GrowthOptimizationPlan;
  tasks: OptimizationTask[];
  onConfirm: () => void;
  onCreateContent: () => void;
  onUpdateStandardAnswer: () => void;
  onPreparePublishing: () => void;
  onRetest: (task?: OptimizationTask) => void;
}) {
  const retestTask = tasks.find((task) => Boolean(task.sourceRunId));
  return (
    <Card size="small" title="推荐动作">
      <Space wrap>
        <Button size="small" onClick={onConfirm}>确认计划</Button>
        <Button size="small" disabled={plan.contentRecommendations.length === 0} onClick={onCreateContent}>生成内容任务</Button>
        <Button size="small" onClick={onUpdateStandardAnswer}>更新标准答案</Button>
        <Button size="small" onClick={onPreparePublishing}>安排发布</Button>
        <Button size="small" onClick={() => onRetest(retestTask)}>安排再次监测</Button>
      </Space>
    </Card>
  );
}

function ContentRecommendationList({ plan, publishingRecords }: { plan: GrowthOptimizationPlan; publishingRecords: PublishingRecord[] }) {
  return (
    <Card size="small" title="关联内容">
      {plan.contentRecommendations.length === 0 ? <EmptyState title="还没有内容建议" description="可生成内容任务的标题、渠道和关键词" reason="内容建议来自真实回复缺口、竞品压制、评价问题和事实偏差。" nextStep="补充监测解读或确认优化计划后再生成内容待办。" /> : (
        <Table
          size="small"
          rowKey={(record, index) => `${record.title}-${index}`}
          pagination={false}
          dataSource={plan.contentRecommendations}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: '内容类型', dataIndex: 'contentType', render: (value) => getContentTypeDisplay(value) },
            { title: '标题', dataIndex: 'title' },
             { title: '发布平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
             { title: '关键词', render: (_, record) => formatList(record.targetKeywords) },
             { title: '推荐原因', dataIndex: 'reason' },
             { title: '内容草稿', render: (_, record) => record.generationTaskId ? <Tag color="green">已生成</Tag> : <Tag>待生成</Tag> },
             { title: '发布状态', render: (_, record) => getRecommendationPublishingStatus(record.generationTaskId, publishingRecords) }
          ]}
        />
      )}
    </Card>
  );
}

function TaskTable({ tasks, onComplete, onRetest }: { tasks: OptimizationTask[]; onComplete: (task: OptimizationTask) => void; onRetest: (task: OptimizationTask) => void }) {
  return (
    <Card size="small" title="复测状态">
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={tasks}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <EmptyState title="还没有待办任务" description="负责人、截止时间、发布内容和再次监测动作" reason="待办任务用于跟踪每条优化动作是否完成并进入复测。" nextStep="确认优化计划后自动生成待办任务。" /> }}
        columns={[
          { title: '任务', dataIndex: 'title' },
          { title: '状态', render: (_, record) => <Tag>{taskStatusLabels[record.status]}</Tag> },
          { title: '负责人', dataIndex: 'ownerId', render: (value) => getOwnerDisplayName(value) },
          { title: '截止时间', dataIndex: 'dueDate', render: (value) => value || '-' },
          { title: '关联内容', dataIndex: 'contentLink', render: (value) => getContentLinkDisplay(value) },
          { title: '计划复测', render: (_, record) => record.retestRecords.at(-1)?.plannedAt ?? record.retestPlanAt ?? '-' },
          { title: '复测结果', render: (_, record) => getRetestResultLabel(record) },
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

export function getFilteredGrowthOptimizationPlans(
  plans: GrowthOptimizationPlan[],
  tasks: OptimizationTask[],
  scope: AnalysisScopeValue<GrowthOptimizationPlanStatus>
): GrowthOptimizationPlan[] {
  const search = scope.search.trim().toLowerCase();
  return plans.filter((plan) => {
    const createdDate = plan.createdAt.slice(0, 10);
    const relatedTasks = getPlanTasks(plan, tasks);
    if (scope.from && createdDate < scope.from) return false;
    if (scope.to && createdDate > scope.to) return false;
    if (scope.status !== 'all' && plan.status !== scope.status) return false;
    if (scope.optimizationUnitId && !relatedTasks.some((task) => task.optimizationUnitId === scope.optimizationUnitId)) return false;
    if (!search) return true;
    return [
      plan.summary,
      ...plan.reasons.flatMap((reason) => [reason.title, reason.evidence]),
      ...plan.contentRecommendations.flatMap((item) => [item.title, ...item.targetKeywords]),
      ...relatedTasks.map((task) => task.title)
    ].some((value) => value.toLowerCase().includes(search));
  });
}

export function getFilteredAnalysisFindings(findings: AnalysisFinding[], scope: AnalysisScopeValue<GrowthOptimizationPlanStatus>): AnalysisFinding[] {
  const search = scope.search.trim().toLowerCase();
  return findings.filter((finding) => {
    if (scope.platform !== 'all' && finding.platformCode !== scope.platform) return false;
    if (scope.optimizationUnitId && finding.optimizationUnitId !== scope.optimizationUnitId) return false;
    if (!search) return true;
    return [finding.title, finding.userIntent ?? '', ...finding.evidence].some((value) => value.toLowerCase().includes(search));
  });
}

export function getAnalysisFindingActionPath(finding: AnalysisFinding, action: AnalysisRecommendedAction, routeContext: ReturnType<typeof readWorkflowRouteContext>): string {
  const context = {
    ...routeContext,
    optimizationUnitId: finding.optimizationUnitId ?? routeContext.optimizationUnitId,
    platformCode: finding.platformCode ?? routeContext.platformCode
  };
  if (action.actionType === 'generate_content') return workflowStagePath('/content-generation', context);
  if (action.actionType === 'update_knowledge') return workflowStagePath('/brand-profile', context);
  return workflowStagePath('/tasks', {
    ...context,
    taskId: finding.relatedTaskId,
    action: finding.relatedTaskId ? 'open' : 'create'
  });
}

function getGrowthOptimizationUnitOptions(tasks: OptimizationTask[]) {
  return [...new Set(tasks.map((task) => task.optimizationUnitId).filter((value): value is string => Boolean(value)))]
    .map((value, index) => ({ value, label: `优化单元 ${index + 1}` }));
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

export function getRecommendationPublishingStatus(generationTaskId: string | undefined, records: PublishingRecord[]) {
  if (!generationTaskId) return <Tag>待生成</Tag>;
  const record = records.find((item) => item.generationTaskId === generationTaskId);
  if (!record) return <Tag>待发布</Tag>;
  const labels = { draft: '草稿', pending: '待发布', queued: '等待发布', publishing: '发布中', published: '已发布', failed: '发布失败' } as const;
  const colors = { draft: 'default', pending: 'gold', queued: 'gold', publishing: 'blue', published: 'green', failed: 'red' } as const;
  return <Tag color={colors[record.status]}>{labels[record.status]}</Tag>;
}

export function getRetestResultLabel(task: OptimizationTask): string {
  const record = task.retestRecords.at(-1);
  if (!record) return task.status === 'retest' ? '待执行' : '未安排';
  if (!record.completedAt) return '待执行';
  return record.improved || record.passed ? '已改善' : '继续优化';
}
