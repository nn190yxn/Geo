import { Select } from 'antd';
import type { UnifiedFilterOption } from '../../../components/UnifiedFilterBar';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import type { AnalysisScopeValue } from '../analysisScopeQuery';

export type AnalysisScopeBarProps<Status extends string = string> = {
  value: AnalysisScopeValue<Status>;
  onChange: (value: AnalysisScopeValue<Status>) => void;
  onClear: () => void;
  statusOptions?: readonly UnifiedFilterOption<Status>[];
  optimizationUnitOptions?: readonly UnifiedFilterOption[];
  intentOptions?: readonly UnifiedFilterOption[];
  resultCount: number;
  totalCount?: number;
};

export function AnalysisScopeBar<Status extends string = string>({
  value,
  onChange,
  onClear,
  statusOptions,
  optimizationUnitOptions = [],
  intentOptions = [],
  resultCount,
  totalCount
}: AnalysisScopeBarProps<Status>) {
  return (
    <UnifiedFilterBar
      value={value}
      onChange={(next) => onChange({ ...value, ...next })}
      onClear={onClear}
      statusOptions={statusOptions}
      searchPlaceholder="搜索当前分析证据"
      resultCount={resultCount}
      totalCount={totalCount}
      extraFilters={(
        <>
          <Select
            aria-label="优化单元筛选"
            value={value.optimizationUnitId ?? 'all'}
            options={withCurrentScopeOption('全部优化单元', '当前优化单元', value.optimizationUnitId, optimizationUnitOptions)}
            onChange={(optimizationUnitId) => onChange({ ...value, optimizationUnitId: optimizationUnitId === 'all' ? undefined : optimizationUnitId })}
          />
          <Select
            aria-label="用户意图筛选"
            value={value.intentId ?? 'all'}
            options={withCurrentScopeOption('全部用户意图', '当前用户意图', value.intentId, intentOptions)}
            onChange={(intentId) => onChange({ ...value, intentId: intentId === 'all' ? undefined : intentId })}
          />
        </>
      )}
    />
  );
}

function withCurrentScopeOption(
  allLabel: string,
  currentLabel: string,
  currentValue: string | undefined,
  options: readonly UnifiedFilterOption[]
): UnifiedFilterOption[] {
  const available = [{ value: 'all', label: allLabel }, ...options];
  if (currentValue && !available.some((option) => option.value === currentValue)) {
    available.push({ value: currentValue, label: currentLabel });
  }
  return available;
}
