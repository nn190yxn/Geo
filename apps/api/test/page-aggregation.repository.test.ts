import { describe, expect, it } from 'vitest';

import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createWorkspaceBrand(repository: PermissionsRepository, suffix: string) {
  return repository.createBrand('user_demo', {
    name: `聚合测试品牌 ${suffix}`,
    industry: '企业服务',
    businessScope: '品牌内容运营',
    targetAudience: '企业运营人员'
  });
}

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

describe('page aggregation memory repository', () => {
  it('聚合品牌资料库并通过资料库入口保存品牌档案', () => {
    const repository = new PermissionsRepository();
    const demoLibrary = repository.getBrandProfileLibrary('user_demo', 'brand_demo');

    expect(demoLibrary).toMatchObject({ brandId: 'brand_demo' });
    expect(demoLibrary?.sections.map((section) => section.key)).toEqual([
      'basic-info',
      'products',
      'audiences',
      'brand-knowledge',
      'media-assets',
      'owned-media',
      'competitors'
    ]);
    expect(demoLibrary?.knowledgeSources).not.toHaveLength(0);
    expect(demoLibrary?.mediaAssets).not.toHaveLength(0);
    expect(demoLibrary?.contentAssets).not.toHaveLength(0);
    expect(demoLibrary?.publishingAccounts).not.toHaveLength(0);
    expect(demoLibrary?.competitors).not.toHaveLength(0);

    const brand = createWorkspaceBrand(repository, '资料库');
    const savedLibrary = repository.saveBrandProfileLibrary('user_demo', brand.brandId, { profile: completeProfile });

    expect(savedLibrary?.profile).toMatchObject({ brandId: brand.brandId, completenessScore: 100 });
    expect(savedLibrary?.sections.find((section) => section.key === 'products')?.completeness).toBe(100);
    expect(repository.getBrandProfileLibrary('user_suspended', brand.brandId)).toBeNull();
  });

  it('创建和更新品牌素材时保留品牌归属', () => {
    const repository = new PermissionsRepository();
    const brand = createWorkspaceBrand(repository, '素材');
    const created = repository.createBrandMediaAsset('user_demo', brand.brandId, {
      title: '品牌介绍图',
      assetType: 'image',
      applicablePlatforms: [' website ', 'website'],
      contentUsage: '官网品牌介绍',
      source: '品牌团队'
    });

    expect(created).toMatchObject({
      brandId: brand.brandId,
      title: '品牌介绍图',
      applicablePlatforms: ['website'],
      reviewStatus: 'pending'
    });

    const updated = repository.updateBrandMediaAsset('user_demo', brand.brandId, created?.id ?? '', {
      title: '品牌介绍主视觉',
      reviewStatus: 'approved'
    });

    expect(updated).toMatchObject({ id: created?.id, brandId: brand.brandId, title: '品牌介绍主视觉' });
    expect(repository.updateBrandMediaAsset('user_demo', 'brand_child_fitness', created?.id ?? '', { title: '越权修改' })).toBeNull();
  });

  it('从内容、发布、引用和复测数据生成内容资产页面项', () => {
    const repository = new PermissionsRepository();
    const items = repository.listContentAssetPageItems('user_demo', 'brand_demo');
    const demoItem = items?.find((item) => item.id === 'asset_demo_homepage');

    expect(demoItem).toMatchObject({
      brandId: 'brand_demo',
      optimizationUnitId: 'unit_demo_core',
      publishStatus: 'draft',
      retestPlanId: 'retest_demo_growth_plan',
      publishingStats: {
        brandId: 'brand_demo',
        totalRecords: 1,
        publishedRecords: 0,
        failedRecords: 0,
        citationCount: 2,
        relatedIntentCount: 1
      }
    });
    expect(demoItem?.sourceReferences).toEqual([
      expect.objectContaining({ type: 'citation', title: '追光小牛品牌核心档案' })
    ]);

    const brand = createWorkspaceBrand(repository, '内容资产');
    const draft = repository.createContentAsset('user_demo', brand.brandId, {
      title: '待发布 FAQ',
      type: 'website_faq',
      platform: 'website',
      url: 'https://example.com/draft-faq',
      status: 'draft'
    });
    const draftItem = repository.listContentAssetPageItems('user_demo', brand.brandId)?.find((item) => item.id === draft?.id);

    expect(draftItem).toMatchObject({
      publishStatus: 'not_started',
      reviewStatus: 'pending',
      publishingStats: { totalRecords: 0, citationCount: 0, relatedIntentCount: 0 }
    });
  });

  it('分别聚合账号级和平台级发布统计并维护平台规则', () => {
    const repository = new PermissionsRepository();
    const brand = createWorkspaceBrand(repository, '发布');
    const account = repository.connectPublishingAccount('user_demo', brand.brandId, {
      platform: 'wechat_official',
      accountName: '测试公众号'
    });
    const asset = repository.createContentAsset('user_demo', brand.brandId, {
      title: '发布统计内容',
      type: 'article',
      platform: 'wechat_official',
      url: 'https://example.com/publishing-stats'
    });

    for (const status of ['draft', 'pending', 'published', 'failed'] as const) {
      repository.createPublishingRecord('user_demo', brand.brandId, {
        accountId: account?.id,
        contentAssetId: asset?.id,
        title: `${status} 内容`,
        body: '发布统计测试正文',
        targetPlatform: 'wechat_official',
        status
      });
    }

    expect(repository.listOwnedMediaAccounts('user_demo', brand.brandId)?.[0]?.stats).toMatchObject({
      totalRecords: 4,
      draftRecords: 1,
      pendingRecords: 1,
      publishedRecords: 1,
      failedRecords: 1
    });
    expect(repository.getPublishingChannelStats('user_demo', brand.brandId)).toEqual([
      expect.objectContaining({ platform: 'wechat_official', totalRecords: 4 })
    ]);

    const rule = repository.createMediaPlatformRule('user_demo', brand.brandId, {
      platform: 'wechat_official',
      name: '公众号',
      contentFormats: [' 长图文 ', '长图文'],
      intentFit: '品牌知识沉淀',
      recommendedFrequency: '每周 1 篇',
      coverRatio: '2.35:1',
      publishingNote: '保留资料来源'
    });
    expect(rule?.contentFormats).toEqual(['长图文']);
    expect(repository.createMediaPlatformRule('user_demo', brand.brandId, rule!)).toBeNull();
    expect(repository.updateMediaPlatformRule('user_demo', brand.brandId, 'wechat_official', {
      platform: 'ignored-platform',
      recommendedFrequency: '每周 2 篇'
    })).toMatchObject({ platform: 'wechat_official', recommendedFrequency: '每周 2 篇' });
  });

  it('维护分析 finding 并生成去重后的分析工作台', () => {
    const repository = new PermissionsRepository();
    const brand = createWorkspaceBrand(repository, '分析');
    const action = { actionType: 'update_knowledge' as const, label: '补充品牌资料', targetId: brand.brandId };
    const first = repository.createAnalysisFinding('user_demo', brand.brandId, {
      type: 'fact',
      title: '品牌事实待补充',
      evidence: ['缺少品牌事实'],
      severity: 'medium',
      recommendedActions: [action]
    });
    repository.createAnalysisFinding('user_demo', brand.brandId, {
      type: 'citation',
      title: '信源待补充',
      evidence: ['缺少权威信源'],
      severity: 'high',
      recommendedActions: [action]
    });

    expect(repository.updateAnalysisFinding('user_demo', brand.brandId, first?.id ?? '', {
      severity: 'high',
      evidence: [' 已补充核验要求 ', '']
    })).toMatchObject({ brandId: brand.brandId, severity: 'high', evidence: ['已补充核验要求'] });

    const dashboard = repository.getAnalysisWorkbenchDashboard('user_demo', brand.brandId);
    expect(dashboard?.findings).toHaveLength(2);
    expect(dashboard?.recommendedActions).toEqual([action]);
    expect(repository.updateAnalysisFinding('user_demo', 'brand_demo', first?.id ?? '', { title: '越权修改' })).toBeNull();
    expect(repository.listAnalysisFindings('user_suspended', brand.brandId)).toBeNull();
  });
});
