import { describe, expect, it } from 'vitest';
import { flattenNavigationItems, getContextualWorkflowSteps, getLatestNavigationOpenKeys, getNavigationGroup, getNavigationItem, getWorkflowIndex, navigationGroups, operationWorkflow, workspaceRouteAliases } from './navigation';

describe('operation navigation config', () => {
  it('covers the first version operation modules in grouped navigation', () => {
    const keys = flattenNavigationItems().map((item) => item.key);

    expect(keys).toEqual(expect.arrayContaining([
      '/brands',
      '/brand-profile',
      '/canvas',
      '/monitoring',
      '/growth-optimization',
      '/user-intents',
      '/optimization-units',
      '/competitor-profile',
      '/competitors',
      '/citations',
      '/evaluations',
      '/facts',
      '/content',
      '/content-assets',
      '/content-generation',
      '/content-optimization',
      '/publishing',
      '/owned-media',
      '/media-platforms',
      '/model-settings',
      '/tasks',
      '/feedback',
      '/reports',
      '/advisor'
    ]));
    expect(navigationGroups.map((group) => group.label)).toEqual(['工作台', '品牌信息', '内容中心', '发布中心', '数据分析']);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(24);
  });

  it('keeps secondary entries for management, support, and advanced pages', () => {
    expect(getNavigationItem('/brands')?.label).toBe('数据总览');
    expect(getNavigationItem('/brand-profile')?.label).toBe('品牌信息');
    expect(getNavigationItem('/competitor-profile')?.label).toBe('竞品信息');
    expect(getNavigationItem('/model-settings')?.label).toBe('AI 平台管理');
    expect(getNavigationItem('/canvas')?.label).toBe('营销画布');
    expect(getNavigationItem('/growth-optimization')?.label).toBe('优化建议');
    expect(getNavigationItem('/content-assets')?.label).toBe('内容资产');
    expect(getNavigationItem('/owned-media')?.label).toBe('自有媒体');
    expect(getNavigationItem('/publishing')?.label).toBe('发布记录');
    expect(getNavigationItem('/tasks')?.label).toBe('再次监测');
    expect(getNavigationItem('/reports')?.label).toBe('报告中心');
    expect(getNavigationItem('/feedback')?.label).toBe('内测反馈');
    expect(getNavigationItem('/advisor')?.label).toBe('顾问服务');
  });

  it('matches each route to one current task domain', () => {
    expect(getNavigationGroup('/brands')?.label).toBe('工作台');
    expect(getNavigationGroup('/monitoring')?.label).toBe('品牌信息');
    expect(getNavigationGroup('/growth-optimization')?.label).toBe('内容中心');
    expect(getNavigationGroup('/publishing')?.label).toBe('发布中心');
    expect(getNavigationGroup('/reports')?.label).toBe('数据分析');
    expect(getNavigationGroup('/unknown')).toBeUndefined();
  });

  it('keeps at most one desktop navigation domain expanded', () => {
    expect(getLatestNavigationOpenKeys(['工作台'], ['工作台', '品牌信息'])).toEqual(['品牌信息']);
    expect(getLatestNavigationOpenKeys(['品牌信息'], [])).toEqual([]);
    expect(getLatestNavigationOpenKeys([], ['内容中心'])).toEqual(['内容中心']);
  });

  it('keeps workflow order from brand profile to retest', () => {
    expect(operationWorkflow.map((step) => step.key)).toEqual([
      '/brand-profile',
      '/optimization-units',
      '/user-intents',
      '/monitoring',
      '/growth-optimization',
      '/content-generation',
      '/publishing',
      '/tasks'
    ]);
    expect(operationWorkflow.map((step) => step.label)).toEqual(expect.arrayContaining(['创建优化单元', 'AI 回复监测', '内容生成与优化', '再次监测']));
    expect(getWorkflowIndex('/monitoring')).toBe(3);
    expect(getWorkflowIndex('/growth-optimization')).toBe(4);
    expect(getNavigationItem('/monitoring')?.label).toBe('AI 回复监测');
    expect(getNavigationItem('/monitoring')?.description).toContain('真实 AI 回复');
    expect(getNavigationItem('/facts')?.label).toBe('事实分析');
    expect(getNavigationItem('/model-settings')?.label).toBe('AI 平台管理');
  });

  it('shows only the current and adjacent workflow stages on the main path', () => {
    expect(getContextualWorkflowSteps('/monitoring').map((step) => [step.position, step.key])).toEqual([
      ['previous', '/user-intents'],
      ['current', '/monitoring'],
      ['next', '/growth-optimization']
    ]);
    expect(getContextualWorkflowSteps('/brand-profile').map((step) => step.position)).toEqual(['current', 'next']);
    expect(getContextualWorkflowSteps('/tasks').map((step) => step.position)).toEqual(['previous', 'current']);
  });

  it('hides workflow stages outside the main path', () => {
    expect(getContextualWorkflowSteps('/competitors')).toEqual([]);
    expect(getContextualWorkflowSteps('/competitor-profile')).toEqual([]);
    expect(getContextualWorkflowSteps('/advisor')).toEqual([]);
  });

  it('preserves workflow object context in adjacent stage links', () => {
    const steps = getContextualWorkflowSteps('/content-generation', {
      optimizationUnitId: 'unit 1',
      intentId: 'intent/2',
      promptId: 'prompt-3',
      runId: 'run-4',
      planId: 'plan-5',
      taskId: 'task-6',
      generationTaskId: 'generation-7',
      versionId: 'version-8',
      publishingRecordId: 'publishing-9',
      platformCode: 'deepseek'
    });

    expect(steps.find((step) => step.position === 'previous')?.href).toContain('/growth-optimization?');
    expect(steps.find((step) => step.position === 'next')?.href).toContain('/publishing?');
    steps.forEach((step) => {
      expect(step.href).toContain('optimizationUnitId=unit+1');
      expect(step.href).toContain('intentId=intent%2F2');
      expect(step.href).toContain('publishingRecordId=publishing-9');
    });
  });

  it('maps brand workspace routes to current first version pages', () => {
    expect(workspaceRouteAliases.dashboard).toBe('/brands');
    expect(workspaceRouteAliases.knowledge).toBe('/brand-profile');
    expect(workspaceRouteAliases.intents).toBe('/user-intents');
    expect(workspaceRouteAliases.monitoring).toBe('/monitoring');
    expect(workspaceRouteAliases['growth-optimization']).toBe('/growth-optimization');
    expect(workspaceRouteAliases['content/generation']).toBe('/content-generation');
    expect(workspaceRouteAliases['content/optimization']).toBe('/content-optimization');
    expect(workspaceRouteAliases['content/assets']).toBe('/content-assets');
    expect(workspaceRouteAliases.publishing).toBe('/publishing');
    expect(workspaceRouteAliases['owned-media']).toBe('/owned-media');
    expect(workspaceRouteAliases.facts).toBe('/facts');
    expect(workspaceRouteAliases['model-settings']).toBe('/model-settings');
    expect(workspaceRouteAliases.feedback).toBe('/feedback');
    expect(workspaceRouteAliases.reports).toBe('/reports');
  });
});
