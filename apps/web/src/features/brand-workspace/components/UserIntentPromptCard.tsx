import { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BrandPrompt,
  BrandWorkspaceSnapshot,
  MonitoringFrequency,
  OptimizationUnit,
  OptimizationUnitInput,
  PromptTemplate,
  PromptTemplateInput,
  UserIntent,
  UserIntentCategory,
  UserIntentInput
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { getPlatformDisplayName } from '../../../utils/displayLabels';

type Props = {
  brandId: string;
};

type IntentFormValues = UserIntentInput;
type TemplateFormValues = Omit<PromptTemplateInput, 'targetKeywords' | 'platformCodes'> & {
  targetKeywordsText?: string;
  platformCodesText?: string;
};

export function UserIntentPromptCard({ brandId }: Props) {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [intentForm] = Form.useForm<IntentFormValues>();
  const [templateForm] = Form.useForm<TemplateFormValues>();
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const unitsQuery = useQuery({
    queryKey: ['optimization-units', brandId],
    queryFn: () => apiGet<OptimizationUnit[]>(`/brands/${brandId}/optimization-units`)
  });
  const intentsQuery = useQuery({
    queryKey: ['user-intents', brandId],
    queryFn: () => apiGet<UserIntent[]>(`/brands/${brandId}/intents`)
  });
  const templatesQuery = useQuery({
    queryKey: ['prompt-templates', brandId],
    queryFn: () => apiGet<PromptTemplate[]>(`/brands/${brandId}/prompt-templates`)
  });
  const promptsQuery = useQuery({
    queryKey: ['brand-prompts', brandId],
    queryFn: () => apiGet<BrandPrompt[]>(`/brands/${brandId}/prompts`)
  });
  const workspaceQuery = useQuery({
    queryKey: ['brand-workspace', brandId],
    queryFn: () => apiGet<BrandWorkspaceSnapshot>(`/brands/${brandId}/workspace`)
  });
  const units = unitsQuery.data?.success ? unitsQuery.data.data : [];
  const intents = intentsQuery.data?.success ? intentsQuery.data.data : [];
  const templates = templatesQuery.data?.success ? templatesQuery.data.data : [];
  const prompts = promptsQuery.data?.success ? promptsQuery.data.data : [];
  const unitNameMap = useMemo(() => new Map(units.map((unit) => [unit.id, unit.name])), [units]);
  const promptsByIntent = useMemo(() => {
    const map = new Map<string, BrandPrompt[]>();
    prompts.forEach((prompt) => {
      map.set(prompt.intentId, [...(map.get(prompt.intentId) ?? []), prompt]);
    });
    return map;
  }, [prompts]);

  const autoGenerateMutation = useMutation({
    mutationFn: () => autoGenerateFirstRoundQuestions(brandId, workspaceQuery.data?.success ? workspaceQuery.data.data.brand : null, units, intents, prompts),
    onSuccess: async (createdCount) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['optimization-units', brandId] }),
        queryClient.invalidateQueries({ queryKey: ['user-intents', brandId] }),
        queryClient.invalidateQueries({ queryKey: ['prompt-templates', brandId] }),
        queryClient.invalidateQueries({ queryKey: ['brand-prompts', brandId] }),
        queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] })
      ]);
      void messageApi.success(`已生成 ${createdCount} 个首轮监测问题`);
    },
    onError: (error) => {
      void messageApi.error(error instanceof Error ? error.message : '自动生成失败');
    }
  });

  const createIntentMutation = useMutation({
    mutationFn: (values: IntentFormValues) => apiPost<UserIntent>(`/brands/${brandId}/intents`, values),
    onSuccess: (response) => {
      if (response.success) {
        setIntentModalOpen(false);
        intentForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['user-intents', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['optimization-units', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
      }
    }
  });
  const createTemplateMutation = useMutation({
    mutationFn: (values: TemplateFormValues) => apiPost<PromptTemplate>(`/brands/${brandId}/prompt-templates`, toTemplatePayload(values)),
    onSuccess: (response) => {
      if (response.success) {
        setTemplateModalOpen(false);
        setSelectedTemplateId(response.data.id);
        templateForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['prompt-templates', brandId] });
      }
    }
  });
  const batchGenerateMutation = useMutation({
    mutationFn: () => apiPost<BrandPrompt[]>(`/brands/${brandId}/prompts/batch-generate`, { templateId: selectedTemplateId }),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['brand-prompts', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['user-intents', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['optimization-units', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
      }
    }
  });
  const promptStatusMutation = useMutation({
    mutationFn: ({ promptId, enabled }: { promptId: string; enabled: boolean }) =>
      apiPatch<BrandPrompt>(`/brands/${brandId}/prompts/${promptId}`, { enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['brand-prompts', brandId] });
      void queryClient.invalidateQueries({ queryKey: ['user-intents', brandId] });
    }
  });

  return (
    <Card
      title="监测场景与监测问题"
      extra={(
        <Space>
          {contextHolder}
          <Button loading={autoGenerateMutation.isPending} onClick={() => autoGenerateMutation.mutate()}>
            自动生成首轮问题
          </Button>
          <Select
            placeholder="选择模板"
            value={selectedTemplateId}
            style={{ width: 220 }}
            options={templates.map((template) => ({ value: template.id, label: template.name }))}
            onChange={setSelectedTemplateId}
          />
          <Button onClick={() => setTemplateModalOpen(true)}>创建问题模板</Button>
          <Button onClick={() => setIntentModalOpen(true)}>创建用户场景</Button>
          <Button type="primary" disabled={!selectedTemplateId || intents.length === 0} loading={batchGenerateMutation.isPending} onClick={() => batchGenerateMutation.mutate()}>
            批量生成监测问题
          </Button>
        </Space>
      )}
    >
      <Table
        rowKey="id"
        loading={intentsQuery.isLoading}
        dataSource={intents}
        pagination={false}
        expandable={{ expandedRowRender: (record) => renderPromptRows(record, promptsByIntent.get(record.id) ?? [], promptStatusMutation.mutate) }}
        columns={[
          { title: '用户场景', dataIndex: 'text' },
          { title: '关联监测主题', render: (_, record) => unitNameMap.get(record.optimizationUnitId) ?? '-' },
          { title: '分类', dataIndex: 'category', render: (value: UserIntentCategory) => intentCategoryLabels[value] },
          { title: '频率', dataIndex: 'monitoringFrequency', render: (value: MonitoringFrequency) => frequencyLabels[value] },
          {
            title: '平台表现',
            render: (_, record) => {
              const metrics = record.platformMetrics;
              const averageScore = metrics.length ? Math.round(metrics.reduce((sum, metric) => sum + metric.recommendationScore, 0) / metrics.length) : 0;
              return <Typography.Text type="secondary">推荐度 {averageScore} / 引用率 {metrics.length ? '0%' : '-'}</Typography.Text>;
            }
          },
          { title: '状态', dataIndex: 'enabled', render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
        ]}
      />
      <Modal
        title="创建用户场景"
        open={intentModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createIntentMutation.isPending}
        onCancel={() => setIntentModalOpen(false)}
        onOk={() => intentForm.submit()}
      >
        <Form form={intentForm} layout="vertical" initialValues={{ category: 'category_recommendation', monitoringFrequency: 'weekly', enabled: true }} onFinish={(values) => createIntentMutation.mutate(values)}>
          <Form.Item name="optimizationUnitId" label="关联监测主题" rules={[{ required: true, message: '请选择监测主题' }]}>
            <Select options={units.map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="category" label="场景分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={Object.entries(intentCategoryLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="text" label="用户场景" rules={[{ required: true, message: '请输入用户场景' }]}>
            <Input.TextArea rows={3} placeholder="例如：想找适合 6 岁孩子的体适能机构" />
          </Form.Item>
          <Form.Item name="monitoringFrequency" label="监测频率">
            <Select options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="创建监测问题模板"
        open={templateModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createTemplateMutation.isPending}
        onCancel={() => setTemplateModalOpen(false)}
        onOk={() => templateForm.submit()}
      >
        <Form form={templateForm} layout="vertical" initialValues={{ category: 'category_recommendation', frequency: 'weekly', platformCodesText: '豆包\nDeepSeek\nKimi' }} onFinish={(values) => createTemplateMutation.mutate(values)}>
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="industry" label="适用行业">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="场景分类">
            <Select options={Object.entries(intentCategoryLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="text" label="问题模板" rules={[{ required: true, message: '请输入问题模板' }]}>
            <Input.TextArea rows={4} placeholder="支持 {brandName}、{brandAlias}、{city}、{industry}、{intent}、{unitName}" />
          </Form.Item>
          <Form.Item name="targetKeywordsText" label="目标关键词">
            <Input.TextArea rows={3} placeholder="一行一个关键词" />
          </Form.Item>
          <Form.Item name="platformCodesText" label="目标平台" rules={[{ required: true, message: '请输入目标平台' }]}>
            <Input.TextArea rows={3} placeholder="一行一个平台名称，例如豆包、Kimi、DeepSeek" />
          </Form.Item>
          <Form.Item name="frequency" label="监测频率">
            <Select options={Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

function renderPromptRows(
  intent: UserIntent,
  prompts: BrandPrompt[],
  updateStatus: (values: { promptId: string; enabled: boolean }) => void
) {
  if (prompts.length === 0) {
    return <Typography.Text type="secondary">当前监测场景尚未生成监测问题</Typography.Text>;
  }

  return (
    <Table
      rowKey="id"
      size="small"
      dataSource={prompts}
      pagination={false}
      columns={[
        { title: '监测问题', dataIndex: 'text' },
        { title: '平台', render: (_, record) => record.platformCodes.map(getPlatformDisplayName).join('、') },
        { title: '关键词', render: (_, record) => <Space wrap>{record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)}</Space> },
        { title: '频率', dataIndex: 'monitoringFrequency', render: (value: MonitoringFrequency) => frequencyLabels[value] },
        {
          title: '状态',
          render: (_, record) => (
            <Switch
              checked={record.enabled}
              checkedChildren="启用"
              unCheckedChildren="停用"
              onChange={(enabled) => updateStatus({ promptId: record.id, enabled })}
            />
          )
        }
      ]}
    />
  );
}

const intentCategoryLabels: Record<UserIntentCategory, string> = {
  brand_awareness: '品牌认知',
  category_recommendation: '品类推荐',
  pain_solution: '痛点解决',
  local_decision: '本地决策',
  competitor_compare: '竞品对比',
  price_decision: '价格决策'
};

const frequencyLabels: Record<MonitoringFrequency, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  manual: '手动'
};

function toTemplatePayload(values: TemplateFormValues): PromptTemplateInput {
  return {
    name: values.name,
    industry: values.industry,
    category: values.category,
    text: values.text,
    targetKeywords: splitLines(values.targetKeywordsText),
    platformCodes: splitLines(values.platformCodesText).map(toPlatformCode),
    frequency: values.frequency
  };
}

function splitLines(value?: string): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function toPlatformCode(value: string): string {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    豆包: 'doubao',
    kimi: 'kimi',
    deepseek: 'deepseek',
    deepseek模型: 'deepseek',
    通义千问: 'qianwen',
    qwen: 'qianwen',
    阶跃星辰: 'stepfun',
    stepfun: 'stepfun'
  };

  return aliases[normalized] ?? aliases[value.trim()] ?? normalized;
}

async function autoGenerateFirstRoundQuestions(
  brandId: string,
  brand: BrandWorkspaceSnapshot['brand'] | null,
  units: OptimizationUnit[],
  intents: UserIntent[],
  prompts: BrandPrompt[]
) {
  if (!brand) {
    throw new Error('品牌信息尚未加载完成');
  }

  if (prompts.length > 0) {
    return prompts.length;
  }

  const unit = units[0] ?? await createDefaultOptimizationUnit(brandId, brand);
  const targetIntents = intents.length > 0 ? intents : await createDefaultIntents(brandId, brand, unit.id);
  const template = await createDefaultPromptTemplate(brandId, brand);
  const generated = await apiPost<BrandPrompt[]>(`/brands/${brandId}/prompts/batch-generate`, {
    templateId: template.id,
    intentIds: targetIntents.map((intent) => intent.id)
  });

  if (!generated.success) {
    throw new Error(generated.error.message);
  }

  return generated.data.length;
}

async function createDefaultOptimizationUnit(brandId: string, brand: BrandWorkspaceSnapshot['brand']) {
  const payload: OptimizationUnitInput = {
    name: `${brand.name}核心推荐场景`,
    type: 'category',
    targetKeywords: [brand.name, brand.industry, ...brand.targetCities].filter(Boolean),
    priority: 'high',
    enabled: true
  };
  const response = await apiPost<OptimizationUnit>(`/brands/${brandId}/optimization-units`, payload);

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

async function createDefaultIntents(brandId: string, brand: BrandWorkspaceSnapshot['brand'], optimizationUnitId: string) {
  const city = brand.targetCities[0] ?? '本地';
  const intentInputs: UserIntentInput[] = [
    { optimizationUnitId, category: 'category_recommendation', text: `${city}有哪些适合${brand.targetAudience}的${brand.industry}品牌推荐？`, monitoringFrequency: 'weekly', enabled: true },
    { optimizationUnitId, category: 'local_decision', text: `${city}家长选择${brand.industry}机构时应该重点比较什么？`, monitoringFrequency: 'weekly', enabled: true },
    { optimizationUnitId, category: 'pain_solution', text: `${brand.targetAudience}遇到${brand.businessScope}相关需求时有哪些解决方案？`, monitoringFrequency: 'weekly', enabled: true },
    { optimizationUnitId, category: 'brand_awareness', text: `${brand.name}在${brand.industry}领域有什么特色和适合人群？`, monitoringFrequency: 'weekly', enabled: true },
    { optimizationUnitId, category: 'price_decision', text: `选择${brand.industry}服务时，价格、课程和服务体验应该如何权衡？`, monitoringFrequency: 'weekly', enabled: true }
  ];
  const created: UserIntent[] = [];

  for (const input of intentInputs) {
    const response = await apiPost<UserIntent>(`/brands/${brandId}/intents`, input);
    if (!response.success) {
      throw new Error(response.error.message);
    }
    created.push(response.data);
  }

  return created;
}

async function createDefaultPromptTemplate(brandId: string, brand: BrandWorkspaceSnapshot['brand']) {
  const response = await apiPost<PromptTemplate>(`/brands/${brandId}/prompt-templates`, {
    name: `${brand.name}首轮 AI 回复监测模板`,
    industry: brand.industry,
    category: 'category_recommendation',
    text: '{intent} 请像真实用户在 AI 搜索中提问一样回答，并说明是否推荐{brandName}、推荐理由、适合人群和可参考信息来源。',
    targetKeywords: [brand.name, brand.industry, ...brand.targetCities].filter(Boolean),
    platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
    frequency: 'weekly'
  });

  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}
