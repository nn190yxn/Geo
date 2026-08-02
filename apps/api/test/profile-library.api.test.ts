import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { BrandsController } from '../src/modules/brands/brands.controller';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

const completeProfile = {
  intro: '提供企业品牌内容运营服务。',
  valueProps: ['统一品牌表达'],
  offerings: ['内容运营'],
  proofPoints: ['标准运营流程'],
  targetCustomers: ['企业运营人员'],
  recommendedExpressions: ['品牌内容运营'],
  blockedExpressions: ['绝对有效'],
  contentRules: ['引用可核验资料'],
  competitors: ['同类服务商'],
  faqs: [{ question: '提供什么服务？', answer: '提供品牌内容运营服务。' }]
};

describe('profile-library API', () => {
  it('reads and updates an isolated brand library with missing-field summaries', async () => {
    const repository = new PermissionsRepository();
    const service = new PermissionsService(repository);
    const controller = new BrandsController(service, null as never, null as never, null as never, null as never);
    const request = { context: { userId: 'user_demo' } } as never;
    const firstBrand = repository.createBrand('user_demo', {
      name: '资料库 API 品牌 A',
      industry: '企业服务',
      businessScope: '',
      targetAudience: ''
    });
    const isolatedBrandBeforeUpdate = await controller.getBrandProfileLibrary(request, 'brand_demo');

    const initial = await controller.getBrandProfileLibrary(request, firstBrand.brandId);
    expect(initial).toMatchObject({
      success: true,
      data: {
        brandId: firstBrand.brandId,
        profile: { completenessScore: 0 },
        sections: expect.arrayContaining([
          expect.objectContaining({ key: 'basic-info', completeness: 0 })
        ])
      }
    });
    expect(initial.data.profile.missingFields).toEqual(expect.arrayContaining(['品牌介绍', '核心卖点', '禁用表达']));

    const updated = await controller.saveBrandProfileLibrary(request, firstBrand.brandId, { profile: completeProfile });
    expect(updated.data).toMatchObject({
      brandId: firstBrand.brandId,
      profile: { completenessScore: 100, missingFields: [] },
      sections: expect.arrayContaining([
        expect.objectContaining({ key: 'products', completeness: 100 }),
        expect.objectContaining({ key: 'brand-knowledge', completeness: 100 })
      ])
    });

    const isolatedBrandAfterUpdate = await controller.getBrandProfileLibrary(request, 'brand_demo');
    expect(isolatedBrandAfterUpdate.data.brandId).toBe('brand_demo');
    expect(isolatedBrandAfterUpdate.data.profile).toEqual(isolatedBrandBeforeUpdate.data.profile);

    const unauthorizedRequest = { context: { userId: 'user_suspended' } } as never;
    await expect(controller.getBrandProfileLibrary(unauthorizedRequest, firstBrand.brandId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.saveBrandProfileLibrary(unauthorizedRequest, firstBrand.brandId, { profile: completeProfile })).rejects.toBeInstanceOf(NotFoundException);
  });
});
