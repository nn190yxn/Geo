import { Alert, Button, Card, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { BrandActionDashboard, BrandActionPeriodEffect, EffectEvidenceDashboard } from '@geo-platform/shared-types';
import { apiGet } from '../../../api/http';
import { getBrandActionPath } from './BeginnerHomeState';
import { EffectEvidencePanel } from '../../../components/EffectEvidencePanel';

type BeginnerHomePanelProps = {
  brandId: string;
  brandName: string | undefined;
  onNavigate: (route: string) => void;
};

export function BeginnerHomePanel({ brandId, brandName, onNavigate }: BeginnerHomePanelProps) {
  const dashboardQuery = useQuery({
    queryKey: ['brand-action-dashboard', brandId],
    queryFn: () => apiGet<BrandActionDashboard>(`/brands/${encodeURIComponent(brandId)}/dashboards/actions`),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const effectQuery = useQuery({
    queryKey: ['effect-evidence', brandId],
    queryFn: () => apiGet<EffectEvidenceDashboard>(`/brands/${encodeURIComponent(brandId)}/reports/effect-evidence`)
  });
  const effectEvidence = effectQuery.data?.success ? effectQuery.data.data : undefined;

  if (dashboardQuery.isLoading) {
    return <Card className="beginner-home-card" loading />;
  }

  if (!dashboard) {
    const message = dashboardQuery.data && !dashboardQuery.data.success
      ? dashboardQuery.data.error.message
      : '首页进度暂时无法加载，请重新获取。';
    return <Alert type="error" showIcon message="无法读取开始进度" description={message} action={<Button onClick={() => void dashboardQuery.refetch()}>重新加载</Button>} />;
  }

  return <BeginnerHomeContent dashboard={dashboard} effectEvidence={effectEvidence} brandId={brandId} brandName={brandName} onNavigate={onNavigate} />;
}

export function BeginnerHomeContent({
  dashboard,
  effectEvidence,
  brandId,
  brandName,
  onNavigate
}: BeginnerHomePanelProps & { dashboard: BrandActionDashboard; effectEvidence?: EffectEvidenceDashboard }) {
  const primaryAction = dashboard.primaryAction;
  const sample = dashboard.latestValidSample;

  return (
    <Card className="beginner-home-card">
      <Space direction="vertical" size={20} className="page-stack">
        {dashboard.sourceFailures.length > 0 ? (
          <Alert type="warning" showIcon message="部分数据仍在恢复" description="当前页面保留了已成功读取的数据，稍后会自动刷新。" />
        ) : null}
        <div className="beginner-home-layout brand-action-overview">
          <Space direction="vertical" size={12} className="page-stack beginner-home-task">
            <Space wrap>
              <Tag color={dashboard.currentStage.status === 'blocked' ? 'error' : 'blue'}>当前阶段：{dashboard.currentStage.label}</Tag>
              {sample ? <Tag>最近有效样本：{formatDate(sample.sampledAt)}</Tag> : <Tag>最近有效样本：待采集</Tag>}
            </Space>
            <Typography.Title level={2}>{primaryAction.label}</Typography.Title>
            <Typography.Paragraph type="secondary">
              {brandName ?? '当前品牌'}：{primaryAction.reason}
            </Typography.Paragraph>
            {primaryAction.blocker ? (
              <Alert
                type="error"
                showIcon
                message={primaryAction.blocker.reason}
                description={`影响范围：${primaryAction.blocker.impactScope}。恢复动作：${primaryAction.blocker.recoveryAction}`}
              />
            ) : null}
            <Button type="primary" size="large" onClick={() => onNavigate(getBrandActionPath(brandId, primaryAction))}>
              {primaryAction.label}
            </Button>
            <Button type="text" onClick={() => onNavigate('/brands?quickStart=1')}>快速接入向导</Button>
          </Space>
          <PeriodEffectCard effect={dashboard.periodEffect} />
        </div>
        <EffectEvidencePanel dashboard={effectEvidence} compact />
        <div aria-label="前三项待办">
          <Typography.Title level={4}>接下来待办</Typography.Title>
          {dashboard.todos.length > 0 ? (
            <Space direction="vertical" size={10} className="page-stack">
              {dashboard.todos.slice(0, 3).map((todo) => (
                <div className="beginner-todo-row" key={todo.id}>
                  <div>
                    <Typography.Text strong>{todo.label}</Typography.Text>
                    <Typography.Paragraph type="secondary">{todo.reason}</Typography.Paragraph>
                  </div>
                  <Button onClick={() => onNavigate(getBrandActionPath(brandId, todo))}>去处理</Button>
                </div>
              ))}
            </Space>
          ) : <Typography.Text type="secondary">当前主行动完成后将刷新下一项待办。</Typography.Text>}
        </div>
      </Space>
    </Card>
  );
}

function PeriodEffectCard({ effect }: { effect: BrandActionPeriodEffect }) {
  const statusLabels: Record<BrandActionPeriodEffect['status'], string> = {
    complete: '证据完整',
    partial: '部分证据',
    pending: '持续观察',
    unavailable: '等待首轮数据'
  };
  return (
    <div className="beginner-home-journey brand-action-effect" aria-label="本周期效果">
      <Space direction="vertical" size={8}>
        <Typography.Text strong>本周期效果</Typography.Text>
        <Tag color={effect.status === 'complete' ? 'green' : effect.status === 'partial' ? 'gold' : 'default'}>{statusLabels[effect.status]}</Tag>
        <Typography.Paragraph>{effect.summary}</Typography.Paragraph>
        <Typography.Text type="secondary">有效样本 {effect.validSampleCount} 条，效果证据 {effect.evidenceCount} 项</Typography.Text>
      </Space>
    </div>
  );
}

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString('zh-CN') : value;
}
