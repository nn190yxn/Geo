import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('geo canvas repository', () => {
  it('renders the unit to intent, metric and content strategy chain', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: `画布单元 ${Date.now()}_${Math.random()}`,
      type: 'scenario',
      priority: 'high',
      targetKeywords: ['场景词']
    });
    const intent = repository.createUserIntent('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      category: 'pain_solution',
      text: '解决本地用户决策问题',
      monitoringFrequency: 'weekly'
    });
    const strategy = repository.createContentStrategy('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      intentId: intent?.id ?? '',
      type: 'gap',
      priority: 'high',
      suggestedTitle: '补齐本地决策内容',
      targetPlatform: 'wechat',
      targetKeywords: ['本地决策']
    });

    const canvas = repository.getGeoCanvasWorkspace('user_demo', 'brand_demo');

    expect(canvas?.nodes.some((node) => node.id === `unit:${unit?.id}`)).toBe(true);
    expect(canvas?.nodes.some((node) => node.id === `intent:${intent?.id}`)).toBe(true);
    expect(canvas?.nodes.some((node) => node.id === `metric:${unit?.id}`)).toBe(true);
    expect(canvas?.nodes.some((node) => node.id === `strategy:${strategy?.id}`)).toBe(true);
    expect(canvas?.edges.some((edge) => edge.source === `unit:${unit?.id}` && edge.target === `intent:${intent?.id}`)).toBe(true);
    expect(canvas?.edges.some((edge) => edge.source === `unit:${unit?.id}` && edge.target === `metric:${unit?.id}`)).toBe(true);
    expect(canvas?.edges.some((edge) => edge.source === `intent:${intent?.id}` && edge.target === `strategy:${strategy?.id}`)).toBe(true);
  });

  it('creates optimization tasks from canvas strategies', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: `任务单元 ${Date.now()}_${Math.random()}`,
      type: 'brand',
      priority: 'medium'
    });
    const intent = repository.createUserIntent('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      category: 'brand_awareness',
      text: '提升品牌认知',
      monitoringFrequency: 'manual'
    });
    const strategy = repository.createContentStrategy('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      intentId: intent?.id ?? '',
      type: 'enhancement',
      priority: 'medium',
      suggestedTitle: '增强品牌介绍内容',
      targetPlatform: 'official_site'
    });

    const task = repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: '执行品牌介绍优化',
      type: 'content_strategy',
      optimizationUnitId: unit?.id,
      strategyId: strategy?.id
    });
    const canvas = repository.getGeoCanvasWorkspace('user_demo', 'brand_demo');

    expect(task?.status).toBe('todo');
    expect(canvas?.tasks.some((item) => item.id === task?.id)).toBe(true);
    expect(canvas?.contentStrategies.find((item) => item.id === strategy?.id)?.status).toBe('task_created');
  });
});
