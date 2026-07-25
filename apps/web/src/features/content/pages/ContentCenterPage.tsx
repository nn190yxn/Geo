import { Button, Card, Form, Input, Modal, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ContentAsset, ContentAssetInput, ContentCenterDashboard, ContentStrategy } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getContentTypeDisplay, getPlatformDisplay, getStatusDisplay } from '../../../utils/displayLabels';

type AssetFormValues = Omit<ContentAssetInput, 'targetKeywords'> & {
  targetKeywordsText?: string;
};

const strategyTypeLabels: Record<ContentStrategy['type'], string> = {
  gap: '内容缺口',
  correction: '信息修正',
  enhancement: '关键词增强',
  authority_citation: '权威引用',
  competitor_response: '竞品回应'
};

const priorityLabels: Record<ContentStrategy['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export function ContentCenterPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ContentAsset>();
  const [assetForm] = Form.useForm<AssetFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['content-center', activeBrandId],
    queryFn: () => apiGet<ContentCenterDashboard>(`/brands/${activeBrandId}/content`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const saveAssetMutation = useMutation({
    mutationFn: (values: AssetFormValues) => {
      const payload = toAssetPayload(values);
      return editingAsset
        ? apiPatch<ContentAsset>(`/brands/${activeBrandId}/content/assets/${editingAsset.id}`, payload)
        : apiPost<ContentAsset>(`/brands/${activeBrandId}/content/assets`, payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setAssetModalOpen(false);
        setEditingAsset(undefined);
        assetForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['content-center', activeBrandId] });
        void messageApi.success('内容资产已保存');
      }
    }
  });
  const generateStrategiesMutation = useMutation({
    mutationFn: () => apiPost<ContentStrategy[]>(`/brands/${activeBrandId}/content/strategies/generate`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['content-center', activeBrandId] });
        void messageApi.success(`已生成 ${response.data.length} 条内容策略`);
      }
    }
  });

  const openAssetModal = (asset?: ContentAsset) => {
    setEditingAsset(asset);
    assetForm.setFieldsValue(asset ? {
      title: asset.title,
      type: asset.type,
      platform: asset.platform,
      url: asset.url,
      targetKeywordsText: asset.targetKeywords.join('\n'),
      reuseOfAssetId: asset.reuseOfAssetId,
      brandAdaptation: asset.brandAdaptation,
      status: asset.status,
      publishedAt: asset.publishedAt
    } : { status: 'draft' });
    setAssetModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <Card
        title="内容策略中心"
        extra={<Space><Button onClick={() => openAssetModal()}>新建资产</Button><Button type="primary" onClick={() => generateStrategiesMutation.mutate()}>生成策略</Button></Space>}
      >
        <Typography.Paragraph>
          管理官网、媒体、社媒、百科和案例等内容资产，并根据 AI 回复监测结果生成内容缺口、信息修正、关键词增强、权威引用和竞品回应策略。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Statistic title="关键词覆盖率" value={dashboard?.coverage.keywordCoverageRate ?? 0} suffix="%" />
          <Statistic title="未覆盖关键词" value={dashboard?.coverage.uncoveredKeywords.length ?? 0} />
          <Statistic title="已发布资产" value={dashboard?.coverage.publishedAssetCount ?? 0} />
          <Statistic title="复用资产" value={dashboard?.coverage.reusableAssetCount ?? 0} />
        </Space>
      </Card>

      <Card title="内容资产" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={dashboard?.assets ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '标题', dataIndex: 'title' },
            { title: '类型', dataIndex: 'type', render: (value) => getContentTypeDisplay(value) },
            { title: '平台', dataIndex: 'platform', render: (value) => getPlatformDisplay(value) },
            { title: '关键词', render: (_, record) => record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) },
            { title: '状态', dataIndex: 'status', render: (value) => getStatusDisplay(value) },
            { title: '复用说明', dataIndex: 'brandAdaptation' },
            { title: '操作', render: (_, record) => <Button size="small" onClick={() => openAssetModal(record)}>编辑</Button> }
          ]}
        />
      </Card>

      <Card title="策略建议" loading={dashboardQuery.isLoading}>
        <Table
          rowKey={(record) => `${record.type}-${record.intentId}-${record.targetPlatform}`}
          dataSource={dashboard?.suggestions ?? []}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '策略类型', render: (_, record) => <Tag>{strategyTypeLabels[record.type]}</Tag> },
            { title: '建议标题', dataIndex: 'suggestedTitle' },
            { title: '目标平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
            { title: '目标关键词', render: (_, record) => record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) },
            { title: '优先级', render: (_, record) => <Tag color={record.priority === 'high' ? 'red' : record.priority === 'medium' ? 'orange' : undefined}>{priorityLabels[record.priority]}</Tag> },
            { title: '生成原因', dataIndex: 'reason' }
          ]}
        />
      </Card>

      <Card title="内容策略列表" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={dashboard?.strategies ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '策略类型', render: (_, record) => <Tag>{strategyTypeLabels[record.type]}</Tag> },
            { title: '建议标题', dataIndex: 'suggestedTitle' },
            { title: '目标平台', dataIndex: 'targetPlatform', render: (value) => getPlatformDisplay(value) },
            { title: '目标关键词', render: (_, record) => record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>) },
            { title: '优先级', render: (_, record) => <Tag color={record.priority === 'high' ? 'red' : record.priority === 'medium' ? 'orange' : undefined}>{priorityLabels[record.priority]}</Tag> },
            { title: '状态', dataIndex: 'status', render: (value) => getStatusDisplay(value) }
          ]}
        />
      </Card>

      <Modal
        title={editingAsset ? '编辑内容资产' : '新建内容资产'}
        open={assetModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveAssetMutation.isPending}
        onCancel={() => setAssetModalOpen(false)}
        onOk={() => assetForm.submit()}
      >
        <Form form={assetForm} layout="vertical" onFinish={(values) => saveAssetMutation.mutate(values)}>
          <Form.Item name="title" label="内容标题" rules={[{ required: true, message: '请输入内容标题' }]}><Input /></Form.Item>
          <Form.Item name="type" label="内容类型" rules={[{ required: true, message: '请输入内容类型' }]}><Input placeholder="官网页面 / 案例文章 / 社交平台图文" /></Form.Item>
          <Form.Item name="platform" label="发布平台" rules={[{ required: true, message: '请输入发布平台' }]}><Input placeholder="官网 / 公众号 / 媒体平台" /></Form.Item>
          <Form.Item name="url" label="内容链接" rules={[{ required: true, message: '请输入内容链接' }]}><Input /></Form.Item>
          <Form.Item name="targetKeywordsText" label="目标关键词"><Input.TextArea rows={3} placeholder="一行一个关键词" /></Form.Item>
          <Form.Item name="brandAdaptation" label="品牌适配说明"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="status" label="内容状态"><Select options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'archived', label: '归档' }]} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function toAssetPayload(values: AssetFormValues): ContentAssetInput {
  return {
    ...values,
    targetKeywords: values.targetKeywordsText?.split('\n').map((item) => item.trim()).filter(Boolean) ?? []
  };
}
