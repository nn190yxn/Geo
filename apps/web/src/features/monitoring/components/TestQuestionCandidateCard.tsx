import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrowserConnectionSession, BrowserResponseCaptureResult, QuestionUserStage, TestAssetGenerationResult, TestPlan, TestPlanCreationResult, TestPlanExecutionResult, TestPlanExecutionStep, TestQuestionCandidate, TestTheme } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getPlatformDisplayName, getStatusDisplay } from '../../../utils/displayLabels';
import { discoveryDimensionLabels, generationMethodLabels, getConnectionSummaryLabel, getDefaultQuestionCandidates, getDurationLabel, getExecutionResultSummary, getPlatformPreview, getQuestionCandidateCountLabel, getThemeCandidateIds, parseQuestionSeedWords, priorityColors, priorityLabels, questionPurposeLabels, themeTypeLabels, toQuestionCandidateUpdateInput, userStageLabels } from './testQuestionDisplay';
import { getBrowserLoginUrl } from './platformConfigDisplay';
import { SearchDemandSnapshotPanel } from './SearchDemandSnapshotPanel';

type Props = {
  brandId: string;
  actionType?: 'primary' | 'default';
  initialPlan?: TestPlan;
};

type QuestionEditFormValues = {
  question: string;
  purposesText: string;
  targetPlatformsText: string;
  priority: TestQuestionCandidate['priority'];
  estimatedValue: string;
  recommendationProbability?: number;
  userStage?: QuestionUserStage;
  generationRationale?: string;
};

export function TestQuestionCandidateCard({ brandId, actionType = 'primary', initialPlan }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [editForm] = Form.useForm<QuestionEditFormValues>();
  const queryClient = useQueryClient();
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<TestQuestionCandidate | null>(null);
  const [savedPlan, setSavedPlan] = useState<TestPlanCreationResult | null>(null);
  const [executionResult, setExecutionResult] = useState<TestPlanExecutionResult | null>(null);
  const [activeBrowserStep, setActiveBrowserStep] = useState<TestPlanExecutionStep | null>(null);
  const [activeBrowserSession, setActiveBrowserSession] = useState<BrowserConnectionSession | null>(null);
  const [browserAnswer, setBrowserAnswer] = useState('');
  const [capturedRunIds, setCapturedRunIds] = useState<string[]>([]);
  const [generationNotice, setGenerationNotice] = useState<GenerationNotice | null>(null);
  const [seedWordsText, setSeedWordsText] = useState('');
  const themesQuery = useQuery({
    queryKey: ['test-themes', brandId],
    queryFn: () => apiGet<TestTheme[]>(`/brands/${brandId}/test-themes`)
  });
  const candidatesQuery = useQuery({
    queryKey: ['test-question-candidates', brandId],
    queryFn: () => apiGet<TestQuestionCandidate[]>(`/brands/${brandId}/test-question-candidates`)
  });
  const themes = themesQuery.data?.success ? themesQuery.data.data : [];
  const candidates = candidatesQuery.data?.success ? candidatesQuery.data.data : [];
  const themeNameMap = useMemo(() => new Map(themes.map((theme) => [theme.id, theme.name])), [themes]);
  const visibleCandidates = showAllQuestions ? candidates : getDefaultQuestionCandidates(candidates, 8);
  const selectedCandidateIds = useMemo(() => candidates.filter((candidate) => candidate.selected).map((candidate) => candidate.id), [candidates]);

  useEffect(() => {
    if (!initialPlan) return;
    setSavedPlan({
      plan: initialPlan,
      questionCount: initialPlan.questions.length,
      platformCount: initialPlan.platformCodes.length,
      targetPlatforms: initialPlan.platformCodes,
      estimatedDurationMinutes: initialPlan.estimatedDurationMinutes,
      connectionSummary: initialPlan.connectionSummary,
      confirmationItems: initialPlan.confirmationItems
    });
  }, [initialPlan]);

  const generateThemesMutation = useMutation({
    mutationFn: () => apiPost<TestAssetGenerationResult<TestTheme>>(`/brands/${brandId}/test-themes/generate`, { seedWords: parseQuestionSeedWords(seedWordsText) }),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['test-themes', brandId] });
        setGenerationNotice(getGenerationNotice('优化方向已生成', response.data));
        showGenerationMessage(messageApi, '优化方向已生成', response.data);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const generateCandidatesMutation = useMutation({
    mutationFn: () => apiPost<TestAssetGenerationResult<TestQuestionCandidate>>(`/brands/${brandId}/test-question-candidates/generate`, { seedWords: parseQuestionSeedWords(seedWordsText) }),
    onSuccess: (response) => {
      if (response.success) {
        setShowAllQuestions(false);
        setSavedPlan(null);
        setExecutionResult(null);
        void queryClient.invalidateQueries({ queryKey: ['test-question-candidates', brandId] });
        setGenerationNotice(getGenerationNotice('监测问题已生成', response.data));
        showGenerationMessage(messageApi, '监测问题已生成', response.data);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const selectionMutation = useMutation({
    mutationFn: ({ candidateIds, selected, themeId }: { candidateIds: string[]; selected: boolean; themeId?: string }) => apiPost<TestQuestionCandidate[]>(`/brands/${brandId}/test-question-candidates/selection`, { candidateIds, selected, themeId }),
    onSuccess: (response) => {
      if (response.success) {
        setSavedPlan(null);
        setExecutionResult(null);
        void queryClient.invalidateQueries({ queryKey: ['test-question-candidates', brandId] });
        void messageApi.success('监测问题选择已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const editCandidateMutation = useMutation({
    mutationFn: (values: QuestionEditFormValues) => {
      if (!editingCandidate) {
        throw new Error('请先选择要编辑的监测问题');
      }

      return apiPatch<TestQuestionCandidate>(`/brands/${brandId}/test-question-candidates/${editingCandidate.id}`, toQuestionCandidateUpdateInput(values));
    },
    onSuccess: (response) => {
      if (response.success) {
        setEditingCandidate(null);
        setSavedPlan(null);
        setExecutionResult(null);
        editForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['test-question-candidates', brandId] });
        void messageApi.success('监测问题已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const createPlanMutation = useMutation({
    mutationFn: () => apiPost<TestPlanCreationResult>(`/brands/${brandId}/test-plans`, { candidateIds: selectedCandidateIds, name: '首轮 AI 回复监测计划' }),
    onSuccess: (response) => {
      if (response.success) {
        setSavedPlan(response.data);
        setExecutionResult(null);
        void messageApi.success(`监测计划已保存：${response.data.questionCount} 个问题，${response.data.platformCount} 个平台`);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const executePlanMutation = useMutation({
    mutationFn: (planId: string) => apiPost<TestPlanExecutionResult>(`/brands/${brandId}/test-plans/${planId}/execute`, {}),
    onSuccess: (response) => {
      if (response.success) {
        setExecutionResult(response.data);
        setSavedPlan((current) => current ? { ...current, plan: response.data.plan } : current);
        void messageApi.success('首轮回复监测已开始');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const startBrowserSessionMutation = useMutation({
    mutationFn: (step: TestPlanExecutionStep) => apiPost<BrowserConnectionSession>('/platforms/browser-sessions', {
      platformCode: step.platformCode,
      testPlanId: executionResult?.plan.id
    }),
    onSuccess: (response, step) => {
      if (response.success) {
        setActiveBrowserStep(step);
        setActiveBrowserSession(response.data);
        setBrowserAnswer('');
        void messageApi.success('官方平台已打开，请登录后提交监测问题');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const confirmBrowserLoginMutation = useMutation({
    mutationFn: (sessionId: string) => apiPatch<BrowserConnectionSession>(`/platforms/browser-sessions/${sessionId}`, {
      event: 'login_confirmed',
      lastMessage: '用户已确认登录，并准备提交监测问题。'
    }),
    onSuccess: (response) => {
      if (response.success) {
        setActiveBrowserSession(response.data);
        void messageApi.success('登录状态已确认，可以回填真实回答');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const captureBrowserResponseMutation = useMutation({
    mutationFn: () => {
      if (!activeBrowserSession || !activeBrowserStep?.runId) {
        throw new Error('浏览器会话或监测运行不存在');
      }
      return apiPost<BrowserResponseCaptureResult>(`/platforms/browser-sessions/${activeBrowserSession.id}/responses`, {
        runId: activeBrowserStep.runId,
        rawText: browserAnswer
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        setCapturedRunIds((current) => [...new Set([...current, response.data.run.id])]);
        setActiveBrowserStep(null);
        setActiveBrowserSession(null);
        setBrowserAnswer('');
        void queryClient.invalidateQueries({ queryKey: ['monitoring-runs', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
        void messageApi.success('真实回答已保存并完成分析');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openEditCandidate = (candidate: TestQuestionCandidate) => {
    setEditingCandidate(candidate);
    editForm.setFieldsValue({
      question: candidate.question,
      purposesText: candidate.purposes.join('、'),
      targetPlatformsText: candidate.targetPlatforms.map(getPlatformDisplayName).join('、'),
      priority: candidate.priority,
      estimatedValue: candidate.estimatedValue,
      recommendationProbability: candidate.recommendationProbability,
      userStage: candidate.userStage,
      generationRationale: candidate.generationRationale
    });
  };

  const startFirstRoundMonitoring = async () => {
    let plan = savedPlan;

    if (!plan) {
      const response = await createPlanMutation.mutateAsync();

      if (!response.success) {
        return;
      }

      plan = response.data;
      setSavedPlan(plan);
    }

    void executePlanMutation.mutate(plan.plan.id);
  };

  const startBrowserAssistedMonitoring = (step: TestPlanExecutionStep) => {
    window.open(getBrowserLoginUrl(step.platformCode), '_blank', 'noopener,noreferrer');
    startBrowserSessionMutation.mutate(step);
  };

  return (
    <Card
      id="test-question-candidate-card"
      title="选择监测问题"
      extra={(
        <Space>
          {contextHolder}
          <Button loading={generateThemesMutation.isPending} onClick={() => generateThemesMutation.mutate()}>生成优化方向</Button>
          <Button type={actionType} loading={generateCandidatesMutation.isPending} onClick={() => generateCandidatesMutation.mutate()}>生成监测问题</Button>
          <Button disabled={selectedCandidateIds.length === 0} loading={createPlanMutation.isPending} onClick={() => createPlanMutation.mutate()}>保存为监测计划</Button>
          <Button type={actionType} disabled={selectedCandidateIds.length === 0 && !savedPlan} loading={createPlanMutation.isPending || executePlanMutation.isPending} onClick={() => void startFirstRoundMonitoring()}>开始首轮监测</Button>
        </Space>
      )}
    >
      <Space direction="vertical" size={16} className="page-stack">
        <PageErrorAlert response={themesQuery.data} />
        <PageErrorAlert response={candidatesQuery.data} />
        <Input.TextArea
          value={seedWordsText}
          rows={2}
          maxLength={400}
          placeholder="可选：输入产品、场景或用户需求种子词，用逗号或换行分隔"
          aria-label="问题拓展种子词"
          onChange={(event) => setSeedWordsText(event.target.value)}
        />
        <Alert
          type="info"
          showIcon
          message="先看优化方向，再选监测问题"
          description="优化方向说明为什么要监测这个业务主题；监测问题会直接用于豆包、Kimi、DeepSeek、通义千问和阶跃星辰的首轮回复监测。"
        />
        <Alert
          type="success"
          showIcon
          message="保存监测计划后继续开始首轮监测"
          description="已选问题会按目标平台生成监测计划。开始监测后，已填写平台密钥的平台会自动获取回复，浏览器和手动录入会展示需要你确认的下一步。"
        />
        {generationNotice ? (
          <Alert
            type={generationNotice.type}
            showIcon
            message={generationNotice.title}
            description={generationNotice.description}
          />
        ) : null}
        <SearchDemandSnapshotPanel brandId={brandId} />
        {savedPlan ? (
          <Card size="small" title="首轮回复监测计划">
            <Space direction="vertical" size={12} className="page-stack">
              <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
                <Descriptions.Item label="监测问题">{savedPlan.questionCount} 个</Descriptions.Item>
                <Descriptions.Item label="目标平台">{getPlatformPreview(savedPlan.targetPlatforms)}</Descriptions.Item>
                <Descriptions.Item label="预计耗时">{getDurationLabel(savedPlan.estimatedDurationMinutes)}</Descriptions.Item>
                <Descriptions.Item label="计划状态">{getStatusDisplay(savedPlan.plan.status)}</Descriptions.Item>
              </Descriptions>
              <Space wrap>
                {savedPlan.connectionSummary.map((summary) => <Tag key={summary.platformCode}>{getConnectionSummaryLabel(summary)}</Tag>)}
              </Space>
              {savedPlan.confirmationItems.length > 0 ? <Alert type="warning" showIcon message="需要你确认的事项" description={savedPlan.confirmationItems.join('；')} /> : null}
              <Button type={actionType} loading={executePlanMutation.isPending} onClick={() => void executePlanMutation.mutate(savedPlan.plan.id)}>一键开始首轮监测</Button>
            </Space>
          </Card>
        ) : null}
        {executionResult ? (
          <Space direction="vertical" size={12} className="page-stack">
            <Alert
              type={executionResult.configurationItems.length > 0 || executionResult.confirmationItems.length > 0 ? 'warning' : 'success'}
              showIcon
              message="首轮回复监测已开始"
              description={`${getExecutionResultSummary(executionResult)}。${executionResult.confirmationItems.length > 0 ? `需要确认：${executionResult.confirmationItems.join('；')}` : '可以在下方 AI 回复监测记录查看自动结果，浏览器和手动录入会显示对应下一步。'}`}
            />
            {executionResult.browserSteps.filter((step) => step.runId).map((step) => (
              <Card key={step.runId} size="small" title={`${getPlatformDisplayName(step.platformCode)} 浏览器辅助监测`}>
                <Space direction="vertical" size={8} className="page-stack">
                  <Typography.Paragraph copyable={{ text: step.question }}>{step.question}</Typography.Paragraph>
                  <Space wrap>
                    <Tag color={capturedRunIds.includes(step.runId!) ? 'green' : 'gold'}>{capturedRunIds.includes(step.runId!) ? '已回填并分析' : '等待真实回答'}</Tag>
                    <Button
                      disabled={capturedRunIds.includes(step.runId!)}
                      loading={startBrowserSessionMutation.isPending}
                      onClick={() => startBrowserAssistedMonitoring(step)}
                    >开始辅助监测</Button>
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        ) : null}
        <Table
          rowKey="id"
          size="small"
          loading={themesQuery.isLoading}
          dataSource={themes}
          pagination={false}
          locale={{ emptyText: <EmptyState title="还没有优化方向" description="本轮需要监测的业务主题和优先级" reason="优化方向会决定默认监测问题、目标平台和首轮真实回复样本。" nextStep="根据品牌资料生成优化方向。" actionLabel="生成优化方向" onAction={() => generateThemesMutation.mutate()} /> }}
          columns={[
            { title: '优化方向', dataIndex: 'name' },
            { title: '类型', dataIndex: 'type', render: (value: TestTheme['type']) => themeTypeLabels[value] },
            { title: '推荐优先级', dataIndex: 'priority', render: (value: TestTheme['priority']) => <Tag color={priorityColors[value]}>{priorityLabels[value]}</Tag> },
            { title: '为什么要测', dataIndex: 'businessExplanation' },
            { title: '预计测试价值', dataIndex: 'estimatedValue' },
            {
              title: '批量选择',
              render: (_, record) => {
                const ids = getThemeCandidateIds(candidates, record.id);
                return (
                  <Space>
                    <Button size="small" disabled={ids.length === 0} onClick={() => selectionMutation.mutate({ themeId: record.id, candidateIds: ids, selected: true })}>全选</Button>
                    <Button size="small" disabled={ids.length === 0} onClick={() => selectionMutation.mutate({ themeId: record.id, candidateIds: ids, selected: false })}>取消</Button>
                  </Space>
                );
              }
            }
          ]}
        />
        <Space align="center">
          <Typography.Text strong>默认推荐问题</Typography.Text>
          <Typography.Text type="secondary">{getQuestionCandidateCountLabel(candidates.length, visibleCandidates.length)}</Typography.Text>
          {candidates.length > visibleCandidates.length || showAllQuestions ? (
            <Button type="link" onClick={() => setShowAllQuestions((value) => !value)}>{showAllQuestions ? '收起问题' : '查看更多问法'}</Button>
          ) : null}
        </Space>
        <Table
          rowKey="id"
          size="small"
          loading={candidatesQuery.isLoading}
          dataSource={visibleCandidates}
          rowSelection={{
            selectedRowKeys: selectedCandidateIds,
            onSelect: (record, selected) => selectionMutation.mutate({ candidateIds: [record.id], selected }),
            onSelectAll: (selected, selectedRows, changedRows) => selectionMutation.mutate({ candidateIds: changedRows.map((row) => row.id), selected })
          }}
          pagination={false}
          locale={{ emptyText: <EmptyState title="还没有监测问题" description="用户会向 AI 提出的真实问题" reason="监测问题是获取真实 AI 回复、生成分析诊断和安排内容任务的起点。" nextStep="生成监测问题，并勾选要进入首轮监测的问题。" actionLabel="生成监测问题" onAction={() => generateCandidatesMutation.mutate()} /> }}
          columns={[
            { title: '监测问题', dataIndex: 'question' },
            { title: '所属优化方向', dataIndex: 'themeId', render: (value: string) => themeNameMap.get(value) ?? '-' },
            { title: '拓展维度', dataIndex: 'discoveryDimension', render: (value: TestQuestionCandidate['discoveryDimension']) => value ? discoveryDimensionLabels[value] : '历史候选' },
            { title: '测试目的', dataIndex: 'purposes', render: (values: TestQuestionCandidate['purposes']) => <Space wrap>{values.map((value) => <Tag key={value}>{questionPurposeLabels[value]}</Tag>)}</Space> },
            { title: '目标平台', dataIndex: 'targetPlatforms', render: (values: string[]) => getPlatformPreview(values) },
            { title: '业务价值', render: (_, record) => <Space direction="vertical" size={2}><Tag color={priorityColors[record.businessValue ?? record.priority]}>{priorityLabels[record.businessValue ?? record.priority]}</Tag><Typography.Text type="secondary">推荐概率 {Math.round((record.recommendationProbability ?? 0) * 100)}%</Typography.Text></Space> },
            { title: '用户阶段', dataIndex: 'userStage', render: (value: TestQuestionCandidate['userStage']) => value ? userStageLabels[value] : '-' },
            { title: '生成依据', render: (_, record) => <Space direction="vertical" size={2}><Typography.Text>{record.generationRationale || record.estimatedValue}</Typography.Text><Tag>{record.generationMethod ? generationMethodLabels[record.generationMethod] : '历史候选'}</Tag>{record.mergedFrom?.length ? <Typography.Text type="secondary">已合并 {record.mergedFrom.length} 个重复来源</Typography.Text> : null}</Space> },
            { title: '操作', render: (_, record) => <Button type="link" onClick={() => openEditCandidate(record)}>编辑</Button> }
          ]}
        />
        <Modal
          title="编辑监测问题"
          open={Boolean(editingCandidate)}
          okText="保存"
          cancelText="取消"
          confirmLoading={editCandidateMutation.isPending}
          onCancel={() => setEditingCandidate(null)}
          onOk={() => editForm.submit()}
        >
          <Form form={editForm} layout="vertical" onFinish={(values) => editCandidateMutation.mutate(values)}>
            <Form.Item name="question" label="监测问题" rules={[{ required: true, message: '请输入监测问题' }]}><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="purposesText" label="测试目的" rules={[{ required: true, message: '请输入测试目的' }]}><Input placeholder="brand_mentioned、rank_first" /></Form.Item>
            <Form.Item name="targetPlatformsText" label="目标平台" rules={[{ required: true, message: '请输入目标平台' }]}><Input placeholder="豆包、Kimi、DeepSeek、通义千问、阶跃星辰" /></Form.Item>
            <Form.Item name="priority" label="推荐优先级" rules={[{ required: true, message: '请选择推荐优先级' }]}><Select options={[{ value: 'high', label: '高优先级' }, { value: 'medium', label: '中优先级' }, { value: 'low', label: '低优先级' }]} /></Form.Item>
            <Form.Item name="estimatedValue" label="预计测试价值" rules={[{ required: true, message: '请输入预计测试价值' }]}><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="recommendationProbability" label="推荐概率"><InputNumber min={0} max={1} step={0.05} className="page-stack" /></Form.Item>
            <Form.Item name="userStage" label="用户阶段"><Select allowClear options={Object.entries(userStageLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="generationRationale" label="生成依据"><Input.TextArea rows={2} /></Form.Item>
          </Form>
        </Modal>
      </Space>
      <Modal
        title={activeBrowserStep ? `${getPlatformDisplayName(activeBrowserStep.platformCode)} 真实回答回填` : '真实回答回填'}
        open={Boolean(activeBrowserStep && activeBrowserSession)}
        footer={null}
        onCancel={() => {
          setActiveBrowserStep(null);
          setActiveBrowserSession(null);
          setBrowserAnswer('');
        }}
      >
        {activeBrowserStep && activeBrowserSession ? (
          <Space direction="vertical" size={16} className="page-stack">
            <Alert
              type="info"
              showIcon
              message="在官方平台完成提交后回填回答"
              description="系统只保存你主动粘贴的回答，不读取登录信息、浏览器存储或平台页面。"
            />
            <Typography.Paragraph copyable={{ text: activeBrowserStep.question }}>{activeBrowserStep.question}</Typography.Paragraph>
            <Space wrap>
              <Button onClick={() => window.open(getBrowserLoginUrl(activeBrowserStep.platformCode), '_blank', 'noopener,noreferrer')}>重新打开官方平台</Button>
              <Button
                type={activeBrowserSession.status === 'ready' ? 'default' : 'primary'}
                disabled={activeBrowserSession.status === 'ready'}
                loading={confirmBrowserLoginMutation.isPending}
                onClick={() => confirmBrowserLoginMutation.mutate(activeBrowserSession.id)}
              >{activeBrowserSession.status === 'ready' ? '已确认登录' : '我已完成登录'}</Button>
            </Space>
            <Input.TextArea
              rows={8}
              value={browserAnswer}
              disabled={activeBrowserSession.status !== 'ready'}
              placeholder="粘贴官方平台返回的完整真实回答"
              onChange={(event) => setBrowserAnswer(event.target.value)}
            />
            <Button
              type="primary"
              disabled={activeBrowserSession.status !== 'ready' || !browserAnswer.trim()}
              loading={captureBrowserResponseMutation.isPending}
              onClick={() => captureBrowserResponseMutation.mutate()}
            >保存回答并分析</Button>
          </Space>
        ) : null}
      </Modal>
    </Card>
  );
}

function showGenerationMessage<TItem>(messageApi: ReturnType<typeof message.useMessage>[0], successText: string, result: TestAssetGenerationResult<TItem>) {
  if (result.missingProfileFields.length > 0) {
    void messageApi.warning(`${successText}，有些品牌资料还可以补充：${result.missingProfileFields.join('、')}`);
    return;
  }

  if (result.source === 'fallback') {
    void messageApi.info(`${successText}，已先用基础模板生成`);
    return;
  }

  void messageApi.success(successText);
}

type GenerationNotice = {
  title: string;
  type: 'success' | 'info' | 'warning';
  description: string;
};

export function getGenerationNotice<TItem>(successText: string, result: TestAssetGenerationResult<TItem>): GenerationNotice {
  const details: string[] = [];

  if (result.source === 'fallback') {
    details.push('当前先用基础模板生成，补齐平台密钥后可使用大模型生成。');
  } else {
    details.push('当前使用大模型生成。');
  }

  if (result.missingProfileFields.length > 0) {
    details.push(`建议补充品牌资料：${result.missingProfileFields.join('、')}。`);
  }

  if (result.generationNotes.length > 0) {
    details.push(`生成说明：${result.generationNotes.join('；')}。`);
  }

  return {
    title: successText,
    type: result.missingProfileFields.length > 0 ? 'warning' : result.source === 'fallback' ? 'info' : 'success',
    description: details.join(' ')
  };
}
