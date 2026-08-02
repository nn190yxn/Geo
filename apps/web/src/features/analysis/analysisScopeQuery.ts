import { mergeUnifiedFilterQuery, readUnifiedFilterQuery, type UnifiedFilterQueryOptions, type UnifiedFilterValue } from '../../app/filterQuery';

export type AnalysisScopeValue<Status extends string = string> = UnifiedFilterValue<Status> & {
  optimizationUnitId?: string;
  intentId?: string;
};

export function readAnalysisScopeQuery<Status extends string = string>(
  search: string,
  options: UnifiedFilterQueryOptions<Status> = {}
): AnalysisScopeValue<Status> {
  const params = new URLSearchParams(search);
  return {
    ...readUnifiedFilterQuery(search, options),
    optimizationUnitId: readOptionalQueryValue(params, 'optimizationUnitId'),
    intentId: readOptionalQueryValue(params, 'intentId')
  };
}

export function mergeAnalysisScopeQuery<Status extends string = string>(
  currentSearch: string,
  value: AnalysisScopeValue<Status>
): string {
  const params = new URLSearchParams(mergeUnifiedFilterQuery(currentSearch, value));
  setOptionalQueryValue(params, 'optimizationUnitId', value.optimizationUnitId);
  setOptionalQueryValue(params, 'intentId', value.intentId);
  const next = params.toString();
  return next ? `?${next}` : '';
}

export function clearAnalysisScopeQuery(currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  for (const key of ['q', 'from', 'to', 'platform', 'status', 'optimizationUnitId', 'intentId']) params.delete(key);
  const next = params.toString();
  return next ? `?${next}` : '';
}

function readOptionalQueryValue(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)?.trim();
  return value || undefined;
}

function setOptionalQueryValue(params: URLSearchParams, key: string, value?: string): void {
  if (value?.trim()) params.set(key, value.trim());
  else params.delete(key);
}
