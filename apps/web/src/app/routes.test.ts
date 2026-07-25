import { describe, expect, it } from 'vitest';
import { flattenNavigationItems, operationWorkflow, workspaceRouteAliases } from '../layouts/navigation';
import { firstVersionRoutes } from './routes';
import { firstVersionRoutePaths } from './routePaths';

describe('first version route registration', () => {
  it('registers every grouped navigation target', () => {
    const navigationTargets = flattenNavigationItems().map((item) => item.key);

    expect(firstVersionRoutePaths).toEqual(expect.arrayContaining(navigationTargets));
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
});
