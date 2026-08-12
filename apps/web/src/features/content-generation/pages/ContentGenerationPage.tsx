import { Alert, Button, Card, Col, Descriptions, Form, Input, Modal, Progress, Row, Select, Space, Steps, Table, Tabs, Tag, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { ContentCenterDashboard, ContentExportRecord, ContentGenerationStep, ContentGenerationTask, ContentGenerationTaskInput, ContentGenerationWorkspace, ContentStrategy, ContentVersion, ContentVersionInput, GrowthContentType, PublishingDashboard, PublishingEntryPayload, PublishingRecord } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandWriteCapability } from '../../../access-control/BrandCapabilityContext';
import { readWorkflowRouteContext, workflowStagePath } from '../../../app/routePaths';
import type { WorkflowRouteContext } from '../../../app/routePaths';
import type { UnifiedFilterValue } from '../../../app/filterQuery';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { CreationWorkspace } from '../../../components/CreationWorkspace';
import { EmptyState, GuidedEmptyState, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import type { WorkspaceViewState } from '../../../components/WorkspaceState';
import { getContentTypeDisplay, getPlatformDisplay } from '../../../utils/displayLabels';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';

const stepOrder = ['strategy_parse', 'knowledge_read', 'outline_generation', 'body_generation', 'geo_rule_check'];

export function ContentGenerationPage() {
  const contentCapability = useBrandWriteCapability('content');
  const publishingCapability = useBrandWriteCapability('publishing');
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const routeContext = readWorkflowRouteContext(location.search);
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const studioMode = getContentStudioMode(location.pathname);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(routeContext.taskId);
  const [taskFilters, setTaskFilters] = useState<UnifiedFilterValue>({ search: '', platform: 'all', status: 'all' });
  const [taskPlatformFilter, setTaskPlatformFilter] = useState<string>('all');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(contentTemplateOptions[0].key);
  const [publishPayload, setPublishPayload] = useState<PublishingEntryPayload>();
  const [createForm] = Form.useForm<ContentGenerationFormValues>();
  const [editorForm] = Form.useForm<ContentVersionInput>();
  const workspaceQuery = useQuery({
    queryKey: ['content-generation', activeBrandId, selectedTaskId],
    queryFn: () => apiGet<ContentGenerationWorkspace>(`/brands/${activeBrandId}/content/generation${selectedTaskId ? `?taskId=${selectedTaskId}` : ''}`)
  });
  const strategiesQuery = useQuery({
    queryKey: ['content-strategies', activeBrandId],
    queryFn: () => apiGet<ContentStrategy[]>(`/brands/${activeBrandId}/content/strategies`)
  });
  const publishingQuery = useQuery({
    queryKey: ['publishing', activeBrandId],
    queryFn: () => apiGet<PublishingDashboard>(`/brands/${activeBrandId}/publishing`)
  });
  const optimizationAssetsQuery = useQuery({
    queryKey: ['content-center', activeBrandId, 'optimization-source'],
    queryFn: () => apiGet<ContentCenterDashboard>(`/brands/${activeBrandId}/content`),
    enabled: studioMode.kind === 'optimization'
  });
  const workspace = workspaceQuery.data?.success ? workspaceQuery.data.data : null;
  const strategies = strategiesQuery.data?.success ? strategiesQuery.data.data : [];
  const publishingRecords = publishingQuery.data?.success ? publishingQuery.data.data.records : [];
  const completedSteps = workspace?.currentTask?.steps.filter((step) => step.status === 'completed').length ?? 0;
  const progress = workspace?.currentTask ? Math.round((completedSteps / workspace.currentTask.steps.length) * 100) : 0;
  const watchedBody = Form.useWatch('body', editorForm);
  const draftBody = typeof watchedBody === 'string' ? watchedBody : workspace?.currentVersion?.body;
  const reviewNotes = getDraftReviewNotes(draftBody);
  const qualityCheck = getDraftQualityCheck(draftBody, workspace?.currentTask?.contentType);
  const generationPreset = getGenerationPreset(workspace?.currentTask, studioMode.kind);
  const taskList = workspace?.tasks ?? [];
  const filteredTaskList = getFilteredContentTasks(taskList, taskFilters.status, taskPlatformFilter, taskFilters.search, strategies);
  const taskListStats = getContentTaskListStats(taskList);
  const creationWorkspaceState = getContentCreationWorkspaceState({
    loading: workspaceQuery.isLoading,
    error: Boolean(workspaceQuery.data && !workspaceQuery.data.success),
    hasTask: Boolean(workspace?.currentTask)
  });
  const selectedTemplate = contentTemplateOptions.find((template) => template.key === selectedTemplateKey) ?? contentTemplateOptions[0];
  const strategyOptions = useMemo(() => strategies.map((strategy) => ({
    value: strategy.id,
    label: `${strategy.suggestedTitle}（${getPlatformDisplay(strategy.targetPlatform)}）`
  })), [strategies]);
  const sourceAssetOptions = useMemo(() => {
    const assets = optimizationAssetsQuery.data?.success ? optimizationAssetsQuery.data.data.assets : [];
    return assets.map((asset) => ({
      value: `${asset.title}${asset.url ? `（${asset.url}）` : ''}`,
      label: `${asset.title}（${getPlatformDisplay(asset.platform)}）`
    }));
  }, [optimizationAssetsQuery.data]);
  const supplementalQueries = [strategiesQuery, publishingQuery, ...(studioMode.kind === 'optimization' ? [optimizationAssetsQuery] : [])];
  const hasSupplementalFailure = supplementalQueries.some((query) => query.data && !query.data.success);
  const retrySupplementalQueries = () => Promise.all(supplementalQueries.map((query) => query.refetch()));

  useEffect(() => {
    if (workspace?.currentVersion) {
      editorForm.setFieldsValue({
        title: workspace.currentVersion.title,
        body: workspace.currentVersion.body,
        exportFormat: 'markdown'
      });
    }
  }, [editorForm, workspace?.currentVersion]);

  useEffect(() => {
    if (routeContext.taskId) setSelectedTaskId(routeContext.taskId);
  }, [routeContext.taskId]);

  useEffect(() => {
    if (studioMode.kind !== 'optimization') return;
    const sourceAssetId = new URLSearchParams(location.search).get('assetId');
    const assets = optimizationAssetsQuery.data?.success ? optimizationAssetsQuery.data.data.assets : [];
    const sourceAsset = assets.find((asset) => asset.id === sourceAssetId);
    if (sourceAsset) {
      createForm.setFieldValue('sourceAssetReference', `${sourceAsset.title}${sourceAsset.url ? `（${sourceAsset.url}）` : ''}`);
    }
  }, [createForm, location.search, optimizationAssetsQuery.data, studioMode.kind]);

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
  const createPublishingRecordMutation = useMutation({
    mutationFn: (payload: PublishingEntryPayload) => apiPost<PublishingRecord>(`/brands/${activeBrandId}/publishing/records`, payload),
    onSuccess: (response) => {
      if (response.success) {
        const payload = publishPayload;
        setPublishPayload(undefined);
        navigate(getContentPublishPreparationPath(routeContext, payload, response.data.id));
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

  const submitContentTask = (values: ContentGenerationFormValues) => {
    const issues = getContentTaskConfigurationIssues(values, studioMode.kind);
    if (issues.length > 0) {
      void messageApi.warning(issues[0]);
      return;
    }
    createTaskMutation.mutate(getContentTaskInputPayload(values, studioMode.kind));
  };

  const selectContentTemplate = (templateKey: string) => {
    const template = contentTemplateOptions.find((item) => item.key === templateKey);
    if (!template) return;

    setSelectedTemplateKey(templateKey);
    createForm.setFieldsValue(getContentTemplateFormPreset(template));
  };

  const openCreationWorkspace = () => {
    document.getElementById('content-creation-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    createForm.focusField('strategyId');
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      {workspaceQuery.data?.success && hasSupplementalFailure ? (
        <PartialDataNotice
          message="部分内容配置暂时缺失"
          description="当前任务和表单输入已保留；重新加载可补齐内容策略、发布记录或来源资产。"
          action={<Button onClick={() => void retrySupplementalQueries()}>重新加载缺失数据</Button>}
        />
      ) : null}
      <AutomationOperatorCard brandId={activeBrandId} source="content_generation" title="平台改写和发布建议" compact />
      <Alert
        type="warning"
        showIcon
        message="发布前请检查事实来源、合规表达和再次监测计划"
        description="内容生成结果需要结合品牌资料、真实 AI 回复和标准答案人工确认，避免夸大承诺、绝对化表达和未经验证的数据。"
      />
      <Card title={studioMode.title}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={14}>
            <Typography.Paragraph>{studioMode.description}</Typography.Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap>
              {generationPreset.map((item) => <Tag key={item.label} color={item.color}>{item.label}：{item.value}</Tag>)}
            </Space>
          </Col>
        </Row>
      </Card>
      <ContentTaskListPanel
        canWrite={contentCapability.canWrite}
        permissionReason={contentCapability.reason}
        tasks={filteredTaskList}
        totalCount={taskList.length}
        stats={taskListStats}
        filters={taskFilters}
        platformFilter={taskPlatformFilter}
        publishingRecords={publishingRecords}
        strategies={strategies}
        loading={workspaceQuery.isLoading}
        hasError={Boolean(workspaceQuery.data && !workspaceQuery.data.success)}
        onFiltersChange={setTaskFilters}
        onPlatformFilterChange={setTaskPlatformFilter}
        onClearFilters={() => {
          setTaskFilters({ search: '', platform: 'all', status: 'all' });
          setTaskPlatformFilter('all');
        }}
        onCreate={openCreationWorkspace}
        onSelect={setSelectedTaskId}
        onPublishPrepare={(taskId) => {
          setSelectedTaskId(taskId);
          void messageApi.info('已切换到该内容任务，请检查右侧草稿后进入发布准备');
        }}
      />
      <div id="content-creation-workspace">
        <CreationWorkspace
          className="content-creation-workspace"
          configurationTitle={<Space size={8}><span>配置内容</span><Tag>步骤 1</Tag></Space>}
          configurationDescription="按业务目标完成五组配置，模板预设会自动带入内容类型和渠道。"
          resultTitle={<Space size={8}><span>结果与发布准备</span><Tag>步骤 2</Tag></Space>}
          resultDescription="在同一区域查看生成进度、失败恢复、草稿风险和发布检查。"
          state={creationWorkspaceState}
          mobileOrder="configuration-first"
          primaryAction={<Button disabled={!contentCapability.canWrite} title={contentCapability.reason} loading={createTaskMutation.isPending} onClick={() => createForm.submit()}>生成草稿</Button>}
          resultHeaderExtra={workspace?.currentVersion ? (
            <ContentDraftActions
              canWrite={contentCapability.canWrite}
              canPublish={publishingCapability.canWrite}
              permissionReason={contentCapability.reason ?? publishingCapability.reason}
              onExport={() => exportMutation.mutate()}
              onCopy={() => void copyContent()}
              onSave={() => editorForm.submit()}
              onPublishPrepare={openPublishEntry}
            />
          ) : null}
          expectation={<ContentResultExpectation template={selectedTemplate} modeKind={studioMode.kind} />}
          loadingState={<ContentResultLoadingState />}
          emptyState={<ContentDraftEmptyState modeKind={studioMode.kind} />}
          errorState={<RegionErrorState description="内容创作台加载失败，左侧配置会保留。请重新加载后继续。" onRetry={() => void workspaceQuery.refetch()} />}
          configuration={(
            <Space direction="vertical" size={16} className="page-stack">
              <Alert type="info" showIcon message={studioMode.inputMessage} description={studioMode.inputDescription} />
              <ContentTemplatePicker selectedKey={selectedTemplateKey} onSelect={selectContentTemplate} />
              <Form form={createForm} layout="vertical" initialValues={getContentTemplateFormPreset(contentTemplateOptions[0])} onFinish={submitContentTask}>
                <ContentConfigSection title="目标与对象">
                  <Form.Item name="strategyId" label="内容策略" extra="决定内容解决的业务问题和默认选题。" rules={[{ required: true, message: '请选择内容策略，系统会据此读取业务目标和品牌上下文' }]}>
                    <Select options={strategyOptions} placeholder="选择内容策略" />
                  </Form.Item>
                   <Form.Item name="growthOptimizationPlanId" label="关联优化计划"><Input placeholder="填写优化计划名称" /></Form.Item>
                  <Form.Item name="userIntent" label="用户意图"><Input placeholder="例如：家长想了解儿童体能课是否适合自家孩子" /></Form.Item>
                  <Form.Item name="contentTopic" label="内容主题"><Input placeholder="默认使用策略标题" /></Form.Item>
                  {studioMode.kind === 'optimization' ? (
                    <>
                      <Form.Item name="sourceAssetReference" label="选择现有内容" extra="可从内容资产中选择，也可在下方直接粘贴原文。">
                        <Select allowClear loading={optimizationAssetsQuery.isLoading} options={sourceAssetOptions} placeholder="选择需要优化的文章、FAQ 或渠道内容" />
                      </Form.Item>
                      <Form.Item
                        name="sourceContent"
                        label="粘贴原文"
                        dependencies={['sourceAssetReference']}
                        rules={[{
                          validator: (_, value) => value?.trim() || createForm.getFieldValue('sourceAssetReference')
                            ? Promise.resolve()
                            : Promise.reject(new Error('请选择现有内容或粘贴需要优化的原文'))
                        }]}
                      >
                        <Input.TextArea rows={8} placeholder="粘贴现有文章、FAQ、社媒文案或页面正文" />
                      </Form.Item>
                    </>
                  ) : null}
                </ContentConfigSection>
                <ContentConfigSection title="模板与渠道">
                  <Row gutter={12}>
                    <Col xs={24} md={12} xl={24} xxl={12}>
                      <Form.Item name="contentType" label="内容模板"><Select allowClear options={contentTypeOptions} placeholder="选择内容模板" /></Form.Item>
                    </Col>
                    <Col xs={24} md={12} xl={24} xxl={12}>
                      <Form.Item name="targetPlatform" label="发布平台"><Select allowClear options={platformOptions} placeholder="默认使用策略平台" /></Form.Item>
                    </Col>
                  </Row>
                </ContentConfigSection>
                <ContentConfigSection title="素材与依据">
                  <Form.Item name="targetKeywords" label="目标关键词"><Select mode="tags" tokenSeparators={[',', '，', '、']} placeholder="输入后回车，可填写多个" /></Form.Item>
                  <Form.Item name="referenceSources" label="引用资料"><Select mode="tags" tokenSeparators={[',', '，', '、']} placeholder="品牌资料、真实 AI 回复、竞品表现、信源建议" /></Form.Item>
                  <Form.Item name="imageAssetRequirement" label="图片素材"><Select mode="tags" tokenSeparators={[',', '，', '、']} placeholder="门店图、课程图、案例图、封面候选" /></Form.Item>
                </ContentConfigSection>
                <ContentConfigSection title="生成配置">
                  <Form.Item name="toneStyle" label="语气风格"><Select allowClear options={toneStyleOptions} placeholder="选择适合渠道的表达风格" /></Form.Item>
                  {studioMode.kind === 'optimization' ? (
                    <Form.Item name="optimizationGoals" label="优化目标" rules={[{ required: true, message: '请选择至少一个优化目标' }]}>
                      <Select mode="multiple" options={contentOptimizationGoalOptions} placeholder="选择结构、事实、FAQ、引用或渠道目标" />
                    </Form.Item>
                  ) : null}
                </ContentConfigSection>
                <ContentConfigSection title="发布检查">
                  <Form.Item name="complianceRequirement" label="合规要求"><Select mode="tags" tokenSeparators={[',', '，', '、']} placeholder="避免绝对化承诺、标注事实来源、保留人工确认" /></Form.Item>
                   <Form.Item name="retestAt" label="再次监测时间"><Input placeholder="例如：2026-07-27 09:00" /></Form.Item>
                </ContentConfigSection>
              </Form>
              <InputPlanningPanel modeKind={studioMode.kind} />
              <ContentStudioContext task={workspace?.currentTask} strategies={strategies} />
              <MaterialSourcePanel task={workspace?.currentTask} />
              <PublishingMaterialPanel />
              {studioMode.kind === 'generation' ? (
                <ContentOptimizationEntry onOpen={() => navigate({ pathname: '/content-optimization', search: location.search, hash: location.hash })} />
              ) : <ExistingContentOptimizationGuide />}
            </Space>
          )}
          result={workspace?.currentTask ? (
            <Space direction="vertical" size={16} className="page-stack">
              <DraftWorkflowStatePanel
                state={getContentDraftPanelState(workspace.currentTask, workspace.currentVersion, qualityCheck)}
                onRetry={() => retryTaskMutation.mutate()}
                retrying={retryTaskMutation.isPending}
              />
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <Space direction="vertical" size={12} className="page-stack">
                    <GenerationControlPanel task={workspace.currentTask} modeKind={studioMode.kind} />
                    <Progress percent={progress} status={workspace.currentTask.status === 'failed' ? 'exception' : 'active'} />
                    <Steps
                      direction="vertical"
                      size="small"
                      current={Math.max(0, completedSteps - 1)}
                      items={[...workspace.currentTask.steps].sort((a, b) => stepOrder.indexOf(a.key) - stepOrder.indexOf(b.key)).map((step) => ({
                        title: step.label,
                        description: <StepDescription step={step} />,
                        status: step.status === 'failed' ? 'error' : step.status === 'completed' ? 'finish' : step.status === 'running' ? 'process' : 'wait'
                      }))}
                    />
                  </Space>
                </Col>
                <Col xs={24} lg={16}>
                  {workspace.currentVersion ? (
                    <Form form={editorForm} layout="vertical" onFinish={(values) => saveVersionMutation.mutate(values)}>
                      {reviewNotes.visible ? <DraftReviewAlert notes={reviewNotes} /> : null}
                      <DraftQualityAlert result={qualityCheck} />
                      <ChannelReadinessPanel task={workspace.currentTask} qualityCheck={qualityCheck} />
                      {studioMode.kind === 'optimization' ? <ContentOptimizationSuggestionPanel suggestions={getContentOptimizationSuggestions(draftBody, workspace.currentTask)} /> : null}
                      <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
                      <Form.Item name="body" label="正文" rules={[{ required: true, message: '请输入正文' }]}><Input.TextArea rows={20} /></Form.Item>
                    </Form>
                  ) : <ContentGenerationPendingState task={workspace.currentTask} />}
                </Col>
              </Row>
            </Space>
          ) : null}
        />
      </div>

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

      <Modal
        title="发布准备信息"
        open={Boolean(publishPayload)}
        onCancel={() => setPublishPayload(undefined)}
        footer={(
          <Space>
            <Button onClick={() => setPublishPayload(undefined)}>稍后处理</Button>
            <Button type="primary" loading={createPublishingRecordMutation.isPending} onClick={() => publishPayload && createPublishingRecordMutation.mutate(publishPayload)}>创建发布记录并继续</Button>
          </Space>
        )}
      >
        {publishPayload ? <PublishEntrySummary payload={publishPayload} /> : null}
      </Modal>
    </Space>
  );
}

export function ContentTemplatePicker({ selectedKey, onSelect }: { selectedKey: string; onSelect: (key: string) => void }) {
  const selectedTemplate = contentTemplateOptions.find((template) => template.key === selectedKey) ?? contentTemplateOptions[0];
  const [category, setCategory] = useState<ContentTemplateCategoryKey>(selectedTemplate.category);
  const visibleTemplates = getContentTemplatesByCategory(category);
  const selectCategory = (nextCategory: ContentTemplateCategoryKey) => {
    setCategory(nextCategory);
    const firstTemplate = getContentTemplatesByCategory(nextCategory)[0];
    if (firstTemplate) onSelect(firstTemplate.key);
  };

  return (
    <Card size="small" title="选择内容模板" extra={<Tag color="blue">第一步</Tag>} className="content-studio-subcard">
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text type="secondary">按使用场景选择模板，内容类型和目标平台会自动写入下方配置。</Typography.Text>
        <Tabs
          aria-label="内容模板分类"
          activeKey={category}
          items={contentTemplateCategories.map((item) => ({ label: item.label, key: item.key }))}
          onChange={(value) => selectCategory(value as ContentTemplateCategoryKey)}
          size="small"
          tabBarGutter={16}
        />
        <Row gutter={[8, 8]}>
        {visibleTemplates.map((template) => {
          const selected = selectedKey === template.key;
          return (
            <Col xs={24} md={12} xl={24} xxl={12} key={template.key}>
              <button
                type="button"
                className={selected ? 'content-template-card content-template-card-selected' : 'content-template-card'}
                aria-label={`选择${template.title}`}
                aria-pressed={selected}
                onClick={() => onSelect(template.key)}
              >
                <Space direction="vertical" size={6} className="page-stack">
                  <Space align="center" className="content-template-title-row">
                    <Typography.Text strong>{template.title}</Typography.Text>
                    {selected ? <Tag color="blue">已选</Tag> : null}
                  </Space>
                  <Typography.Text type="secondary">使用场景：{template.description}</Typography.Text>
                  <Space wrap size={[4, 4]}>
                    {template.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                  </Space>
                  <Typography.Text type="secondary">预计结构：{template.example}</Typography.Text>
                  <Typography.Text type="secondary">适用平台：{formatList(template.applicablePlatforms)}</Typography.Text>
                  <Typography.Text type="secondary">推荐字数：{template.recommendedLength}</Typography.Text>
                  <Typography.Text type="secondary">素材要求：{formatList(template.materialRequirements)}</Typography.Text>
                  <Typography.Text type="secondary">引用要求：{template.citationRequirement}</Typography.Text>
                  <Typography.Text type="secondary">复测建议：{template.retestSuggestion}</Typography.Text>
                </Space>
              </button>
            </Col>
          );
        })}
        </Row>
      </Space>
    </Card>
  );
}

function ContentConfigSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="content-config-section">
      <Typography.Text strong>{title}</Typography.Text>
      <div className="content-config-section-body">{children}</div>
    </div>
  );
}

export function ContentDraftEmptyState({ modeKind }: { modeKind: ContentStudioModeKind }) {
  const isOptimization = modeKind === 'optimization';
  return (
    <div className="content-draft-empty-state">
      <Space direction="vertical" size={12} align="center">
        <Typography.Title level={4} style={{ margin: 0 }}>{isOptimization ? '等待生成优化建议' : '等待生成内容草稿'}</Typography.Title>
        <Typography.Text type="secondary">
          {isOptimization ? '左侧选择策略并录入已有内容后，这里会展示结构建议、事实补强、FAQ 补充、引用补强和渠道适配建议。' : '左侧补齐内容目标、模板渠道、素材依据和合规要求后，这里会展示草稿、FAQ、引用依据、风险提醒和渠道发布检查。'}
        </Typography.Text>
        <Space wrap>
          <Tag color="blue">品牌资料</Tag>
          <Tag color="geekblue">品牌标准答案</Tag>
          <Tag color="green">真实 AI 回复</Tag>
          <Tag color="orange">发布检查</Tag>
        </Space>
      </Space>
    </div>
  );
}

export function ContentResultExpectation({ template, modeKind }: { template: ContentTemplateOption; modeKind: ContentStudioModeKind }) {
  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Space wrap>
        <Tag color="blue">{template.title}</Tag>
        <Tag>{getContentTypeLabel(template.contentType)}</Tag>
        <Tag>{getPlatformDisplay(template.targetPlatform)}</Tag>
      </Space>
      <Typography.Text strong>{modeKind === 'optimization' ? '预计获得一份可审阅的内容优化稿' : '预计获得一份可审阅的渠道草稿'}</Typography.Text>
      <Typography.Text type="secondary">结果区会依次呈现生成步骤、正文预览、事实与合规风险、渠道发布检查和进入发布准备动作。</Typography.Text>
    </Space>
  );
}

function ContentResultLoadingState() {
  return (
    <Space direction="vertical" size={12} className="page-stack">
      <Alert type="info" showIcon message="正在读取内容任务" description="配置区保持可用，任务信息加载完成后会在这里恢复生成进度和草稿。" />
      <Progress percent={20} status="active" showInfo={false} />
    </Space>
  );
}

function ContentGenerationPendingState({ task }: { task: ContentGenerationTask }) {
  if (task.status === 'failed') {
    return <Alert type="error" showIcon message="草稿生成失败" description="当前配置和失败步骤已保留，请根据左侧失败原因重新生成。" />;
  }

  if (task.status === 'running') {
    return <Alert type="info" showIcon message="草稿生成中" description={`当前正在处理“${getContentTaskCurrentStepLabel(task)}”，生成完成后正文会自动显示在这里。`} />;
  }

  return <Alert type="info" showIcon message="等待生成草稿" description="任务配置已经保存，生成开始后可在左侧步骤区查看进度。" />;
}

export function ContentOptimizationSuggestionPanel({ suggestions }: { suggestions: ContentOptimizationSuggestion[] }) {
  return (
    <Card size="small" title="内容优化建议" className="content-studio-subcard content-optimization-suggestions">
      <Row gutter={[8, 8]}>
        {suggestions.map((suggestion) => (
          <Col xs={24} md={12} key={suggestion.key}>
            <div className="content-studio-readiness-item">
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{suggestion.label}</Typography.Text>
                <Typography.Text type="secondary">{suggestion.description}</Typography.Text>
              </Space>
              <Tag color={suggestion.color}>{suggestion.status}</Tag>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

export function PublishEntrySummary({ payload }: { payload: PublishingEntryPayload }) {
  return (
    <Space direction="vertical" size={12} className="page-stack">
      <Typography.Paragraph>发布准备会带上草稿标题、发布渠道、内容类型、目标关键词和正文摘要。</Typography.Paragraph>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="标题">{payload.title}</Descriptions.Item>
        <Descriptions.Item label="发布渠道">{getPlatformDisplay(payload.targetPlatform)}</Descriptions.Item>
        <Descriptions.Item label="内容类型">{getContentTypeLabel(payload.contentType)}</Descriptions.Item>
        <Descriptions.Item label="目标关键词">{formatList(payload.targetKeywords)}</Descriptions.Item>
        <Descriptions.Item label="正文摘要">{payload.body.slice(0, 120)}{payload.body.length > 120 ? '...' : ''}</Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

export function ContentDraftActions({ canWrite = true, canPublish = true, permissionReason, onExport, onCopy, onSave, onPublishPrepare }: {
  canWrite?: boolean;
  canPublish?: boolean;
  permissionReason?: string;
  onExport: () => void;
  onCopy: () => void;
  onSave: () => void;
  onPublishPrepare: () => void;
}) {
  return (
    <Space wrap>
      <Button onClick={onExport}>导出</Button>
      <Button onClick={onCopy}>复制内容</Button>
      <Button disabled={!canWrite} title={permissionReason} onClick={onSave}>保存草稿</Button>
      <Button type="primary" disabled={!canPublish} title={permissionReason} onClick={onPublishPrepare}>进入发布准备</Button>
    </Space>
  );
}

function ContentTaskListPanel({ canWrite = true, permissionReason, tasks, totalCount, stats, filters, platformFilter, publishingRecords, strategies, loading, hasError, onFiltersChange, onPlatformFilterChange, onClearFilters, onCreate, onSelect, onPublishPrepare }: {
  canWrite?: boolean;
  permissionReason?: string;
  tasks: ContentGenerationTask[];
  totalCount: number;
  stats: ContentTaskListStats;
  filters: UnifiedFilterValue;
  platformFilter: string;
  publishingRecords: PublishingRecord[];
  strategies: ContentStrategy[];
  loading: boolean;
  hasError: boolean;
  onFiltersChange: (value: UnifiedFilterValue) => void;
  onPlatformFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onCreate: () => void;
  onSelect: (taskId: string) => void;
  onPublishPrepare: (taskId: string) => void;
}) {
  const state = loading ? 'loading' : hasError ? 'error' : totalCount === 0 ? 'empty' : 'ready';

  return (
    <ManagementListPage<ContentGenerationTask>
      title="内容任务"
      description="集中管理内容选题、模板、关联对象、目标渠道、生成进度和发布交接。"
      primaryAction={totalCount > 0 ? <Button type="primary" disabled={!canWrite} title={permissionReason} onClick={onCreate}>创建内容任务</Button> : undefined}
      state={state}
      summary={(
        <Row gutter={[12, 12]}>
          <Col xs={12} lg={6}>
            <ContentTaskStatCard label="全部任务" value={stats.total} description="草稿、待生成和失败任务" />
          </Col>
          <Col xs={12} lg={6}>
            <ContentTaskStatCard label="已完成" value={stats.completed} description="可进入发布准备" />
          </Col>
          <Col xs={12} lg={6}>
            <ContentTaskStatCard label="待处理" value={stats.pending} description="待生成或生成中" />
          </Col>
          <Col xs={12} lg={6}>
            <ContentTaskStatCard label="发布统计" value={stats.publishReady} description="已具备发布准备入口" />
          </Col>
        </Row>
      )}
      filters={(
        <UnifiedFilterBar
          value={filters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
          statusOptions={contentTaskStatusFilterOptions.filter((option) => option.value !== 'all')}
          searchPlaceholder="搜索标题、模板、关联对象或关键词"
          resultCount={tasks.length}
          totalCount={totalCount}
          showDateRange={false}
          showPlatform={false}
          hasAdditionalFilters={platformFilter !== 'all'}
          extraFilters={(
            <Select
              aria-label="目标平台筛选"
              value={platformFilter}
              options={contentTaskPlatformFilterOptions}
              style={{ minWidth: 160 }}
              onChange={onPlatformFilterChange}
            />
          )}
        />
      )}
      tableTitle="内容任务列表"
      tableDescription="每条任务保留继续编辑和发布准备两个高频动作。"
      emptyState={(
        <GuidedEmptyState
          title="创建第一条内容任务"
          reason="当前品牌还没有内容任务。"
          impact="发布准备和再次监测缺少可交接的内容草稿。"
          benefit="完成后可继续审稿、发布交接并安排再次监测。"
          actionLabel="选择模板并创建内容"
          onAction={onCreate}
        />
      )}
      errorState={<RegionErrorState description="内容任务加载失败，请稍后重新加载页面。" />}
      tableAriaLabel="内容任务管理列表"
      tableProps={{
        rowKey: 'id',
        dataSource: tasks,
        pagination: tasks.length > 8 ? { pageSize: 8 } : false,
        locale: {
          emptyText: totalCount > 0
            ? <EmptyState title="没有匹配的内容任务" description="当前筛选条件下的内容任务" reason="搜索词或筛选条件缩小了结果范围。" nextStep="清空筛选后查看全部内容任务。" />
            : undefined
        },
        columns: [
          { title: '内容标题', render: (_, record) => getContentTaskDisplayName(record) },
          { title: '内容模板', dataIndex: 'contentType', render: (value) => getContentTypeLabel(value) },
          { title: '关联对象', render: (_, record) => getContentTaskAssociation(record, strategies) },
          { title: '目标平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
          { title: '生成状态', render: (_, record) => <Tag color={taskStatusColors[record.status]}>{taskStatusLabels[record.status]}</Tag> },
          { title: '发布时间', render: (_, record) => formatCompactDate(getContentTaskPublishedAt(publishingRecords, record.id)) },
          {
            title: '操作',
            render: (_, record) => (
              <ManagementRowActions
                primaryActions={[
                  <Button key="edit" size="small" onClick={() => onSelect(record.id)}>继续编辑</Button>,
                  <Button key="publish" size="small" disabled={record.status !== 'completed'} onClick={() => onPublishPrepare(record.id)}>发布准备</Button>
                ]}
              />
            )
          }
        ]
      }}
    />
  );
}

function ContentTaskStatCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="geo-stat-card">
      <Space direction="vertical" size={4}>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <Typography.Title level={3} style={{ margin: 0 }}>{value}</Typography.Title>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </Space>
    </div>
  );
}

function ContentStudioContext({ task, strategies }: { task?: ContentGenerationTask; strategies: ContentStrategy[] }) {
  const strategy = task?.strategyId ? strategies.find((item) => item.id === task.strategyId) : undefined;

  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Text strong>创作上下文</Typography.Text>
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="当前策略">{strategy?.suggestedTitle ?? '待选择内容策略'}</Descriptions.Item>
        <Descriptions.Item label="优化单元">{strategy?.optimizationUnitId ? '已关联优化单元' : '随内容策略带入'}</Descriptions.Item>
        <Descriptions.Item label="用户意图">{strategy?.intentId ? '已关联用户意图' : '随内容策略带入'}</Descriptions.Item>
        <Descriptions.Item label="引用依据">{formatList(task?.referenceSources)}</Descriptions.Item>
        <Descriptions.Item label="目标关键词">{formatList(task?.targetKeywords)}</Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

function ContentOptimizationEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <Alert
      type="success"
      showIcon
      message="已有内容需要优化"
      description="进入内容优化后，可以粘贴现有文章或 FAQ，补充事实依据、结构、引用来源和平台适配建议。"
      action={<Button size="small" onClick={onOpen}>进入内容优化</Button>}
    />
  );
}

function ExistingContentOptimizationGuide() {
  return (
    <Alert
      type="warning"
      showIcon
      message="优化已有内容"
      description="把现有文章或 FAQ 作为内容主题录入，引用依据填写真实 AI 回复、品牌资料和需要补强的信源。生成后在右侧草稿区检查事实补强、FAQ 补充和渠道适配建议。"
    />
  );
}

function InputPlanningPanel({ modeKind }: { modeKind: ContentStudioModeKind }) {
  const items = modeKind === 'optimization'
    ? ['原文问题定位', '事实与 FAQ 补强', '渠道结构重排', '发布后再次监测']
    : ['监测缺口转选题', '品牌事实注入', '标准答案对齐', '发布后再次监测'];

  return (
    <Card size="small" title="创作任务拆解" className="content-studio-subcard">
      <Row gutter={[8, 8]}>
        {items.map((item, index) => (
          <Col span={12} key={item}>
            <div className="content-studio-step-chip">
              <Typography.Text type="secondary">{index + 1}</Typography.Text>
              <Typography.Text>{item}</Typography.Text>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

function MaterialSourcePanel({ task }: { task?: ContentGenerationTask }) {
  const sources = getContentMaterialSources(task);

  return (
    <Card size="small" title="素材与依据" className="content-studio-subcard">
      <Space direction="vertical" size={8} className="page-stack">
        {sources.map((source) => (
          <div className="content-studio-source-row" key={source.label}>
            <Space direction="vertical" size={2}>
              <Typography.Text strong>{source.label}</Typography.Text>
              <Typography.Text type="secondary">{source.description}</Typography.Text>
            </Space>
            <Tag color={source.color}>{source.status}</Tag>
          </div>
        ))}
      </Space>
    </Card>
  );
}

function PublishingMaterialPanel() {
  return (
    <Card size="small" title="发布素材规则" className="content-studio-subcard">
      <Space direction="vertical" size={8} className="page-stack">
        <Typography.Text type="secondary">封面图、案例图和门店图在发布中心维护，进入发布准备后按渠道规格选择。</Typography.Text>
        <div className="content-studio-source-row">
          <Typography.Text>图片素材</Typography.Text>
          <Tag color="blue">最多 5 张候选</Tag>
        </div>
        <div className="content-studio-source-row">
          <Typography.Text>发布策略</Typography.Text>
          <Tag color="green">按渠道随机或人工指定</Tag>
        </div>
      </Space>
    </Card>
  );
}

function GenerationControlPanel({ task, modeKind }: { task: ContentGenerationTask; modeKind: ContentStudioModeKind }) {
  const preset = getGenerationPreset(task, modeKind);

  return (
    <Card size="small" title="生成配置" className="content-studio-subcard">
      <Space direction="vertical" size={8} className="page-stack">
        {preset.map((item) => (
          <div className="content-studio-source-row" key={item.label}>
            <Typography.Text type="secondary">{item.label}</Typography.Text>
            <Tag color={item.color}>{item.value}</Tag>
          </div>
        ))}
      </Space>
    </Card>
  );
}

function ChannelReadinessPanel({ task, qualityCheck }: { task: ContentGenerationTask; qualityCheck: DraftQualityCheckResult }) {
  const items = getChannelReadinessItems(task, qualityCheck);

  return (
    <Card size="small" title="渠道发布检查" className="content-studio-subcard content-studio-readiness-card">
      <Row gutter={[8, 8]}>
        {items.map((item) => (
          <Col xs={24} md={12} key={item.label}>
            <div className="content-studio-readiness-item">
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{item.label}</Typography.Text>
                <Typography.Text type="secondary">{item.description}</Typography.Text>
              </Space>
              <Tag color={item.color}>{item.status}</Tag>
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

export function DraftWorkflowStatePanel({ state, onRetry, retrying }: { state: ContentDraftPanelState; onRetry: () => void; retrying: boolean }) {
  return (
    <Alert
      type={state.alertType}
      showIcon
      message={state.label}
      description={state.description}
      action={state.key === 'failed'
        ? <Button size="small" loading={retrying} onClick={onRetry}>重新生成</Button>
        : <Tag color={state.color}>{state.nextAction}</Tag>}
      style={{ marginBottom: 16 }}
    />
  );
}

export type ContentStudioModeKind = 'generation' | 'optimization';

export function getContentStudioMode(pathname: string): {
  kind: ContentStudioModeKind;
  title: string;
  description: string;
  inputMessage: string;
  inputDescription: string;
} {
  if (pathname === '/content-optimization') {
    return {
      kind: 'optimization',
      title: '内容优化',
      description: '优化已有内容的结构、事实依据、FAQ、引用来源和渠道适配，让内容更容易支撑后续 AI 回复监测。',
      inputMessage: '用已有内容生成优化稿',
      inputDescription: '选择内容策略后，把已有文章、FAQ 或社媒文案作为内容主题录入，并补充需要强化的关键词和引用依据。'
    };
  }

  return {
    kind: 'generation',
    title: '内容生成',
    description: '基于品牌资料、标准答案、AI 回复监测缺口和内容策略生成可发布草稿，并进入发布准备和再次监测。',
    inputMessage: '用监测缺口生成可发布内容',
    inputDescription: '选择内容策略后，系统会结合品牌资料、标准答案、AI 回复监测缺口、目标关键词和引用资料生成草稿。'
  };
}

export function getContentMaterialSources(task?: Pick<ContentGenerationTask, 'targetKeywords' | 'referenceSources'>): Array<{ label: string; description: string; status: string; color: string }> {
  return [
    {
      label: '品牌资料',
      description: '用于校验事实、课程、门店、服务边界',
      status: '默认带入',
      color: 'blue'
    },
    {
      label: '品牌标准答案',
      description: '用于对齐问答口径和关键表达',
      status: '默认带入',
      color: 'geekblue'
    },
    {
      label: '真实 AI 回复',
      description: formatList(task?.referenceSources) === '-' ? '生成前建议补充监测回复或浏览器辅助结果' : formatList(task?.referenceSources),
      status: formatList(task?.referenceSources) === '-' ? '待补充' : '已选择',
      color: formatList(task?.referenceSources) === '-' ? 'orange' : 'green'
    },
    {
      label: '目标关键词',
      description: formatList(task?.targetKeywords) === '-' ? '生成前建议补充核心搜索表达' : formatList(task?.targetKeywords),
      status: formatList(task?.targetKeywords) === '-' ? '待补充' : '已选择',
      color: formatList(task?.targetKeywords) === '-' ? 'orange' : 'green'
    }
  ];
}

export function getGenerationPreset(task: Pick<ContentGenerationTask, 'contentType' | 'targetPlatform'> | undefined, modeKind: ContentStudioModeKind): Array<{ label: string; value: string; color: string }> {
  return [
    { label: '任务模式', value: modeKind === 'optimization' ? '优化已有内容' : '生成新内容', color: modeKind === 'optimization' ? 'gold' : 'blue' },
    { label: '内容规格', value: getContentTypeLabel(task?.contentType), color: 'purple' },
    { label: '发布渠道', value: getPlatformDisplay(task?.targetPlatform), color: 'cyan' },
    { label: '审稿策略', value: '事实、合规、再次监测', color: 'green' }
  ];
}

export function getChannelReadinessItems(task: Pick<ContentGenerationTask, 'contentType' | 'targetKeywords' | 'referenceSources' | 'retestAt'>, qualityCheck: DraftQualityCheckResult): Array<{ label: string; description: string; status: string; color: string }> {
  return [
    {
      label: '内容结构',
      description: qualityCheck.missingSections.length > 0 ? `待补齐 ${qualityCheck.missingSections.join('、')}` : `${getContentTypeLabel(task.contentType)} 结构完整`,
      status: qualityCheck.missingSections.length > 0 ? '待处理' : '通过',
      color: qualityCheck.missingSections.length > 0 ? 'orange' : 'green'
    },
    {
      label: '素材引用',
      description: formatList(task.referenceSources) === '-' ? '需补充真实 AI 回复、品牌资料或信源建议' : formatList(task.referenceSources),
      status: formatList(task.referenceSources) === '-' ? '待补充' : '已选择',
      color: formatList(task.referenceSources) === '-' ? 'orange' : 'green'
    },
    {
      label: '关键词覆盖',
      description: formatList(task.targetKeywords) === '-' ? '需补充目标关键词' : formatList(task.targetKeywords),
      status: formatList(task.targetKeywords) === '-' ? '待补充' : '已覆盖',
      color: formatList(task.targetKeywords) === '-' ? 'orange' : 'green'
    },
    {
      label: '再次监测',
      description: task.retestAt || '建议设置发布后的再次监测时间',
      status: task.retestAt ? '已安排' : '建议补充',
      color: task.retestAt ? 'green' : 'blue'
    }
  ];
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
            <Descriptions.Item label="优化计划">{task.growthOptimizationPlanId ? '已关联' : '未关联'}</Descriptions.Item>
            <Descriptions.Item label="版本数">{workspace?.versions.length ?? 0}</Descriptions.Item>
            {task.errorMessage ? <Descriptions.Item label="失败原因"><Typography.Text type="danger">{task.errorMessage}</Typography.Text></Descriptions.Item> : null}
          </Descriptions>
        ) : <EmptyState title="先创建内容任务" description="内容主题、模板、目标平台和引用资料" reason="缺少内容任务时，发布准备、媒体统计和再次监测都没有内容来源。" nextStep="在下方创作台选择内容模板并生成草稿。" />}
      </Card>
      <TaskTable tasks={workspace?.tasks ?? []} onSelect={onSelect} />
    </Space>
  );
}

function TaskTable({ tasks, onSelect, onPublishPrepare }: { tasks: ContentGenerationTask[]; onSelect: (taskId: string) => void; onPublishPrepare?: (taskId: string) => void }) {
  return (
    <Table
      rowKey="id"
      dataSource={tasks}
      pagination={tasks.length > 8 ? { pageSize: 8 } : false}
      locale={{ emptyText: <EmptyState title="还没有内容任务" description="可编辑、发布和复测的内容草稿" reason="内容运营需要先把品牌资料和监测结论转成内容资产。" nextStep="从内容策略创建新内容，或在创作台补齐配置后生成。" /> }}
      columns={[
        { title: '内容标题', render: (_, record) => getContentTaskDisplayName(record) },
        { title: '内容模板', dataIndex: 'contentType', render: (value) => getContentTypeLabel(value) },
        { title: '关联优化单元', dataIndex: 'growthOptimizationPlanId', render: (value) => value ? '已关联' : '随策略带入' },
        { title: '关联用户意图', render: (_, record) => record.targetKeywords.length > 0 ? formatList(record.targetKeywords.slice(0, 2)) : '待补充' },
        { title: '适用平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
        { title: '状态', render: (_, record) => <Tag color={taskStatusColors[record.status]}>{taskStatusLabels[record.status]}</Tag> },
        { title: '创建时间', dataIndex: 'createdAt', render: (value) => formatCompactDate(value) },
        { title: '发布统计', render: (_, record) => getContentTaskPublishSummary(record) },
        {
          title: '操作',
          render: (_, record) => (
            <ManagementRowActions
              primaryActions={onPublishPrepare ? [
                <Button key="edit" size="small" onClick={() => onSelect(record.id)}>继续编辑</Button>,
                <Button key="publish" size="small" disabled={record.status !== 'completed'} onClick={() => onPublishPrepare(record.id)}>发布准备</Button>
              ] : [
                <Button key="edit" size="small" onClick={() => onSelect(record.id)}>继续编辑</Button>
              ]}
            />
          )
        }
      ]}
    />
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

type ContentTaskListStats = {
  total: number;
  completed: number;
  pending: number;
  publishReady: number;
};

export type ContentGenerationFormValues = ContentGenerationTaskInput & {
  userIntent?: string;
  toneStyle?: string;
  imageAssetRequirement?: string[];
  complianceRequirement?: string[];
  sourceAssetReference?: string;
  sourceContent?: string;
  optimizationGoals?: string[];
};

export function getContentCreationWorkspaceState({ loading, error, hasTask }: { loading: boolean; error: boolean; hasTask: boolean }): WorkspaceViewState {
  if (loading) return 'loading';
  if (error) return 'error';
  if (!hasTask) return 'empty';
  return 'ready';
}

export function getContentTaskConfigurationIssues(values: Partial<ContentGenerationFormValues>, modeKind: ContentStudioModeKind): string[] {
  const issues: string[] = [];
  if (!values.strategyId) issues.push('请选择内容策略');
  if (modeKind === 'optimization') {
    if (!values.sourceAssetReference && !values.sourceContent?.trim()) issues.push('请选择现有内容或粘贴需要优化的原文');
    if (!values.optimizationGoals?.length) issues.push('请选择至少一个优化目标');
  }
  return issues;
}

export function getContentPublishPreparationPath(
  context: WorkflowRouteContext,
  payload: Pick<PublishingEntryPayload, 'generationTaskId' | 'versionId'> | undefined,
  publishingRecordId: string
): string {
  return workflowStagePath('/publishing', {
    ...context,
    generationTaskId: payload?.generationTaskId,
    versionId: payload?.versionId,
    publishingRecordId,
    tab: 'records'
  });
}

export function getContentTaskInputPayload(values: ContentGenerationFormValues, modeKind: ContentStudioModeKind = 'generation'): ContentGenerationTaskInput {
  const referenceSources = [...(values.referenceSources ?? [])];
  if (modeKind === 'optimization') {
    if (values.sourceAssetReference) referenceSources.push(`现有内容资产：${values.sourceAssetReference}`);
    if (values.sourceContent?.trim()) referenceSources.push(`待优化原文：${values.sourceContent.trim()}`);
    if (values.optimizationGoals?.length) referenceSources.push(`优化目标：${values.optimizationGoals.join('、')}`);
  }

  return {
    strategyId: values.strategyId,
    growthOptimizationPlanId: values.growthOptimizationPlanId,
    targetPlatform: values.targetPlatform,
    contentType: values.contentType,
    contentTopic: values.contentTopic,
    targetKeywords: values.targetKeywords,
    referenceSources,
    retestAt: values.retestAt
  };
}

export type ContentOptimizationSuggestion = {
  key: 'structure' | 'facts' | 'faq' | 'citations' | 'channel';
  label: string;
  description: string;
  status: string;
  color: string;
};

export function getContentOptimizationSuggestions(body: string | undefined, task: Pick<ContentGenerationTask, 'referenceSources' | 'targetPlatform'>): ContentOptimizationSuggestion[] {
  const normalizedBody = body?.trim() ?? '';
  const headingCount = normalizedBody.match(/^##?\s+/gm)?.length ?? 0;
  const hasFacts = task.referenceSources.length > 0;
  const hasFaq = /FAQ|常见问题|[?？]/i.test(normalizedBody);
  const hasCitations = /引用|来源|依据/.test(normalizedBody) || hasFacts;

  return [
    {
      key: 'structure',
      label: '结构建议',
      description: headingCount >= 2 ? `已识别 ${headingCount} 个正文层级，可继续检查阅读顺序。` : '建议补充清晰标题、结论摘要和分段层级。',
      status: headingCount >= 2 ? '结构清晰' : '建议补强',
      color: headingCount >= 2 ? 'green' : 'orange'
    },
    {
      key: 'facts',
      label: '事实补强',
      description: hasFacts ? '已带入品牌资料或现有内容依据，请逐项核对关键事实。' : '建议补充品牌资料、真实回复或已审核事实。',
      status: hasFacts ? '已有依据' : '待补依据',
      color: hasFacts ? 'green' : 'orange'
    },
    {
      key: 'faq',
      label: 'FAQ 补充',
      description: hasFaq ? '正文已包含问答表达，可继续核对用户意图覆盖。' : '建议增加高频用户问题和简洁标准答案。',
      status: hasFaq ? '已覆盖' : '建议补充',
      color: hasFaq ? 'green' : 'blue'
    },
    {
      key: 'citations',
      label: '引用补强',
      description: hasCitations ? '已有引用线索，发布前需核对来源有效性。' : '建议增加官网、权威媒体或品牌知识来源。',
      status: hasCitations ? '已有线索' : '待补引用',
      color: hasCitations ? 'green' : 'orange'
    },
    {
      key: 'channel',
      label: '渠道适配',
      description: `当前按${getPlatformDisplay(task.targetPlatform)}规格检查标题、篇幅和素材。`,
      status: '已匹配渠道',
      color: 'blue'
    }
  ];
}

export type ContentDraftPanelState = {
  key: 'not_generated' | 'generating' | 'failed' | 'review_required' | 'saved' | 'publish_ready';
  label: string;
  description: string;
  nextAction: string;
  color: string;
  alertType: 'info' | 'success' | 'warning' | 'error';
};

export function getContentDraftPanelState(task: ContentGenerationTask | undefined, version: ContentVersion | undefined, qualityCheck: DraftQualityCheckResult): ContentDraftPanelState {
  if (!task) {
    return {
      key: 'not_generated',
      label: '未生成内容',
      description: '左侧补齐内容目标、模板渠道、素材依据和生成配置后生成草稿。',
      nextAction: '创建内容',
      color: 'default',
      alertType: 'info'
    };
  }

  if (task.status === 'running') {
    return {
      key: 'generating',
      label: '正在生成内容',
      description: `适用平台：${getPlatformDisplay(task.targetPlatform)}；当前步骤：${getContentTaskCurrentStepLabel(task)}；可保留任务后继续查看。`,
      nextAction: '等待生成完成',
      color: 'blue',
      alertType: 'info'
    };
  }

  if (task.status === 'failed') {
    return {
      key: 'failed',
      label: '生成失败',
      description: task.errorMessage ?? '内容生成未成功，请检查策略、引用资料和平台配置后重新生成。',
      nextAction: '重新生成',
      color: 'red',
      alertType: 'error'
    };
  }

  if (!version) {
    return {
      key: 'not_generated',
      label: '等待草稿内容',
      description: '任务已创建，草稿内容生成后会在这里展示。',
      nextAction: '等待草稿',
      color: 'default',
      alertType: 'info'
    };
  }

  if (qualityCheck.publishable) {
    return {
      key: 'publish_ready',
      label: '可进入发布准备',
      description: '正文长度、关键章节和合规检查已满足发布准备要求，请继续检查封面图、素材和再次监测计划。',
      nextAction: '进入发布准备',
      color: 'green',
      alertType: 'success'
    };
  }

  if (task.status === 'completed') {
    return {
      key: 'review_required',
      label: '待审核完善',
      description: `草稿已生成，进入发布准备前需要补齐：${qualityCheck.issues.join('；')}`,
      nextAction: '补齐草稿',
      color: 'orange',
      alertType: 'warning'
    };
  }

  return {
    key: 'saved',
    label: '草稿已保存',
    description: '内容版本已保存，可继续编辑、导出或进入发布检查。',
    nextAction: '继续编辑',
    color: 'blue',
    alertType: 'info'
  };
}

function getContentTaskCurrentStepLabel(task: ContentGenerationTask): string {
  const runningStep = task.steps.find((step) => step.status === 'running');
  if (runningStep) return runningStep.label;

  const pendingStep = task.steps.find((step) => step.status === 'pending');
  return pendingStep?.label ?? '整理草稿';
}

export function getFilteredContentTasks(tasks: ContentGenerationTask[], statusFilter: string, platformFilter: string, search = '', strategies: ContentStrategySummary[] = []): ContentGenerationTask[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || task.targetPlatform === platformFilter;
    const searchableValues = [
      getContentTaskDisplayName(task),
      getContentTypeLabel(task.contentType),
      getContentTaskAssociation(task, strategies),
      getPlatformDisplay(task.targetPlatform),
      ...task.targetKeywords
    ];
    const matchesSearch = normalizedSearch.length === 0 || searchableValues.some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    return matchesStatus && matchesPlatform && matchesSearch;
  });
}

type ContentStrategySummary = Pick<ContentStrategy, 'id' | 'suggestedTitle'>;

export function getContentTaskAssociation(task: Pick<ContentGenerationTask, 'strategyId' | 'growthOptimizationPlanId'>, strategies: ContentStrategySummary[]): string {
  const strategy = strategies.find((item) => item.id === task.strategyId);
  if (strategy) return strategy.suggestedTitle;
  if (task.growthOptimizationPlanId) return '已关联优化计划';
  return '随内容策略带入';
}

export function getContentTaskPublishedAt(records: PublishingRecord[], taskId: string): string | undefined {
  return records
    .filter((record) => record.generationTaskId === taskId && record.status === 'published')
    .reduce<string | undefined>((latest, record) => !latest || record.updatedAt > latest ? record.updatedAt : latest, undefined);
}

export function getContentTaskListStats(tasks: ContentGenerationTask[]): ContentTaskListStats {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    pending: tasks.filter((task) => task.status === 'pending' || task.status === 'running').length,
    publishReady: tasks.filter((task) => task.status === 'completed').length
  };
}

export function getContentTaskPublishSummary(task: Pick<ContentGenerationTask, 'status' | 'retestAt'>): string {
  if (task.status === 'completed') {
    return task.retestAt ? '待发布，已安排再次监测' : '待发布，建议安排再次监测';
  }

  if (task.status === 'failed') return '生成失败，暂无发布统计';
  if (task.status === 'running') return '生成中，统计待更新';
  return '待生成，统计待更新';
}

function formatCompactDate(value?: string): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().slice(0, 10);
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

export type ContentTemplateCategoryKey = 'brand_promotion' | 'qa' | 'case' | 'tutorial' | 'comparison' | 'education' | 'channel';

export const contentTemplateCategories: Array<{ key: ContentTemplateCategoryKey; label: string }> = [
  { key: 'brand_promotion', label: '品牌宣传' },
  { key: 'qa', label: '问答' },
  { key: 'case', label: '案例' },
  { key: 'tutorial', label: '教程' },
  { key: 'comparison', label: '对比' },
  { key: 'education', label: '科普' },
  { key: 'channel', label: '渠道内容' }
];

export type ContentTemplateOption = {
  key: string;
  category: ContentTemplateCategoryKey;
  title: string;
  description: string;
  tags: string[];
  example: string;
  applicablePlatforms: string[];
  recommendedLength: string;
  materialRequirements: string[];
  citationRequirement: string;
  retestSuggestion: string;
  contentType: GrowthContentType;
  targetPlatform: string;
};

export const contentTemplateOptions = [
  {
    key: 'brand_story',
    category: 'brand_promotion',
    title: '品牌宣传模板',
    description: '适合把品牌事实、服务优势和用户价值组织成完整叙事。',
    tags: ['品牌理念', '核心优势', '用户价值'],
    example: '品牌事实 -> 服务优势 -> 用户行动建议',
    applicablePlatforms: ['官网', '公众号', '知乎'],
    recommendedLength: '800-1500 字',
    materialRequirements: ['品牌资料', '门店或团队图片'],
    citationRequirement: '至少引用品牌事实和标准答案',
    retestSuggestion: '发布后复测品牌名和核心服务词',
    contentType: 'platform_profile_copy',
    targetPlatform: 'official_site'
  },
  {
    key: 'faq_answer',
    category: 'qa',
    title: '问答式模板',
    description: '适合补齐 AI 回复里缺失的标准问答和官网 FAQ。',
    tags: ['Q&A', 'FAQ', '标准答案'],
    example: '问题 -> 品牌标准答案 -> 补充依据',
    applicablePlatforms: ['官网', 'AI 平台资料', '知乎'],
    recommendedLength: '400-900 字',
    materialRequirements: ['标准答案', '真实 AI 回复'],
    citationRequirement: '标注问题来源和品牌标准答案',
    retestSuggestion: '发布后复测同一用户问题',
    contentType: 'website_faq',
    targetPlatform: 'official_site'
  },
  {
    key: 'guide',
    category: 'tutorial',
    title: '教程指南模板',
    description: '适合把复杂服务流程拆成可执行步骤。',
    tags: ['操作指南', '选择建议', '注意事项'],
    example: '适用人群 -> 选择步骤 -> 避坑提醒',
    applicablePlatforms: ['公众号', '知乎', '官网'],
    recommendedLength: '1000-1800 字',
    materialRequirements: ['服务流程', '案例图片'],
    citationRequirement: '引用课程、服务和适用人群事实',
    retestSuggestion: '发布后复测选择类搜索表达',
    contentType: 'wechat_article',
    targetPlatform: 'wechat_official'
  },
  {
    key: 'comparison',
    category: 'comparison',
    title: '对比分析模板',
    description: '适合解释不同课程、服务方案或选择标准。',
    tags: ['方案对比', '优劣分析', '选择标准'],
    example: '对比维度 -> 适配场景 -> 推荐结论',
    applicablePlatforms: ['知乎', '公众号', '官网'],
    recommendedLength: '1200-2200 字',
    materialRequirements: ['竞品信息', '品牌优势事实'],
    citationRequirement: '对比项需有事实依据',
    retestSuggestion: '发布后复测竞品对比问题',
    contentType: 'wechat_article',
    targetPlatform: 'wechat_official'
  },
  {
    key: 'case_story',
    category: 'case',
    title: '案例故事模板',
    description: '适合把用户场景、服务过程和结果反馈整理成故事。',
    tags: ['案例', '场景', '反馈'],
    example: '用户背景 -> 服务过程 -> 可验证反馈',
    applicablePlatforms: ['公众号', '小红书', '官网'],
    recommendedLength: '700-1400 字',
    materialRequirements: ['案例素材', '授权图片'],
    citationRequirement: '案例信息需脱敏并保留事实边界',
    retestSuggestion: '发布后复测案例相关长尾问题',
    contentType: 'xiaohongshu_note',
    targetPlatform: 'xiaohongshu'
  },
  {
    key: 'ranking_recommendation',
    category: 'comparison',
    title: '榜单推荐模板',
    description: '适合围绕本地选择、服务清单和推荐理由组织内容。',
    tags: ['榜单', '推荐理由', '本地搜索'],
    example: '评估标准 -> 推荐清单 -> 选择建议',
    applicablePlatforms: ['知乎', '小红书', '公众号'],
    recommendedLength: '900-1800 字',
    materialRequirements: ['评估标准', '本地服务信息'],
    citationRequirement: '推荐理由需对应事实依据',
    retestSuggestion: '发布后复测榜单和推荐类问题',
    contentType: 'xiaohongshu_note',
    targetPlatform: 'xiaohongshu'
  },
  {
    key: 'local_guide',
    category: 'tutorial',
    title: '本地攻略模板',
    description: '适合承接城市、本地门店和到店决策问题。',
    tags: ['本地攻略', '门店', '到店决策'],
    example: '区域问题 -> 门店信息 -> 到店建议',
    applicablePlatforms: ['小红书', '公众号', '官网'],
    recommendedLength: '600-1200 字',
    materialRequirements: ['门店图', '地址和服务范围'],
    citationRequirement: '门店信息和服务范围需准确',
    retestSuggestion: '发布后复测城市和区域关键词',
    contentType: 'xiaohongshu_note',
    targetPlatform: 'xiaohongshu'
  },
  {
    key: 'faq_collection',
    category: 'qa',
    title: 'FAQ 汇总模板',
    description: '适合批量整理真实用户问题和品牌标准答案。',
    tags: ['FAQ', '问题汇总', '标准口径'],
    example: '问题分类 -> 标准答案 -> 延伸行动',
    applicablePlatforms: ['官网', 'AI 平台资料', '公众号'],
    recommendedLength: '800-1600 字',
    materialRequirements: ['用户意图', '品牌标准答案'],
    citationRequirement: '每个回答绑定标准答案或资料来源',
    retestSuggestion: '发布后复测 FAQ 覆盖问题',
    contentType: 'website_faq',
    targetPlatform: 'official_site'
  },
  {
    key: 'media_release',
    category: 'brand_promotion',
    title: '媒体稿模板',
    description: '适合发布品牌动态、活动和重要信息。',
    tags: ['媒体稿', '活动', '品牌动态'],
    example: '新闻点 -> 事实说明 -> 联系方式',
    applicablePlatforms: ['官网', '公众号', '媒体平台'],
    recommendedLength: '600-1200 字',
    materialRequirements: ['活动信息', '官方图片'],
    citationRequirement: '时间、地点、主体和数据需可核验',
    retestSuggestion: '发布后复测品牌动态和活动问题',
    contentType: 'wechat_article',
    targetPlatform: 'wechat_official'
  },
  {
    key: 'xiaohongshu_seed',
    category: 'channel',
    title: '小红书种草模板',
    description: '适合轻量表达体验、场景和行动建议。',
    tags: ['小红书', '种草', '场景化'],
    example: '场景痛点 -> 体验亮点 -> 话题标签',
    applicablePlatforms: ['小红书'],
    recommendedLength: '500-900 字',
    materialRequirements: ['封面图', '场景图', '话题标签'],
    citationRequirement: '体验表达需匹配真实服务边界',
    retestSuggestion: '发布后复测小红书搜索表达',
    contentType: 'xiaohongshu_note',
    targetPlatform: 'xiaohongshu'
  },
  {
    key: 'zhihu_longform',
    category: 'education',
    title: '知乎长文模板',
    description: '适合回答复杂决策问题，强调逻辑、证据和可执行建议。',
    tags: ['知乎', '长文', '决策解释'],
    example: '问题判断 -> 分析框架 -> 具体建议',
    applicablePlatforms: ['知乎'],
    recommendedLength: '1500-3000 字',
    materialRequirements: ['真实 AI 回复', '品牌资料', '竞品信息'],
    citationRequirement: '关键判断需引用事实或资料来源',
    retestSuggestion: '发布后复测知乎问答和长尾问题',
    contentType: 'wechat_article',
    targetPlatform: 'wechat_official'
  },
  {
    key: 'wechat_article',
    category: 'channel',
    title: '公众号文章模板',
    description: '适合品牌自有阵地沉淀完整观点、案例和行动入口。',
    tags: ['公众号', '观点', '转化入口'],
    example: '开场问题 -> 深度说明 -> 行动入口',
    applicablePlatforms: ['公众号'],
    recommendedLength: '1000-2000 字',
    materialRequirements: ['头图', '正文配图', '二维码或预约入口'],
    citationRequirement: '观点需结合品牌事实和标准答案',
    retestSuggestion: '发布后复测文章主题和品牌服务词',
    contentType: 'wechat_article',
    targetPlatform: 'wechat_official'
  }
] satisfies ContentTemplateOption[];

export function getContentTemplatesByCategory(category: ContentTemplateCategoryKey): ContentTemplateOption[] {
  return contentTemplateOptions.filter((template) => template.category === category);
}

export function getContentTemplateFormPreset(template: Pick<ContentTemplateOption, 'contentType' | 'targetPlatform'>): Pick<ContentGenerationTaskInput, 'contentType' | 'targetPlatform'> {
  return {
    contentType: template.contentType,
    targetPlatform: template.targetPlatform
  };
}

const platformOptions = [
  { value: 'wechat_official', label: '公众号' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'official_site', label: '官网 FAQ' },
  { value: 'douyin', label: '短视频平台' },
  { value: 'ai_platform_profile', label: 'AI 平台介绍资料' },
  { value: 'creative_brief', label: '图片创意需求' }
];

const contentTaskPlatformFilterOptions = [{ value: 'all', label: '全部平台' }, ...platformOptions];

const toneStyleOptions = [
  { value: 'professional', label: '专业可信' },
  { value: 'friendly', label: '亲切易懂' },
  { value: 'educational', label: '科普解释' },
  { value: 'conversion', label: '行动引导' }
];

const contentOptimizationGoalOptions = [
  { value: '结构优化', label: '结构优化' },
  { value: '事实补强', label: '事实补强' },
  { value: 'FAQ 补充', label: 'FAQ 补充' },
  { value: '引用补强', label: '引用补强' },
  { value: '渠道适配', label: '渠道适配' }
];

const taskStatusLabels: Record<ContentGenerationTask['status'], string> = {
  pending: '待生成',
  running: '生成中',
  completed: '已完成',
  failed: '未成功'
};

const contentTaskStatusFilterOptions = [
  { value: 'all', label: '全部状态' },
  ...Object.entries(taskStatusLabels).map(([value, label]) => ({ value, label }))
];

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
      locale={{ emptyText: <EmptyState title="还没有历史版本" description="已保存的内容版本" reason="保存版本后可以对比修改记录、审核状态和发布准备情况。" nextStep="生成内容草稿并保存一个版本。" /> }}
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
      locale={{ emptyText: <EmptyState title="还没有导出记录" description="导出到发布准备或媒体平台的记录" reason="导出记录用于追踪内容是否进入发布运营和再次监测。" nextStep="完成内容审核后进入发布准备。" /> }}
      columns={[
        { title: '文件名', dataIndex: 'fileName' },
        { title: '格式', dataIndex: 'exportFormat' },
        { title: '创建时间', dataIndex: 'createdAt' }
      ]}
    />
  );
}
