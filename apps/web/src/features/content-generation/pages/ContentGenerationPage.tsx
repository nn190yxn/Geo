import { Alert, Button, Card, Descriptions, Form, Input, Modal, Progress, Select, Space, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContentExportRecord, ContentGenerationStep, ContentGenerationTask, ContentGenerationTaskInput, ContentGenerationWorkspace, ContentStrategy, ContentVersionInput, GrowthContentType, PublishingEntryPayload } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getContentTypeDisplay, getPlatformDisplay } from '../../../utils/displayLabels';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';

const stepOrder = ['strategy_parse', 'knowledge_read', 'outline_generation', 'body_generation', 'geo_rule_check'];

export function ContentGenerationPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  const [publishPayload, setPublishPayload] = useState<PublishingEntryPayload>();
  const [createForm] = Form.useForm<ContentGenerationTaskInput>();
  const [editorForm] = Form.useForm<ContentVersionInput>();
  const workspaceQuery = useQuery({
    queryKey: ['content-generation', activeBrandId, selectedTaskId],
    queryFn: () => apiGet<ContentGenerationWorkspace>(`/brands/${activeBrandId}/content/generation${selectedTaskId ? `?taskId=${selectedTaskId}` : ''}`)
  });
  const strategiesQuery = useQuery({
    queryKey: ['content-strategies', activeBrandId],
    queryFn: () => apiGet<ContentStrategy[]>(`/brands/${activeBrandId}/content/strategies`)
  });
  const workspace = workspaceQuery.data?.success ? workspaceQuery.data.data : null;
  const strategies = strategiesQuery.data?.success ? strategiesQuery.data.data : [];
  const completedSteps = workspace?.currentTask?.steps.filter((step) => step.status === 'completed').length ?? 0;
  const progress = workspace?.currentTask ? Math.round((completedSteps / workspace.currentTask.steps.length) * 100) : 0;
  const watchedBody = Form.useWatch('body', editorForm);
  const draftBody = typeof watchedBody === 'string' ? watchedBody : workspace?.currentVersion?.body;
  const reviewNotes = getDraftReviewNotes(draftBody);
  const qualityCheck = getDraftQualityCheck(draftBody, workspace?.currentTask?.contentType);
  const strategyOptions = useMemo(() => strategies.map((strategy) => ({
    value: strategy.id,
    label: `${strategy.suggestedTitle}（${strategy.targetPlatform}）`
  })), [strategies]);

  useEffect(() => {
    if (workspace?.currentVersion) {
      editorForm.setFieldsValue({
        title: workspace.currentVersion.title,
        body: workspace.currentVersion.body,
        exportFormat: 'markdown'
      });
    }
  }, [editorForm, workspace?.currentVersion]);

  const createTaskMutation = useMutation({
    mutationFn: (values: ContentGenerationTaskInput) => apiPost<ContentGenerationWorkspace>(`/brands/${activeBrandId}/content/generation/tasks`, values),
    onSuccess: (response) => {
      if (response.success) {
        const taskId = response.data.currentTask?.id;
        setSelectedTaskId(taskId);
        createForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['content-generation', activeBrandId] });
        void messageApi.success('内容草稿已生成');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const saveVersionMutation = useMutation({
    mutationFn: (values: ContentVersionInput) => apiPost<ContentGenerationWorkspace>(`/brands/${activeBrandId}/content/generation/tasks/${workspace?.currentTask?.id}/versions`, values),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['content-generation', activeBrandId, selectedTaskId] });
        void messageApi.success('内容版本已保存');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const exportMutation = useMutation({
    mutationFn: () => apiPost<ContentExportRecord>(`/brands/${activeBrandId}/content/generation/tasks/${workspace?.currentTask?.id}/export`, { versionId: workspace?.currentVersion?.id }),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['content-generation', activeBrandId, selectedTaskId] });
        void messageApi.success(`已导出 ${response.data.fileName}`);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const publishEntryMutation = useMutation({
    mutationFn: () => apiPost<PublishingEntryPayload>(`/brands/${activeBrandId}/content/generation/tasks/${workspace?.currentTask?.id}/publish-entry`, { versionId: workspace?.currentVersion?.id }),
    onSuccess: (response) => {
      if (response.success) {
        setPublishPayload(response.data);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const retryTaskMutation = useMutation({
    mutationFn: () => apiPost<ContentGenerationWorkspace>(`/brands/${activeBrandId}/content/generation/tasks/${workspace?.currentTask?.id}/retry`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['content-generation', activeBrandId, selectedTaskId] });
        void messageApi.success('已重新生成内容');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const copyContent = async () => {
    const values = editorForm.getFieldsValue();
    await navigator.clipboard.writeText(`# ${values.title}\n\n${values.body}`);
    void messageApi.success('内容已复制');
  };

  const openPublishEntry = () => {
    const currentBody = editorForm.getFieldValue('body') as string | undefined;
    const result = getDraftQualityCheck(currentBody, workspace?.currentTask?.contentType);
    if (!result.publishable) {
      void messageApi.warning('正文质量检查未通过，请先补全草稿再进入发布准备');
      return;
    }
    publishEntryMutation.mutate();
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={workspaceQuery.data} />
      <PageErrorAlert response={strategiesQuery.data} />
      <AutomationOperatorCard brandId={activeBrandId} source="content_generation" title="平台改写和发布建议" compact />
      <Card title="写内容" extra={<Button type="primary" onClick={() => createForm.submit()}>生成草稿</Button>}>
        <Form form={createForm} layout="vertical" onFinish={(values) => createTaskMutation.mutate(values)}>
          <Form.Item name="strategyId" label="内容策略" rules={[{ required: true, message: '请选择内容策略' }]}>
            <Select options={strategyOptions} placeholder="选择内容策略" />
          </Form.Item>
          <Space size={12} className="page-stack" wrap align="start">
            <Form.Item name="targetPlatform" label="建议发布平台" style={{ minWidth: 220 }}><Select allowClear options={platformOptions} placeholder="默认使用策略平台" /></Form.Item>
            <Form.Item name="contentType" label="内容类型" style={{ minWidth: 240 }}><Select allowClear options={contentTypeOptions} placeholder="选择内容类型" /></Form.Item>
            <Form.Item name="contentTopic" label="内容主题" style={{ minWidth: 320 }}><Input placeholder="默认使用策略标题" /></Form.Item>
          </Space>
          <Space size={12} className="page-stack" wrap align="start">
            <Form.Item name="targetKeywords" label="目标关键词" style={{ minWidth: 320 }}><Select mode="tags" tokenSeparators={[',', '，', '、']} placeholder="输入后回车，可填写多个" /></Form.Item>
            <Form.Item name="referenceSources" label="引用资料" style={{ minWidth: 320 }}><Select mode="tags" tokenSeparators={[',', '，', '、']} placeholder="品牌档案、监测结果、内容缺口等" /></Form.Item>
            <Form.Item name="retestAt" label="再次监测时间" style={{ minWidth: 240 }}><Input placeholder="2026-07-27T00:00:00.000Z" /></Form.Item>
          </Space>
        </Form>
      </Card>

      <Space align="start" size={16} className="page-stack" wrap>
        <Card title="生成进度" loading={workspaceQuery.isLoading} style={{ flex: '0 0 360px' }}>
          {workspace?.currentTask ? (
            <>
              <TaskStateSummary task={workspace.currentTask} onRetry={() => retryTaskMutation.mutate()} retrying={retryTaskMutation.isPending} />
              <Progress percent={progress} status={workspace.currentTask.status === 'failed' ? 'exception' : 'active'} />
              <Steps
                direction="vertical"
                size="small"
                current={Math.max(0, completedSteps - 1)}
                items={workspace.currentTask.steps.sort((a, b) => stepOrder.indexOf(a.key) - stepOrder.indexOf(b.key)).map((step) => ({
                  title: step.label,
                  description: <StepDescription step={step} />,
                  status: step.status === 'failed' ? 'error' : step.status === 'completed' ? 'finish' : step.status === 'running' ? 'process' : 'wait'
                }))}
              />
            </>
          ) : <EmptyState description="还没有内容草稿，请先选择内容策略生成草稿。" />}
        </Card>

        <Card
          title="内容编辑器"
          loading={workspaceQuery.isLoading}
          style={{ flex: '1 1 680px', minWidth: 0 }}
          extra={workspace?.currentTask ? (
            <Space>
              <Button onClick={() => exportMutation.mutate()}>导出</Button>
              <Button onClick={() => void copyContent()}>复制内容</Button>
              <Button onClick={openPublishEntry}>去发布</Button>
              <Button type="primary" onClick={() => editorForm.submit()}>保存</Button>
            </Space>
          ) : null}
        >
          {workspace?.currentTask ? (
            <Form form={editorForm} layout="vertical" onFinish={(values) => saveVersionMutation.mutate(values)}>
              {reviewNotes.visible ? <DraftReviewAlert notes={reviewNotes} /> : null}
              <DraftQualityAlert result={qualityCheck} />
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
              <Form.Item name="body" label="正文" rules={[{ required: true, message: '请输入正文' }]}><Input.TextArea rows={18} /></Form.Item>
            </Form>
          ) : <EmptyState description="还没有可编辑的草稿，请先生成内容草稿。" />}
        </Card>
      </Space>

      <Tabs
        items={[
          {
            key: 'overview',
            label: '内容概览',
            children: <Overview workspace={workspace} onSelect={(taskId) => setSelectedTaskId(taskId)} />
          },
          {
            key: 'versions',
            label: '历史版本',
            children: <VersionTable workspace={workspace} onSelect={(taskId) => setSelectedTaskId(taskId)} />
          },
          {
            key: 'exports',
            label: '导出记录',
            children: <ExportTable records={workspace?.exports ?? []} />
          }
        ]}
      />

      <Modal title="发布记录信息" open={Boolean(publishPayload)} onCancel={() => setPublishPayload(undefined)} footer={<Button type="primary" onClick={() => setPublishPayload(undefined)}>知道了</Button>}>
        <Typography.Paragraph>发布记录会带上下面这些信息。</Typography.Paragraph>
        <pre>{JSON.stringify(publishPayload, null, 2)}</pre>
      </Modal>
    </Space>
  );
}

function DraftReviewAlert({ notes }: { notes: DraftReviewNotes }) {
  const description = [
    notes.reviewRequired ? '这篇草稿有需要人工确认的表达，发布前请按品牌事实检查。' : '',
    notes.complianceNotes.length > 0 ? `合规说明：${notes.complianceNotes.join('；')}` : '',
    notes.retestSuggestions.length > 0 ? `复测建议：${notes.retestSuggestions.join('；')}` : ''
  ].filter(Boolean).join(' ');

  return <Alert type={notes.reviewRequired ? 'warning' : 'info'} showIcon message={notes.reviewRequired ? '发布前需要你确认' : '发布前检查'} description={description} style={{ marginBottom: 16 }} />;
}

function DraftQualityAlert({ result }: { result: DraftQualityCheckResult }) {
  if (result.publishable) {
    return <Alert type="success" showIcon message="正文质量检查已通过" description="正文长度和关键审稿章节满足发布准备要求。" style={{ marginBottom: 16 }} />;
  }

  return (
    <Alert
      type="warning"
      showIcon
      message="正文质量检查未通过"
      description={`进入发布准备前需要补齐：${result.issues.join('；')}`}
      style={{ marginBottom: 16 }}
    />
  );
}

function Overview({ workspace, onSelect }: { workspace: ContentGenerationWorkspace | null; onSelect: (taskId: string) => void }) {
  const task = workspace?.currentTask;
  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Card>
        {task ? (
          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
            <Descriptions.Item label="当前内容">{getContentTaskDisplayName(task)}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={taskStatusColors[task.status]}>{taskStatusLabels[task.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="内容类型">{getContentTypeLabel(task.contentType)}</Descriptions.Item>
            <Descriptions.Item label="建议发布平台">{getPlatformDisplay(task.targetPlatform)}</Descriptions.Item>
            <Descriptions.Item label="内容主题">{task.contentTopic || '-'}</Descriptions.Item>
            <Descriptions.Item label="再次监测时间">{task.retestAt || '-'}</Descriptions.Item>
            <Descriptions.Item label="目标关键词">{formatList(task.targetKeywords)}</Descriptions.Item>
            <Descriptions.Item label="引用资料">{formatList(task.referenceSources)}</Descriptions.Item>
            <Descriptions.Item label="优化计划">{task.growthOptimizationPlanId || '-'}</Descriptions.Item>
            <Descriptions.Item label="版本数">{workspace?.versions.length ?? 0}</Descriptions.Item>
            {task.errorMessage ? <Descriptions.Item label="失败原因"><Typography.Text type="danger">{task.errorMessage}</Typography.Text></Descriptions.Item> : null}
          </Descriptions>
        ) : <EmptyState description="还没有内容任务。" />}
      </Card>
      <TaskTable tasks={workspace?.tasks ?? []} onSelect={onSelect} />
    </Space>
  );
}

function TaskTable({ tasks, onSelect }: { tasks: ContentGenerationTask[]; onSelect: (taskId: string) => void }) {
  return (
    <Card title="内容待办列表">
      <Table
        rowKey="id"
        dataSource={tasks}
        pagination={false}
        locale={{ emptyText: <EmptyState description="还没有内容待办，可从优化计划或内容策略生成。" /> }}
        columns={[
          { title: '内容主题', render: (_, record) => getContentTaskDisplayName(record) },
          { title: '内容类型', dataIndex: 'contentType', render: (value) => getContentTypeLabel(value) },
          { title: '建议发布平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
          { title: '目标关键词', dataIndex: 'targetKeywords', render: (values) => formatList(values) },
          { title: '引用资料', dataIndex: 'referenceSources', render: (values) => formatList(values) },
          { title: '再次监测时间', dataIndex: 'retestAt', render: (value) => value || '-' },
          { title: '状态', render: (_, record) => <Tag color={taskStatusColors[record.status]}>{taskStatusLabels[record.status]}</Tag> },
          { title: '操作', render: (_, record) => <Button size="small" onClick={() => onSelect(record.id)}>查看</Button> }
        ]}
      />
    </Card>
  );
}

function TaskStateSummary({ task, onRetry, retrying }: { task: ContentGenerationTask; onRetry: () => void; retrying: boolean }) {
  const state = getContentGenerationTaskState(task);

  return (
    <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 12 }}>
      <Tag color={state.color}>{state.label}</Tag>
      {state.alert ? <Alert type={state.alertType} message={state.alert} showIcon action={task.status === 'failed' ? <Button size="small" loading={retrying} onClick={onRetry}>重新生成</Button> : undefined} /> : null}
    </Space>
  );
}

function StepDescription({ step }: { step: ContentGenerationStep }) {
  return (
    <Space direction="vertical" size={2}>
      {step.message ? <Typography.Text>{step.message}</Typography.Text> : null}
      <Tag color={stepStatusColors[step.status]}>{stepStatusLabels[step.status]}</Tag>
      {step.completedAt ? <Typography.Text type="secondary">完成时间：{step.completedAt}</Typography.Text> : null}
    </Space>
  );
}

export function getContentGenerationTaskState(task: Pick<ContentGenerationTask, 'status' | 'errorMessage'>): { label: string; color: string; alert?: string; alertType: 'info' | 'success' | 'warning' | 'error' } {
  if (task.status === 'failed') {
    return { label: '生成失败', color: 'red', alert: task.errorMessage ?? '内容生成失败，可重新生成', alertType: 'error' };
  }

  if (task.status === 'running') {
    return { label: '生成中', color: 'blue', alert: '正在生成内容草稿', alertType: 'info' };
  }

  if (task.status === 'completed') {
    return { label: '已完成', color: 'green', alertType: 'success' };
  }

  return { label: '待生成', color: 'default', alert: '内容任务已创建，等待开始生成', alertType: 'info' };
}

export function getContentTypeLabel(contentType?: GrowthContentType | string): string {
  return getContentTypeDisplay(contentType);
}

export function getContentTaskDisplayName(task: Pick<ContentGenerationTask, 'contentTopic' | 'contentType' | 'targetPlatform'>): string {
  if (task.contentTopic && task.contentTopic.trim().length > 0) return task.contentTopic;

  return getContentTypeLabel(task.contentType);
}

export function formatList(values?: string[]): string {
  return values && values.length > 0 ? values.join('、') : '-';
}

type DraftReviewNotes = {
  visible: boolean;
  reviewRequired: boolean;
  complianceNotes: string[];
  retestSuggestions: string[];
};

type DraftQualityCheckResult = {
  publishable: boolean;
  bodyLength: number;
  matchedSections: string[];
  missingSections: string[];
  issues: string[];
};

const defaultMinimumPublishableBodyLength = 260;

const contentTypeMinimumPublishableBodyLength: Partial<Record<GrowthContentType, number>> = {
  wechat_article: 650,
  xiaohongshu_note: 500
};

const blockedDraftExpressions = ['保证长高', '治疗感统失调', '包过中考体育'];

const commonDraftQualitySections = ['合规说明', '复测建议'];

const contentTypeDraftQualitySections: Partial<Record<GrowthContentType, string[]>> = {
  wechat_article: ['品牌事实', '家长行动建议'],
  xiaohongshu_note: ['品牌事实', '话题标签'],
  website_faq: ['官网 FAQ', '合规说明'],
  short_video_script: ['短视频脚本', '复测建议'],
  platform_profile_copy: ['品牌事实', '建议发布平台'],
  image_creative_brief: ['图片创意需求', '复测建议']
};

export function getDraftReviewNotes(body?: string): DraftReviewNotes {
  const complianceNotes = extractMarkdownSection(body, '合规说明');
  const retestSuggestions = extractMarkdownSection(body, '复测建议');
  const reviewRequired = Boolean(body?.includes('需要你确认'));

  return {
    visible: reviewRequired || complianceNotes.length > 0 || retestSuggestions.length > 0,
    reviewRequired,
    complianceNotes,
    retestSuggestions
  };
}

export function getDraftQualityCheck(body?: string, contentType?: GrowthContentType | string): DraftQualityCheckResult {
  const normalizedBody = stripMarkdownSyntax(body ?? '');
  const bodyLength = normalizedBody.length;
  const requiredSections = getRequiredDraftQualitySections(contentType);
  const minimumPublishableBodyLength = getMinimumPublishableBodyLength(contentType);
  const matchedSections = requiredSections.filter((section) => hasDraftSection(body, section));
  const missingSections = requiredSections.filter((section) => !matchedSections.includes(section));
  const blockedExpressions = blockedDraftExpressions.filter((expression) => body?.includes(expression));
  const issues = [
    bodyLength < minimumPublishableBodyLength ? `正文至少 ${minimumPublishableBodyLength} 字，当前约 ${bodyLength} 字` : '',
    missingSections.length > 0 ? `缺少 ${missingSections.join('、')}` : '',
    blockedExpressions.length > 0 ? `包含高风险表达 ${blockedExpressions.join('、')}` : ''
  ].filter(Boolean);

  return {
    publishable: issues.length === 0,
    bodyLength,
    matchedSections,
    missingSections,
    issues
  };
}

function getMinimumPublishableBodyLength(contentType?: GrowthContentType | string): number {
  const typedContentType = contentType as GrowthContentType | undefined;
  return contentTypeMinimumPublishableBodyLength[typedContentType as GrowthContentType] ?? defaultMinimumPublishableBodyLength;
}

function getRequiredDraftQualitySections(contentType?: GrowthContentType | string): string[] {
  const typedContentType = contentType as GrowthContentType | undefined;
  return [...new Set([...(contentTypeDraftQualitySections[typedContentType as GrowthContentType] ?? ['品牌事实']), ...commonDraftQualitySections])];
}

function hasDraftSection(body: string | undefined, section: string): boolean {
  if (!body) return false;
  return body.split('\n').some((line) => {
    const trimmed = line.trim().replace(/^#+\s*/, '').replace(/^[-*]\s*/, '');
    return trimmed === section || trimmed.startsWith(`${section}：`) || trimmed.startsWith(`${section}:`);
  });
}

function stripMarkdownSyntax(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\-\s]/g, '').trim();
}

function extractMarkdownSection(body: string | undefined, heading: string): string[] {
  if (!body) return [];

  const lines = body.split('\n');
  const notes: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === `${heading}：` || trimmed === `${heading}:`) {
      collecting = true;
      continue;
    }

    if (trimmed.startsWith(`${heading}：`) || trimmed.startsWith(`${heading}:`)) {
      const inline = trimmed.replace(`${heading}：`, '').replace(`${heading}:`, '').trim();
      if (inline) notes.push(inline);
      collecting = true;
      continue;
    }

    if (!collecting) continue;

    if (!trimmed) {
      collecting = false;
      continue;
    }

    if (trimmed.endsWith('：') || trimmed.endsWith(':')) {
      collecting = false;
      continue;
    }

    notes.push(trimmed.replace(/^-\s*/, ''));
  }

  return notes;
}

const contentTypeLabels: Record<GrowthContentType, string> = {
  wechat_article: '公众号推文',
  xiaohongshu_note: '小红书图文',
  website_faq: '官网 FAQ',
  short_video_script: '短视频脚本',
  platform_profile_copy: '平台介绍文案',
  image_creative_brief: '图片创意需求'
};

const contentTypeOptions = Object.entries(contentTypeLabels).map(([value, label]) => ({ value, label }));

const platformOptions = [
  { value: 'wechat_official', label: '公众号' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'official_site', label: '官网 FAQ' },
  { value: 'douyin', label: '短视频平台' },
  { value: 'ai_platform_profile', label: 'AI 平台介绍资料' },
  { value: 'creative_brief', label: '图片创意需求' }
];

const taskStatusLabels: Record<ContentGenerationTask['status'], string> = {
  pending: '待生成',
  running: '生成中',
  completed: '已完成',
  failed: '未成功'
};

const taskStatusColors: Record<ContentGenerationTask['status'], string> = {
  pending: 'default',
  running: 'blue',
  completed: 'green',
  failed: 'red'
};

const stepStatusLabels: Record<ContentGenerationStep['status'], string> = {
  pending: '待开始',
  running: '生成中',
  completed: '已完成',
  failed: '未成功'
};

const stepStatusColors: Record<ContentGenerationStep['status'], string> = {
  pending: 'default',
  running: 'blue',
  completed: 'green',
  failed: 'red'
};

function VersionTable({ workspace, onSelect }: { workspace: ContentGenerationWorkspace | null; onSelect: (taskId: string) => void }) {
  return (
    <Table
      rowKey="id"
      dataSource={workspace?.versions ?? []}
      pagination={false}
      locale={{ emptyText: <EmptyState description="暂无历史版本。" /> }}
      columns={[
        { title: '版本', dataIndex: 'version' },
        { title: '标题', dataIndex: 'title' },
        { title: '导出格式', dataIndex: 'exportFormat' },
        { title: '更新时间', dataIndex: 'updatedAt' },
        { title: '操作', render: (_, record) => <Button size="small" onClick={() => onSelect(record.generationTaskId)}>查看</Button> }
      ]}
    />
  );
}

function ExportTable({ records }: { records: ContentExportRecord[] }) {
  return (
    <Table
      rowKey="id"
      dataSource={records}
      pagination={false}
      locale={{ emptyText: <EmptyState description="暂无导出记录。" /> }}
      columns={[
        { title: '文件名', dataIndex: 'fileName' },
        { title: '格式', dataIndex: 'exportFormat' },
        { title: '创建时间', dataIndex: 'createdAt' }
      ]}
    />
  );
}
