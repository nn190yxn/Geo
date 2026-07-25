import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublishingAccount, PublishingAccountInput, PublishingDashboard, PublishingRecord, PublishingRecordInput, PublishingStatusInput } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getContentTypeDisplay, getPlatformDisplay } from '../../../utils/displayLabels';

const authStatusLabels: Record<PublishingAccount['authStatus'], string> = {
  connected: '已授权',
  expired: '授权过期',
  error: '授权异常',
  disconnected: '未接入'
};

export const recordStatusLabels: Record<PublishingRecord['status'], string> = {
  draft: '草稿',
  pending: '待人工发布',
  published: '已发布',
  failed: '发布失败'
};

export function getPublishingRecordStatusColor(status: PublishingRecord['status']): string | undefined {
  if (status === 'failed') return 'red';
  if (status === 'published') return 'green';
  if (status === 'pending') return 'orange';
  return undefined;
}

export function getPublishingUrlDisplay(record: Pick<PublishingRecord, 'status' | 'publishedUrl'>): string {
  if (record.publishedUrl) return record.publishedUrl;
  if (record.status === 'draft') return '草稿，暂未发布';
  if (record.status === 'pending') return '等待人工发布';
  if (record.status === 'published') return '已发布，待补充链接';
  return '-';
}

const loginModeLabels: Record<string, string> = {
  oauth: '平台授权',
  manual: '手动维护',
  cookie: '浏览器登录状态接入'
};

export function getPublishingPlatformLabel(platform: PublishingDashboard['platforms'][number]) {
  return `${platform.name} · ${platform.accountCount} 个账号${platform.hasAuthError ? ' · 异常' : ''}`;
}

export function PublishingCenterPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [selectedPlatform, setSelectedPlatform] = useState('wechat');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [accountForm] = Form.useForm<PublishingAccountInput>();
  const [recordForm] = Form.useForm<PublishingRecordInput>();
  const dashboardQuery = useQuery({
    queryKey: ['publishing-dashboard', activeBrandId],
    queryFn: () => apiGet<PublishingDashboard>(`/brands/${activeBrandId}/publishing`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const platformAccounts = dashboard?.accounts.filter((account) => account.platform === selectedPlatform) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['publishing-dashboard', activeBrandId] });
  const connectAccountMutation = useMutation({
    mutationFn: (values: PublishingAccountInput) => apiPost<PublishingAccount>(`/brands/${activeBrandId}/publishing/accounts`, values),
    onSuccess: (response) => {
      if (response.success) {
        setAccountModalOpen(false);
        accountForm.resetFields();
        void invalidate();
        void messageApi.success('发布账号已接入');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const reauthorizeMutation = useMutation({
    mutationFn: (accountId: string) => apiPost<PublishingAccount>(`/brands/${activeBrandId}/publishing/accounts/${accountId}/reauthorize`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void invalidate();
        void messageApi.success('账号已重新授权');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const createRecordMutation = useMutation({
    mutationFn: (values: PublishingRecordInput) => apiPost<PublishingRecord>(`/brands/${activeBrandId}/publishing/records`, values),
    onSuccess: (response) => {
      if (response.success) {
        setRecordModalOpen(false);
        recordForm.resetFields();
        void invalidate();
        void messageApi.success('发布记录已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const updateRecordStatusMutation = useMutation({
    mutationFn: ({ recordId, input }: { recordId: string; input: PublishingStatusInput }) => apiPatch<PublishingRecord>(`/brands/${activeBrandId}/publishing/records/${recordId}/status`, input),
    onSuccess: (response) => {
      if (response.success) {
        void invalidate();
        void messageApi.success('发布状态已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const copyRecordBody = async (record: PublishingRecord) => {
    await navigator.clipboard.writeText(`# ${record.title}\n\n${record.body}`);
    void messageApi.success('正文已复制');
  };

  const markRecordPublished = (record: PublishingRecord) => {
    if (!record.publishedUrl) {
      void messageApi.warning('请先补充真实发布链接，再标记为已发布');
      return;
    }
    updateRecordStatusMutation.mutate({ recordId: record.id, input: { status: 'published', publishedUrl: record.publishedUrl } });
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={dashboardQuery.data} />
      <Card title="发布中心" extra={<Space><Button onClick={() => setAccountModalOpen(true)}>接入账号</Button><Button type="primary" onClick={() => setRecordModalOpen(true)}>新建发布记录</Button></Space>}>
        <Typography.Paragraph>
          管理公众号、头条号、搜狐号、百家号等内容平台账号接入和发布记录，内容从生成到发布保持品牌、内容资产和账号追踪。
        </Typography.Paragraph>
        <Alert type="info" showIcon message="发布中心当前记录账号授权状态和发布流程参数，正式自动发布能力将在平台账号授权完成后接入。" />
      </Card>

      <Tabs
        items={[
          {
            key: 'records',
            label: '发布记录',
            children: (
              <Table
                rowKey="id"
                loading={dashboardQuery.isLoading}
                dataSource={dashboard?.records ?? []}
                locale={{ emptyText: <EmptyState description="暂无发布记录，请先新建一条发布记录。" actionLabel="新建发布记录" onAction={() => setRecordModalOpen(true)} /> }}
                columns={[
                  { title: '内容标题', dataIndex: 'title' },
                  { title: '发布平台', dataIndex: 'platform', render: (value) => getPlatformDisplay(value) },
                  { title: '发布账号', dataIndex: 'accountName', render: (value) => value || '-' },
                  { title: '发布状态', render: (_, record) => <Tag color={getPublishingRecordStatusColor(record.status)}>{recordStatusLabels[record.status]}</Tag> },
                  { title: '发布链接', render: (_, record) => getPublishingUrlDisplay(record) },
                  { title: '操作', render: (_, record) => <Space wrap><Button size="small" onClick={() => void copyRecordBody(record)}>复制正文</Button><Button size="small" onClick={() => updateRecordStatusMutation.mutate({ recordId: record.id, input: { status: 'pending' } })}>待人工发布</Button><Button size="small" disabled={!record.publishedUrl} onClick={() => markRecordPublished(record)}>标记已发布</Button><Button size="small" danger onClick={() => updateRecordStatusMutation.mutate({ recordId: record.id, input: { status: 'failed', errorMessage: '平台账号授权异常' } })}>标记失败</Button></Space> }
                ]}
              />
            )
          },
          {
            key: 'accounts',
            label: '账号管理',
            children: (
              <Space align="start" size={16} className="page-stack" wrap>
                <Card title="平台列表" style={{ flex: '0 0 300px' }} loading={dashboardQuery.isLoading}>
                  <Space direction="vertical" className="page-stack">
                    {(dashboard?.platforms ?? []).map((platform) => (
                      <Button key={platform.platform} block type={selectedPlatform === platform.platform ? 'primary' : 'default'} onClick={() => setSelectedPlatform(platform.platform)}>
                        {getPublishingPlatformLabel(platform)}
                      </Button>
                    ))}
                  </Space>
                </Card>
                <Card title="账号详情 / 接入账号" style={{ flex: '1 1 680px', minWidth: 0 }} loading={dashboardQuery.isLoading}>
                  {platformAccounts.length === 0 ? (
                    <EmptyState description="当前平台暂无接入账号。" actionLabel="接入当前平台账号" onAction={() => {
                      accountForm.setFieldsValue({ platform: selectedPlatform });
                      setAccountModalOpen(true);
                    }} />
                  ) : (
                    <Table
                      rowKey="id"
                      dataSource={platformAccounts}
                      pagination={false}
                      columns={[
                        { title: '账号名称', dataIndex: 'accountName' },
                        { title: '登录方式', dataIndex: 'loginMode', render: (value) => loginModeLabels[value] ?? value },
                        { title: '授权状态', render: (_, record) => <Tag color={record.authStatus === 'error' || record.authStatus === 'expired' ? 'red' : 'green'}>{authStatusLabels[record.authStatus]}</Tag> },
                        { title: '最近授权', dataIndex: 'lastAuthorizedAt', render: (value) => value || '-' },
                        { title: '异常原因', dataIndex: 'errorMessage', render: (value) => value || '-' },
                        { title: '操作', render: (_, record) => <Button size="small" onClick={() => reauthorizeMutation.mutate(record.id)}>重新授权</Button> }
                      ]}
                    />
                  )}
                </Card>
              </Space>
            )
          }
        ]}
      />

      <Modal title="接入发布账号" open={accountModalOpen} okText="保存" cancelText="取消" onCancel={() => setAccountModalOpen(false)} onOk={() => accountForm.submit()} confirmLoading={connectAccountMutation.isPending}>
        <Form form={accountForm} layout="vertical" initialValues={{ platform: selectedPlatform, loginMode: 'oauth', authStatus: 'connected' }} onFinish={(values) => connectAccountMutation.mutate(values)}>
          <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: '请选择发布平台' }]}><Select options={(dashboard?.platforms ?? []).map((platform) => ({ value: platform.platform, label: platform.name }))} /></Form.Item>
          <Form.Item name="accountName" label="账号名称" rules={[{ required: true, message: '请输入账号名称' }]}><Input /></Form.Item>
          <Form.Item name="loginMode" label="登录方式"><Select options={[{ value: 'oauth', label: '平台授权' }, { value: 'manual', label: '手动维护' }, { value: 'cookie', label: '浏览器登录状态接入' }]} /></Form.Item>
          <Form.Item name="authStatus" label="授权状态"><Select options={[{ value: 'connected', label: '已授权' }, { value: 'expired', label: '授权过期' }, { value: 'error', label: '授权异常' }, { value: 'disconnected', label: '未接入' }]} /></Form.Item>
          <Form.Item name="errorMessage" label="异常原因"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="新建发布记录" open={recordModalOpen} okText="保存" cancelText="取消" onCancel={() => setRecordModalOpen(false)} onOk={() => recordForm.submit()} confirmLoading={createRecordMutation.isPending}>
        <Form form={recordForm} layout="vertical" initialValues={{ targetPlatform: selectedPlatform, status: 'draft' }} onFinish={(values) => createRecordMutation.mutate(values)}>
          <Form.Item name="accountId" label="发布账号"><Select allowClear options={(dashboard?.accounts ?? []).map((account) => ({ value: account.id, label: `${account.accountName}（${getPlatformDisplay(account.platform)}）` }))} /></Form.Item>
          <Form.Item name="title" label="内容标题" rules={[{ required: true, message: '请输入内容标题' }]}><Input /></Form.Item>
          <Form.Item name="body" label="内容正文" rules={[{ required: true, message: '请输入内容正文' }]}><Input.TextArea rows={5} /></Form.Item>
          <Form.Item name="targetPlatform" label="目标平台" rules={[{ required: true, message: '请选择目标平台' }]}><Select options={(dashboard?.platforms ?? []).map((platform) => ({ value: platform.platform, label: platform.name }))} /></Form.Item>
          <Form.Item name="contentType" label="内容类型"><Input placeholder={`${getContentTypeDisplay('wechat_article')} / ${getContentTypeDisplay('media_article')}`} /></Form.Item>
          <Form.Item name="status" label="发布状态"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'pending', label: '待发布' }]} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
