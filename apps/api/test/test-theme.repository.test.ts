import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('test theme repository', () => {
  it('creates and lists test themes under the selected brand', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'location',
      name: '贵阳本地推荐',
      businessExplanation: '验证本地推荐可见度',
      priority: 'high',
      estimatedValue: '判断城市推荐场景表现',
      sourceProfileFields: ['targetCities', 'offerings']
    });

    expect(theme).toMatchObject({ brandId: 'brand_demo', enabled: true, priority: 'high' });
    expect(repository.listTestThemes('user_demo', 'brand_demo')).toContainEqual(theme);
  });

  it('updates test theme priority and enabled state', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'brand',
      name: '追光小牛品牌认知',
      businessExplanation: '验证品牌基础认知',
      priority: 'high',
      estimatedValue: '确认品牌介绍准确性'
    });

    const updated = repository.updateTestTheme('user_demo', 'brand_demo', theme?.id ?? '', { priority: 'low', enabled: false });

    expect(updated).toMatchObject({ priority: 'low', enabled: false });
  });

  it('keeps test themes isolated by brand access', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'competitor',
      name: '竞品对比',
      businessExplanation: '验证竞品对比场景',
      priority: 'medium',
      estimatedValue: '识别竞品压制'
    });

    expect(repository.listTestThemes('other_user', 'brand_demo')).toBeNull();
    expect(repository.updateTestTheme('other_user', 'brand_demo', theme?.id ?? '', { enabled: false })).toBeNull();
  });
});
