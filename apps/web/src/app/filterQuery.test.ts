import { describe, expect, it } from 'vitest';
import {
  clearUnifiedFilterQuery,
  getResultCountLabel,
  hasActiveUnifiedFilters,
  mergeUnifiedFilterQuery,
  normalizeDateRange,
  readUnifiedFilterQuery
} from './filterQuery';

describe('unified filter query helpers', () => {
  it('reads supported filters and normalizes invalid values', () => {
    expect(readUnifiedFilterQuery('?q=%20GEO%20&from=2026-07-15&to=2026-07-01&platform=deepseek&status=open', {
      statuses: ['open', 'closed'] as const
    })).toEqual({
      search: 'GEO',
      from: '2026-07-01',
      to: '2026-07-15',
      platform: 'deepseek',
      status: 'open'
    });

    expect(readUnifiedFilterQuery('?from=2026-02-30&platform=unknown&status=unknown', {
      statuses: ['open'] as const
    })).toEqual({ search: '', from: undefined, to: undefined, platform: 'all', status: 'all' });
  });

  it('merges filters while preserving workflow context', () => {
    expect(mergeUnifiedFilterQuery('?taskId=task_1&tab=records&q=old', {
      search: 'new query',
      from: '2026-07-01',
      to: '2026-07-15',
      platform: 'kimi',
      status: 'pending'
    })).toBe('?taskId=task_1&tab=records&q=new+query&from=2026-07-01&to=2026-07-15&platform=kimi&status=pending');
  });

  it('clears only filter parameters', () => {
    expect(clearUnifiedFilterQuery('?runId=run_1&q=GEO&platform=doubao&status=failed')).toBe('?runId=run_1');
  });

  it('reports active filters and stable result counts', () => {
    expect(hasActiveUnifiedFilters({ search: '', platform: 'all', status: 'all' })).toBe(false);
    expect(hasActiveUnifiedFilters({ search: '', platform: 'qianwen', status: 'all' })).toBe(true);
    expect(getResultCountLabel(8, 20)).toBe('显示 8 条，共 20 条');
    expect(getResultCountLabel(-2)).toBe('共 0 条结果');
    expect(getResultCountLabel(Number.NaN)).toBe('共 0 条结果');
  });

  it('keeps valid date boundaries and removes invalid dates', () => {
    expect(normalizeDateRange('2024-02-29', '2024-03-01')).toEqual({ from: '2024-02-29', to: '2024-03-01' });
    expect(normalizeDateRange('2025-02-29', 'invalid')).toEqual({ from: undefined, to: undefined });
  });
});
