import { Button, Card, Form, Input, Modal, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CitationDashboard, CitationSource, ContentAsset, ContentAssetInput, ContentStrategy } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';

type AssetFormValues = Omit<ContentAssetInput, 'targetKeywords'> & {
  targetKeywordsText?: string;
};

const sourceTypeLabels: Record<CitationSource['sourceType'], string> = {
  official_site: '官网',
  media: '媒体',
  social: '社媒',
  encyclopedia: '百科',
  third_party: '第三方平台'
};

const authorityLabels: Record<CitationSource['authorityLevel'], string> = {
  high: '高',
  medium: '中',
  low: '低',
  unknown: '未知'
};

export function CitationAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [selectedCitation, setSelectedCitation] = useState<CitationSource>();
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetForm] = Form.useForm<AssetFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['citation-dashboard', activeBrandId],
    queryFn: () => apiGet<CitationDashboard>(`/brands/${activeBrandId}/citations`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const bindAssetMutation = useMutation({
    mutationFn: (values: AssetFormValues) => {
      return apiPost<ContentAsset>(`/brands/${activeBrandId}/citations/${selectedCitation?.id}/content-asset`, toAssetPayload(values));
    },
    onSuccess: (response) => {
      if (response.success) {
        setAssetModalOpen(false);
        setSelectedCitation(undefined);
        assetForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['citation-dashboard', activeBrandId] });
        void messageApi.success('内容资产已绑定');
      }
    }
  });
  const createStrategyMutation = useMutation({
    mutationFn: (citationId: string) => apiPost<ContentStrategy>(`/brands/${activeBrandId}/citations/${citationId}/enhancement-strategy`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void messageApi.success('引用增强策略已创建');
      }
    }
  });

  const openAssetModal = (citation: CitationSource) => {
    setSelectedCitation(citation);
    assetForm.setFieldsValue({
      title: citation.title,
      type: citation.sourceType,
      platform: citation.sourceType,
      url: citation.url,
      status: 'published'
    });
    setAssetModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <Card title="引用分析">
        <Typography.Paragraph>
          基于 AI 回答中的引用来源，统计官网、媒体、社媒、百科和第三方平台引用表现，并创建引用增强策略。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Statistic title="引用总数" value={dashboard?.totalCitations ?? 0} />
          <Statistic title="内容引用率" value={dashboard?.contentCitationRate ?? 0} suffix="%" />
          <Statistic title="官网引用率" value={dashboard?.officialCitationRate ?? 0} suffix="%" />
          <Statistic title="权威来源占比" value={dashboard?.authoritySourceRate ?? 0} suffix="%" />
        </Space>
      </Card>

      <Card title="来源类型分布" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="sourceType"
          dataSource={dashboard?.sourceTypeBreakdown ?? []}
          pagination={false}
          columns={[
            { title: '来源类型', render: (_, record) => sourceTypeLabels[record.sourceType] },
            { title: '引用次数', dataIndex: 'citationCount' },
            { title: '占比', dataIndex: 'rate', render: (value) => `${value}%` }
          ]}
        />
      </Card>

      <Card title="内容引用率趋势" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="date"
          dataSource={dashboard?.trend ?? []}
          pagination={false}
          columns={[
            { title: '日期', dataIndex: 'date' },
            { title: '引用次数', dataIndex: 'citationCount' },
            { title: '内容引用率', dataIndex: 'contentCitationRate', render: (value) => `${value}%` }
          ]}
        />
      </Card>

      <Card title="引用来源明细" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={dashboard?.sources ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '来源标题', dataIndex: 'title' },
            { title: '来源平台', dataIndex: 'platformCode' },
            { title: 'URL', dataIndex: 'url', render: (value) => <Typography.Text copyable ellipsis>{value}</Typography.Text> },
            { title: '来源类型', render: (_, record) => <Tag>{sourceTypeLabels[record.sourceType]}</Tag> },
            { title: '权威等级', render: (_, record) => <Tag color={record.authorityLevel === 'high' ? 'green' : undefined}>{authorityLabels[record.authorityLevel]}</Tag> },
            { title: '引用次数', dataIndex: 'citationCount' },
            { title: '关联监测问题', dataIndex: 'promptText' },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button size="small" onClick={() => openAssetModal(record)}>{record.contentAssetId ? '更新资产' : '绑定资产'}</Button>
                  <Button size="small" onClick={() => createStrategyMutation.mutate(record.id)}>增强策略</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="绑定内容资产"
        open={assetModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={bindAssetMutation.isPending}
        onCancel={() => setAssetModalOpen(false)}
        onOk={() => assetForm.submit()}
      >
        <Form form={assetForm} layout="vertical" onFinish={(values) => bindAssetMutation.mutate(values)}>
          <Form.Item name="title" label="内容标题" rules={[{ required: true, message: '请输入内容标题' }]}><Input /></Form.Item>
          <Form.Item name="type" label="内容类型"><Input /></Form.Item>
          <Form.Item name="platform" label="发布平台"><Input /></Form.Item>
          <Form.Item name="url" label="内容链接" rules={[{ required: true, message: '请输入内容链接' }]}><Input /></Form.Item>
          <Form.Item name="targetKeywordsText" label="目标关键词"><Input.TextArea rows={3} placeholder="一行一个关键词" /></Form.Item>
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
