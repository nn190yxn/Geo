import { describe, expect, it } from 'vitest';
import { flattenNavigationItems, operationWorkflow, workspaceRouteAliases } from '../layouts/navigation';
import { firstVersionRoutes } from './routes';
import { firstVersionRoutePaths } from './routePaths';

const featurePageSources = import.meta.glob([
  '../features/**/*.tsx',
  '!../features/**/*.test.tsx'
], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

describe('first version route registration', () => {
  it('keeps every first version page reachable from grouped navigation', () => {
    const navigationTargets = flattenNavigationItems().map((item) => item.key);

    expect([...navigationTargets].sort()).toEqual([...firstVersionRoutePaths].sort());
  });

  it('registers every operation workflow target', () => {
    const workflowTargets = operationWorkflow.map((step) => step.key);

    expect(firstVersionRoutePaths).toEqual(expect.arrayContaining(workflowTargets));
  });

  it('keeps brand workspace aliases inside registered first version pages', () => {
    const aliasTargets = Object.values(workspaceRouteAliases);

    expect(firstVersionRoutePaths).toEqual(expect.arrayContaining(aliasTargets));
  });

  it('registers every first version page as a lazy route component', () => {
    expect(firstVersionRoutes).toHaveLength(firstVersionRoutePaths.length);
    expect(firstVersionRoutes.map((route) => route.path)).toEqual(firstVersionRoutePaths);
    expect(firstVersionRoutes.every((route) => route.Component.$$typeof === Symbol.for('react.lazy'))).toBe(true);
  });

  it('uses client-side navigation for feature page actions', () => {
    Object.entries(featurePageSources).forEach(([path, source]) => {
      expect(source, path).not.toMatch(/<Button\b[^>]*\bhref=/);
      expect(source, path).not.toMatch(/<a\b[^>]*\bhref=/);
      expect(source, path).not.toContain('window.location.assign(');
    });
  });
});
