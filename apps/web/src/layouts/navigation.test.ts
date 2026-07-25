import { describe, expect, it } from 'vitest';
import { flattenNavigationItems, getNavigationItem, getWorkflowIndex, navigationGroups, operationWorkflow, workspaceRouteAliases } from './navigation';

describe('operation navigation config', () => {
  it('covers the first version operation modules in grouped navigation', () => {
    const keys = flattenNavigationItems().map((item) => item.key);

    expect(keys).toEqual(expect.arrayContaining([
      '/brands',
      '/canvas',
      '/monitoring',
      '/growth-optimization',
      '/competitors',
      '/citations',
      '/evaluations',
      '/content',
      '/content-generation',
      '/publishing',
      '/model-settings',
      '/tasks',
      '/feedback',
      '/reports',
      '/advisor'
    ]));
    expect(navigationGroups.map((group) => group.label)).toEqual(['总览', '发现机会', '数据分析', '内容运营', '系统设置', '运营闭环']);
  });

  it('keeps workflow order from brand setup to report export', () => {
    expect(operationWorkflow.map((step) => step.key)).toEqual([
      '/brands',
      '/canvas',
      '/monitoring',
      '/growth-optimization',
      '/content',
      '/content-generation',
      '/publishing',
      '/model-settings',
      '/tasks',
      '/feedback',
      '/advisor',
      '/reports'
    ]);
    expect(operationWorkflow.map((step) => step.label)).toEqual(expect.arrayContaining(['监测 AI 回复', '顾问跟进']));
    expect(getWorkflowIndex('/monitoring')).toBe(2);
    expect(getWorkflowIndex('/growth-optimization')).toBe(3);
    expect(getNavigationItem('/monitoring')?.label).toBe('AI 回复监测');
    expect(getNavigationItem('/monitoring')?.description).toContain('记录 AI 如何回答');
    expect(getNavigationItem('/advisor')?.requiresBrand).toBe(true);
  });

  it('maps brand workspace routes to current first version pages', () => {
    expect(workspaceRouteAliases.dashboard).toBe('/brands');
    expect(workspaceRouteAliases.knowledge).toBe('/brands');
    expect(workspaceRouteAliases.intents).toBe('/brands');
    expect(workspaceRouteAliases.monitoring).toBe('/monitoring');
    expect(workspaceRouteAliases['growth-optimization']).toBe('/growth-optimization');
    expect(workspaceRouteAliases['content/generation']).toBe('/content-generation');
    expect(workspaceRouteAliases['model-settings']).toBe('/model-settings');
    expect(workspaceRouteAliases.feedback).toBe('/feedback');
    expect(workspaceRouteAliases.reports).toBe('/reports');
  });
});
