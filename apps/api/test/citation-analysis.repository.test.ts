import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createIsolatedBrand(repository: PermissionsRepository) {
  const brand = repository.createBrand('user_demo', {
    name: '示例品牌',
    industry: 'GEO',
    website: 'https://example.com',
    businessScope: 'GEO 测试',
    targetAudience: '品牌运营团队'
  });
  repository.createPlatformConfig('user_demo', brand.brandId, {
    platformCode: 'manual_input',
    name: '人工录入',
    mode: 'manual'
  });

  return brand.brandId;
}

function prepareCitationScenario(repository: PermissionsRepository, brandId: string) {
  repository.saveBrandProfile('user_demo', brandId, {
    intro: '示例品牌是多品牌 GEO 管理平台',
    valueProps: ['多品牌 GEO 管理', '监测与内容优化'],
    offerings: ['GEO 监测'],
    proofPoints: ['可追溯引用'],
    targetCustomers: ['品牌运营团队'],
    recommendedExpressions: ['适合品牌运营团队'],
    blockedExpressions: [],
    contentRules: [],
    competitors: [],
    faqs: [{ question: '适合谁', answer: '品牌运营团队' }]
  });
  const unit = repository.createOptimizationUnit('user_demo', brandId, {
    name: `引用测试单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', brandId, {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '选择 GEO 管理平台',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `引用测试模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请评价{brandName}在{intent}场景下的引用来源。',
    targetKeywords: ['GEO 引用'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', brandId, {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });

  return { promptId: prompts?.[0].id ?? '' };
}

function createCitationRun(repository: PermissionsRepository, brandId: string, promptId: string, citations: string[]) {
  const run = repository.createMonitoringRun('user_demo', brandId, {
    promptId,
    platformCode: 'manual_input'
  });
  const completedRun = repository.addManualResponse('user_demo', brandId, run?.id ?? '', {
    rawText: '示例品牌适合品牌运营团队，并具备可追溯引用。',
    citations,
    modelName: 'manual'
  });

  return repository.parseAnalysisResult('user_demo', brandId, completedRun?.id ?? '');
}

describe('citation analysis repository', () => {
  it('classifies citation source type and authority level', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { promptId } = prepareCitationScenario(repository, brandId);
    createCitationRun(repository, brandId, promptId, [
      'https://example.com/about',
      'https://news.qq.com/a/geo-report',
      'https://weixin.qq.com/s/demo',
      'https://baike.baidu.com/item/demo',
      'https://partner.example.net/case'
    ]);

    const dashboard = repository.getCitationDashboard('user_demo', brandId);
    const breakdown = Object.fromEntries((dashboard?.sourceTypeBreakdown ?? []).map((item) => [item.sourceType, item.citationCount]));

    expect(dashboard?.totalCitations).toBe(5);
    expect(breakdown.official_site).toBe(1);
    expect(breakdown.media).toBe(1);
    expect(breakdown.social).toBe(1);
    expect(breakdown.encyclopedia).toBe(1);
    expect(breakdown.third_party).toBe(1);
    expect(dashboard?.sources.find((source) => source.sourceType === 'official_site')?.authorityLevel).toBe('high');
    expect(dashboard?.sources.find((source) => source.sourceType === 'third_party')?.authorityLevel).toBe('low');
  });

  it('binds a citation to a content asset and creates an authority citation strategy', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { promptId } = prepareCitationScenario(repository, brandId);
    createCitationRun(repository, brandId, promptId, ['https://partner.example.net/case']);
    const source = repository.getCitationDashboard('user_demo', brandId)?.sources.find((item) => item.url.includes('partner.example.net'));

    const asset = repository.bindCitationContentAsset('user_demo', brandId, source?.id ?? '', {
      title: '第三方案例文章',
      type: 'case_article',
      platform: 'third_party',
      targetKeywords: ['GEO 引用']
    });
    const strategy = repository.createCitationEnhancementStrategy('user_demo', brandId, source?.id ?? '');
    const dashboard = repository.getCitationDashboard('user_demo', brandId);

    expect(asset?.title).toBe('第三方案例文章');
    expect(dashboard?.sources.find((item) => item.id === source?.id)?.contentAssetId).toBe(asset?.id);
    expect(dashboard?.contentCitationRate).toBeGreaterThan(0);
    expect(strategy).toMatchObject({
      type: 'authority_citation',
      priority: 'high',
      relatedPromptIds: [promptId]
    });
    expect(repository.getGeoCanvasWorkspace('user_demo', brandId)?.contentStrategies.some((item) => item.id === strategy?.id)).toBe(true);
  });
});
