import { useState } from 'react';
import { Alert, Button, Card, Collapse, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrowserConnectionSession, BrowserConnectionStatusInput, PlatformConfig, PlatformConfigInput, PlatformMode, PlatformValidationResult } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getPlatformDisplayName } from '../../../utils/displayLabels';
import { advancedPlatformSettingFields, getBrowserIssueLabel, getBrowserLoginUrl, getBrowserSessionStatusColor, getBrowserSessionStatusLabel, getLastAvailableLabel, getLatestBrowserSession, getMethodPreview, groupPlatformConfigs } from './platformConfigDisplay';

type PlatformFormValues = PlatformConfigInput;

export function PlatformConfigCard() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PlatformFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [browserPlatform, setBrowserPlatform] = useState<PlatformConfig | null>(null);
  const platformsQuery = useQuery({
    queryKey: ['platform-configs'],
    queryFn: () => apiGet<PlatformConfig[]>('/platforms')
  });
  const browserSessionsQuery = useQuery({
    queryKey: ['browser-connection-sessions'],
    queryFn: () => apiGet<BrowserConnectionSession[]>('/platforms/browser-sessions')
  });
  const platforms = platformsQuery.data?.success ? platformsQuery.data.data : [];
  const browserSessions = browserSessionsQuery.data?.success ? browserSessionsQuery.data.data : [];
  const platformGroups = groupPlatformConfigs(platforms);
  const selectedBrowserSession = browserPlatform ? getLatestBrowserSession(browserPlatform.platformCode, browserSessions) : undefined;
  const savePlatformMutation = useMutation({
    mutationFn: (values: PlatformFormValues) => {
      const payload = toPlatformPayload(values);
      return editingPlatformId
        ? apiPatch<PlatformConfig>(`/platforms/${editingPlatformId}`, payload)
        : apiPost<PlatformConfig>('/platforms', payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setModalOpen(false);
        setEditingPlatformId(null);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['platform-configs'] });
        void messageApi.success(editingPlatformId ? 'AI 平台连接已更新' : 'AI 平台连接已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const validateMutation = useMutation({
    mutationFn: (platformId: string) => apiPost<PlatformValidationResult>(`/platforms/${platformId}/validate`, {}),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['platform-configs'] });
      if (response.success) {
        void messageApi.success(response.data.message);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const startBrowserSessionMutation = useMutation({
    mutationFn: (platformCode: string) => apiPost<BrowserConnectionSession>('/platforms/browser-sessions', { platformCode }),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['browser-connection-sessions'] });
        window.open(getBrowserLoginUrl(response.data.platformCode), '_blank', 'noopener,noreferrer');
        void messageApi.success('浏览器登录页已打开，请在新页面完成登录');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const updateBrowserSessionMutation = useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: string; input: BrowserConnectionStatusInput }) => apiPatch<BrowserConnectionSession>(`/platforms/browser-sessions/${sessionId}`, input),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['browser-connection-sessions'] });
        void messageApi.success('浏览器连接状态已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openCreateModal = () => {
    setEditingPlatformId(null);
    form.resetFields();
    form.setFieldsValue({ mode: 'manual', enabled: true, rateLimitPerMinute: 0 });
    setModalOpen(true);
  };

  const openEditModal = (config: PlatformConfig) => {
    setEditingPlatformId(config.id);
    form.setFieldsValue({
      platformCode: config.platformCode,
      name: config.name,
      mode: config.mode,
      endpointUrl: config.endpointUrl,
      modelName: config.modelName,
      rateLimitPerMinute: config.rateLimitPerMinute,
      enabled: config.enabled
    });
    setModalOpen(true);
  };

  const markBrowserReady = () => {
    if (!selectedBrowserSession) return;

    updateBrowserSessionMutation.mutate({
      sessionId: selectedBrowserSession.id,
      input: {
        status: 'ready',
        loginDetected: true,
        lastOperation: 'login_confirmed',
        lastMessage: '用户已确认浏览器登录完成。',
        lastAvailableAt: new Date().toISOString()
      }
    });
  };

  const markBrowserNeedsConfirmation = () => {
    if (!selectedBrowserSession) return;

    updateBrowserSessionMutation.mutate({
      sessionId: selectedBrowserSession.id,
      input: {
        status: 'needs_confirmation',
        loginDetected: false,
        lastOperation: 'manual_confirmation_required',
        lastIssueType: 'risk_control',
        lastMessage: '用户反馈遇到验证码、登录失效、平台限制或风控提示。'
      }
    });
  };

  return (
    <Card title="连接要测试的 AI 平台" extra={<Button type="primary" onClick={openCreateModal}>新增平台</Button>}>
      {contextHolder}
      <PageErrorAlert response={platformsQuery.data} />
      <Alert
        type="info"
        showIcon
        message="先把常用 AI 平台跑通"
        description="豆包、Kimi、DeepSeek、通义千问和阶跃星辰可以先用浏览器或手动方式完成首轮监测；补齐平台密钥后，再切换到自动监测。"
      />
      <Space direction="vertical" size={16} className="page-stack">
        {platformGroups.map((group) => (
          <Space key={group.key} direction="vertical" size={8} className="page-stack">
            <Space align="center" wrap>
              <Tag color={group.color}>{group.title}</Tag>
              <Typography.Text type="secondary">{group.description}</Typography.Text>
            </Space>
            <Table
              rowKey="id"
              size="small"
              loading={platformsQuery.isLoading}
              dataSource={group.platforms}
              pagination={false}
              locale={{ emptyText: <EmptyState description={`${group.title}里还没有平台。`} /> }}
              scroll={{ x: 980 }}
              columns={[
                { title: '平台', render: (_, record) => <Typography.Text>{record.name || getPlatformDisplayName(record.platformCode)}</Typography.Text> },
                { title: '能不能监测', render: (_, record) => <Tag color={connectionStatusColors[record.connectionStatus]}>{record.connectionStatusLabel}</Tag> },
                { title: '监测方式', render: (_, record) => <Typography.Text>{getMethodPreview(record)}</Typography.Text> },
                { title: '平台密钥', render: (_, record) => record.hasCredential ? <Tag color="green">已填写</Tag> : <Tag>未填写</Tag> },
                {
                  title: '最近检查',
                  render: (_, record) => record.lastValidation ? (
                    <Tag color={record.lastValidation.ok ? 'green' : 'red'}>{record.lastValidation.message}</Tag>
                  ) : <Tag>还没检查</Tag>
                },
                { title: '下一步', dataIndex: 'nextAction', render: (value: string) => <Typography.Text type="secondary">{value}</Typography.Text> },
                { title: '是否使用', dataIndex: 'enabled', render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '使用中' : '已停用'}</Tag> },
                {
                  title: '操作',
                  render: (_, record) => (
                    <Space>
                      <Button type="link" onClick={() => openEditModal(record)}>编辑</Button>
                      <Button type="link" loading={validateMutation.isPending} onClick={() => validateMutation.mutate(record.id)}>检查连接</Button>
                      {record.availableMethods.includes('browser') ? <Button type="link" onClick={() => setBrowserPlatform(record)}>打开浏览器监测</Button> : null}
                    </Space>
                  )
                }
              ]}
            />
          </Space>
        ))}
      </Space>
      <Modal
        title={editingPlatformId ? '编辑 AI 平台连接' : '新增 AI 平台连接'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={savePlatformMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => savePlatformMutation.mutate(values)}>
          <Form.Item name="platformCode" label="平台代码" rules={[{ required: true, message: '请输入平台代码' }]}>
            <Input placeholder="例如：deepseek" />
          </Form.Item>
          <Form.Item name="name" label="平台名称" rules={[{ required: true, message: '请输入平台名称' }]}>
            <Input placeholder="例如：DeepSeek" />
          </Form.Item>
          <Form.Item name="mode" label="监测方式" rules={[{ required: true, message: '请选择监测方式' }]}>
            <Select options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="credentialRef" label="平台密钥">
            <Input.Password placeholder="保存后只显示是否已填写" />
          </Form.Item>
          <Form.Item name="enabled" label="是否使用这个平台" valuePropName="checked">
            <Switch checkedChildren="使用" unCheckedChildren="停用" />
          </Form.Item>
          <Collapse
            ghost
            items={[
              {
                key: 'advanced',
                label: '自动监测设置',
                children: (
                  <>
                    <Form.Item name={advancedPlatformSettingFields[0].name} label={advancedPlatformSettingFields[0].label}>
                      <Input placeholder="https://api.deepseek.com/chat/completions" />
                    </Form.Item>
                    <Form.Item name={advancedPlatformSettingFields[1].name} label={advancedPlatformSettingFields[1].label}>
                      <Input placeholder="deepseek-chat" />
                    </Form.Item>
                    <Form.Item name={advancedPlatformSettingFields[2].name} label={advancedPlatformSettingFields[2].label}>
                      <InputNumber min={0} addonAfter="次/分钟" className="full-width" />
                    </Form.Item>
                  </>
                )
              }
            ]}
          />
        </Form>
      </Modal>
      <Modal
        title={browserPlatform ? `${browserPlatform.name} 浏览器辅助监测` : '浏览器辅助监测'}
        open={Boolean(browserPlatform)}
        footer={null}
        onCancel={() => setBrowserPlatform(null)}
      >
        {browserPlatform ? (
          <Space direction="vertical" size={16} className="page-stack">
            <Alert
              type="info"
              showIcon
              message="先在浏览器里登录这个 AI 平台"
              description="点击打开登录页后，请在新页面自行登录。系统只记录这个平台是否可用和授权品牌范围，不读取登录信息、浏览器存储或本地配置目录。"
            />
            <Space wrap>
              <Tag color={selectedBrowserSession ? getBrowserSessionStatusColor(selectedBrowserSession.status) : 'default'}>
                {selectedBrowserSession ? getBrowserSessionStatusLabel(selectedBrowserSession.status) : '未开始'}
              </Tag>
              <Typography.Text type="secondary">最近一次可用：{getLastAvailableLabel(selectedBrowserSession)}</Typography.Text>
            </Space>
            {selectedBrowserSession?.lastMessage ? <Typography.Paragraph>{selectedBrowserSession.lastMessage}</Typography.Paragraph> : null}
            {selectedBrowserSession?.status === 'needs_confirmation' ? (
              <Alert type="warning" showIcon message={getBrowserIssueLabel(selectedBrowserSession.lastIssueType)} description="请先处理验证码或重新登录；本轮测试也可以改为手动录入回答。" />
            ) : null}
            <Space wrap>
              <Button type="primary" loading={startBrowserSessionMutation.isPending} onClick={() => startBrowserSessionMutation.mutate(browserPlatform.platformCode)}>打开 AI 平台</Button>
              <Button disabled={!selectedBrowserSession} loading={updateBrowserSessionMutation.isPending} onClick={markBrowserReady}>我已完成登录</Button>
              <Button disabled={!selectedBrowserSession} loading={updateBrowserSessionMutation.isPending} onClick={markBrowserNeedsConfirmation}>遇到验证码或风控</Button>
            </Space>
          </Space>
        ) : null}
      </Modal>
    </Card>
  );
}

const modeLabels: Record<PlatformMode, string> = {
  api: '自动监测',
  manual: '人工录入',
  semi_auto: '浏览器辅助监测',
  mock: '示例回答'
};

const connectionStatusColors: Record<PlatformConfig['connectionStatus'], string> = {
  ready: 'green',
  browser_available: 'gold',
  manual_available: 'blue',
  needs_configuration: 'red',
  needs_confirmation: 'orange'
};

function toPlatformPayload(values: PlatformFormValues): PlatformConfigInput {
  return {
    platformCode: values.platformCode,
    name: values.name,
    mode: values.mode,
    endpointUrl: values.endpointUrl,
    modelName: values.modelName,
    rateLimitPerMinute: values.rateLimitPerMinute,
    credentialRef: values.credentialRef,
    enabled: values.enabled ?? true
  };
}
