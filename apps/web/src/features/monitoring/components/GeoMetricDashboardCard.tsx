import { Alert, Button, Card, Col, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { BrandMetricDashboard, BrandMetricRankingItem, GEOMetricSnapshot } from '@geo-platform/shared-types';
import { apiGet } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getPlatformDisplayName } from '../../../utils/displayLabels';

type Props = {
  brandId: string;
  onStartTest?: () => void;
};

type RankingSortKey = 'totalScore' | 'mentionRate' | 'top3Rate' | 'positiveRate' | 'periodChange';

export function GeoMetricDashboardCard({ brandId, onStartTest }: Props) {
  const [sortBy, setSortBy] = useState<RankingSortKey>('totalScore');
  const dashboardQuery = useQuery({
    queryKey: ['geo-metrics', brandId],
    queryFn: () => apiGet<BrandMetricDashboard>(`/brands/${brandId}/metrics`)
  });
  const rankingQuery = useQuery({
    queryKey: ['geo-metric-ranking', sortBy],
    queryFn: () => apiGet<BrandMetricRankingItem[]>(`/metrics/brands/ranking?sortBy=${sortBy}`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const ranking = rankingQuery.data?.success ? rankingQuery.data.data : [];

  return (
    <Card title="AI 推荐表现" loading={dashboardQuery.isLoading}>
      <PageErrorAlert response={dashboardQuery.data} />
      <PageErrorAlert response={rankingQuery.data} />
      {dashboard ? (
        <Space direction="vertical" size={16} className="page-stack">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Statistic title="综合表现分" value={dashboard.current.totalScore} suffix="/100" />
              {dashboard.current.insufficientSample ? <Tag color="orange">样本不足</Tag> : <Tag color="green">样本充足</Tag>}
            </Col>
            {scoreItems.map((item) => (
              <Col xs={12} md={6} key={item.key}>
                <Typography.Text type="secondary">{item.label}</Typography.Text>
                <Progress percent={dashboard.current[item.key]} size="small" />
              </Col>
            ))}
          </Row>
          {dashboard.current.insufficientSample ? (
            <Alert
              type="warning"
              showIcon
              message="当前品牌样本不足"
              description="请先创建一次 AI 回复监测，录入或获取 AI 原始回复后点击解读，系统会更新推荐表现。"
              action={onStartTest ? <Button size="small" onClick={onStartTest}>去新建监测</Button> : undefined}
            />
          ) : null}
          <Table
            rowKey={(record) => record.platformCode ?? record.optimizationUnitId ?? record.intentId ?? record.id}
            size="small"
            pagination={false}
            dataSource={[
              ...dashboard.breakdown.platform,
              ...dashboard.breakdown.optimizationUnit,
              ...dashboard.breakdown.intent
            ]}
            columns={metricColumns}
          />
          <Space align="center">
            <Typography.Text strong>多品牌排行</Typography.Text>
            <Select value={sortBy} options={rankingSortOptions} onChange={setSortBy} style={{ width: 180 }} />
          </Space>
          <Table
            rowKey="brandId"
            size="small"
            loading={rankingQuery.isLoading}
            pagination={false}
            dataSource={ranking}
            locale={{ emptyText: <EmptyState title="还没有多品牌排行" description="可对比的品牌推荐表现数据" reason="排行需要多个品牌完成真实回复监测和解读。" nextStep="完成更多品牌的 AI 回复监测后再查看。" /> }}
            columns={rankingColumns}
          />
        </Space>
      ) : (
        <EmptyState title="还没有推荐表现数据" description="品牌提及、排名、准确度、情绪和引用来源指标" reason="这些指标只从真实 AI 回复、浏览器辅助结果或手动录入真实回复中计算。" nextStep="创建一次 AI 回复监测并完成结果解读。" actionLabel={onStartTest ? '去新建监测' : undefined} onAction={onStartTest} />
      )}
    </Card>
  );
}

const scoreItems: Array<{ key: keyof Pick<GEOMetricSnapshot, 'mentionScore' | 'rankingScore' | 'accuracyScore' | 'sentimentScore' | 'citationScore' | 'competitorScore' | 'knowledgeCompletenessScore'>; label: string }> = [
  { key: 'mentionScore', label: '提及分' },
  { key: 'rankingScore', label: '推荐分' },
  { key: 'accuracyScore', label: '准确分' },
  { key: 'sentimentScore', label: '正向分' },
  { key: 'citationScore', label: '引用分' },
  { key: 'competitorScore', label: '竞品对比分' },
  { key: 'knowledgeCompletenessScore', label: '完整度影响项' }
];

const metricColumns = [
  { title: '维度', render: (_: unknown, record: GEOMetricSnapshot) => getMetricDimensionLabel(record) },
  { title: '样本', dataIndex: 'sampleCount' },
  { title: '总分', dataIndex: 'totalScore' },
  { title: '提及分', dataIndex: 'mentionScore' },
  { title: '推荐分', dataIndex: 'rankingScore' },
  { title: '正向分', dataIndex: 'sentimentScore' },
  { title: '状态', render: (_: unknown, record: GEOMetricSnapshot) => record.insufficientSample ? <Tag color="orange">样本不足</Tag> : <Tag color="green">正常</Tag> }
];

const rankingColumns = [
  { title: '品牌', dataIndex: 'name' },
  { title: '总分', dataIndex: 'totalScore' },
  { title: '提及率', dataIndex: 'mentionRate', render: (value: number) => `${value}%` },
  { title: 'Top3 推荐率', dataIndex: 'top3Rate', render: (value: number) => `${value}%` },
  { title: '正向表达率', dataIndex: 'positiveRate', render: (value: number) => `${value}%` },
  { title: '环比变化', dataIndex: 'periodChange' },
  { title: '样本', dataIndex: 'sampleCount' }
];

export function getMetricDimensionLabel(record: Pick<GEOMetricSnapshot, 'platformCode' | 'optimizationUnitId' | 'intentId' | 'category'>): string {
  if (record.platformCode) return getPlatformDisplayName(record.platformCode);
  if (record.category) return intentCategoryLabels[record.category] ?? '监测意图';
  if (record.optimizationUnitId) return '优化单元';
  if (record.intentId) return '监测问题';
  return '整体';
}

const intentCategoryLabels: Record<string, string> = {
  category_recommendation: '品类推荐',
  local_decision: '本地决策',
  pain_solution: '需求解决',
  brand_awareness: '品牌认知',
  price_decision: '价格决策'
};

const rankingSortOptions: Array<{ value: RankingSortKey; label: string }> = [
  { value: 'totalScore', label: '总分' },
  { value: 'mentionRate', label: '提及率' },
  { value: 'top3Rate', label: 'Top3 推荐率' },
  { value: 'positiveRate', label: '正向表达率' },
  { value: 'periodChange', label: '环比变化' }
];
