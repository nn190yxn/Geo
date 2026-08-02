import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AnalysisResult,
  AnalysisResultInput,
  AnalysisSentiment,
  BrandPrompt,
  ManualResponseInput,
  MonitoringRunDetail,
  MonitoringRunInput,
  MonitoringRunStatus,
  PlatformConfig
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { workflowStagePath, type WorkflowRouteContext } from '../../../app/routePaths';
import { EmptyState, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { getConfirmationReviewItems, getMonitoringResultSummary, type MonitoringResultLine } from './monitoringResultDisplay';
import { getPlatformDisplayName } from '../../../utils/displayLabels';

type Props = {
  brandId: string;
  initialPromptId?: string;
  initialMode?: 'automatic' | 'manual' | 'records' | 'retest';
  platformCode?: string;
  createActionType?: 'primary' | 'default';
  routeContext?: WorkflowRouteContext;
};

type RunFormValues = MonitoringRunInput;
type ManualResponseFormValues = Omit<ManualResponseInput, 'citations'> & { citationsText?: string };
type AnalysisFormValues = Omit<AnalysisResultInput, 'competitorMentions'> & { competitorMentionsText?: string };

export function MonitoringRunsCard({ brandId, initialPromptId, initialMode, platformCode = 'all', createActionType = 'primary', routeContext = {} }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialRouteHandled = useRef(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [runForm] = Form.useForm<RunFormValues>();
  const [manualForm] = Form.useForm<ManualResponseFormValues>();
  const [analysisForm] = Form.useForm<AnalysisFormValues>();
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [manualRunId, setManualRunId] = useState<string | null>(null);
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null);
  const promptsQuery = useQuery({
    queryKey: ['brand-prompts', brandId],
    queryFn: () => apiGet<BrandPrompt[]>(`/brands/${brandId}/prompts`)
  });
  const platformsQuery = useQuery({
    queryKey: ['platform-configs'],
    queryFn: () => apiGet<PlatformConfig[]>('/platforms')
  });
  const runsQuery = useQuery({
    queryKey: ['monitoring-runs', brandId],
    queryFn: () => apiGet<MonitoringRunDetail[]>(`/brands/${brandId}/monitoring-runs`)
  });
  const prompts = promptsQuery.data?.success ? promptsQuery.data.data.filter((prompt) => prompt.enabled) : [];
  const platforms = platformsQuery.data?.success ? platformsQuery.data.data.filter((platform) => platform.enabled) : [];
  const runs = runsQuery.data?.success ? runsQuery.data.data : [];
  const visibleRuns = useMemo(
    () => platformCode === 'all' ? runs : runs.filter((run) => run.platformCode === platformCode),
    [platformCode, runs]
  );
  const promptMap = useMemo(() => new Map(prompts.map((prompt) => [prompt.id, prompt])), [prompts]);
  const selectedAnalysisRun = runs.find((run) => run.id === analysisRunId);
  const confirmationItems = getConfirmationReviewItems(selectedAnalysisRun?.analysis);
  const platformOptions = platforms.map((platform) => ({ value: platform.platformCode, label: `${platform.name} (${modeLabels[platform.mode]})` }));
  const runsFailed = Boolean(runsQuery.data && !runsQuery.data.success);
  const setupDataFailed = [promptsQuery.data, platformsQuery.data].some((response) => response && !response.success);

  useEffect(() => {
    if (initialRouteHandled.current || (initialMode !== 'automatic' && initialMode !== 'retest')) return;
    initialRouteHandled.current = true;
    const prompt = initialPromptId ? promptMap.get(initialPromptId) : undefined;
    runForm.setFieldsValue({ promptId: initialPromptId, platformCode: prompt?.platformCodes[0] });
    setRunModalOpen(true);
  }, [initialMode, initialPromptId, promptMap, runForm]);
  const createRunMutation = useMutation({
    mutationFn: (values: RunFormValues) => apiPost<MonitoringRunDetail>(`/brands/${brandId}/monitoring-runs`, values),
    onSuccess: (response) => {
      if (response.success) {
        setRunModalOpen(false);
        runForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['monitoring-runs', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
        void messageApi.success('回复监测记录已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const manualResponseMutation = useMutation({
    mutationFn: (values: ManualResponseFormValues) => apiPost<MonitoringRunDetail>(
      `/brands/${brandId}/monitoring-runs/${manualRunId}/manual-response`,
      toManualResponsePayload(values)
    ),
    onSuccess: (response) => {
      if (response.success) {
        setManualRunId(null);
        manualForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['monitoring-runs', brandId] });
        void messageApi.success('原始回答已保存');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const parseAnalysisMutation = useMutation({
    mutationFn: (runId: string) => apiPost<AnalysisResult>(`/brands/${brandId}/monitoring-runs/${runId}/analysis/parse`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['monitoring-runs', brandId] });
        void messageApi.success('已开始解读回答');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const updateAnalysisMutation = useMutation({
    mutationFn: (values: AnalysisFormValues) => apiPatch<AnalysisResult>(
      `/brands/${brandId}/monitoring-runs/${analysisRunId}/analysis`,
      toAnalysisPayload(values)
    ),
    onSuccess: (response) => {
      if (response.success) {
        setAnalysisRunId(null);
        analysisForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['monitoring-runs', brandId] });
        void messageApi.success('人工复核已保存');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openRunModal = () => {
    runForm.resetFields();
    setRunModalOpen(true);
  };

  const openManualModal = (runId: string) => {
    setManualRunId(runId);
    manualForm.resetFields();
  };

  const openAnalysisModal = (run: MonitoringRunDetail) => {
    if (!run.analysis) {
      return;
    }

    setAnalysisRunId(run.id);
    analysisForm.setFieldsValue({
      brandMentioned: run.analysis.brandMentioned,
      brandRank: run.analysis.brandRank,
      sentiment: run.analysis.sentiment,
      accuracyScore: run.analysis.accuracyScore,
      citationScore: run.analysis.citationScore,
      platformEvaluation: run.analysis.platformEvaluation,
      recommendationReason: run.analysis.recommendationReason,
      rankingReason: run.analysis.rankingReason,
      expressionCompleteness: run.analysis.expressionCompleteness,
      expressionDeviation: run.analysis.expressionDeviation,
      competitorMentionsText: run.analysis.competitorMentions.map((item) => `${item.name}|${item.rank ?? ''}|${item.sentiment}`).join('\n'),
      reviewRequired: run.analysis.reviewRequired
    });
  };

  return (
    <Card id="monitoring-runs-card" title="AI 回复监测记录" extra={<Button type={createActionType} onClick={openRunModal}>新建监测</Button>}>
      {contextHolder}
      {setupDataFailed && !runsFailed ? (
        <PartialDataNotice
          message="部分监测配置暂时缺失"
          description="已有监测记录仍可查看；重新加载可补齐监测问题和平台选项。"
          action={<Button onClick={() => void Promise.all([promptsQuery.refetch(), platformsQuery.refetch()])}>重新加载缺失数据</Button>}
        />
      ) : null}
      {runsFailed ? (
        <RegionErrorState
          title="监测记录暂时无法加载"
          description="当前记录请求未成功，已保留新建监测和表单输入。"
          retryLabel="重新加载记录"
          onRetry={() => void runsQuery.refetch()}
        />
      ) : (
        <>
          <Alert
        type="info"
        showIcon
        message="看完真实回复后，继续生成优化计划"
        description="重点看三件事：AI 有没有提到你的品牌、排在第几、说得准不准。确认后到优化计划页安排内容和再次监测。"
        action={<Button onClick={() => navigate(getMonitoringAnalysisPath(routeContext))}>查看分析诊断</Button>}
          />
          <Table
        rowKey="id"
        loading={runsQuery.isLoading}
        dataSource={visibleRuns}
        pagination={false}
        locale={{ emptyText: <EmptyState title="还没有 AI 回复监测记录" description="来自豆包、Kimi、DeepSeek、通义千问或阶跃星辰的真实 AI 原始回答" reason="真实回复是推荐度、排名、评价、事实准确率和引用来源分析的基础。" nextStep="选择监测问题和 AI 平台，开始一次监测。" actionLabel="新建监测" onAction={openRunModal} /> }}
        scroll={{ x: 1080 }}
        columns={[
          { title: '监测问题', dataIndex: 'promptText', render: (value: string) => <Typography.Text ellipsis>{value || '-'}</Typography.Text> },
          { title: '平台', dataIndex: 'platformCode', render: (value: string) => getPlatformDisplayName(value) },
          { title: '状态', dataIndex: 'status', render: (value: MonitoringRunStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag> },
          { title: '监测进度', render: (_, record) => <RunExecutionState run={record} /> },
          { title: '结果解读', render: (_, record) => <MonitoringResultExplanation run={record} /> },
          { title: 'AI 回答', render: (_, record) => record.response ? <Typography.Text>{record.response.rawText.slice(0, 36)}</Typography.Text> : <Typography.Text type="secondary">待录入</Typography.Text> },
          { title: '解读状态', render: (_, record) => record.analysis ? <Tag color={record.analysis.reviewRequired ? 'orange' : 'green'}>{record.analysis.reviewRequired ? '待确认' : '已解读'}</Tag> : <Tag>未解读</Tag> },
          {
            title: '操作',
            render: (_, record) => (
              <Space>
                <Button type="link" disabled={!canEnterManualResponse(record)} onClick={() => openManualModal(record.id)}>
                  {record.retryStatus === 'retry_pending' || record.status === 'failed' ? '手动补录' : '录入回答'}
                </Button>
                <Button type="link" disabled={!record.response} loading={parseAnalysisMutation.isPending} onClick={() => parseAnalysisMutation.mutate(record.id)}>
                  解读
                </Button>
                <Button type="link" disabled={!record.analysis} onClick={() => openAnalysisModal(record)}>
                  {record.analysis?.reviewRequired ? '需要确认' : '查看解读'}
                </Button>
                <Button type="link" disabled={!record.analysis} onClick={() => navigate(getMonitoringAnalysisPath(routeContext, record))}>
                  生成优化计划
                </Button>
              </Space>
            )
          }
        ]}
          />
        </>
      )}
      <Modal
        title="新建 AI 回复监测"
        open={runModalOpen}
        okText="开始监测"
        cancelText="取消"
        confirmLoading={createRunMutation.isPending}
        onCancel={() => setRunModalOpen(false)}
        onOk={() => runForm.submit()}
      >
        <Form form={runForm} layout="vertical" onFinish={(values) => createRunMutation.mutate(values)}>
          <Form.Item name="promptId" label="监测问题" rules={[{ required: true, message: '请选择监测问题' }]}>
            <Select
              options={prompts.map((prompt) => ({ value: prompt.id, label: prompt.text.slice(0, 60) }))}
              onChange={(promptId) => {
                const prompt = promptMap.get(promptId);
                if (prompt?.platformCodes[0]) {
                  runForm.setFieldValue('platformCode', prompt.platformCodes[0]);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="platformCode" label="AI 平台" rules={[{ required: true, message: '请选择 AI 平台' }]}>
            <Select options={platformOptions} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="录入 AI 回答"
        open={Boolean(manualRunId)}
        okText="保存"
        cancelText="取消"
        confirmLoading={manualResponseMutation.isPending}
        onCancel={() => setManualRunId(null)}
        onOk={() => manualForm.submit()}
      >
        <Form form={manualForm} layout="vertical" onFinish={(values) => manualResponseMutation.mutate(values)}>
          <Form.Item name="rawText" label="AI 回答" rules={[{ required: true, message: '请输入 AI 回答' }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="modelName" label="平台或模型名称">
            <Input placeholder="例如：豆包、Kimi、DeepSeek" />
          </Form.Item>
          <Form.Item name="citationsText" label="引用来源">
            <Input.TextArea rows={3} placeholder="一行一个引用来源" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="确认回复解读"
        open={Boolean(analysisRunId)}
        okText="保存确认"
        cancelText="取消"
        width={720}
        confirmLoading={updateAnalysisMutation.isPending}
        onCancel={() => setAnalysisRunId(null)}
        onOk={() => analysisForm.submit()}
      >
        {confirmationItems.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="需要你确认"
            description={(
              <Space direction="vertical" size={8}>
                {confirmationItems.map((item, index) => (
                  <Space key={`${item.label}_${index}`} direction="vertical" size={2}>
                    <Typography.Text strong>{item.label}：{item.value}</Typography.Text>
                    <Typography.Text>{item.action}</Typography.Text>
                  </Space>
                ))}
              </Space>
            )}
          />
        ) : null}
        <Form form={analysisForm} layout="vertical" onFinish={(values) => updateAnalysisMutation.mutate(values)}>
          <Space size="large" align="start">
            <Form.Item name="brandMentioned" label="有没有出现" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="reviewRequired" label="需要你确认" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Space size="large" align="start">
            <Form.Item name="brandRank" label="排第几">
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="sentiment" label="整体评价">
              <Select options={analysisSentimentOptions} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="accuracyScore" label="说得准不准">
              <InputNumber min={0} max={100} />
            </Form.Item>
            <Form.Item name="citationScore" label="引用可信度">
              <InputNumber min={0} max={100} />
            </Form.Item>
          </Space>
          <Form.Item name="platformEvaluation" label="有没有出现和整体判断">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="recommendationReason" label="AI 为什么这样推荐">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="rankingReason" label="排第几、竞品表现和补强建议">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="expressionCompleteness" label="说得准不准、需要补什么">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="expressionDeviation" label="需要修正的说法">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="competitorMentionsText" label="提到的竞品">
            <Input.TextArea rows={3} placeholder="每行填写：竞品名称｜排名｜评价，例如：竞品 A｜2｜中性" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export function getMonitoringAnalysisPath(
  context: WorkflowRouteContext,
  run?: Pick<MonitoringRunDetail, 'id' | 'promptId'>
): string {
  const path = workflowStagePath('/growth-optimization', {
    ...context,
    runId: run?.id ?? context.runId,
    promptId: run?.promptId ?? context.promptId
  });
  return `${path}#standard-answer-diagnosis`;
}

function MonitoringResultExplanation({ run }: { run: MonitoringRunDetail }) {
  const summary = getMonitoringResultSummary(run);

  return (
    <Space direction="vertical" size={4}>
      <Typography.Text strong>{summary.title}</Typography.Text>
      <Space wrap>
        {summary.lines.map((line) => <ResultLineTag key={line.label} line={line} />)}
      </Space>
      <Typography.Text type="secondary">建议下一步：{summary.nextAction}</Typography.Text>
    </Space>
  );
}

function ResultLineTag({ line }: { line: MonitoringResultLine }) {
  return <Tag color={resultToneColors[line.tone]}>{line.label}：{line.value}</Tag>;
}

function RunExecutionState({ run }: { run: MonitoringRunDetail }) {
  const state = getMonitoringRunExecutionState(run);

  return (
    <Space direction="vertical" size={2}>
      <Tag color={state.color}>{state.label}</Tag>
      {state.hint ? <Typography.Text type="secondary">{state.hint}</Typography.Text> : null}
    </Space>
  );
}

export function getMonitoringRunExecutionState(run: Pick<MonitoringRunDetail, 'status' | 'retryStatus' | 'errorMessage'>): { label: string; color: string; hint?: string } {
  if (run.status === 'running') {
    return { label: '正在监测', color: 'blue', hint: '系统正在向 AI 平台提交问题' };
  }

  if (run.retryStatus === 'retry_pending') {
    return { label: '稍后再试', color: 'gold', hint: '平台暂时未返回结果，系统会自动重试' };
  }

  if (run.retryStatus === 'retried' && run.status === 'failed') {
    return { label: '自动监测没成功', color: 'red', hint: '可以手动录入 AI 原始回复' };
  }

  if (run.status === 'review_required') {
    return { label: '等待手动录入', color: 'orange', hint: '需要手动粘贴 AI 回答' };
  }

  if (run.status === 'completed') {
    return { label: '监测完成', color: 'green' };
  }

  return { label: '等待开始', color: 'default', hint: '确认平台和监测方式后开始获取真实回复' };
}

export function canEnterManualResponse(run: Pick<MonitoringRunDetail, 'status' | 'retryStatus'>): boolean {
  return run.status !== 'completed' || run.retryStatus === 'retry_pending';
}

const modeLabels: Record<PlatformConfig['mode'], string> = {
  api: '自动',
  manual: '手动',
  semi_auto: '浏览器辅助',
  mock: '示例回答（不计入指标）'
};

const statusLabels: Record<MonitoringRunStatus, string> = {
  pending: '待开始',
  running: '监测中',
  completed: '已完成',
  failed: '未成功',
  review_required: '待手动录入'
};

const statusColors: Record<MonitoringRunStatus, string> = {
  pending: 'default',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  review_required: 'orange'
};

const resultToneColors: Record<MonitoringResultLine['tone'], string> = {
  success: 'green',
  warning: 'gold',
  danger: 'red',
  muted: 'default'
};

const analysisSentimentOptions: Array<{ value: AnalysisSentiment; label: string }> = [
  { value: 'positive', label: '正向' },
  { value: 'neutral', label: '中性' },
  { value: 'negative', label: '负向' },
  { value: 'unknown', label: '未知' }
];

function toManualResponsePayload(values: ManualResponseFormValues): ManualResponseInput {
  return {
    rawText: values.rawText,
    modelName: values.modelName,
    citations: values.citationsText?.split('\n').map((item) => item.trim()).filter(Boolean) ?? []
  };
}

function toAnalysisPayload(values: AnalysisFormValues): AnalysisResultInput {
  return {
    brandMentioned: values.brandMentioned,
    brandRank: values.brandRank,
    sentiment: values.sentiment,
    accuracyScore: values.accuracyScore,
    citationScore: values.citationScore,
    platformEvaluation: values.platformEvaluation,
    recommendationReason: values.recommendationReason,
    rankingReason: values.rankingReason,
    expressionCompleteness: values.expressionCompleteness,
    expressionDeviation: values.expressionDeviation,
    competitorMentions: values.competitorMentionsText?.split('\n').map((line) => {
      const [name, rank, sentiment] = line.split(/[|｜]/).map((item) => item.trim());
      return {
        name,
        rank: rank ? Number(rank) : null,
        sentiment: normalizeAnalysisSentiment(sentiment)
      };
    }).filter((item) => item.name) ?? [],
    reviewRequired: values.reviewRequired
  };
}

export function normalizeAnalysisSentiment(value?: string): AnalysisSentiment {
  const sentimentLabels: Record<string, AnalysisSentiment> = {
    positive: 'positive',
    正向: 'positive',
    neutral: 'neutral',
    中性: 'neutral',
    negative: 'negative',
    负向: 'negative',
    unknown: 'unknown',
    未知: 'unknown'
  };

  return sentimentLabels[value?.trim().toLowerCase() ?? ''] ?? 'unknown';
}
