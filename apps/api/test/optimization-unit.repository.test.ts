import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('optimization unit repository', () => {
  it('creates optimization units under the selected brand', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: ' 儿童体适能品牌推荐 ',
      type: 'brand',
      targetKeywords: [' 儿童体适能 ', '少儿运动'],
      priority: 'high',
      enabled: true
    });

    expect(unit?.brandId).toBe('brand_demo');
    expect(unit?.name).toBe('儿童体适能品牌推荐');
    expect(unit?.targetKeywords).toEqual(['儿童体适能', '少儿运动']);
    expect(unit?.relatedCounts).toEqual({
      userIntents: 0,
      prompts: 0,
      contentStrategies: 0,
      monitoringRuns: 0,
      tasks: 0
    });
    expect(repository.listOptimizationUnits('user_demo', 'brand_demo')).toContainEqual(unit);
  });

  it('updates priority, keywords, and enabled status without changing the brand relation', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: '深圳儿童体适能机构',
      type: 'location',
      targetKeywords: ['深圳少儿体适能'],
      priority: 'medium'
    });

    const updated = repository.updateOptimizationUnit('user_demo', 'brand_demo', unit?.id ?? '', {
      priority: 'low',
      targetKeywords: ['深圳儿童运动', '儿童体能训练'],
      enabled: false
    });

    expect(updated?.brandId).toBe('brand_demo');
    expect(updated?.priority).toBe('low');
    expect(updated?.targetKeywords).toEqual(['深圳儿童运动', '儿童体能训练']);
    expect(updated?.enabled).toBe(false);
  });

  it('keeps optimization units isolated by brand access', () => {
    const repository = new PermissionsRepository();

    expect(repository.createOptimizationUnit('other_user', 'brand_demo', {
      name: '未授权优化单元',
      type: 'competitor',
      priority: 'medium'
    })).toBeNull();

    expect(repository.listOptimizationUnits('other_user', 'brand_demo')).toBeNull();
  });
});
