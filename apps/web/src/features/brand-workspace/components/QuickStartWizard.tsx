import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Switch,
  Tag,
  Typography,
  message
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  KnowledgeSourceStatus,
  QuickStartFactCandidate,
  QuickStartQuestionsDraft,
  QuickStartReadinessStepInput,
  QuickStartSession,
  QuickStartStep,
  QuickStartStepUpdateInput,
  QuickStartWebsiteStepInput,
  SourcePagePlanItem,
  SourcePageRole
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { PageSkeleton, RegionErrorState } from '../../../components/PageState';
import { ProductPage, ProductPageSection } from '../../../components/ProductPage';
import {
  createQuickStartEditorState,
  getNextQuickStartStep,
  getQuickStartFieldLabel,
  getQuickStartReadiness,
  getQuickStartStepIndex,
  isQuickStartVersionConflict,
  quickStartSteps,
  restoreQuickStartEditorState,
  updateQuickStartFact,
  type QuickStartEditorState
} from './quickStartState';
import { getPlatformDisplayName } from '../../../utils/displayLabels';

type QuickStartWizardProps = {
  brandId: string;
  brandName?: string;
  onExit: () => void;
  onViewMoreQuestions: () => void;
  onStartMonitoring: (planId: string) => void;
};

type SaveStepVariables = {
  step: QuickStartStep;
  data: QuickStartStepUpdateInput['data'];
};

export async function getOrCreateQuickStartSession(
  brandId: string,
  getSession = apiGet<QuickStartSession>,
  createSession = apiPost<QuickStartSession>
): Promise<ApiResponse<QuickStartSession>> {
  const path = `/brands/${encodeURIComponent(brandId)}/quick-start-session`;
  const response = await getSession(path);
  if (response.success) return response;
  if (response.error.code === 'REQUEST_ERROR' && response.error.message.includes('快速接入会话不存在')) {
    return createSession(path, {});
  }
  return response;
}

export function QuickStartWizard({ brandId, brandName, onExit, onViewMoreQuestions, onStartMonitoring }: QuickStartWizardProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const queryKey = ['quick-start-session', brandId] as const;
  const [editor, setEditor] = useState<QuickStartEditorState>(() => createQuickStartEditorState(brandName));
  const sessionQuery = useQuery({
    queryKey,
    queryFn: () => getOrCreateQuickStartSession(brandId),
    retry: false,
    refetchOnWindowFocus: false
  });
  const session = sessionQuery.data?.success ? sessionQuery.data.data : null;

  useEffect(() => {
    setEditor(createQuickStartEditorState(brandName));
  }, [brandId]);

  useEffect(() => {
    if (session) setEditor(restoreQuickStartEditorState(session, brandName));
  }, [session]);

  useEffect(() => {
    if (!brandName) return;
    setEditor((current) => current.website.brandName
      ? current
      : { ...current, website: { ...current.website, brandName } });
  }, [brandName]);

  const saveMutation = useMutation({
    mutationFn: ({ step, data }: SaveStepVariables) => {
      if (!session) throw new Error('快速接入会话仍在加载');
      return apiPatch<QuickStartSession>(
        `/brands/${encodeURIComponent(brandId)}/quick-start-session/steps/${step}`,
        { version: session.version, data }
      );
    },
    onSuccess: async (response, variables) => {
      if (response.success) {
        queryClient.setQueryData(queryKey, response);
        setEditor((current) => ({ ...current, activeStep: getNextQuickStartStep(variables.step) }));
        void messageApi.success(variables.step === 'readiness' ? '快速接入已完成' : '当前步骤已保存');
        if (variables.step === 'readiness' && response.data.draft.readiness?.testPlanId) {
          onStartMonitoring(response.data.draft.readiness.testPlanId);
        }
        return;
      }
      if (isQuickStartVersionConflict(response.error.code)) {
        void messageApi.warning('其他页面已更新');
        await sessionQuery.refetch();
        return;
      }
      void messageApi.error(response.error.message);
    },
    onError: (error) => void messageApi.error(error instanceof Error ? error.message : '当前步骤保存失败')
  });

  const saveStep = (step: QuickStartStep, data: QuickStartStepUpdateInput['data']) => {
    saveMutation.mutate({ step, data });
  };

  return (
    <QuickStartWizardView
      session={session}
      editor={editor}
      loading={sessionQuery.isLoading}
      errorMessage={sessionQuery.data && !sessionQuery.data.success ? sessionQuery.data.error.message : undefined}
      saving={saveMutation.isPending}
      contextHolder={contextHolder}
      onExit={onExit}
      onViewMoreQuestions={onViewMoreQuestions}
      onRetry={() => void sessionQuery.refetch()}
      onStepChange={(activeStep) => setEditor((current) => ({ ...current, activeStep }))}
      onWebsiteChange={(website) => setEditor((current) => ({ ...current, website }))}
      onFactsChange={(facts) => setEditor((current) => ({ ...current, facts }))}
      onQuestionsChange={(questions) => setEditor((current) => ({ ...current, questions }))}
      onSave={saveStep}
    />
  );
}

export type QuickStartWizardViewProps = {
  session: QuickStartSession | null;
  editor: QuickStartEditorState;
  loading: boolean;
  saving: boolean;
  errorMessage?: string;
  contextHolder?: React.ReactNode;
  onExit: () => void;
  onViewMoreQuestions: () => void;
  onRetry: () => void;
  onStepChange: (step: QuickStartStep) => void;
  onWebsiteChange: (website: QuickStartWebsiteStepInput) => void;
  onFactsChange: (facts: QuickStartFactCandidate[]) => void;
  onQuestionsChange: (questions: QuickStartQuestionsDraft['items']) => void;
  onSave: (step: QuickStartStep, data: QuickStartStepUpdateInput['data']) => void;
};

export function QuickStartWizardView({
  session,
  editor,
  loading,
  saving,
  errorMessage,
  contextHolder,
  onExit,
  onViewMoreQuestions,
  onRetry,
  onStepChange,
  onWebsiteChange,
  onFactsChange,
  onQuestionsChange,
  onSave
}: QuickStartWizardViewProps) {
  const reachedStep = getQuickStartStepIndex(session?.currentStep ?? 'website');
  const currentStep = getQuickStartStepIndex(editor.activeStep);

  return (
    <ProductPage
      title="快速接入向导"
      description="按四步保存官网与品牌事实，离开页面后仍可继续上次进度。"
      context={session?.status === 'completed' ? <Tag color="green">接入已完成</Tag> : <Tag color="blue">进度自动保存到服务端</Tag>}
      secondaryActions={<Button onClick={onExit}>退出向导</Button>}
      className="quick-start-page"
    >
      {contextHolder}
      {loading ? <PageSkeleton rows={5} /> : errorMessage ? (
        <RegionErrorState title="快速接入暂时无法加载" description={errorMessage} onRetry={onRetry} />
      ) : (
        <div className="quick-start-shell" data-responsive="desktop-sidebar mobile-stack">
          <nav className="quick-start-navigation" aria-label="快速接入步骤">
            <Steps
              direction="vertical"
              size="small"
              current={currentStep}
              onChange={(index) => {
                if (index <= reachedStep) onStepChange(quickStartSteps[index].key);
              }}
              items={quickStartSteps.map((step, index) => ({
                title: step.title,
                disabled: index > reachedStep
              }))}
            />
          </nav>
          <main className="quick-start-content">
            {editor.activeStep === 'website' ? (
              <WebsiteStep
                website={editor.website}
                crawlStatus={session?.draft.website?.crawlStatus}
                sourcePlanConfirmedAt={session?.draft.website?.sourcePagePlan?.confirmedAt}
                saving={saving}
                onChange={onWebsiteChange}
                onSave={() => onSave('website', editor.website)}
              />
            ) : null}
            {editor.activeStep === 'facts' ? (
              <FactsStep
                candidates={editor.facts}
                saving={saving}
                onChange={onFactsChange}
                onSave={() => onSave('facts', { candidates: editor.facts })}
              />
            ) : null}
            {editor.activeStep === 'questions' ? (
              <QuestionsStep
                items={editor.questions}
                saving={saving}
                onChange={onQuestionsChange}
                onViewMore={onViewMoreQuestions}
                onSave={() => onSave('questions', {
                  items: editor.questions,
                  metadata: session?.draft.questions?.metadata
                })}
              />
            ) : null}
            {editor.activeStep === 'readiness' ? (
              <ReadinessStep
                session={session}
                candidates={editor.facts}
                questions={editor.questions}
                saving={saving}
                onComplete={() => onSave('readiness', { completed: true } satisfies QuickStartReadinessStepInput)}
              />
            ) : null}
          </main>
        </div>
      )}
    </ProductPage>
  );
}

function WebsiteStep({
  website,
  crawlStatus,
  sourcePlanConfirmedAt,
  saving,
  onChange,
  onSave
}: {
  website: QuickStartWebsiteStepInput;
  crawlStatus?: KnowledgeSourceStatus;
  sourcePlanConfirmedAt?: string;
  saving: boolean;
  onChange: (website: QuickStartWebsiteStepInput) => void;
  onSave: () => void;
}) {
  const status = crawlStatus ? crawlStatusDisplay[crawlStatus] : null;
  const sourcePageItems = website.sourcePagePlan?.items ?? [];
  const canSave = Boolean(
    website.brandName.trim()
    && website.websiteUrl.trim()
    && website.targetMarkets.length > 0
    && (sourcePageItems.length === 0 || sourcePageItems.some((item) => item.included))
  );
  return (
    <ProductPageSection title="官网信息" description="填写基础信息后将触发官网浅层发现，并生成待确认的品牌事实。">
      <Space direction="vertical" size={16} className="page-stack">
        {status ? <Alert type={status.type} showIcon message={`官网发现：${status.label}`} description={status.description} /> : null}
        <div className="quick-start-form-grid">
          <label className="quick-start-field">
            <Typography.Text strong>品牌名称</Typography.Text>
            <Input value={website.brandName} onChange={(event) => onChange({ ...website, brandName: event.target.value })} />
          </label>
          <label className="quick-start-field">
            <Typography.Text strong>官网地址</Typography.Text>
            <Input placeholder="https://example.com" value={website.websiteUrl} onChange={(event) => onChange({ ...website, websiteUrl: event.target.value })} />
          </label>
          <label className="quick-start-field">
            <Typography.Text strong>目标市场</Typography.Text>
            <TagInput values={website.targetMarkets} placeholder="输入城市或市场后回车" onChange={(targetMarkets) => onChange({ ...website, targetMarkets })} />
          </label>
          <label className="quick-start-field">
            <Typography.Text strong>竞品（可选）</Typography.Text>
            <TagInput values={website.competitors ?? []} placeholder="输入竞品后回车" onChange={(competitors) => onChange({ ...website, competitors })} />
          </label>
        </div>
        {sourcePageItems.length > 0 ? (
          <SourcePagePlanEditor
            websiteUrl={website.websiteUrl}
            items={sourcePageItems}
            confirmedAt={sourcePlanConfirmedAt}
            onChange={(items) => onChange({ ...website, sourcePagePlan: { items } })}
          />
        ) : null}
        {!canSave ? <Typography.Text type="secondary">请填写品牌名称、有效官网地址和至少一个目标市场。</Typography.Text> : null}
        <div className="quick-start-actions"><Button type="primary" loading={saving} disabled={!canSave} onClick={onSave}>{sourcePageItems.length > 0 ? '确认来源范围并继续' : '保存官网信息并继续'}</Button></div>
      </Space>
    </ProductPageSection>
  );
}

function SourcePagePlanEditor({
  websiteUrl,
  items,
  confirmedAt,
  onChange
}: {
  websiteUrl: string;
  items: SourcePagePlanItem[];
  confirmedAt?: string;
  onChange: (items: SourcePagePlanItem[]) => void;
}) {
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [addError, setAddError] = useState<string>();
  const addPage = () => {
    let url: URL;
    let website: URL;
    try {
      website = new URL(websiteUrl);
      url = new URL(manualUrl, website);
    } catch {
      setAddError('请输入有效的官网页面 URL。');
      return;
    }
    url.hash = '';
    if (url.origin !== website.origin || !['http:', 'https:'].includes(url.protocol)) {
      setAddError('只能添加与官网同源的 HTTP(S) 页面。');
      return;
    }
    if (items.some((item) => item.url === url.toString())) {
      setAddError('该页面已经在来源计划中。');
      return;
    }
    onChange([...items, {
      id: `manual_source_page_${Date.now()}`,
      url: url.toString(),
      title: manualTitle.trim() || '人工添加页面',
      sourceRole: 'other',
      selectionReason: '由用户人工加入官网来源范围。',
      included: true,
      processingStatus: 'planned'
    }]);
    setManualUrl('');
    setManualTitle('');
    setAddError(undefined);
  };

  return (
    <Card
      size="small"
      title="官网来源页面计划"
      extra={confirmedAt ? <Tag color="green">范围已确认</Tag> : <Tag color="gold">等待确认</Tag>}
      className="quick-start-source-plan"
    >
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text type="secondary">深度抓取前确认需要纳入的同源页面。系统只展示候选范围，当前不会访问这些页面。</Typography.Text>
        {items.map((item) => (
          <Card key={item.id} size="small" className="quick-start-source-page">
            <Space direction="vertical" size={8} className="page-stack">
              <Space wrap>
                <Switch
                  size="small"
                  checked={item.included}
                  onChange={(included) => onChange(items.map((current) => current.id === item.id ? { ...current, included } : current))}
                />
                <Typography.Text strong>{item.title}</Typography.Text>
                <Tag color={sourcePageStatusDisplay[item.processingStatus].color}>{sourcePageStatusDisplay[item.processingStatus].label}</Tag>
              </Space>
              <Typography.Link href={item.url} target="_blank" rel="noreferrer">{item.url}</Typography.Link>
              <Select
                value={item.sourceRole}
                options={sourcePageRoleOptions}
                onChange={(sourceRole: SourcePageRole) => onChange(items.map((current) => current.id === item.id ? { ...current, sourceRole } : current))}
              />
              <Typography.Text type="secondary">选取原因：{item.selectionReason}</Typography.Text>
              {item.errorMessage ? <Alert type="warning" showIcon message={item.errorMessage} /> : null}
              <Space wrap>
                {item.processingStatus === 'failed' ? (
                  <Button size="small" onClick={() => onChange(items.map((current) => current.id === item.id ? { ...current, processingStatus: 'planned', errorMessage: undefined, included: true } : current))}>重试此页面</Button>
                ) : null}
                <Button size="small" danger disabled={items.length === 1} onClick={() => onChange(items.filter((current) => current.id !== item.id))}>移除页面</Button>
              </Space>
            </Space>
          </Card>
        ))}
        {!items.some((item) => item.included) ? <Alert type="warning" showIcon message="至少需要纳入一个官网来源页面" /> : null}
        <div className="quick-start-source-page-add">
          <Input placeholder="同源页面 URL" value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} />
          <Input placeholder="页面标题（可选）" value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} />
          <Button disabled={!manualUrl.trim()} onClick={addPage}>添加页面</Button>
        </div>
        {addError ? <Typography.Text type="danger">{addError}</Typography.Text> : null}
      </Space>
    </Card>
  );
}

function FactsStep({
  candidates,
  saving,
  onChange,
  onSave
}: {
  candidates: QuickStartFactCandidate[];
  saving: boolean;
  onChange: (facts: QuickStartFactCandidate[]) => void;
  onSave: () => void;
}) {
  const readiness = getQuickStartReadiness(candidates);
  return (
    <ProductPageSection title="事实确认" description="逐条核对官网发现结果。编辑只更新确认值，原始值和来源证据会完整保留。">
      <Space direction="vertical" size={16} className="page-stack">
        {candidates.length === 0 ? <Alert type="info" showIcon message="暂无事实候选" description="请先保存官网信息。官网发现失败时也会生成可人工确认的基础事实。" /> : null}
        {readiness.unresolvedCriticalFacts.length > 0 ? (
          <Alert type="warning" showIcon message="关键事实尚未确认" description="仍有待确认或已拒绝的关键事实，当前可以继续选择问题，完成执行准备前需要逐条确认或编辑后确认。" />
        ) : null}
        <div className="quick-start-fact-grid">
          {candidates.map((candidate) => (
            <FactCandidateCard
              key={candidate.id}
              candidate={candidate}
              onChange={(update) => onChange(updateQuickStartFact(candidates, candidate.id, update))}
            />
          ))}
        </div>
        <div className="quick-start-actions"><Button type="primary" loading={saving} onClick={onSave}>保存事实确认并继续</Button></div>
      </Space>
    </ProductPageSection>
  );
}

function FactCandidateCard({
  candidate,
  onChange
}: {
  candidate: QuickStartFactCandidate;
  onChange: (update: Pick<QuickStartFactCandidate, 'status'> & { editedValue?: string }) => void;
}) {
  const editedValue = candidate.editedValue ?? candidate.extractedValue;
  return (
    <Card size="small" className="quick-start-fact-card">
      <Space direction="vertical" size={12} className="page-stack">
        <Space wrap>
          <Typography.Text strong>{getQuickStartFieldLabel(candidate.fieldKey)}</Typography.Text>
          {candidate.isCritical ? <Tag color="red">关键事实</Tag> : null}
          <Tag color={factStatusDisplay[candidate.status].color}>{factStatusDisplay[candidate.status].label}</Tag>
          <Tag>置信度 {Math.round(candidate.confidence * 100)}%</Tag>
        </Space>
        <div><Typography.Text type="secondary">原始值</Typography.Text><Typography.Paragraph>{candidate.extractedValue}</Typography.Paragraph></div>
        <label className="quick-start-field">
          <Typography.Text type="secondary">确认值</Typography.Text>
          <Input.TextArea rows={2} value={editedValue} onChange={(event) => onChange({ status: candidate.status, editedValue: event.target.value })} />
        </label>
        <div className="quick-start-source">
          <Typography.Text type="secondary">来源证据</Typography.Text>
          <Typography.Paragraph>
            {candidate.url ? <Typography.Link href={candidate.url} target="_blank" rel="noreferrer">{candidate.title ?? candidate.url}</Typography.Link> : candidate.title ?? '来源地址待补充'}
          </Typography.Paragraph>
          {candidate.url ? <Typography.Paragraph type="secondary">来源 URL：{candidate.url}</Typography.Paragraph> : null}
          <Typography.Paragraph type="secondary">{candidate.excerpt}</Typography.Paragraph>
        </div>
        <Space wrap>
          <Button size="small" onClick={() => onChange({ status: 'confirmed' })}>确认原始值</Button>
          <Button size="small" type="primary" ghost onClick={() => onChange({ status: 'edited', editedValue })}>编辑后确认</Button>
          <Button size="small" danger onClick={() => onChange({ status: 'rejected' })}>拒绝</Button>
        </Space>
      </Space>
    </Card>
  );
}

function QuestionsStep({
  items,
  saving,
  onChange,
  onViewMore,
  onSave
}: {
  items: QuickStartQuestionsDraft['items'];
  saving: boolean;
  onChange: (items: QuickStartQuestionsDraft['items']) => void;
  onViewMore: () => void;
  onSave: () => void;
}) {
  const hasEmptyQuestion = items.some((item) => !item.question.trim());
  return (
    <ProductPageSection title="问题选择" description="检查会话中的监测问题，并决定哪些问题进入后续执行。">
      <Space direction="vertical" size={16} className="page-stack">
        {items.length === 0 ? (
          <Alert type="info" showIcon message="当前还没有推荐问题" description="请先确认关键品牌事实，系统会生成六类高价值问题。" />
        ) : items.map((item) => (
          <div className="quick-start-question-row" key={item.id}>
            <Switch checked={item.enabled} aria-label={`选择问题：${item.question}`} onChange={(enabled) => onChange(items.map((current) => current.id === item.id ? { ...current, enabled } : current))} />
            <div className="page-stack">
              <Space wrap>
                <Tag color="blue">{questionCategoryLabels[item.category]}</Tag>
                <Typography.Text type="secondary">{item.targetPlatforms.map(getPlatformDisplayName).join('、')}</Typography.Text>
              </Space>
              <Input value={item.question} onChange={(event) => onChange(items.map((current) => current.id === item.id ? { ...current, question: event.target.value } : current))} />
            </div>
          </div>
        ))}
        {hasEmptyQuestion ? <Typography.Text type="danger">请填写已有问题的内容，或恢复原问题后保存。</Typography.Text> : null}
        <div className="quick-start-actions">
          <Space wrap>
            <Button type="primary" loading={saving} disabled={items.length === 0 || hasEmptyQuestion || !items.some((item) => item.enabled)} onClick={onSave}>保存问题草稿并继续</Button>
            <Button onClick={onViewMore}>查看更多问题</Button>
          </Space>
        </div>
      </Space>
    </ProductPageSection>
  );
}

function ReadinessStep({
  session,
  candidates,
  questions,
  saving,
  onComplete
}: {
  session: QuickStartSession | null;
  candidates: QuickStartFactCandidate[];
  questions: QuickStartQuestionsDraft['items'];
  saving: boolean;
  onComplete: () => void;
}) {
  const readiness = getQuickStartReadiness(candidates);
  const selectedQuestions = questions.filter((item) => item.enabled).length;
  const website = session?.draft.website?.websiteUrl ?? '尚未保存';
  const readinessSummary = session?.draft.readiness;
  return (
    <ProductPageSection title="执行准备" description="确认官网、品牌事实和问题草稿已准备好，再完成快速接入。">
      <Space direction="vertical" size={16} className="page-stack">
        <Row gutter={[16, 16]} className="quick-start-summary-grid">
          <Col xs={24} md={12} xl={8}><Card><Statistic title="官网" value={website} valueStyle={{ fontSize: 18 }} /></Card></Col>
          <Col xs={24} md={12} xl={8}><Card><Statistic title="已确认事实" value={readiness.confirmedCount} suffix={`/ ${candidates.length}`} /></Card></Col>
          <Col xs={24} md={12} xl={8}><Card><Statistic title="已选问题" value={selectedQuestions} /></Card></Col>
          <Col xs={24} md={12} xl={8}><Card><Statistic title="目标平台" value={readinessSummary?.targetPlatforms.length ?? 0} /></Card></Col>
          <Col xs={24} md={12} xl={8}><Card><Statistic title="预计样本" value={readinessSummary?.estimatedSampleCount ?? 0} /></Card></Col>
          <Col xs={24} md={12} xl={8}><Card><Statistic title="预计耗时" value={readinessSummary?.estimatedDurationMinutes ?? 0} suffix="分钟" /></Card></Col>
        </Row>
        {readinessSummary ? (
          <Card size="small" title="平台连接与执行方式">
            <Space direction="vertical" size={12} className="page-stack">
              <Space wrap>
                {readinessSummary.connectionSummary.map((item) => (
                  <Tag key={item.platformCode} color={connectionStatusColors[item.status]}>{item.name}：{connectionStatusLabels[item.status]}</Tag>
                ))}
              </Space>
              <Typography.Text>执行方式：{executionMethodLabels[readinessSummary.executionMethod]}</Typography.Text>
              <Typography.Text>下一步：{readinessSummary.nextStep}</Typography.Text>
            </Space>
          </Card>
        ) : null}
        {readiness.canComplete ? (
          <Alert type="success" showIcon message="关键事实已确认" description="当前接入资料和首轮问题满足执行门禁，完成后将进入 AI 回复监测。" />
        ) : (
          <Alert
            type="error"
            showIcon
            message="暂时无法完成执行准备"
            description={readiness.criticalCount === 0
              ? '至少需要一个关键事实并完成确认。请返回事实确认步骤。'
              : `仍有 ${readiness.unresolvedCriticalFacts.length} 条关键事实处于待确认或已拒绝状态。请返回事实确认步骤处理。`}
          />
        )}
        <div className="quick-start-actions"><Button type="primary" loading={saving} disabled={!readiness.canComplete || selectedQuestions === 0 || !readinessSummary} onClick={onComplete}>创建计划并开始首轮监测</Button></div>
      </Space>
    </ProductPageSection>
  );
}

function TagInput({ values, placeholder, onChange }: { values: string[]; placeholder: string; onChange: (values: string[]) => void }) {
  return (
    <Select
      mode="tags"
      value={values}
      placeholder={placeholder}
      tokenSeparators={['、', ',', '，']}
      options={values.map((value) => ({ value, label: value }))}
      onChange={(nextValues) => onChange(nextValues.map((item) => item.trim()).filter(Boolean))}
    />
  );
}

const crawlStatusDisplay = {
  pending: { label: '等待发现', type: 'info' as const, description: '保存官网信息后会开始浅层发现。' },
  processing: { label: '发现中', type: 'info' as const, description: '可以离开页面，稍后返回继续确认。' },
  completed: { label: '发现完成', type: 'success' as const, description: '已生成带来源的事实候选，请继续人工确认。' },
  failed: { label: '发现失败', type: 'warning' as const, description: '官网内容暂时无法读取，仍可继续人工确认基础事实并完成接入。' }
};

const sourcePageRoleOptions: Array<{ value: SourcePageRole; label: string }> = [
  { value: 'home', label: '首页' },
  { value: 'product', label: '产品与服务' },
  { value: 'about', label: '关于品牌' },
  { value: 'faq', label: '常见问题' },
  { value: 'case', label: '客户案例' },
  { value: 'contact', label: '联系信息' },
  { value: 'policy', label: '政策说明' },
  { value: 'other', label: '其他资料' }
];

const sourcePageStatusDisplay: Record<SourcePagePlanItem['processingStatus'], { label: string; color: string }> = {
  planned: { label: '待处理', color: 'blue' },
  processing: { label: '处理中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  failed: { label: '处理失败', color: 'red' }
};

const factStatusDisplay: Record<QuickStartFactCandidate['status'], { label: string; color: string }> = {
  pending: { label: '待确认', color: 'gold' },
  confirmed: { label: '已确认', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
  edited: { label: '编辑后确认', color: 'blue' }
};

const questionCategoryLabels: Record<QuickStartQuestionsDraft['items'][number]['category'], string> = {
  brand: '品牌',
  category: '品类',
  location: '地域',
  buying_decision: '购买决策',
  competitor_comparison: '竞品比较',
  pain_point: '用户痛点'
};

const connectionStatusLabels = {
  ready: '可自动监测',
  browser_available: '可浏览器辅助',
  manual_available: '可手动录入',
  needs_configuration: '需要配置',
  needs_confirmation: '需要确认'
};

const connectionStatusColors = {
  ready: 'green',
  browser_available: 'blue',
  manual_available: 'cyan',
  needs_configuration: 'gold',
  needs_confirmation: 'orange'
};

const executionMethodLabels = { api: '自动监测', browser: '浏览器辅助监测', manual: '手动录入' };
