import { Alert, Button, Card, Space, Steps, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { BeginnerHomeDashboard } from '@geo-platform/shared-types';
import { apiGet } from '../../../api/http';
import { MetricSummaryGrid } from '../../../components/MetricSummaryGrid';
import { getBeginnerActionRoute, getBeginnerHomeQuestions, getBeginnerJourneyStages } from './BeginnerHomeState';

type BeginnerHomePanelProps = {
  brandId: string;
  brandName: string | undefined;
  onNavigate: (route: string) => void;
};

export function BeginnerHomePanel({ brandId, brandName, onNavigate }: BeginnerHomePanelProps) {
  const dashboardQuery = useQuery({
    queryKey: ['beginner-home-dashboard', brandId],
    queryFn: () => apiGet<BeginnerHomeDashboard>(`/brands/${brandId}/dashboards/home`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;

  if (dashboardQuery.isLoading) {
    return <Card className="beginner-home-card" loading />;
  }

  if (!dashboard) {
    const message = dashboardQuery.data && !dashboardQuery.data.success
      ? dashboardQuery.data.error.message
      : '首页进度暂时无法加载，请重新获取。';
    return <Alert type="error" showIcon message="无法读取开始进度" description={message} action={<Button onClick={() => void dashboardQuery.refetch()}>重新加载</Button>} />;
  }

  return <BeginnerHomeContent dashboard={dashboard} brandId={brandId} brandName={brandName} onNavigate={onNavigate} />;
}

export function BeginnerHomeContent({
  dashboard,
  brandId,
  brandName,
  onNavigate
}: BeginnerHomePanelProps & { dashboard: BeginnerHomeDashboard }) {

  const stages = getBeginnerJourneyStages(dashboard);
  const actionRoute = getBeginnerActionRoute(dashboard.nextAction);

  if (dashboard.resultSummary.sampleSize > 0) {
    const summary = dashboard.resultSummary;
    const questions = getBeginnerHomeQuestions(brandId);

    return (
      <Card className="beginner-home-card" title={`${brandName ?? '当前品牌'}的首轮监测结果`}>
        <Space direction="vertical" size={20} className="page-stack">
          <MetricSummaryGrid
            ariaLabel="首轮监测结果摘要"
            items={[
              { key: 'recommendation', label: '推荐度', value: summary.recommendationRate, suffix: '%', description: `${summary.rankedSampleSize}/${summary.sampleSize} 条回复出现有效排名` },
              { key: 'rank', label: '平均排名', value: summary.averageRank ?? '-', description: summary.averageRank === null ? '暂无有效排名' : `基于 ${summary.rankedSampleSize} 条有效排名` },
              { key: 'citation', label: '引用率', value: summary.citationHitRate, suffix: '%', description: `基于 ${summary.sampleSize} 条真实回复` },
              { key: 'issues', label: '待处理问题', value: summary.pendingIssueCount, suffix: '条', description: '需要人工复核的真实回复' }
            ]}
          />
          <div>
            <Typography.Title level={4}>你可能想了解</Typography.Title>
            <Space wrap>
              {questions.map((question) => (
                <Button key={question.key} onClick={() => onNavigate(question.route)}>{question.label}</Button>
              ))}
            </Space>
          </div>
        </Space>
      </Card>
    );
  }

  return (
    <Card className="beginner-home-card">
      <div className="beginner-home-layout">
        <Space direction="vertical" size={12} className="page-stack beginner-home-task">
          <Tag color="blue">推荐下一步</Tag>
          <Typography.Title level={2}>{dashboard.nextAction.label}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {brandName ?? '当前品牌'}：{dashboard.nextAction.reason}。完成后即可继续推进首轮 AI 回复监测。
          </Typography.Paragraph>
          <Button type="primary" size="large" onClick={() => onNavigate(actionRoute)}>
            {dashboard.nextAction.label}
          </Button>
        </Space>
        <div className="beginner-home-journey" aria-label="首轮监测三个阶段">
          <Typography.Text strong>完成首轮监测</Typography.Text>
          <Steps direction="vertical" size="small" items={stages.map((stage) => ({ title: stage.title, description: stage.description, status: stage.status }))} />
        </div>
      </div>
    </Card>
  );
}
