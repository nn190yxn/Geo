import { Skeleton, Typography } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

export type MetricSummaryItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  suffix?: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
};

export type MetricSummaryGridProps = {
  items: readonly MetricSummaryItem[];
  columns?: 2 | 3 | 4 | 5;
  loading?: boolean;
  ariaLabel?: string;
};

export function MetricSummaryGrid({
  items,
  columns = 4,
  loading = false,
  ariaLabel = '关键指标'
}: MetricSummaryGridProps) {
  const style = { '--metric-summary-columns': columns } as CSSProperties;
  const visibleItems: readonly MetricSummaryItem[] = loading && items.length === 0
    ? Array.from<unknown, MetricSummaryItem>({ length: columns }, (_, index) => ({ key: `loading-${index}`, label: '', value: '' }))
    : items;

  return (
    <div className="metric-summary-grid" style={style} role="list" aria-label={ariaLabel} aria-busy={loading}>
      {visibleItems.map((item) => (
        <div className="metric-summary-item" role="listitem" key={item.key}>
          {loading ? <Skeleton active paragraph={{ rows: 1 }} title={{ width: '45%' }} /> : (
            <>
              <div className="metric-summary-heading">
                <Typography.Text type="secondary">{item.label}</Typography.Text>
                {item.status ? <div className="metric-summary-status">{item.status}</div> : null}
              </div>
              <div className="metric-summary-value">
                <span>{item.value}</span>
                {item.suffix ? <Typography.Text type="secondary">{item.suffix}</Typography.Text> : null}
              </div>
              {item.description ? <Typography.Text type="secondary">{item.description}</Typography.Text> : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
