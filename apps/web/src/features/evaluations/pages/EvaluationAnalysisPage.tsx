import { Button, Card, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrandProfile, ContentStrategy, EvaluationDashboard, EvaluationIssue } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';

const issueTypeLabels: Record<EvaluationIssue['issueType'], string> = {
  misinformation: '错误信息',
  missing_selling_point: '缺失卖点',
  blocked_expression: '禁用表达',
  negative_expression: '负向表达',
  low_accuracy: '准确性偏低'
};

const severityLabels: Record<EvaluationIssue['severity'], string> = {
  high: '高',
  medium: '中',
  low: '低'
};

const statusLabels: Record<EvaluationIssue['status'], string> = {
  open: '待处理',
  strategy_created: '已建策略',
  knowledge_updated: '已更新知识库',
  resolved: '已解决'
};

export function EvaluationAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const dashboardQuery = useQuery({
    queryKey: ['evaluation-dashboard', activeBrandId],
    queryFn: () => apiGet<EvaluationDashboard>(`/brands/${activeBrandId}/evaluations`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const createStrategyMutation = useMutation({
    mutationFn: (issueId: string) => apiPost<ContentStrategy>(`/brands/${activeBrandId}/evaluations/${issueId}/correction-strategy`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['evaluation-dashboard', activeBrandId] });
        void messageApi.success('修正内容策略已创建');
      }
    }
  });
  const updateKnowledgeMutation = useMutation({
    mutationFn: (issueId: string) => apiPost<BrandProfile>(`/brands/${activeBrandId}/evaluations/${issueId}/knowledge`, {}),
    onSuccess: (response) => {
      if (response.success) {
        void queryClient.invalidateQueries({ queryKey: ['evaluation-dashboard', activeBrandId] });
        void messageApi.success('品牌知识库已更新');
      }
    }
  });

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <Card title="评价分析">
        <Typography.Paragraph>
          基于 AI 回答解读结果查看整体评价、准确表达和表达问题，并沉淀修正内容策略或品牌知识库更新。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Statistic title="正向表达率" value={dashboard?.positiveRate ?? 0} suffix="%" />
          <Statistic title="中性表达率" value={dashboard?.neutralRate ?? 0} suffix="%" />
          <Statistic title="负向表达率" value={dashboard?.negativeRate ?? 0} suffix="%" />
          <Statistic title="准确表达率" value={dashboard?.accurateRate ?? 0} suffix="%" />
        </Space>
      </Card>

      <Card title="评价趋势" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="date"
          dataSource={dashboard?.trend ?? []}
          pagination={false}
          columns={[
            { title: '日期', dataIndex: 'date' },
            { title: '样本数', dataIndex: 'sampleCount' },
            { title: '正向表达率', dataIndex: 'positiveRate', render: (value) => `${value}%` },
            { title: '中性表达率', dataIndex: 'neutralRate', render: (value) => `${value}%` },
            { title: '负向表达率', dataIndex: 'negativeRate', render: (value) => `${value}%` },
            { title: '准确表达率', dataIndex: 'accurateRate', render: (value) => `${value}%` }
          ]}
        />
      </Card>

      <Card title="错误表达类型分布" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="issueType"
          dataSource={dashboard?.issueTypeBreakdown ?? []}
          pagination={false}
          columns={[
            { title: '问题类型', render: (_, record) => issueTypeLabels[record.issueType] },
            { title: '数量', dataIndex: 'count' },
            { title: '占比', dataIndex: 'rate', render: (value) => `${value}%` }
          ]}
        />
      </Card>

      <Card title="表达问题列表" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={dashboard?.issues ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '问题类型', render: (_, record) => <Tag>{issueTypeLabels[record.issueType]}</Tag> },
            { title: '原始回答片段', dataIndex: 'rawFragment', render: (value) => <Typography.Text ellipsis>{value}</Typography.Text> },
            { title: '正确表达建议', dataIndex: 'suggestedExpression' },
            { title: '关联平台', dataIndex: 'platformCode' },
            { title: '关联监测问题', dataIndex: 'promptText' },
            { title: '严重程度', render: (_, record) => <Tag color={record.severity === 'high' ? 'red' : record.severity === 'medium' ? 'orange' : undefined}>{severityLabels[record.severity]}</Tag> },
            { title: '状态', render: (_, record) => <Tag>{statusLabels[record.status]}</Tag> },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button size="small" onClick={() => createStrategyMutation.mutate(record.id)}>修正策略</Button>
                  <Button size="small" onClick={() => updateKnowledgeMutation.mutate(record.id)}>更新知识库</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </Space>
  );
}
