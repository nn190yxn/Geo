import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('brand workspace repository', () => {
  it('creates a brand and grants owner access to the creator', () => {
    const repository = new PermissionsRepository();
    const brand = repository.createBrand('user_demo', {
      name: '新品牌',
      aliases: ['新品牌别名'],
      industry: '教育服务',
      targetCities: ['深圳'],
      businessScope: '青少年成长服务',
      targetAudience: '家庭用户'
    });

    const accessibleBrand = repository.findAccessibleBrand('user_demo', brand.brandId);

    expect(brand.status).toBe('active');
    expect(accessibleBrand?.role).toBe('owner');
  });

  it('updates brand status and filters archived brands from detail lists', () => {
    const repository = new PermissionsRepository();
    const brand = repository.createBrand('user_demo', {
      name: '归档测试品牌',
      industry: '测试行业',
      businessScope: '测试业务',
      targetAudience: '测试用户'
    });

    repository.updateBrandStatus('user_demo', brand.brandId, 'archived');

    expect(repository.findAccessibleBrandDetail('user_demo', brand.brandId)).toBeNull();
  });
});
