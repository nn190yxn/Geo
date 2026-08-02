import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Tag, Tooltip, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlatformConfig, PlatformConfigInput, PlatformMode, PlatformValidationResult } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { PageErrorAlert } from '../../../components/PageState';
import { ProductPage } from '../../../components/ProductPage';
import { getPlatformDisplayName, preferredAIPlatformSummary } from '../../../utils/displayLabels';

type ModelFormValues = PlatformConfigInput;

export function ModelSettingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ModelFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PlatformConfig | null>(null);
  const watchedPlatformCode = Form.useWatch('platformCode', form);
  const watchedMode = Form.useWatch('mode', form);
  const activeGuide = getModelSetupGuide(watchedPlatformCode);
  const modelsQuery = useQuery({
    queryKey: ['model-settings'],
    queryFn: () => apiGet<PlatformConfig[]>('/platforms')
  });
  const models = modelsQuery.data?.success ? modelsQuery.data.data : [];
  const platformCards = getPlatformCardItems(models);
  const saveMutation = useMutation({
    mutationFn: (values: ModelFormValues) => {
      const payload = toModelPayload(values, Boolean(editingModel));
      return editingModel
        ? apiPatch<PlatformConfig>(`/platforms/${editingModel.id}`, payload)
        : apiPost<PlatformConfig>('/platforms', payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setModalOpen(false);
        setEditingModel(null);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['model-settings'] });
        void messageApi.success('模型设置已保存');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const validateMutation = useMutation({
    mutationFn: (modelId: string) => apiPost<PlatformValidationResult>(`/platforms/${modelId}/validate`, {}),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['model-settings'] });
      if (response.success) {
        void messageApi.success(response.data.message);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openEditModal = (model: PlatformConfig) => {
    setEditingModel(model);
    form.setFieldsValue({
      platformCode: model.platformCode,
      name: model.name,
      mode: model.mode,
      endpointUrl: model.endpointUrl,
      modelName: model.modelName,
      rateLimitPerMinute: model.rateLimitPerMinute,
      enabled: model.enabled,
      credentialRef: undefined
    });
    setModalOpen(true);
  };

  const openPlatformSetup = (item: PlatformCardItem) => {
    const config = item.configId ? models.find((model) => model.id === item.configId) : undefined;
    if (config) {
      openEditModal(config);
      return;
    }

    const guide = getModelSetupGuide(item.platformCode);
    setEditingModel(null);
    form.resetFields();
    form.setFieldsValue({
      platformCode: item.platformCode,
      name: item.displayName,
      mode: 'api',
      endpointUrl: guide?.endpointUrl,
      modelName: guide?.modelName,
      rateLimitPerMinute: 20,
      enabled: true
    });
    setModalOpen(true);
  };

  return (
    <ProductPage
      title="AI 平台管理"
      description="查看各 AI 平台是否可用于真实回复监测，并从统一入口完成连接、验证和接入方式管理。"
      context={<Tag color="blue">内测优先：阶跃星辰 step-3.7-flash</Tag>}
    >
      <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={modelsQuery.data} />
      <Alert
        type="info"
        showIcon
        message="连接信息按公开边界展示"
        description={`主页面只展示脱敏连接状态、可用监测方式和最近验证结果。${preferredAIPlatformSummary}的具体配置统一在管理弹窗中维护。`}
      />

      <PlatformConnectionCards items={platformCards} loading={modelsQuery.isLoading} onSetup={openPlatformSetup} />

      <Modal
        title={editingModel ? '编辑 AI 平台设置' : '新增 AI 平台设置'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        footer={(_, { OkBtn, CancelBtn }) => (
          <Space>
            <CancelBtn />
            {editingModel ? <Button loading={validateMutation.isPending} onClick={() => validateMutation.mutate(editingModel.id)}>检查连接</Button> : null}
            <OkBtn />
          </Space>
        )}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          {activeGuide ? <Alert type="info" showIcon message={`${activeGuide.displayName} 接入提示`} description={`准备 ${activeGuide.requiredItems.join('、')}，接口地址可填 ${activeGuide.endpointUrl}，模型名称可先填 ${activeGuide.modelName}。`} style={{ marginBottom: 16 }} /> : null}
          <Form.Item name="platformCode" label={<FieldLabel text="AI 平台" help="用于选择要接入的 AI 平台，页面会统一显示为豆包、Kimi、DeepSeek、通义千问或阶跃星辰。" />} rules={[{ required: true, message: '请输入 AI 平台' }]}>
            <Input placeholder="例如：DeepSeek" />
          </Form.Item>
          <Form.Item name="name" label={<FieldLabel text="显示名称" help={`给运营人员看的名称，例如 ${preferredAIPlatformSummary}。`} />} rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="例如：DeepSeek" />
          </Form.Item>
          <Form.Item name="mode" label={<FieldLabel text="调用方式" help="选择自动 API 监测后，系统会用接口地址和模型名称自动调用；手动录入用于复制问题后粘贴回答。" />} rules={[{ required: true, message: '请选择调用方式' }]}>
            <Select options={watchedMode === 'mock'
              ? [...publicModeOptions, { value: 'mock', label: modeLabels.mock, disabled: true }]
              : publicModeOptions} />
          </Form.Item>
          <Form.Item name="endpointUrl" label={<FieldLabel text="接口地址" help="填写兼容 OpenAI Chat Completions 的完整地址，例如 https://api.deepseek.com/chat/completions。" />}>
            <Input placeholder="https://api.deepseek.com/chat/completions" />
          </Form.Item>
          <Form.Item name="modelName" label={<FieldLabel text="模型名称" help="填写供应商文档里的 model 名称，例如 deepseek-chat、moonshot-v1-8k。" />}>
            <Input placeholder="例如：deepseek-chat" />
          </Form.Item>
          <Form.Item name="credentialRef" label={<FieldLabel text="API Key" help="可以直接填写供应商给的 API Key；也可以填写服务器环境变量名，例如 DEEPSEEK_API_KEY。保存后页面只显示是否已填写。" />}>
            <Input.Password placeholder={editingModel ? '不填写则保持原 API Key' : '粘贴 API Key，或填写环境变量名'} />
          </Form.Item>
          <Form.Item name="rateLimitPerMinute" label={<FieldLabel text="每分钟调用上限" help="用于控制自动监测频率，避免供应商限流；不知道填多少可先填 20。" />}>
            <InputNumber min={0} addonAfter="次/分钟" className="full-width" />
          </Form.Item>
          <Form.Item name="enabled" label="是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
      </Space>
    </ProductPage>
  );
}

export type PlatformCardItem = {
  platformCode: string;
  displayName: string;
  statusLabel: string;
  statusColor: string;
  methodLabels: string[];
  validationLabel: string;
  nextAction: string;
  configId?: string;
};

export function PlatformConnectionCards({ items, loading, onSetup }: { items: PlatformCardItem[]; loading: boolean; onSetup: (item: PlatformCardItem) => void }) {
  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.platformCode} xs={24} md={12} xl={8}>
          <Card className="geo-platform-stat-card" title={item.displayName} loading={loading}>
            <Space direction="vertical" size={16} className="page-stack">
              <Space wrap>
                <Tag color={item.statusColor}>{item.statusLabel}</Tag>
                <Typography.Text type="secondary">{item.validationLabel}</Typography.Text>
              </Space>
              <div>
                <Typography.Text type="secondary">可用监测方式</Typography.Text>
                <div>
                  <Space wrap size={[4, 8]}>
                    {item.methodLabels.map((label) => <Tag key={label}>{label}</Tag>)}
                  </Space>
                </div>
              </div>
              <Typography.Text type="secondary">{item.nextAction}</Typography.Text>
              <Button block onClick={() => onSetup(item)}>{item.configId ? '管理接入' : '连接平台'}</Button>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

export function getPlatformCardItems(configs: PlatformConfig[]): PlatformCardItem[] {
  const matchedIds = new Set<string>();
  const guideItems = modelSetupGuides.map((guide) => {
    const config = configs.find((item) => normalizePlatformCode(item.platformCode) === normalizePlatformCode(guide.platformCode));
    if (config) matchedIds.add(config.id);
    return buildPlatformCardItem(guide.platformCode, guide.displayName, config);
  });
  const customItems = configs
    .filter((config) => !matchedIds.has(config.id) && config.mode !== 'mock')
    .map((config) => buildPlatformCardItem(config.platformCode, config.name || getPlatformDisplayName(config.platformCode), config));

  return [...guideItems, ...customItems];
}

function buildPlatformCardItem(platformCode: string, displayName: string, config?: PlatformConfig): PlatformCardItem {
  const status = getPlatformConnectionDisplay(config);
  return {
    platformCode,
    displayName,
    statusLabel: status.label,
    statusColor: status.color,
    methodLabels: getPlatformMethodLabels(config),
    validationLabel: getPlatformValidationLabel(config),
    nextAction: config?.nextAction || '连接后即可检查平台可用性并开始真实回复监测。',
    configId: config?.id
  };
}

export function getPlatformConnectionDisplay(config?: PlatformConfig): { label: string; color: string } {
  if (!config) return { label: '未接入', color: 'default' };
  if (!config.enabled) return { label: '已停用', color: 'default' };
  const displays = {
    ready: { label: '已连接', color: 'green' },
    browser_available: { label: '浏览器辅助可用', color: 'blue' },
    manual_available: { label: '手动录入可用', color: 'blue' },
    needs_configuration: { label: '待配置', color: 'gold' },
    needs_confirmation: { label: '待确认', color: 'gold' }
  } as const;
  return displays[config.connectionStatus];
}

export function getPlatformMethodLabels(config?: PlatformConfig): string[] {
  const methods = config?.availableMethods ?? ['api', 'browser', 'manual'];
  const labels = { api: '自动 API 监测', browser: '浏览器辅助', manual: '手动录入' } as const;
  return methods.map((method) => labels[method]);
}

export function getPlatformValidationLabel(config?: PlatformConfig): string {
  if (!config) return '连接后可验证';
  if (!config.lastValidation) return '尚未验证';
  return config.lastValidation.ok ? '最近验证成功' : '最近验证失败，请重新检查';
}

function normalizePlatformCode(value: string): string {
  return value.trim().toLowerCase();
}

function FieldLabel({ text, help }: { text: string; help: string }) {
  return (
    <Space size={4}>
      <span>{text}</span>
      <Tooltip title={help}>
        <button type="button" className="field-help-button" aria-label={`查看${text}说明`}>?</button>
      </Tooltip>
    </Space>
  );
}

function toModelPayload(values: ModelFormValues, editing: boolean): PlatformConfigInput {
  const credentialRef = values.credentialRef?.trim();

  return {
    ...values,
    platformCode: values.platformCode.trim(),
    name: values.name.trim(),
    endpointUrl: values.endpointUrl?.trim() || undefined,
    modelName: values.modelName?.trim() || undefined,
    credentialRef: credentialRef || (editing ? undefined : credentialRef),
    rateLimitPerMinute: values.rateLimitPerMinute ?? 0,
    enabled: values.enabled ?? true
  };
}

export type ModelSetupGuide = {
  platformCode: string;
  displayName: string;
  requiredItems: string[];
  endpointUrl: string;
  modelName: string;
  nextAction: string;
};

export const modelSetupGuides: ModelSetupGuide[] = [
  {
    platformCode: 'stepfun',
    displayName: '阶跃星辰',
    requiredItems: ['API Key', '接口地址', '模型名称'],
    endpointUrl: 'https://api.stepfun.com/v1/chat/completions',
    modelName: 'step-3.7-flash',
    nextAction: '内测默认优先使用，保存后先跑少量问题验证回答格式'
  },
  {
    platformCode: 'deepseek',
    displayName: 'DeepSeek',
    requiredItems: ['API Key', '接口地址', '模型名称'],
    endpointUrl: 'https://api.deepseek.com/chat/completions',
    modelName: 'deepseek-chat',
    nextAction: '保存后检查连接，成功后可用于自动监测'
  },
  {
    platformCode: 'kimi',
    displayName: 'Kimi',
    requiredItems: ['API Key', '接口地址', '模型名称'],
    endpointUrl: 'https://api.moonshot.cn/v1/chat/completions',
    modelName: 'moonshot-v1-8k',
    nextAction: '没有 API Key 时可先用浏览器或手动录入'
  },
  {
    platformCode: 'qianwen',
    displayName: '通义千问',
    requiredItems: ['API Key', '接口地址', '模型名称'],
    endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    modelName: 'qwen-plus',
    nextAction: '确认账号额度后再提高每分钟调用上限'
  },
  {
    platformCode: 'doubao',
    displayName: '豆包',
    requiredItems: ['API Key', '接口地址', '模型名称'],
    endpointUrl: '填写豆包兼容 Chat Completions 的接口地址',
    modelName: '填写豆包模型名称',
    nextAction: '没有 API Key 时可先用浏览器辅助监测或手动录入'
  }
];

export function getModelSetupGuide(platformCode?: string): ModelSetupGuide | undefined {
  const normalized = platformCode?.trim().toLowerCase();
  if (!normalized) return undefined;
  return modelSetupGuides.find((guide) => guide.platformCode === normalized);
}

const modeLabels: Record<PlatformMode, string> = {
  api: '自动 API 调用',
  semi_auto: '浏览器或手动确认',
  manual: '手动录入',
  mock: '不可用于指标'
};

const publicModeOptions: Array<{ value: Exclude<PlatformMode, 'mock'>; label: string }> = [
  { value: 'api', label: modeLabels.api },
  { value: 'semi_auto', label: modeLabels.semi_auto },
  { value: 'manual', label: modeLabels.manual }
];
