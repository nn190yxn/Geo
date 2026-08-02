import { Button, Card, Empty, Space, Tag, Typography } from 'antd';
import type { AnalysisFinding, AnalysisFindingSeverity, AnalysisFindingType, AnalysisRecommendedAction } from '@geo-platform/shared-types';
import { getPlatformDisplay } from '../../../utils/displayLabels';

const findingTypeLabels: Record<AnalysisFindingType, string> = {
  competitor: '竞品差距',
  evaluation: '评价表达',
  citation: '信源覆盖',
  fact: '事实准确性'
};

const severityDisplay: Record<AnalysisFindingSeverity, { label: string; color: string }> = {
  high: { label: '高风险', color: 'red' },
  medium: { label: '中风险', color: 'gold' },
  low: { label: '低风险', color: 'blue' }
};

export type AnalysisFindingCardsProps = {
  findings: AnalysisFinding[];
  onAction: (finding: AnalysisFinding, action: AnalysisRecommendedAction) => void;
  onOpenTask: (finding: AnalysisFinding) => void;
};

export function AnalysisFindingCards({ findings, onAction, onOpenTask }: AnalysisFindingCardsProps) {
  if (findings.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分析范围内没有诊断结论" />;
  }

  return (
    <div className="geo-workbench-grid">
      {findings.map((finding) => {
        const severity = severityDisplay[finding.severity];
        return (
          <Card
            key={finding.id}
            size="small"
            className="geo-diagnostic-card"
            title={<Space wrap><Tag>{findingTypeLabels[finding.type]}</Tag><Typography.Text strong>{finding.title}</Typography.Text></Space>}
            extra={<Tag color={severity.color}>{severity.label}</Tag>}
          >
            <Space direction="vertical" size={12} className="page-stack">
              {finding.userIntent || finding.platformCode ? (
                <Typography.Text type="secondary">
                  {[finding.userIntent, finding.platformCode ? getPlatformDisplay(finding.platformCode) : undefined].filter(Boolean).join(' · ')}
                </Typography.Text>
              ) : null}
              <div>
                <Typography.Text strong>证据摘要</Typography.Text>
                {finding.evidence.length > 0 ? (
                  <ul className="geo-compact-list">
                    {finding.evidence.slice(0, 3).map((evidence, index) => <li key={`${finding.id}-evidence-${index}`}>{evidence}</li>)}
                  </ul>
                ) : <Typography.Paragraph type="secondary">等待补充真实回复证据。</Typography.Paragraph>}
              </div>
              <Space wrap>
                {finding.recommendedActions.map((action, index) => (
                  <Button key={`${action.actionType}-${action.targetId ?? index}`} size="small" onClick={() => onAction(finding, action)}>
                    {action.label}
                  </Button>
                ))}
                {finding.relatedTaskId ? <Button size="small" onClick={() => onOpenTask(finding)}>查看关联任务</Button> : null}
              </Space>
            </Space>
          </Card>
        );
      })}
    </div>
  );
}

export function getAnalysisFindingTypeLabel(type: AnalysisFindingType): string {
  return findingTypeLabels[type];
}

export function getAnalysisFindingSeverityDisplay(severity: AnalysisFindingSeverity) {
  return severityDisplay[severity];
}
