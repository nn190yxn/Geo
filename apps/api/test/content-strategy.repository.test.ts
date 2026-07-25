import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function prepareContentScenario(repository: PermissionsRepository) {
  repository.saveBrandProfile('user_demo', 'brand_demo', {
    intro: '示例品牌是多品牌 GEO 管理平台',
    valueProps: ['多品牌 GEO 管理', '监测与内容优化'],
    offerings: ['GEO 监测'],
    proofPoints: ['可追溯引用'],
    targetCustomers: ['品牌运营团队'],
    recommendedExpressions: ['适合品牌运营团队'],
    blockedExpressions: [],
    contentRules: [],
    competitors: ['竞品A'],
    faqs: [{ question: '适合谁', answer: '品牌运营团队' }]
  });
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `内容测试单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    targetKeywords: ['GEO 管理', '内容优化'],
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '选择 GEO 管理平台',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `内容测试模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请评价{brandName}在{intent}场景下的内容覆盖。',
    targetKeywords: ['GEO 管理', '内容优化'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });

  return { unitId: unit?.id ?? '', intentId: intent?.id ?? '', promptId: prompts?.[0].id ?? '' };
}

function createContentRun(repository: PermissionsRepository, promptId: string, rawText: string) {
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId,
    platformCode: 'manual_input'
  });
  const completedRun = repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
    rawText,
    citations: [],
    modelName: 'manual'
  });

  return repository.parseAnalysisResult('user_demo', 'brand_demo', completedRun?.id ?? '');
}

describe('content strategy repository', () => {
  it('detects content gaps and creates strategies with prompt and optimization unit linkage', () => {
    const repository = new PermissionsRepository();
    const { unitId, intentId, promptId } = prepareContentScenario(repository);

    repository.createContentAsset('user_demo', 'brand_demo', {
      title: '品牌官网介绍',
      type: 'official_page',
      platform: 'official_site',
      url: 'https://example.com/about',
      targetKeywords: ['GEO 管理'],
      status: 'published'
    });
    createContentRun(repository, promptId, '示例品牌适合品牌运营团队，但回答没有体现监测与内容优化，也缺少引用。');

    const dashboard = repository.getContentCenterDashboard('user_demo', 'brand_demo');
    const generated = repository.generateContentStrategies('user_demo', 'brand_demo') ?? [];
    const gapStrategy = generated.find((strategy) => strategy.type === 'gap');
    const correctionStrategy = generated.find((strategy) => strategy.type === 'correction');
    const citationStrategy = generated.find((strategy) => strategy.type === 'authority_citation');

    expect(dashboard?.coverage.uncoveredKeywords).toContain('监测与内容优化');
    expect(dashboard?.suggestions.some((suggestion) => suggestion.type === 'gap')).toBe(true);
    expect(gapStrategy).toMatchObject({
      optimizationUnitId: unitId,
      intentId,
      relatedPromptIds: [promptId]
    });
    expect(correctionStrategy?.priority).toBe('medium');
    expect(citationStrategy?.priority).toBe('high');
  });

  it('supports content asset filtering and reuse metadata', () => {
    const repository = new PermissionsRepository();
    prepareContentScenario(repository);
    const baseAsset = repository.createContentAsset('user_demo', 'brand_demo', {
      title: '基础案例内容',
      type: 'case_article',
      platform: 'official_site',
      url: 'https://example.com/case/base',
      targetKeywords: ['GEO 管理'],
      status: 'published'
    });
    const reusedAsset = repository.createContentAsset('user_demo', 'brand_demo', {
      title: '复用案例内容',
      type: 'case_article',
      platform: 'wechat',
      url: 'https://example.com/case/reuse',
      targetKeywords: ['内容优化'],
      reuseOfAssetId: baseAsset?.id,
      brandAdaptation: '改写为公众号发布版本',
      status: 'draft'
    });

    const published = repository.listContentAssets('user_demo', 'brand_demo', { status: 'published' });
    const keywordMatched = repository.listContentAssets('user_demo', 'brand_demo', { keyword: '内容优化' });
    const dashboard = repository.getContentCenterDashboard('user_demo', 'brand_demo');

    expect(published?.map((asset) => asset.id)).toContain(baseAsset?.id);
    expect(published?.map((asset) => asset.id)).not.toContain(reusedAsset?.id);
    expect(keywordMatched?.map((asset) => asset.id)).toContain(reusedAsset?.id);
    expect(dashboard?.coverage.reusableAssetCount).toBeGreaterThanOrEqual(1);
  });
});
