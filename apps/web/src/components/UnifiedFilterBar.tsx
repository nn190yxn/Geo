import { Button, Input, Select, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { UnifiedFilterValue } from '../app/filterQuery';
import { getResultCountLabel, hasActiveUnifiedFilters } from '../app/filterQuery';
import { PlatformSwitch } from './PlatformSwitch';

export type UnifiedFilterOption<Value extends string = string> = {
  value: Value;
  label: string;
};

export type UnifiedFilterBarProps<Status extends string = string> = {
  value: UnifiedFilterValue<Status>;
  onChange: (value: UnifiedFilterValue<Status>) => void;
  onClear?: () => void;
  statusOptions?: readonly UnifiedFilterOption<Status>[];
  searchPlaceholder?: string;
  resultCount: number;
  totalCount?: number;
  showDateRange?: boolean;
  showPlatform?: boolean;
  extraFilters?: ReactNode;
  hasAdditionalFilters?: boolean;
};

export function UnifiedFilterBar<Status extends string = string>({
  value,
  onChange,
  onClear,
  statusOptions = [],
  searchPlaceholder = '搜索当前列表',
  resultCount,
  totalCount,
  showDateRange = true,
  showPlatform = true,
  extraFilters,
  hasAdditionalFilters = false
}: UnifiedFilterBarProps<Status>) {
  const updateValue = (next: Partial<UnifiedFilterValue<Status>>) => onChange({ ...value, ...next });
  const clearFilters = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChange({ search: '', platform: 'all', status: 'all' });
  };

  return (
    <section className="unified-filter-bar" aria-label="列表筛选">
      <div className="unified-filter-controls">
        <Input
          allowClear
          aria-label="搜索"
          className="unified-filter-search"
          onChange={(event) => updateValue({ search: event.target.value })}
          placeholder={searchPlaceholder}
          value={value.search}
        />
        {showDateRange ? (
          <div className="unified-filter-date-range" role="group" aria-label="时间范围">
            <Input
              aria-label="开始日期"
              max={value.to}
              onChange={(event) => updateValue({ from: event.target.value || undefined })}
              type="date"
              value={value.from ?? ''}
            />
            <Typography.Text type="secondary">至</Typography.Text>
            <Input
              aria-label="结束日期"
              min={value.from}
              onChange={(event) => updateValue({ to: event.target.value || undefined })}
              type="date"
              value={value.to ?? ''}
            />
          </div>
        ) : null}
        {statusOptions.length > 0 ? (
          <Select
            aria-label="状态筛选"
            className="unified-filter-status"
            onChange={(status) => updateValue({ status })}
            options={[{ value: 'all', label: '全部状态' }, ...statusOptions]}
            value={value.status}
          />
        ) : null}
        {extraFilters}
        <Button disabled={!hasActiveUnifiedFilters(value) && !hasAdditionalFilters} onClick={clearFilters}>清空筛选</Button>
      </div>
      {showPlatform ? (
        <PlatformSwitch value={value.platform} onChange={(platform) => updateValue({ platform })} />
      ) : null}
      <Typography.Text className="unified-filter-count" type="secondary" aria-live="polite">
        {getResultCountLabel(resultCount, totalCount)}
      </Typography.Text>
    </section>
  );
}
