import { Alert, Button, Form, Input, Modal, Select, Space, Statistic, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { MediaPlatformRule, OwnedMediaAccount, PublishingAccount, PublishingAccountInput, PublishingDashboard, PublishingExecutionResult, PublishingMode, PublishingOperationDashboard, PublishingRecord, PublishingRecordInput, PublishingRecordPerformance, PublishingStatusInput, SprintRetestTrendItem } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { publishingPath, readWorkflowRouteContext, workflowStagePath, type WorkflowRouteContext } from '../../../app/routePaths';
import type { UnifiedFilterValue } from '../../../app/filterQuery';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { EmptyState, RegionErrorState } from '../../../components/PageState';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import type { WorkspaceViewState } from '../../../components/WorkspaceState';
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
  queued: '等待直连发布',
  publishing: '发布中',
  published: '已发布',
  failed: '发布失败'
};

export function getPublishingRecordStatusColor(status: PublishingRecord['status']): string | undefined {
  if (status === 'failed') return 'red';
  if (status === 'published') return 'green';
  if (['pending', 'queued'].includes(status)) return 'orange';
  if (status === 'publishing') return 'blue';
  return undefined;
}

export function getPublishingUrlDisplay(record: Pick<PublishingRecord, 'status' | 'publishedUrl'>): string {
  if (record.publishedUrl) return record.publishedUrl;
  if (record.status === 'draft') return '草稿，暂未发布';
  if (record.status === 'pending') return '等待人工发布';
  if (record.status === 'queued') return '等待平台执行';
  if (record.status === 'publishing') return '正在调用发布平台';
  if (record.status === 'published') return '已发布，待补充链接';
  return '-';
}

const loginModeLabels: Record<string, string> = {
  oauth: '平台授权',
  manual: '手动维护',
  cookie: '浏览器登录状态接入'
};

const publishingModeLabels: Record<NonNullable<PublishingAccount['publishingMode']>, string> = {
  manual: '人工发布',
  assisted: '半自动发布',
  automatic: '自动发布'
};

const publishingModeOptions: Array<{ value: PublishingMode; label: string }> = Object.entries(publishingModeLabels).map(([value, label]) => ({
  value: value as PublishingMode,
  label
}));

export function getPublishingPlatformLabel(platform: PublishingDashboard['platforms'][number]) {
  return `${platform.name} · ${platform.accountCount} 个账号${platform.hasAuthError ? ' · 异常' : ''}`;
}

export function PublishingCenterPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const routeContext = readWorkflowRouteContext(location.search);
  const pageMode = getPublishingPageMode(location.pathname);
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [publishingResultRecord, setPublishingResultRecord] = useState<PublishingRecord>();
  const [accessFilters, setAccessFilters] = useState<UnifiedFilterValue>({ search: '', platform: 'all', status: 'all' });
  const [ownedMediaPlatformFilter, setOwnedMediaPlatformFilter] = useState('all');
  const [accountForm] = Form.useForm<PublishingAccountInput>();
  const [recordForm] = Form.useForm<PublishingRecordInput>();
  const [publishingResultForm] = Form.useForm<PublishingStatusInput>();
  const operationDashboardQuery = useQuery({
    queryKey: ['publishing-operation-dashboard', activeBrandId],
    queryFn: () => apiGet<PublishingOperationDashboard>(`/brands/${activeBrandId}/dashboards/publishing-operation`)
  });
  const operationDashboard = operationDashboardQuery.data?.success ? operationDashboardQuery.data.data : null;
  const filteredOwnedMediaAccounts = getFilteredOwnedMediaAccounts(operationDashboard?.accounts ?? [], accessFilters, ownedMediaPlatformFilter);
  const filteredMediaPlatformRules = getFilteredMediaPlatformRules(operationDashboard?.platformRules ?? [], accessFilters.search);
  const publishingFilters = readPublishingRecordFilters(location.search);
  const publishingChannelFilter = new URLSearchParams(location.search).get('channel') ?? 'all';
  const publishingRows = getPublishingOperationRows(operationDashboard);
  const filteredPublishingRows = getFilteredPublishingOperationRows(publishingRows, publishingFilters, publishingChannelFilter);
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['publishing-dashboard', activeBrandId] }),
      queryClient.invalidateQueries({ queryKey: ['publishing-operation-dashboard', activeBrandId] })
    ]);
  };
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
  const updateAccountModeMutation = useMutation({
    mutationFn: ({ accountId, publishingMode }: { accountId: string; publishingMode: PublishingMode }) => apiPatch<PublishingAccount>(`/brands/${activeBrandId}/publishing/accounts/${accountId}/mode`, { publishingMode }),
    onSuccess: (response) => {
      if (response.success) {
        void invalidate();
        void messageApi.success('发布模式已更新');
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
        setPublishingResultRecord(undefined);
        publishingResultForm.resetFields();
        void invalidate();
        void messageApi.success('发布状态已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const executeRecordMutation = useMutation({
    mutationFn: (recordId: string) => apiPost<PublishingExecutionResult>(`/brands/${activeBrandId}/publishing/records/${recordId}/execute`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void invalidate();
        void messageApi[response.data.outcome === 'failed' ? 'error' : 'success'](
          response.data.outcome === 'failed' ? response.data.record.errorMessage || '发布失败' : '内容已发布'
        );
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const copyRecordBody = async (record: PublishingRecord) => {
    await navigator.clipboard.writeText(`# ${record.title}\n\n${record.body}`);
    void messageApi.success('正文已复制');
  };

  const accountConnectionModal = (
    <Modal title="接入发布账号" open={accountModalOpen} okText="保存发布账号" cancelText="取消" onCancel={() => setAccountModalOpen(false)} onOk={() => accountForm.submit()} confirmLoading={connectAccountMutation.isPending}>
      <Form form={accountForm} layout="vertical" initialValues={{ platform: 'wechat', loginMode: 'oauth', publishingMode: 'assisted', authStatus: 'connected' }} onFinish={(values) => connectAccountMutation.mutate(values)}>
        <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: '请选择发布平台' }]}><Select options={getPublishingAccountPlatformOptions(null, operationDashboard)} /></Form.Item>
        <Form.Item name="accountName" label="账号名称" rules={[{ required: true, message: '请输入账号名称' }]}><Input /></Form.Item>
        <Form.Item name="loginMode" label="登录方式"><Select options={[{ value: 'oauth', label: '平台授权' }, { value: 'manual', label: '手动维护' }, { value: 'cookie', label: '浏览器登录状态接入' }]} /></Form.Item>
        <Form.Item name="publishingMode" label="发布模式"><Select options={[{ value: 'manual', label: '人工发布' }, { value: 'assisted', label: '半自动发布' }, { value: 'automatic', label: '自动发布' }]} /></Form.Item>
        <Form.Item name="authStatus" label="授权状态"><Select options={[{ value: 'connected', label: '已授权' }, { value: 'expired', label: '授权过期' }, { value: 'error', label: '授权异常' }, { value: 'disconnected', label: '未接入' }]} /></Form.Item>
        <Form.Item name="errorMessage" label="异常原因"><Input /></Form.Item>
      </Form>
    </Modal>
  );
  const publishingRecordModal = (
    <Modal title="新建发布记录" open={recordModalOpen} okText="创建发布记录" cancelText="取消" onCancel={() => setRecordModalOpen(false)} onOk={() => recordForm.submit()} confirmLoading={createRecordMutation.isPending}>
      <Form form={recordForm} layout="vertical" initialValues={{ targetPlatform: 'wechat', status: 'draft' }} onFinish={(values) => createRecordMutation.mutate(values)}>
        <PublishingPreparationFields
          accounts={operationDashboard?.accounts ?? []}
          platformOptions={getPublishingAccountPlatformOptions(null, operationDashboard)}
        />
      </Form>
    </Modal>
  );
  const publishingResultModal = (
    <Modal title="记录真实发布结果" open={Boolean(publishingResultRecord)} okText="保存发布结果" cancelText="取消" onCancel={() => setPublishingResultRecord(undefined)} onOk={() => publishingResultForm.submit()} confirmLoading={updateRecordStatusMutation.isPending}>
      <Form form={publishingResultForm} layout="vertical" initialValues={{ status: 'published' }} onFinish={(values) => publishingResultRecord && updateRecordStatusMutation.mutate({ recordId: publishingResultRecord.id, input: values })}>
        <PublishingResultFields />
      </Form>
    </Modal>
  );

  if (pageMode.kind === 'owned-media') {
    return (
      <>
        {contextHolder}
        <OwnedMediaAccessPage
          accounts={filteredOwnedMediaAccounts}
          totalCount={operationDashboard?.accounts.length ?? 0}
          filters={accessFilters}
          platformFilter={ownedMediaPlatformFilter}
          state={getPublishingAccessPageState(operationDashboardQuery.isLoading, Boolean(operationDashboardQuery.data && !operationDashboardQuery.data.success), operationDashboard?.accounts.length ?? 0)}
          onFiltersChange={setAccessFilters}
          onPlatformFilterChange={setOwnedMediaPlatformFilter}
          onClearFilters={() => {
            setAccessFilters({ search: '', platform: 'all', status: 'all' });
            setOwnedMediaPlatformFilter('all');
          }}
          onConnect={() => setAccountModalOpen(true)}
          onManage={(account) => {
            const action = getOwnedMediaAccountAction(account);
            if (action.kind === 'reauthorize') reauthorizeMutation.mutate(account.id);
            else navigate(publishingPath({ tab: 'records' }));
          }}
          onRetry={() => void operationDashboardQuery.refetch()}
          managing={reauthorizeMutation.isPending}
          onModeChange={(account, publishingMode) => updateAccountModeMutation.mutate({ accountId: account.id, publishingMode })}
        />
        {accountConnectionModal}
      </>
    );
  }

  if (pageMode.kind === 'media-platforms') {
    return (
      <>
        {contextHolder}
        <MediaPlatformRulesPage
          rules={filteredMediaPlatformRules}
          totalCount={operationDashboard?.platformRules.length ?? 0}
          filters={accessFilters}
          state={getPublishingAccessPageState(operationDashboardQuery.isLoading, Boolean(operationDashboardQuery.data && !operationDashboardQuery.data.success), operationDashboard?.platformRules.length ?? 0)}
          onFiltersChange={setAccessFilters}
          onClearFilters={() => setAccessFilters({ search: '', platform: 'all', status: 'all' })}
          onRetry={() => void operationDashboardQuery.refetch()}
        />
      </>
    );
  }

  if (pageMode.kind === 'publishing') {
    return (
      <>
        {contextHolder}
        <PublishingRecordsWorkspacePage
          rows={filteredPublishingRows}
          totalCount={publishingRows.length}
          filters={publishingFilters}
          channelFilter={publishingChannelFilter}
          channels={getPublishingRecordChannelOptions(publishingRows)}
          highlightedRecordId={routeContext.publishingRecordId}
          state={getPublishingAccessPageState(operationDashboardQuery.isLoading, Boolean(operationDashboardQuery.data && !operationDashboardQuery.data.success), publishingRows.length)}
          onFiltersChange={(filters, channel) => navigate({ pathname: location.pathname, search: getPublishingRecordFilterSearch(location.search, filters, channel), hash: location.hash }, { replace: true })}
          onCreate={() => setRecordModalOpen(true)}
          onOpenOwnedMedia={() => navigate({ pathname: '/owned-media', search: location.search, hash: location.hash })}
          onOpenPlatformRules={() => navigate({ pathname: '/media-platforms', search: location.search, hash: location.hash })}
          onRecordResult={(record) => {
            setPublishingResultRecord(record);
            publishingResultForm.setFieldsValue({ status: 'published', publishedUrl: record.publishedUrl });
          }}
          onScheduleRetest={(record) => navigate(getPublishingRetestPath(record, routeContext))}
          onCopy={(record) => void copyRecordBody(record)}
          onSetPending={(record) => updateRecordStatusMutation.mutate({ recordId: record.id, input: { status: 'pending' } })}
          onSetFailed={(record) => updateRecordStatusMutation.mutate({ recordId: record.id, input: { status: 'failed', errorMessage: '发布流程需要重新处理' } })}
          onExecute={(record) => executeRecordMutation.mutate(record.id)}
          onRetry={() => void operationDashboardQuery.refetch()}
          updating={updateRecordStatusMutation.isPending || executeRecordMutation.isPending}
        />
        {publishingRecordModal}
        {publishingResultModal}
      </>
    );
  }

  return null;
}

export type PublishingOperationRow = PublishingRecord & {
  performance?: PublishingRecordPerformance;
  retestItem?: SprintRetestTrendItem;
};

export function PublishingPreparationFields({ accounts, platformOptions }: {
  accounts: OwnedMediaAccount[];
  platformOptions: Array<{ value: string; label: string }>;
}) {
  const form = Form.useFormInstance<PublishingRecordInput>();
  const availableAccounts = accounts.filter((account) => account.authStatus === 'connected');

  return (
    <>
      {availableAccounts.length === 0 && (
        <Alert
          type="warning"
          showIcon
          message="还没有可用发布账号"
          description="请先在自有媒体中接入账号或恢复账号授权，再完成发布准备。"
          style={{ marginBottom: 16 }}
        />
      )}
      <Typography.Paragraph type="secondary">进入发布准备前，请补齐发布账号、内容标题、内容正文和目标平台。</Typography.Paragraph>
      <Form.Item name="accountId" label="发布账号" rules={[{ required: true, message: '请选择可用发布账号' }]}>
        <Select
          allowClear
          options={availableAccounts.map((account) => ({ value: account.id, label: `${account.accountName}（${account.platformName} · ${publishingModeLabels[account.publishingMode ?? 'manual']}）` }))}
          onChange={(accountId) => {
            const account = availableAccounts.find((item) => item.id === accountId);
            if (account) form.setFieldValue('targetPlatform', account.platform);
          }}
        />
      </Form.Item>
      <Form.Item name="title" label="内容标题" rules={[{ required: true, message: '请输入内容标题' }]}><Input /></Form.Item>
      <Form.Item name="body" label="内容正文" rules={[{ required: true, message: '请输入内容正文' }]}><Input.TextArea rows={5} /></Form.Item>
      <Form.Item name="targetPlatform" label="目标平台" rules={[{ required: true, message: '请选择目标平台' }]}><Select options={platformOptions} /></Form.Item>
      <Form.Item name="contentType" label="内容类型"><Input placeholder={`${getContentTypeDisplay('wechat_article')} / ${getContentTypeDisplay('media_article')}`} /></Form.Item>
      <Form.Item name="status" label="发布状态"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'pending', label: '待人工发布' }]} /></Form.Item>
    </>
  );
}

export function PublishingResultFields() {
  return (
    <>
      <Form.Item name="publishedUrl" label="真实发布链接" rules={[{ required: true, type: 'url', message: '请输入完整的真实发布链接' }]}><Input placeholder="https://" /></Form.Item>
      <Form.Item name="status" hidden><Input /></Form.Item>
      <Typography.Text type="secondary">保存后发布状态将更新为已发布，可继续安排再次监测。</Typography.Text>
    </>
  );
}

export type PublishingRecordsWorkspacePageProps = {
  rows: PublishingOperationRow[];
  totalCount: number;
  filters: UnifiedFilterValue<PublishingRecord['status']>;
  channelFilter: string;
  channels: Array<{ value: string; label: string }>;
  highlightedRecordId?: string;
  state: WorkspaceViewState;
  updating: boolean;
  onFiltersChange: (filters: UnifiedFilterValue<PublishingRecord['status']>, channel: string) => void;
  onCreate: () => void;
  onOpenOwnedMedia: () => void;
  onOpenPlatformRules: () => void;
  onRecordResult: (record: PublishingRecord) => void;
  onScheduleRetest: (record: PublishingRecord) => void;
  onCopy: (record: PublishingRecord) => void;
  onSetPending: (record: PublishingRecord) => void;
  onSetFailed: (record: PublishingRecord) => void;
  onExecute?: (record: PublishingRecord) => void;
  onRetry: () => void;
};

export function PublishingRecordsWorkspacePage({ rows, totalCount, filters, channelFilter, channels, highlightedRecordId, state, updating, onFiltersChange, onCreate, onOpenOwnedMedia, onOpenPlatformRules, onRecordResult, onScheduleRetest, onCopy, onSetPending, onSetFailed, onExecute, onRetry }: PublishingRecordsWorkspacePageProps) {
  return (
    <ManagementListPage<PublishingOperationRow>
      title="发布记录"
      description="统一检查待发布内容、目标媒体、账号状态和真实发布结果，并在发布后衔接再次监测。"
      context={highlightedRecordId ? <Alert type="info" showIcon message="已定位内容生成流程交接的发布记录" /> : undefined}
      primaryAction={totalCount > 0 ? <Button type="primary" onClick={onCreate}>新建发布记录</Button> : undefined}
      secondaryActions={<Space wrap><Button onClick={onOpenOwnedMedia}>管理媒体账号</Button><Button onClick={onOpenPlatformRules}>查看平台规则</Button></Space>}
      filters={(
        <UnifiedFilterBar
          value={filters}
          onChange={(value) => onFiltersChange(value, channelFilter)}
          onClear={() => onFiltersChange({ search: '', platform: 'all', status: 'all' }, 'all')}
          statusOptions={publishingRecordStatusOptions}
          searchPlaceholder="搜索标题、正文、账号或真实链接"
          resultCount={rows.length}
          totalCount={totalCount}
          showDateRange={false}
          showPlatform={false}
          extraFilters={(
            <Select
              aria-label="发布渠道筛选"
              value={channelFilter}
              options={[{ value: 'all', label: '全部发布渠道' }, ...channels]}
              onChange={(channel) => onFiltersChange(filters, channel)}
            />
          )}
        />
      )}
      state={state}
      loadingState={null}
      errorState={<RegionErrorState description="发布记录和再次监测状态加载失败，请重新加载后继续处理。" onRetry={onRetry} />}
      emptyState={<EmptyState title="还没有发布记录" description="从内容生成交接或手动创建的发布准备记录" reason="发布记录用于确认账号、真实链接和再次监测状态。" nextStep="创建第一条发布记录并选择目标平台。" actionLabel="新建发布记录" onAction={onCreate} />}
      tableTitle="发布记录"
      tableDescription="计划时间缺失时明确标记为未排期；发布后请录入真实链接并安排再次监测。"
      tableAriaLabel="发布准备记录列表"
      tableProps={{
        rowKey: 'id',
        rowClassName: (record) => record.id === highlightedRecordId ? 'ant-table-row-selected' : '',
        dataSource: rows,
        pagination: rows.length > 8 ? { pageSize: 8 } : false,
        locale: { emptyText: <EmptyState title="没有匹配的发布记录" description="当前筛选条件下的发布准备记录" reason="搜索词、发布渠道或状态未匹配现有记录。" nextStep="清空部分筛选后重新查看。" /> },
        columns: [
          {
            title: '内容摘要',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{record.title}</Typography.Text>
                <Typography.Text type="secondary">{getPublishingBodySummary(record.body)}</Typography.Text>
              </Space>
            )
          },
          {
            title: '平台与账号',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Typography.Text>{getPlatformDisplay(record.platform)}</Typography.Text>
                <Typography.Text type="secondary">{record.accountName || '待选择发布账号'}</Typography.Text>
              </Space>
            )
          },
          {
            title: '计划时间',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Typography.Text type="warning">未排期</Typography.Text>
                <Typography.Text type="secondary">创建于 {getPublishingDateDisplay(record.createdAt)}</Typography.Text>
              </Space>
            )
          },
          {
            title: '发布状态',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Tag color={getPublishingRecordStatusColor(record.status)}>{recordStatusLabels[record.status]}</Tag>
                {record.errorMessage ? <Typography.Text type="danger">{record.errorMessage}</Typography.Text> : null}
              </Space>
            )
          },
          {
            title: '真实链接',
            render: (_, record) => record.publishedUrl
              ? <Typography.Link href={record.publishedUrl} target="_blank" rel="noreferrer">查看发布内容</Typography.Link>
              : <Typography.Text type="secondary">{getPublishingUrlDisplay(record)}</Typography.Text>
          },
          {
            title: '再次监测',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Tag color={getPublishingRetestStatusColor(record.performance?.retestStatus)}>{getPublishingRetestStatusLabel(record.performance?.retestStatus)}</Tag>
                <Typography.Text type="secondary">{record.retestItem?.message || record.performance?.nextSuggestion || '发布后安排同题监测'}</Typography.Text>
              </Space>
            )
          },
          {
            title: '操作',
            render: (_, record) => (
              <ManagementRowActions
                primaryActions={[
                  record.publishingMode && record.publishingMode !== 'manual' && !['queued', 'publishing', 'published'].includes(record.status) && onExecute
                    ? <Button key="execute" type="primary" size="small" loading={updating} onClick={() => onExecute(record)}>立即发布</Button>
                    : <Button key="result" size="small" loading={updating} onClick={() => onRecordResult(record)}>{record.publishedUrl ? '更新发布结果' : '记录发布结果'}</Button>,
                  <Button key="retest" size="small" onClick={() => onScheduleRetest(record)}>安排再次监测</Button>
                ]}
                moreAction={(
                  <AccessibleDropdown
                    label={`发布记录“${record.title}”的更多操作`}
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'copy', label: '复制正文' },
                        { key: 'pending', label: '设为待人工发布', disabled: record.status === 'pending' },
                        { key: 'failed', label: '标记发布失败', danger: true, disabled: record.status === 'failed' }
                      ],
                      onClick: ({ key }) => {
                        if (key === 'copy') onCopy(record);
                        if (key === 'pending') onSetPending(record);
                        if (key === 'failed') onSetFailed(record);
                      }
                    }}
                  >
                    <Button size="small">更多</Button>
                  </AccessibleDropdown>
                )}
              />
            )
          }
        ]
      }}
    />
  );
}

export type OwnedMediaAccessPageProps = {
  accounts: OwnedMediaAccount[];
  totalCount: number;
  filters: UnifiedFilterValue;
  platformFilter: string;
  state: WorkspaceViewState;
  managing: boolean;
  onFiltersChange: (value: UnifiedFilterValue) => void;
  onPlatformFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onConnect: () => void;
  onManage: (account: OwnedMediaAccount) => void;
  onModeChange?: (account: OwnedMediaAccount, publishingMode: PublishingMode) => void;
  onRetry: () => void;
};

export function OwnedMediaAccessPage({ accounts, totalCount, filters, platformFilter, state, managing, onFiltersChange, onPlatformFilterChange, onClearFilters, onConnect, onManage, onModeChange, onRetry }: OwnedMediaAccessPageProps) {
  const connectedCount = accounts.filter((account) => account.authStatus === 'connected').length;
  const issueCount = accounts.filter((account) => account.authStatus !== 'connected').length;
  const platformOptions = [...new Map([
    ...ownedMediaPlatformOptions.map((item) => [item.platform, item.name] as const),
    ...accounts.map((account) => [account.platform, account.platformName] as const)
  ]).entries()]
    .map(([value, label]) => ({ value, label }));

  return (
    <ManagementListPage<OwnedMediaAccount>
      title="自有媒体"
      description="统一接入和维护品牌自有媒体账号，确保内容发布前账号授权状态清晰可执行。"
      primaryAction={totalCount > 0 ? <Button type="primary" onClick={onConnect}>接入账号</Button> : undefined}
      summary={(
        <Space size={32} wrap>
          <Statistic title="已接入账号" value={totalCount} />
          <Statistic title="筛选结果可用" value={connectedCount} />
          <Statistic title="筛选结果待处理" value={issueCount} />
        </Space>
      )}
      filters={(
        <UnifiedFilterBar
          value={filters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
          statusOptions={ownedMediaAuthStatusOptions}
          searchPlaceholder="搜索账号名称或平台"
          resultCount={accounts.length}
          totalCount={totalCount}
          showDateRange={false}
          showPlatform={false}
          extraFilters={(
            <Select
              aria-label="发布平台筛选"
              value={platformFilter}
              options={[{ value: 'all', label: '全部平台' }, ...platformOptions]}
              onChange={onPlatformFilterChange}
            />
          )}
        />
      )}
      state={state}
      loadingState={null}
      errorState={<RegionErrorState description="自有媒体账号状态加载失败，请重新加载后继续管理。" onRetry={onRetry} />}
      emptyState={<EmptyState title="还没有接入自有媒体" description="可用于品牌内容发布的官网、公众号、知乎等账号" reason="账号接入后才能确认发布渠道和授权可用性。" nextStep="接入第一个品牌自有媒体账号。" actionLabel="接入账号" onAction={onConnect} />}
      tableTitle="账号接入列表"
      tableDescription="授权异常和过期账号会直接显示原因与下一步动作。"
      tableAriaLabel="自有媒体账号接入列表"
      tableProps={{
        rowKey: 'id',
        dataSource: accounts,
        pagination: accounts.length > 8 ? { pageSize: 8 } : false,
        locale: { emptyText: <EmptyState title="没有匹配的账号" description="当前筛选条件下的自有媒体账号" reason="账号名称、平台或授权状态未匹配现有记录。" nextStep="清空部分筛选后重新查看。" /> },
        columns: [
          { title: '账号名称', render: (_, record) => <Space direction="vertical" size={2}><Typography.Text strong>{record.accountName}</Typography.Text><Typography.Text type="secondary">{record.platformName}</Typography.Text></Space> },
          { title: '接入方式', dataIndex: 'loginMode', render: (value) => loginModeLabels[value] ?? value },
          {
            title: '发布模式',
            render: (_, record) => onModeChange
              ? <Select aria-label={`${record.accountName}发布模式`} size="small" value={record.publishingMode ?? 'manual'} options={publishingModeOptions} onChange={(value) => onModeChange(record, value)} />
              : publishingModeLabels[record.publishingMode ?? 'manual']
          },
          { title: '授权状态', render: (_, record) => <Tag color={getOwnedMediaAuthStatusColor(record.authStatus)}>{authStatusLabels[record.authStatus]}</Tag> },
          { title: '最近验证', dataIndex: 'lastAuthorizedAt', render: (value) => getPublishingDateDisplay(value) },
          { title: '发布记录', render: (_, record) => `${record.stats.publishedRecords}/${record.stats.totalRecords} 已发布` },
          { title: '状态说明', render: (_, record) => record.errorMessage || getOwnedMediaAccountStatusMessage(record) },
          {
            title: '操作',
            render: (_, record) => {
              const action = getOwnedMediaAccountAction(record);
              return <ManagementRowActions primaryActions={[<Button key={action.kind} size="small" type={action.kind === 'reauthorize' ? 'primary' : 'default'} loading={managing && action.kind === 'reauthorize'} onClick={() => onManage(record)}>{action.label}</Button>]} />;
            }
          }
        ]
      }}
    />
  );
}

export type MediaPlatformRulesPageProps = {
  rules: MediaPlatformRule[];
  totalCount: number;
  filters: UnifiedFilterValue;
  state: WorkspaceViewState;
  onFiltersChange: (value: UnifiedFilterValue) => void;
  onClearFilters: () => void;
  onRetry: () => void;
};

export function MediaPlatformRulesPage({ rules, totalCount, filters, state, onFiltersChange, onClearFilters, onRetry }: MediaPlatformRulesPageProps) {
  return (
    <ManagementListPage<MediaPlatformRule>
      title="媒体平台"
      description="集中查看各媒体平台的内容规则，让内容准备、素材检查和发布排期使用同一份品牌级依据。"
      summary={<Space size={32} wrap><Statistic title="已维护平台" value={totalCount} /><Statistic title="规则覆盖" value={totalCount} suffix="个渠道" /></Space>}
      filters={(
        <UnifiedFilterBar
          value={filters}
          onChange={onFiltersChange}
          onClear={onClearFilters}
          searchPlaceholder="搜索平台、内容格式、适用意图或规则"
          resultCount={rules.length}
          totalCount={totalCount}
          showDateRange={false}
          showPlatform={false}
        />
      )}
      state={state}
      loadingState={null}
      errorState={<RegionErrorState description="媒体平台规则加载失败，请重新加载后继续查看。" onRetry={onRetry} />}
      emptyState={<EmptyState title="还没有媒体平台规则" description="指导内容格式、适用意图、发布频率和素材准备的平台规则" reason="品牌尚未维护可用于发布准备的平台规范。" nextStep="由品牌管理员维护平台规则后再安排内容发布。" />}
      tableTitle="平台规则列表"
      tableDescription="规则直接来自当前品牌配置，发布准备时可按平台逐项核对。"
      tableAriaLabel="媒体平台规则列表"
      tableProps={{
        rowKey: 'platform',
        dataSource: rules,
        pagination: rules.length > 8 ? { pageSize: 8 } : false,
        locale: { emptyText: <EmptyState title="没有匹配的平台规则" description="当前搜索条件下的平台规则" reason="平台名称、内容格式或规则说明未匹配现有配置。" nextStep="清空搜索词后重新查看。" /> },
        columns: [
          { title: '平台', render: (_, record) => <Space direction="vertical" size={2}><Typography.Text strong>{record.name}</Typography.Text><Typography.Text type="secondary">{record.platform}</Typography.Text></Space> },
          { title: '内容格式', dataIndex: 'contentFormats', render: (values: string[]) => <Space size={[0, 4]} wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
          { title: '适用意图', dataIndex: 'intentFit' },
          { title: '发布频率', dataIndex: 'recommendedFrequency' },
          { title: '素材要求', dataIndex: 'coverRatio' },
          { title: '注意事项', dataIndex: 'publishingNote' }
        ]
      }}
    />
  );
}

type PublishingPageMode = {
  kind: 'publishing' | 'owned-media' | 'media-platforms';
  title: string;
  description: string;
  notice: string;
  defaultTab: 'records' | 'accounts' | 'platform-guidance';
};

export function getPublishingPageMode(pathname: string): PublishingPageMode {
  if (pathname === '/media-platforms') {
    return {
      kind: 'media-platforms',
      title: '媒体平台',
      description: '查看各发布渠道的内容格式、适合用户意图、发布频率和复测建议，帮助内容资产进入可执行的分发流程。',
      notice: '媒体平台页展示渠道规则和发布建议，账号授权状态仍在自有媒体中统一维护。',
      defaultTab: 'platform-guidance'
    };
  }

  if (pathname === '/publishing') {
    return {
      kind: 'publishing',
      title: '发布记录',
      description: '检查待发布内容、目标媒体、账号状态和发布结果，并在发布后安排再次监测。',
      notice: '先确认正文和发布账号，半自动模式可显式触发发布，自动模式在创建记录后直接执行，发布成功后可安排再次监测。',
      defaultTab: 'records'
    };
  }

  return {
    kind: 'owned-media',
    title: '自有媒体',
    description: '管理官网、公众号、小红书、知乎等品牌可控账号，并把内容资产、负责人、发布时间和再次监测计划串联起来。',
    notice: '自有媒体统一记录账号授权状态和发布模式，直连发布由服务端配置的受控平台 Adapter 执行。',
    defaultTab: 'accounts'
  };
}

export const ownedMediaAuthStatusOptions = [
  { value: 'connected', label: '已授权' },
  { value: 'expired', label: '授权过期' },
  { value: 'error', label: '授权异常' },
  { value: 'disconnected', label: '未接入' }
] as const;

export const publishingRecordStatuses: PublishingRecord['status'][] = ['draft', 'pending', 'queued', 'publishing', 'published', 'failed'];

export const publishingRecordStatusOptions = publishingRecordStatuses.map((status) => ({ value: status, label: recordStatusLabels[status] }));

export function readPublishingRecordFilters(search: string): UnifiedFilterValue<PublishingRecord['status']> {
  const params = new URLSearchParams(search);
  const status = params.get('status');
  return {
    search: params.get('q')?.trim() ?? '',
    platform: 'all',
    status: status && publishingRecordStatuses.includes(status as PublishingRecord['status'])
      ? status as PublishingRecord['status']
      : 'all'
  };
}

export function getPublishingRecordFilterSearch(currentSearch: string, filters: UnifiedFilterValue<PublishingRecord['status']>, channel: string): string {
  const params = new URLSearchParams(currentSearch);
  setPublishingFilterParam(params, 'q', filters.search.trim());
  setPublishingFilterParam(params, 'status', filters.status === 'all' ? '' : filters.status);
  setPublishingFilterParam(params, 'channel', channel === 'all' ? '' : channel);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function getPublishingRetestPath(record: Pick<PublishingRecord, 'id' | 'generationTaskId'>, context: WorkflowRouteContext): string {
  return workflowStagePath('/tasks', {
    ...context,
    generationTaskId: record.generationTaskId,
    publishingRecordId: record.id,
    action: 'create'
  });
}

export function getPublishingOperationRows(dashboard: PublishingOperationDashboard | null): PublishingOperationRow[] {
  if (!dashboard) return [];
  return dashboard.records.map((record) => ({
    ...record,
    performance: dashboard.performance.find((item) => item.recordId === record.id),
    retestItem: dashboard.pendingRetestItems.find((item) => item.publishingRecord?.id === record.id)
  }));
}

export function getFilteredPublishingOperationRows(rows: PublishingOperationRow[], filters: UnifiedFilterValue<PublishingRecord['status']>, channelFilter: string): PublishingOperationRow[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter((record) => {
    const matchesSearch = !search || [record.title, record.body, record.accountName, record.publishedUrl, record.errorMessage]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(search));
    const matchesStatus = filters.status === 'all' || record.status === filters.status;
    const matchesChannel = channelFilter === 'all' || record.platform === channelFilter;
    return matchesSearch && matchesStatus && matchesChannel;
  });
}

export function getPublishingRecordChannelOptions(rows: PublishingOperationRow[]): Array<{ value: string; label: string }> {
  return [...new Set(rows.map((record) => record.platform))]
    .sort((left, right) => getPlatformDisplay(left).localeCompare(getPlatformDisplay(right), 'zh-CN'))
    .map((value) => ({ value, label: getPlatformDisplay(value) }));
}

export function getPublishingBodySummary(body: string, maxLength = 64): string {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized || '正文待补充';
  return `${normalized.slice(0, maxLength)}…`;
}

export function getPublishingRetestStatusLabel(status?: PublishingRecordPerformance['retestStatus']): string {
  const labels: Record<PublishingRecordPerformance['retestStatus'], string> = {
    not_planned: '待安排',
    planned: '已安排',
    completed: '已完成',
    improved: '已改善',
    not_improved: '待继续优化'
  };
  return status ? labels[status] : '待安排';
}

export function getPublishingRetestStatusColor(status?: PublishingRecordPerformance['retestStatus']): string | undefined {
  if (status === 'improved') return 'green';
  if (status === 'planned' || status === 'completed') return 'blue';
  if (status === 'not_improved') return 'orange';
  return undefined;
}

function setPublishingFilterParam(params: URLSearchParams, key: string, value: string): void {
  if (value) params.set(key, value);
  else params.delete(key);
}

export function getPublishingAccessPageState(loading: boolean, failed: boolean, totalCount: number): WorkspaceViewState {
  if (loading) return 'loading';
  if (failed) return 'error';
  if (totalCount === 0) return 'empty';
  return 'ready';
}

export function getPublishingAccountPlatformOptions(dashboard: PublishingDashboard | null, operationDashboard: PublishingOperationDashboard | null): Array<{ value: string; label: string }> {
  return [...new Map([
    ...(dashboard?.platforms ?? []).map((platform) => [platform.platform, platform.name] as const),
    ...(operationDashboard?.platformRules ?? []).map((rule) => [rule.platform, rule.name] as const),
    ...ownedMediaPlatformOptions.map((platform) => [platform.platform, platform.name] as const)
  ]).entries()].map(([value, label]) => ({ value, label }));
}

export function getFilteredOwnedMediaAccounts(accounts: OwnedMediaAccount[], filters: UnifiedFilterValue, platformFilter = 'all'): OwnedMediaAccount[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return accounts.filter((account) => {
    const matchesSearch = search.length === 0 || [account.accountName, account.platformName, account.platform, account.errorMessage]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(search));
    const matchesPlatform = platformFilter === 'all' || account.platform === platformFilter;
    const matchesStatus = filters.status === 'all' || account.authStatus === filters.status;
    return matchesSearch && matchesPlatform && matchesStatus;
  });
}

export function getFilteredMediaPlatformRules(rules: MediaPlatformRule[], searchValue: string): MediaPlatformRule[] {
  const search = searchValue.trim().toLocaleLowerCase();
  if (!search) return rules;
  return rules.filter((rule) => [
    rule.name,
    rule.platform,
    ...rule.contentFormats,
    rule.intentFit,
    rule.recommendedFrequency,
    rule.coverRatio,
    rule.publishingNote
  ].some((value) => value.toLocaleLowerCase().includes(search)));
}

export function getOwnedMediaAccountAction(account: Pick<PublishingAccount, 'authStatus'>): { kind: 'publish' | 'reauthorize'; label: string } {
  if (account.authStatus === 'connected') return { kind: 'publish', label: '进入发布准备' };
  return { kind: 'reauthorize', label: '重新授权' };
}

export function getOwnedMediaAccountStatusMessage(account: Pick<PublishingAccount, 'authStatus'>): string {
  if (account.authStatus === 'connected') return '账号可用于发布准备';
  if (account.authStatus === 'expired') return '授权已过期，请重新授权';
  if (account.authStatus === 'error') return '授权异常，请检查后重新授权';
  return '账号尚未完成授权';
}

export function getOwnedMediaAuthStatusColor(status: PublishingAccount['authStatus']): string | undefined {
  if (status === 'connected') return 'green';
  if (status === 'expired' || status === 'error') return 'red';
  return undefined;
}

export function getPublishingDateDisplay(value?: string): string {
  if (!value) return '尚未验证';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

type MediaPlatformGuidance = {
  platform: string;
  name: string;
  rule: string;
  contentFormats: string[];
  intentFit: string;
  frequency: string;
  coverRatio: string;
  publishingNote: string;
  retestAction: string;
};

export const ownedMediaPlatformOptions = [
  { platform: 'website', name: '官网' },
  { platform: 'blog', name: '博客' },
  { platform: 'wechat', name: '公众号' },
  { platform: 'zhihu', name: '知乎' },
  { platform: 'xiaohongshu', name: '小红书' },
  { platform: 'bilibili', name: 'B 站' },
  { platform: 'video_channel', name: '视频号' },
  { platform: 'other', name: '其他账号' }
];

export function getOwnedMediaAccountCoverage(accounts: PublishingAccount[]): Array<{ platform: string; name: string; connected: boolean }> {
  return ownedMediaPlatformOptions.map((item) => ({
    ...item,
    connected: accounts.some((account) => account.platform === item.platform && account.authStatus === 'connected')
  }));
}

type PublishingChannelStatsItem = {
  platform: string;
  name: string;
  totalRecords: number;
  pendingRecords: number;
  publishedRecords: number;
  failedRecords: number;
  aiCitationCount: string;
  relatedIntentCount: number;
  retestStatus: string;
  nextAction: string;
};

export function getPublishingChannelStats(records: PublishingRecord[]): PublishingChannelStatsItem[] {
  return ownedMediaPlatformOptions.map((platform) => {
    const platformRecords = records.filter((record) => record.platform === platform.platform);
    const pendingRecords = platformRecords.filter((record) => record.status === 'pending').length;
    const publishedRecords = platformRecords.filter((record) => record.status === 'published').length;
    const failedRecords = platformRecords.filter((record) => record.status === 'failed').length;

    return {
      platform: platform.platform,
      name: platform.name,
      totalRecords: platformRecords.length,
      pendingRecords,
      publishedRecords,
      failedRecords,
      aiCitationCount: '待接入引用统计',
      relatedIntentCount: new Set(platformRecords.map((record) => record.contentAssetId).filter(Boolean)).size,
      retestStatus: publishedRecords > 0 ? '建议再次监测' : '发布后安排',
      nextAction: failedRecords > 0 ? '处理失败' : pendingRecords > 0 ? '继续发布' : '检查素材'
    };
  });
}

type PublishingPlatformDetail = {
  platform: string;
  name: string;
  accountCount: number;
  coverRatio: string;
  frequency: string;
  latestPublishedAt: string;
  nextAction: string;
  records: PublishingRecord[];
};

export function getPublishingPlatformDetail(platform: string, records: PublishingRecord[], accounts: PublishingAccount[]): PublishingPlatformDetail {
  const guidance = getMediaPlatformGuidance(platform);
  const platformRecords = records.filter((record) => record.platform === platform);
  const publishedRecords = platformRecords.filter((record) => record.status === 'published');
  const latestPublishedAt = publishedRecords.map((record) => record.updatedAt).sort().at(-1);
  const failedCount = platformRecords.filter((record) => record.status === 'failed').length;
  const pendingCount = platformRecords.filter((record) => record.status === 'pending').length;

  return {
    platform,
    name: guidance.name,
    accountCount: accounts.filter((account) => account.platform === platform).length,
    coverRatio: guidance.coverRatio,
    frequency: guidance.frequency,
    latestPublishedAt: latestPublishedAt ?? '暂无发布记录',
    nextAction: failedCount > 0 ? '处理发布失败内容' : pendingCount > 0 ? '继续发布待处理内容' : '准备下一批内容并安排再次监测',
    records: platformRecords
  };
}

export function getMediaPlatformGuidance(platform: string, fallbackName?: string): MediaPlatformGuidance {
  const guidance: Record<string, Omit<MediaPlatformGuidance, 'platform'>> = {
    wechat: {
      name: '公众号',
      rule: '适合长文、案例、FAQ 和品牌观点，发布前检查标题、摘要和事实表述。',
      contentFormats: ['公众号推文', 'FAQ 合集', '案例文章'],
      intentFit: '品牌了解、方案比较、购买前确认',
      frequency: '每周 1-3 篇',
      coverRatio: '2.35:1 或 1:1',
      publishingNote: '标题、摘要、封面和跳转入口发布前逐项确认',
      retestAction: '发布后 3-7 天再次监测核心问题'
    },
    wechat_official: {
      name: '公众号',
      rule: '适合长文、案例、FAQ 和品牌观点，发布前检查标题、摘要和事实表述。',
      contentFormats: ['公众号推文', 'FAQ 合集', '案例文章'],
      intentFit: '品牌了解、方案比较、购买前确认',
      frequency: '每周 1-3 篇',
      coverRatio: '2.35:1 或 1:1',
      publishingNote: '标题、摘要、封面和跳转入口发布前逐项确认',
      retestAction: '发布后 3-7 天再次监测核心问题'
    },
    xiaohongshu: {
      name: '小红书',
      rule: '适合场景化种草、用户疑问和对比内容，重点检查口语化表达和图片需求。',
      contentFormats: ['小红书图文', '场景 FAQ', '对比笔记'],
      intentFit: '场景咨询、口碑比较、体验问题',
      frequency: '每周 2-5 篇',
      coverRatio: '3:4',
      publishingNote: '首图、标题、话题标签和合规表达需统一检查',
      retestAction: '发布后记录高频评论并补充到监测问题'
    },
    zhihu: {
      name: '知乎',
      rule: '适合问答、科普和方案对比，回答需要清晰引用品牌事实和可信来源。',
      contentFormats: ['问答', '专栏文章', '对比说明'],
      intentFit: '专业判断、方案选择、竞品比较',
      frequency: '每周 1-2 篇',
      coverRatio: '无强制封面',
      publishingNote: '回答结构、事实来源和利益相关说明发布前确认',
      retestAction: '发布后复测相关问答型问题'
    },
    baijiahao: {
      name: '百家号',
      rule: '适合搜索承接型文章和品牌知识内容，标题和摘要需要覆盖核心关键词。',
      contentFormats: ['媒体稿', '知识文章', 'FAQ'],
      intentFit: '搜索了解、品牌信息确认',
      frequency: '每周 1-3 篇',
      coverRatio: '16:9',
      publishingNote: '标题关键词、摘要、封面和分类发布前确认',
      retestAction: '发布后观察搜索型问题的引用变化'
    },
    website: {
      name: '官网',
      rule: '适合沉淀标准答案、产品页和 FAQ，内容需要长期可引用并保持事实准确。',
      contentFormats: ['官网 FAQ', '产品页', '方案页'],
      intentFit: '品牌确认、产品了解、售前答疑',
      frequency: '按资料变更及时更新',
      coverRatio: '按页面模板',
      publishingNote: 'URL、标题、结构化标题和更新时间发布前确认',
      retestAction: '更新后复测品牌和产品核心问题'
    },
    official_site: {
      name: '官网',
      rule: '适合沉淀标准答案、产品页和 FAQ，内容需要长期可引用并保持事实准确。',
      contentFormats: ['官网 FAQ', '产品页', '方案页'],
      intentFit: '品牌确认、产品了解、售前答疑',
      frequency: '按资料变更及时更新',
      coverRatio: '按页面模板',
      publishingNote: 'URL、标题、结构化标题和更新时间发布前确认',
      retestAction: '更新后复测品牌和产品核心问题'
    },
    blog: {
      name: '博客',
      rule: '适合沉淀长尾教程、观点文章和案例复盘，保持标题和分类清晰。',
      contentFormats: ['教程文章', '案例复盘', '观点文章'],
      intentFit: '深度了解、操作学习、长期搜索',
      frequency: '每周 1-2 篇',
      coverRatio: '16:9',
      publishingNote: '分类、摘要、内链和图片版权发布前确认',
      retestAction: '发布后复测长尾问题和引用来源'
    },
    bilibili: {
      name: 'B 站',
      rule: '适合视频讲解、案例拆解和知识科普，标题与封面需要明确问题场景。',
      contentFormats: ['视频脚本', '知识科普', '案例拆解'],
      intentFit: '学习了解、案例判断、复杂问题解释',
      frequency: '每周 1 篇',
      coverRatio: '16:9',
      publishingNote: '封面、分区、简介和字幕发布前确认',
      retestAction: '发布后复测视频标题相关问题'
    },
    video_channel: {
      name: '视频号',
      rule: '适合短视频、活动预告和场景化服务说明，内容要短、清晰、可转发。',
      contentFormats: ['短视频脚本', '活动预告', '服务说明'],
      intentFit: '快速了解、活动触达、服务确认',
      frequency: '每周 2-4 条',
      coverRatio: '9:16 或 1:1',
      publishingNote: '封面、字幕、话题和引导语发布前确认',
      retestAction: '发布后复测活动和服务短问题'
    }
  };

  const matched = guidance[platform] ?? {
    name: fallbackName ?? getPlatformDisplay(platform),
    rule: '按平台内容规范检查标题、正文、引用依据和发布账号状态。',
    contentFormats: ['文章', 'FAQ', '图文'],
    intentFit: '品牌了解、问题解答、方案比较',
    frequency: '按内容策略排期发布',
    coverRatio: '按平台要求',
    publishingNote: '发布账号、内容格式、素材和链接发布前确认',
    retestAction: '发布后安排再次监测'
  };

  return { platform, ...matched };
}
