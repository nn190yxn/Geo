import { isPreferredAIPlatform, type AIPlatformFilterValue } from '../utils/displayLabels';

export type UnifiedFilterValue<Status extends string = string> = {
  search: string;
  from?: string;
  to?: string;
  platform: AIPlatformFilterValue;
  status: 'all' | Status;
};

export type UnifiedFilterQueryOptions<Status extends string = string> = {
  statuses?: readonly Status[];
};

const filterQueryKeys = ['q', 'from', 'to', 'platform', 'status'] as const;

export function readUnifiedFilterQuery<Status extends string = string>(
  search: string,
  options: UnifiedFilterQueryOptions<Status> = {}
): UnifiedFilterValue<Status> {
  const params = new URLSearchParams(search);
  const platform = params.get('platform');
  const status = params.get('status');
  const range = normalizeDateRange(params.get('from') ?? undefined, params.get('to') ?? undefined);

  return {
    search: params.get('q')?.trim() ?? '',
    ...range,
    platform: isPreferredAIPlatform(platform) ? platform : 'all',
    status: isAllowedStatus(status, options.statuses) ? status : 'all'
  };
}

export function mergeUnifiedFilterQuery<Status extends string = string>(
  currentSearch: string,
  value: UnifiedFilterValue<Status>
): string {
  const params = new URLSearchParams(currentSearch);
  const range = normalizeDateRange(value.from, value.to);

  setOrDelete(params, 'q', value.search.trim());
  setOrDelete(params, 'from', range.from);
  setOrDelete(params, 'to', range.to);
  setOrDelete(params, 'platform', value.platform === 'all' ? undefined : value.platform);
  setOrDelete(params, 'status', value.status === 'all' ? undefined : value.status);

  return toSearchString(params);
}

export function clearUnifiedFilterQuery(currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  filterQueryKeys.forEach((key) => params.delete(key));
  return toSearchString(params);
}

export function hasActiveUnifiedFilters(value: UnifiedFilterValue): boolean {
  return Boolean(
    value.search.trim()
    || value.from
    || value.to
    || value.platform !== 'all'
    || value.status !== 'all'
  );
}

export function normalizeDateRange(from?: string, to?: string): Pick<UnifiedFilterValue, 'from' | 'to'> {
  const normalizedFrom = isISODate(from) ? from : undefined;
  const normalizedTo = isISODate(to) ? to : undefined;

  if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
    return { from: normalizedTo, to: normalizedFrom };
  }

  return { from: normalizedFrom, to: normalizedTo };
}

export function getResultCountLabel(resultCount: number, totalCount?: number): string {
  const safeResultCount = normalizeCount(resultCount);
  const safeTotalCount = totalCount === undefined ? undefined : Math.max(safeResultCount, normalizeCount(totalCount));
  return safeTotalCount === undefined || safeTotalCount === safeResultCount
    ? `共 ${safeResultCount} 条结果`
    : `显示 ${safeResultCount} 条，共 ${safeTotalCount} 条`;
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function isAllowedStatus<Status extends string>(
  value: string | null,
  statuses?: readonly Status[]
): value is Status {
  if (!value || value === 'all') return false;
  return statuses ? statuses.includes(value as Status) : true;
}

function isISODate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function setOrDelete(params: URLSearchParams, key: string, value?: string): void {
  if (value) params.set(key, value);
  else params.delete(key);
}

function toSearchString(params: URLSearchParams): string {
  const value = params.toString();
  return value ? `?${value}` : '';
}
