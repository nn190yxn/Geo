import { Tag, Typography } from 'antd';
import { useId, type ReactNode } from 'react';

export type InsightTone = 'neutral' | 'success' | 'warning' | 'danger';

export type InsightOverviewProps = {
  title: ReactNode;
  description: ReactNode;
  findings?: readonly ReactNode[];
  tone?: InsightTone;
  toneLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export type InsightDetailSectionProps = {
  title: ReactNode;
  description?: ReactNode;
  resultCount?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

const toneColors: Record<InsightTone, string> = {
  neutral: 'blue',
  success: 'green',
  warning: 'orange',
  danger: 'red'
};

export function InsightOverview({
  title,
  description,
  findings = [],
  tone = 'neutral',
  toneLabel,
  actions,
  children
}: InsightOverviewProps) {
  const titleId = useId();

  return (
    <section className={`insight-overview insight-overview-${tone}`} aria-labelledby={titleId}>
      <div className="insight-overview-header">
        <div className="insight-overview-copy">
          <Typography.Text type="secondary">关键结论</Typography.Text>
          <div className="insight-overview-title-row">
            <Typography.Title level={2} id={titleId}>{title}</Typography.Title>
            {toneLabel ? <Tag color={toneColors[tone]}>{toneLabel}</Tag> : null}
          </div>
          <Typography.Paragraph>{description}</Typography.Paragraph>
        </div>
        {actions ? <div className="insight-overview-actions">{actions}</div> : null}
      </div>
      {findings.length > 0 ? (
        <ul className="insight-overview-findings">
          {findings.map((finding, index) => <li key={index}>{finding}</li>)}
        </ul>
      ) : null}
      {children ? <div className="insight-overview-content">{children}</div> : null}
    </section>
  );
}

export function InsightDetailSection({
  title,
  description,
  resultCount,
  actions,
  children,
  className
}: InsightDetailSectionProps) {
  return (
    <section className={className ? `insight-detail-section ${className}` : 'insight-detail-section'}>
      <div className="insight-detail-header">
        <div className="insight-detail-copy">
          <div className="insight-detail-title-row">
            <Typography.Title level={3}>{title}</Typography.Title>
            {resultCount !== undefined ? <Typography.Text type="secondary">{resultCount} 条</Typography.Text> : null}
          </div>
          {description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}
        </div>
        {actions ? <div className="insight-detail-actions">{actions}</div> : null}
      </div>
      <div className="insight-detail-content">{children}</div>
    </section>
  );
}
