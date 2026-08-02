import { describe, expect, it } from 'vitest';
import { workspaceRouteAliases } from '../layouts/navigation';
import { getWorkspaceRouteTarget } from './WorkspaceRouteRedirect';

describe('getWorkspaceRouteTarget', () => {
  it('maps brand workspace aliases to first version pages', () => {
    expect(getWorkspaceRouteTarget('content/generation')).toBe('/content-generation');
    expect(getWorkspaceRouteTarget('growth-optimization')).toBe('/growth-optimization');
  });

  it('preserves workflow query and section hash', () => {
    expect(getWorkspaceRouteTarget(
      'monitoring',
      '?promptId=prompt-1&mode=manual',
      '#manual-test-entry'
    )).toBe('/monitoring?promptId=prompt-1&mode=manual#manual-test-entry');
  });

  it('preserves query and hash across every brand workspace alias', () => {
    Object.entries(workspaceRouteAliases).forEach(([alias, target]) => {
      expect(getWorkspaceRouteTarget(alias, '?optimizationUnitId=unit-1&promptId=prompt-2', '#workflow-section'))
        .toBe(`${target}?optimizationUnitId=unit-1&promptId=prompt-2#workflow-section`);
    });
  });

  it('falls back to the beginner home while preserving safe location context', () => {
    expect(getWorkspaceRouteTarget('unknown', '?source=workspace', '#next-action'))
      .toBe('/brands?source=workspace#next-action');
  });
});
