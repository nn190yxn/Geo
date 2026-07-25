import { useState } from 'react';
import { Alert, Button, Card, Col, Divider, Form, Input, Modal, Progress, Row, Select, Space, Statistic, Steps, Table, Tag, Typography, Upload, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { BrandFaq, BrandImportConfirmationResult, BrandDetail, BrandImportDraft, BrandImportField, BrandMutationInput, BrandWorkspaceSnapshot, BrandWorkspaceSummary, KnowledgeSource, VisibilitySprint } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost, apiPostForm } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { operationWorkflow } from '../../../layouts/navigation';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { BrandKnowledgeCard } from '../components/BrandKnowledgeCard';
import { OptimizationUnitsCard } from '../components/OptimizationUnitsCard';
import { UserIntentPromptCard } from '../components/UserIntentPromptCard';
import { getBrandImportCompletenessScore, getBrandImportDraftState, getImportFieldConfidenceState, getMissingFieldImpact, supportedBrandImportFormats } from './brandImportState';
import { firstRoundSteps, getFirstRoundCurrentStep, getFirstRoundStepStatus } from './firstRoundWorkflow';
import { getSprintMetricCards, getSprintNextAction, getSprintProgressPercent, getSprintStatusLabel, getSprintStepDisplayStatus } from './sprintWorkspace';

type BrandFormValues = Omit<BrandMutationInput, 'aliases' | 'targetCities'> & {
  aliasesText?: string;
  targetCitiesText?: string;
};

type ImportFieldEditorValues = Record<string, string>;

export function BrandWorkspacePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const setActiveBrandId = useBrandContextStore((state) => state.setActiveBrandId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<BrandFormValues>();
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importDraft, setImportDraft] = useState<BrandImportDraft | null>(null);
  const [importFieldValues, setImportFieldValues] = useState<ImportFieldEditorValues>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedGuideKey, setSelectedGuideKey] = useState(firstRoundSteps[0].key);
  const activeBrandQuery = useQuery({
    queryKey: ['active-brand', activeBrandId],
    queryFn: () => apiGet<BrandWorkspaceSummary>('/brands/active')
  });
  const brandsQuery = useQuery({
    queryKey: ['brand-details'],
    queryFn: () => apiGet<BrandDetail[]>('/brands/details')
  });
  const workspaceQuery = useQuery({
    queryKey: ['brand-workspace', activeBrandId],
    queryFn: () => apiGet<BrandWorkspaceSnapshot>(`/brands/${activeBrandId}/workspace`)
  });
  const currentSprintQuery = useQuery({
    queryKey: ['visibility-sprint-current', activeBrandId],
    queryFn: () => apiGet<VisibilitySprint>(`/brands/${activeBrandId}/sprints/current`)
  });
  const activeBrand = activeBrandQuery.data?.success ? activeBrandQuery.data.data : null;
  const brands = brandsQuery.data?.success ? brandsQuery.data.data : [];
  const workspace = workspaceQuery.data?.success ? workspaceQuery.data.data : null;
  const currentSprint = currentSprintQuery.data?.success ? currentSprintQuery.data.data : null;
  const currentFirstRoundStep = getFirstRoundCurrentStep(workspace, importDraft);
  const selectedGuide = firstRoundSteps.find((step) => step.key === selectedGuideKey) ?? firstRoundSteps[currentFirstRoundStep];
  const saveBrandMutation = useMutation({
    mutationFn: (values: BrandFormValues) => {
      const payload = toBrandPayload(values);
      return editingBrandId
        ? apiPatch<BrandDetail>(`/brands/${editingBrandId}`, payload)
        : apiPost<BrandDetail>('/brands', payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setActiveBrandId(response.data.brandId);
        setModalOpen(false);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['accessible-brands'] });
        void queryClient.invalidateQueries({ queryKey: ['brand-details'] });
        void queryClient.invalidateQueries({ queryKey: ['active-brand'] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace'] });
        void messageApi.success(editingBrandId ? '品牌信息已更新' : '品牌已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const statusMutation = useMutation({
    mutationFn: ({ brandId, status }: { brandId: string; status: BrandDetail['status'] }) =>
      apiPatch<BrandDetail>(`/brands/${brandId}/status`, { status }),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['accessible-brands'] });
      void queryClient.invalidateQueries({ queryKey: ['brand-details'] });
      void queryClient.invalidateQueries({ queryKey: ['active-brand'] });
      void queryClient.invalidateQueries({ queryKey: ['brand-workspace'] });
      if (response.success) {
        void messageApi.success('品牌状态已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const uploadBrandMaterialMutation = useMutation({
    mutationFn: async (file: File) => {
      setImportError(null);
      setImportDraft(null);
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await apiPostForm<KnowledgeSource>(`/brands/${activeBrandId}/knowledge-sources/upload`, formData);

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error.message);
      }

      const parseResponse = await apiPost<BrandImportDraft>(`/brands/${activeBrandId}/knowledge-sources/${uploadResponse.data.id}/parse`, {});

      if (!parseResponse.success) {
        throw new Error(parseResponse.error.message);
      }

      return parseResponse.data;
    },
    onSuccess: (draft) => {
      setImportDraft(draft);
      setImportFieldValues(createImportFieldEditorValues(draft.fields));
      void queryClient.invalidateQueries({ queryKey: ['brand-workspace', activeBrandId] });
      if (draft.status === 'failed') {
        setImportError(draft.errorMessage ?? '资料读取失败，请改用手动填写品牌信息。');
        void messageApi.warning('资料已上传，部分内容需要手动补充');
        return;
      }

        void messageApi.success('已读取品牌资料，请继续确认品牌档案');
    },
    onError: (error) => {
      setImportError(error instanceof Error ? error.message : '资料上传失败，请重试或手动填写品牌信息。');
    }
  });
  const confirmBrandImportMutation = useMutation({
    mutationFn: async () => {
      if (!importDraft) {
        throw new Error('请先上传并读取品牌资料。');
      }

      const fields = importDraft.fields.map((field) => ({
        key: field.key,
        value: parseImportFieldEditorValue(field, importFieldValues[field.key] ?? '')
      }));
      const response = await apiPost<BrandImportConfirmationResult>(`/brands/${activeBrandId}/knowledge-sources/${importDraft.sourceId}/confirm`, { fields });

      if (!response.success) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      if (importDraft) {
        setImportDraft({ ...importDraft, status: 'confirmed' });
      }
      void queryClient.invalidateQueries({ queryKey: ['accessible-brands'] });
      void queryClient.invalidateQueries({ queryKey: ['brand-details'] });
      void queryClient.invalidateQueries({ queryKey: ['active-brand'] });
      void queryClient.invalidateQueries({ queryKey: ['brand-workspace', activeBrandId] });
      void messageApi.success('品牌档案已保存');
    },
    onError: (error) => {
      void messageApi.error(error instanceof Error ? error.message : '品牌档案保存失败');
    }
  });

  const openCreateModal = () => {
    setEditingBrandId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const openEditModal = (brand: BrandDetail) => {
    setEditingBrandId(brand.brandId);
    form.setFieldsValue({
      name: brand.name,
      aliasesText: brand.aliases.join('、'),
      industry: brand.industry,
      website: brand.website,
      targetCitiesText: brand.targetCities.join('、'),
      businessScope: brand.businessScope,
      targetAudience: brand.targetAudience,
      status: brand.status
    });
    setModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={activeBrandQuery.data} />
      <PageErrorAlert response={brandsQuery.data} />
      <PageErrorAlert response={workspaceQuery.data} />
      <PageErrorAlert response={currentSprintQuery.data} />
      <Space className="page-heading" align="center">
        <Typography.Title level={2}>品牌工作区</Typography.Title>
        <Button type="primary" onClick={openCreateModal}>新增品牌</Button>
      </Space>
      <Card title="当前品牌上下文">
        <Space direction="vertical">
          <Typography.Text code>{activeBrandId}</Typography.Text>
          <Typography.Text>{activeBrand?.name ?? '品牌信息加载中'}</Typography.Text>
          {activeBrand?.role ? <Typography.Text type="secondary">当前角色：{activeBrand.role}</Typography.Text> : null}
        </Space>
      </Card>
      <Card title="运营闭环入口">
        <Typography.Paragraph>
          按创建品牌、选择监测方向、监测 AI 回复、生成优化计划、写内容、记录发布、安排再次监测和导出报告的顺序完成首轮运营。
        </Typography.Paragraph>
        <Space wrap>
          {operationWorkflow.map((step, index) => (
            <Button key={step.key} onClick={() => navigate(step.key)}>
              {index + 1}. {step.label}
            </Button>
          ))}
          <Button onClick={() => navigate('/advisor')}>顾问服务</Button>
        </Space>
      </Card>
      <SprintWorkspaceEntry sprint={currentSprint} loading={currentSprintQuery.isLoading} onNavigate={(route) => navigate(route)} />
      <AutomationOperatorCard brandId={activeBrandId} source="brand_workspace" title="让 AI 帮我跑一轮" />
      <Card title="完成首轮监测">
        <Space direction="vertical" size={16} className="page-stack">
          <Steps
            size="small"
            current={currentFirstRoundStep}
            items={firstRoundSteps.map((step, index) => ({
              title: step.title,
              description: step.description,
              status: getFirstRoundStepStatus(index, currentFirstRoundStep)
            }))}
          />
          <Alert
            type="info"
            showIcon
            message={selectedGuide.title}
            description={selectedGuide.guide}
            action={<Button size="small" onClick={() => navigate(selectedGuide.route)}>{selectedGuide.actionLabel}</Button>}
          />
          <Alert
            type="success"
            showIcon
            message="首轮监测后的下一步"
            description="监测完成后，先补齐缺失的品牌资料，确认 AI 平台能正常监测，再生成优化计划、内容任务和下一次监测安排。"
          />
          <Space wrap>
            {firstRoundSteps.map((step) => (
              <Button key={step.key} type={selectedGuide.key === step.key ? 'primary' : 'default'} onClick={() => setSelectedGuideKey(step.key)}>
                {step.title}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>
      <Card title="创建或补充品牌资料">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card size="small" title="上传品牌资料">
              <Space direction="vertical" size={12} className="page-stack">
                <Typography.Paragraph>
                  支持 Markdown、Word 和 PDF。上传后系统会先提取品牌简介、课程或产品、目标客户、卖点、FAQ、竞品和需要避免的说法。
                </Typography.Paragraph>
                <Upload
                  accept=".md,.markdown,.doc,.docx,.pdf"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void uploadBrandMaterialMutation.mutateAsync(file);
                    return false;
                  }}
                >
                  <Button type="primary" loading={uploadBrandMaterialMutation.isPending}>上传品牌资料</Button>
                </Upload>
                <Space wrap>
                  {supportedBrandImportFormats.map((format) => <Tag key={format}>{format}</Tag>)}
                </Space>
                {uploadBrandMaterialMutation.isPending ? (
                  <Alert type="info" showIcon message="正在读取资料" description="读取完成后会展示可确认的品牌档案草稿。" />
                ) : null}
                {importDraft ? <BrandImportDraftSummary draft={importDraft} /> : null}
                {importDraft?.status === 'ready_for_confirmation' ? (
                  <BrandImportConfirmationPanel
                    draft={importDraft}
                    values={importFieldValues}
                    saving={confirmBrandImportMutation.isPending}
                    onChange={(key, value) => setImportFieldValues((current) => ({ ...current, [key]: value }))}
                    onConfirm={() => confirmBrandImportMutation.mutate()}
                  />
                ) : null}
                {importError ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="资料需要你补充确认"
                    description={importError}
                    action={<Button size="small" onClick={openCreateModal}>手动填写品牌信息</Button>}
                  />
                ) : null}
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="手动填写品牌信息">
              <Space direction="vertical" size={12} className="page-stack">
                <Typography.Paragraph>
                  适合资料暂时不完整的品牌。先填写品牌名称、行业、城市、业务范围和目标用户，后续仍可继续补充品牌知识库。
                </Typography.Paragraph>
                <Button onClick={openCreateModal}>手动填写品牌信息</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
      <Row gutter={16}>
        <Col span={4}><Card><Statistic title="档案" value={workspace?.relatedCounts.profile ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="监测主题" value={workspace?.relatedCounts.optimizationUnits ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="用户场景" value={workspace?.relatedCounts.intents ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="内容资产" value={workspace?.relatedCounts.contentAssets ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="AI 回复记录" value={workspace?.relatedCounts.monitoringRuns ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="报告" value={workspace?.relatedCounts.reports ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="顾问记录" value={workspace?.relatedCounts.advisorRecords ?? 0} /></Card></Col>
      </Row>
      <Card title="品牌总览">
        <Table
          rowKey="brandId"
          loading={brandsQuery.isLoading}
          dataSource={brands}
          pagination={false}
          locale={{ emptyText: <EmptyState description="暂无品牌，请先创建一个品牌工作区。" actionLabel="新增品牌" onAction={openCreateModal} /> }}
          columns={[
            { title: '品牌名称', dataIndex: 'name' },
            { title: '行业', dataIndex: 'industry' },
            { title: '目标城市', render: (_, record) => record.targetCities.join('、') || '-' },
            {
              title: '状态',
              dataIndex: 'status',
              render: (status: BrandDetail['status']) => <Tag color={status === 'active' ? 'green' : 'default'}>{status}</Tag>
            },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => setActiveBrandId(record.brandId)}>切换</Button>
                  <Button type="link" onClick={() => openEditModal(record)}>编辑</Button>
                  <Button type="link" onClick={() => statusMutation.mutate({ brandId: record.brandId, status: record.status === 'active' ? 'inactive' : 'active' })}>
                    {record.status === 'active' ? '停用' : '启用'}
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
      <OptimizationUnitsCard brandId={activeBrandId} />
      <UserIntentPromptCard brandId={activeBrandId} />
      <BrandKnowledgeCard brandId={activeBrandId} />
      <Modal
        title={editingBrandId ? '编辑品牌' : '新增品牌'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveBrandMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveBrandMutation.mutate(values)}>
          <Form.Item name="name" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="aliasesText" label="品牌别名">
            <Input placeholder="多个别名用顿号或逗号分隔" />
          </Form.Item>
          <Form.Item name="industry" label="行业" rules={[{ required: true, message: '请输入行业' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="website" label="官网">
            <Input />
          </Form.Item>
          <Form.Item name="targetCitiesText" label="目标城市">
            <Input placeholder="多个城市用顿号或逗号分隔" />
          </Form.Item>
          <Form.Item name="businessScope" label="业务范围" rules={[{ required: true, message: '请输入业务范围' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="targetAudience" label="目标用户" rules={[{ required: true, message: '请输入目标用户' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="品牌状态" initialValue="active">
            <Select options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function BrandImportDraftSummary({ draft }: { draft: BrandImportDraft }) {
  const state = getBrandImportDraftState(draft);
  const completenessScore = getBrandImportCompletenessScore(draft);

  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Alert
        type={state.alertType}
        showIcon
        message={<Space><Tag color={state.color}>{state.label}</Tag><span>{state.message}</span></Space>}
        description={draft.errorMessage ?? `已识别 ${draft.confidenceSummary.high} 个高置信字段，${draft.confidenceSummary.needsConfirmation} 个字段需要确认。`}
      />
      <Progress percent={completenessScore} size="small" status={draft.status === 'failed' ? 'exception' : 'active'} />
    </Space>
  );
}

function SprintWorkspaceEntry({ sprint, loading, onNavigate }: { sprint: VisibilitySprint | null; loading: boolean; onNavigate: (route: string) => void }) {
  const status = getSprintStatusLabel(sprint?.status ?? 'draft');
  const nextAction = getSprintNextAction(sprint);
  const metricCards = getSprintMetricCards(sprint);
  const progress = getSprintProgressPercent(sprint);

  return (
    <Card
      title="AI 可见性运营 Sprint"
      loading={loading}
      extra={<Button type="primary" onClick={() => onNavigate(nextAction.route)}>{nextAction.label}</Button>}
    >
      <Space direction="vertical" size={16} className="page-stack">
        <Row gutter={16} align="middle">
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={8} className="page-stack">
              <Space wrap>
                <Tag color={status.color}>{status.label}</Tag>
                <Typography.Text strong>{sprint?.title ?? '首轮 AI 可见性运营'}</Typography.Text>
              </Space>
              <Typography.Text type="secondary">{sprint?.goal ?? '围绕高价值问题完成真实回复监测、标准答案对照、内容补强、发布和复测。'}</Typography.Text>
              <Alert type="info" showIcon message={nextAction.description} action={<Button size="small" onClick={() => onNavigate(nextAction.route)}>{nextAction.label}</Button>} />
            </Space>
          </Col>
          <Col xs={24} lg={14}>
            <Steps
              size="small"
              current={Math.max(0, sprint?.steps.findIndex((step) => step.code === sprint.currentStep) ?? 0)}
              items={(sprint?.steps ?? []).map((step) => ({ title: step.title, description: step.message, status: getSprintStepDisplayStatus(step.status) }))}
            />
            {sprint?.steps.length ? <Progress percent={progress} size="small" /> : null}
          </Col>
        </Row>
        <Row gutter={12}>
          {metricCards.map((item) => (
            <Col key={item.label} xs={12} md={4}>
              <Statistic title={item.label} value={item.value} suffix={item.suffix} />
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
}

function BrandImportConfirmationPanel({
  draft,
  values,
  saving,
  onChange,
  onConfirm
}: {
  draft: BrandImportDraft;
  values: ImportFieldEditorValues;
  saving: boolean;
  onChange: (key: string, value: string) => void;
  onConfirm: () => void;
}) {
  const visibleFields = draft.fields.filter((field) => field.value !== null || field.confirmationRequired);

  return (
    <Card size="small" title="确认品牌档案">
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text type="secondary">请检查系统识别出的字段。高置信字段可以直接保存，标记为需要确认的字段建议先补充或修正。</Typography.Text>
        {visibleFields.map((field) => {
          const confidence = getImportFieldConfidenceState(field.confidence);

          return (
            <div key={field.key}>
              <Space wrap>
                <Typography.Text strong>{field.label}</Typography.Text>
                <Tag color={confidence.color}>{confidence.label}</Tag>
                {field.confirmationRequired ? <Tag color="red">待确认</Tag> : null}
              </Space>
              {field.sourceExcerpt ? <Typography.Paragraph type="secondary">来源片段：{field.sourceExcerpt}</Typography.Paragraph> : null}
              <Input.TextArea
                rows={Array.isArray(field.value) ? 3 : 2}
                value={values[field.key] ?? ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            </div>
          );
        })}
        {draft.missingFields.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            message="还缺这些关键信息"
            description={draft.missingFields.map((field) => getMissingFieldImpact(field)).join(' ')}
          />
        ) : null}
        <Divider />
        <Button type="primary" loading={saving} onClick={onConfirm}>确认并保存品牌档案</Button>
      </Space>
    </Card>
  );
}


function toBrandPayload(values: BrandFormValues): BrandMutationInput {
  return {
    name: values.name,
    aliases: splitList(values.aliasesText),
    industry: values.industry,
    website: values.website,
    targetCities: splitList(values.targetCitiesText),
    businessScope: values.businessScope,
    targetAudience: values.targetAudience,
    status: values.status
  };
}

function splitList(value?: string): string[] {
  return (value ?? '')
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function createImportFieldEditorValues(fields: BrandImportField[]): ImportFieldEditorValues {
  return Object.fromEntries(fields.map((field) => [field.key, formatImportFieldValue(field.value)]));
}

function formatImportFieldValue(value: BrandImportField['value']): string {
  if (value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    if (isFaqList(value)) {
      return value.map((item) => `${item.question}\n${item.answer}`).join('\n\n');
    }

    return value.join('\n');
  }

  return value;
}

function parseImportFieldEditorValue(field: BrandImportField, value: string): BrandImportField['value'] {
  if (Array.isArray(field.value)) {
    if (isFaqList(field.value)) {
      return value
        .split(/\n\s*\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [question = '', ...answerParts] = item.split('\n');
          return { question: question.trim(), answer: answerParts.join('\n').trim() };
        })
        .filter((item) => item.question || item.answer);
    }

    return splitLines(value);
  }

  if (field.value === null && listFieldKeys.has(field.key)) {
    return splitLines(value);
  }

  return value.trim();
}

function splitLines(value: string): string[] {
  return value
    .split(/\n|、|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const listFieldKeys = new Set(['aliases', 'targetCities', 'valueProps', 'offerings', 'proofPoints', 'targetCustomers', 'recommendedExpressions', 'blockedExpressions', 'contentRules', 'competitors']);

function isFaqList(value: string[] | BrandFaq[]): value is BrandFaq[] {
  return value.length > 0 && typeof value[0] === 'object' && 'question' in value[0];
}
