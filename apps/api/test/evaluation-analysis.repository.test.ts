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

function prepareEvaluationScenario(repository: PermissionsRepository, brandId: string) {
  repository.saveBrandProfile('user_demo', brandId, {
    intro: '示例品牌是多品牌 GEO 管理平台',
    valueProps: ['多品牌 GEO 管理', '监测与内容优化'],
    offerings: ['GEO 监测'],
    proofPoints: ['可追溯引用'],
    targetCustomers: ['品牌运营团队'],
    recommendedExpressions: ['适合品牌运营团队'],
    blockedExpressions: ['价格虚高'],
    contentRules: [],
    competitors: [],
    faqs: [{ question: '适合谁', answer: '品牌运营团队' }]
  });
  const unit = repository.createOptimizationUnit('user_demo', brandId, {
    name: `评价测试单元 ${Date.now()}_${Math.random()}`,
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
    name: `评价测试模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请评价{brandName}在{intent}场景下的表达质量。',
    targetKeywords: ['GEO 评价'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', brandId, {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });

  return { promptId: prompts?.[0].id ?? '' };
}

function createEvaluationRun(repository: PermissionsRepository, brandId: string, promptId: string, rawText: string) {
  const run = repository.createMonitoringRun('user_demo', brandId, {
    promptId,
    platformCode: 'manual_input'
  });
  const completedRun = repository.addManualResponse('user_demo', brandId, run?.id ?? '', {
    rawText,
    citations: ['https://example.com/about'],
    modelName: 'manual'
  });

  return repository.parseAnalysisResult('user_demo', brandId, completedRun?.id ?? '');
}

describe('evaluation analysis repository', () => {
  it('calculates sentiment and accuracy rates from analysis results', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { promptId } = prepareEvaluationScenario(repository, brandId);

    createEvaluationRun(repository, brandId, promptId, '示例品牌适合品牌运营团队，具备多品牌 GEO 管理、监测与内容优化、GEO 监测和可追溯引用优势。');
    createEvaluationRun(repository, brandId, promptId, '示例品牌提供 GEO 管理相关服务。');
    createEvaluationRun(repository, brandId, promptId, '示例品牌不推荐，存在不足。');

    const dashboard = repository.getEvaluationDashboard('user_demo', brandId);

    expect(dashboard?.sampleCount).toBe(3);
    expect(dashboard?.positiveRate).toBe(33);
    expect(dashboard?.neutralRate).toBe(33);
    expect(dashboard?.negativeRate).toBe(33);
    expect(dashboard?.accurateRate).toBe(33);
    expect(dashboard?.trend[0]).toMatchObject({ sampleCount: 3 });
  });

  it('saves expression issues and supports correction strategy and knowledge update entry', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { promptId } = prepareEvaluationScenario(repository, brandId);

    createEvaluationRun(repository, brandId, promptId, '示例品牌价格虚高，不推荐，服务表达缺少关键优势。');
    const dashboard = repository.getEvaluationDashboard('user_demo', brandId);
    const issueTypes = new Set((dashboard?.issues ?? []).map((issue) => issue.issueType));
    const issue = dashboard?.issues.find((item) => item.issueType === 'blocked_expression');

    expect(issueTypes.has('blocked_expression')).toBe(true);
    expect(issueTypes.has('negative_expression')).toBe(true);
    expect(issueTypes.has('missing_selling_point')).toBe(true);
    expect(issue?.severity).toBe('medium');

    const strategy = repository.createEvaluationCorrectionStrategy('user_demo', brandId, issue?.id ?? '');
    const profile = repository.updateBrandKnowledgeFromEvaluationIssue('user_demo', brandId, issue?.id ?? '');

    expect(strategy).toMatchObject({
      type: 'correction',
      relatedPromptIds: [promptId]
    });
    expect(repository.getGeoCanvasWorkspace('user_demo', brandId)?.contentStrategies.some((item) => item.id === strategy?.id)).toBe(true);
    expect(profile?.recommendedExpressions).toContain(issue?.suggestedExpression);
    expect(profile?.blockedExpressions).toContain(issue?.rawFragment);
    expect(repository.getEvaluationDashboard('user_demo', brandId)?.issues.find((item) => item.id === issue?.id)?.status).toBe('knowledge_updated');
  });
});
