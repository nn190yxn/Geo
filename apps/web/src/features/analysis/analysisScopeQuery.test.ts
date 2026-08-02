import { describe, expect, it } from 'vitest';
import { clearAnalysisScopeQuery, mergeAnalysisScopeQuery, readAnalysisScopeQuery } from './analysisScopeQuery';

describe('analysis scope query', () => {
  it('reads the unified analysis dimensions', () => {
    expect(readAnalysisScopeQuery('?q=FAQ&from=2026-07-01&to=2026-07-16&platform=kimi&status=open&optimizationUnitId=unit-1&intentId=intent-1', { statuses: ['open'] as const })).toEqual({
      search: 'FAQ',
      from: '2026-07-01',
      to: '2026-07-16',
      platform: 'kimi',
      status: 'open',
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1'
    });
  });

  it('updates filters while preserving workflow context and hash-independent query values', () => {
    const search = mergeAnalysisScopeQuery('?runId=run-1&promptId=prompt-1', {
      search: '品牌',
      platform: 'deepseek',
      status: 'all',
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1'
    });
    const params = new URLSearchParams(search);

    expect(params.get('runId')).toBe('run-1');
    expect(params.get('promptId')).toBe('prompt-1');
    expect(params.get('q')).toBe('品牌');
    expect(params.get('platform')).toBe('deepseek');
    expect(params.get('optimizationUnitId')).toBe('unit-1');
    expect(params.get('intentId')).toBe('intent-1');
  });

  it('clears only analysis scope values', () => {
    expect(clearAnalysisScopeQuery('?runId=run-1&q=FAQ&platform=kimi&optimizationUnitId=unit-1&intentId=intent-1')).toBe('?runId=run-1');
  });
});
