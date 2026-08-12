import { Alert, Card, Space, Tag, Typography } from 'antd';
import type { EffectEvidence, EffectEvidenceDashboard, ReportDataGap } from '@geo-platform/shared-types';

export function EffectEvidencePanel({
  dashboard,
  evidence,
  dataGaps,
  periodStart,
  periodEnd,
  compact = false
}: {
  dashboard?: EffectEvidenceDashboard;
  evidence?: EffectEvidence[];
  dataGaps?: ReportDataGap[];
  periodStart?: string;
  periodEnd?: string;
  compact?: boolean;
}) {
  if (!dashboard && !evidence) return <Card size="small" loading />;
  const items = dashboard?.evidence ?? evidence ?? [];
  const gaps = dashboard?.dataGaps ?? dataGaps ?? [];
  const complete = items.length > 0 && items.every((item) => item.evidenceStatus === 'complete');

  return (
    <Card size="small" title={compact ? '效果证据' : `效果证据（${items.length}）`} extra={<Tag color={complete ? 'green' : 'gold'}>{complete ? '证据完整' : '证据待补充'}</Tag>}>
      <Space direction="vertical" size={compact ? 6 : 10} className="page-stack">
        {dashboard || periodStart || periodEnd ? <Typography.Text type="secondary">统计周期：{dashboard?.periodStart ?? periodStart} 至 {dashboard?.periodEnd ?? periodEnd}（{dashboard?.periodSource === 'latest_report' ? '冻结报告周期' : '当前页面周期'}）</Typography.Text> : null}
        {items.map((item) => (
          <div key={`${item.taskId}-${item.retestRunId}`}>
            <Typography.Text strong>{item.taskTitle}</Typography.Text>
            {!compact ? <Space direction="vertical" size={2} className="page-stack">
              <Typography.Text>基线与复测：{item.sampleSummary.baselineValid ? '基线有效' : '基线待补充'}，{item.sampleSummary.retestValid ? '复测有效' : '复测待补充'}</Typography.Text>
              <Typography.Text>内容资产 {item.contentAssetIds.length} 项，发布记录 {item.publishingRecords.length} 项</Typography.Text>
              <Typography.Text>提及率：{formatPercent(item.baselineMetrics?.mentionRate)} 至 {formatPercent(item.afterMetrics?.mentionRate)}</Typography.Text>
              <Typography.Text>品牌排名：{item.baselineMetrics?.brandRank ?? '待补充'} 至 {item.afterMetrics?.brandRank ?? '待补充'}</Typography.Text>
              <Typography.Text>表达准确率：{formatScore(item.baselineMetrics?.accuracyScore)} 至 {formatScore(item.afterMetrics?.accuracyScore)}</Typography.Text>
              <Typography.Text>引用率：{formatPercent(item.baselineMetrics?.citationRate)} 至 {formatPercent(item.afterMetrics?.citationRate)}</Typography.Text>
              {item.publishingRecords.map((record) => <Typography.Text key={record.id}>{record.platform}：{record.publishedUrl ? <Typography.Link href={record.publishedUrl} target="_blank" rel="noreferrer">查看真实发布链接</Typography.Link> : '真实链接待补充'}</Typography.Text>)}
            </Space> : null}
          </div>
        ))}
        {items.length === 0 ? <Alert type="info" showIcon message="当前周期暂无已完成的再次监测证据" /> : null}
        {gaps.map((gap) => <Alert key={`${gap.section}-${gap.reason}`} type="warning" showIcon message={`${gap.section}：${gap.reason}`} />)}
      </Space>
    </Card>
  );
}

function formatPercent(value?: number): string {
  return value === undefined ? '待补充' : `${Math.round(value)}%`;
}

function formatScore(value?: number): string {
  return value === undefined ? '待补充' : `${Math.round(value)}%`;
}
