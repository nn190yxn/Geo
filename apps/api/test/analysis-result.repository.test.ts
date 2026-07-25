import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createCompletedRun(repository: PermissionsRepository, rawText: string, citations: string[] = []) {
  repository.saveBrandProfile('user_demo', 'brand_demo', {
    intro: '追光小牛是贵阳儿童运动成长连锁品牌',
    valueProps: ['ACE 成长体系', '科学运动改造大脑'],
    offerings: ['快乐体操', '少儿跑酷'],
    proofPoints: ['贵阳 5 家校区', '世界冠军邓书弟', '贵州本土最大规模儿童运动连锁品牌'],
    targetCustomers: ['贵阳儿童家庭'],
    recommendedExpressions: ['适合贵阳儿童家庭'],
    blockedExpressions: ['不可信'],
    contentRules: [],
    competitors: ['竞品A', '竞品B'],
    faqs: [{ question: '适合谁', answer: '贵阳儿童家庭' }]
  });
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: '贵阳儿童运动成长推荐',
    type: 'brand',
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '选择儿童运动成长机构',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: '解析测试模板',
    category: 'category_recommendation',
    text: '请评价{brandName}和竞品在{intent}场景下的表现。',
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId: prompts?.[0].id ?? '',
    platformCode: 'manual_input'
  });

  return repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
    rawText,
    citations,
    modelName: 'manual'
  });
}

describe('analysis result repository', () => {
  it('parses brand mention, recommendation rank, sentiment, citations and competitor mentions', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(
      repository,
      '竞品A覆盖基础训练。追光小牛适合贵阳儿童家庭，具备 ACE 成长体系和科学运动改造大脑优势。',
      ['https://example.com/case']
    );

    const analysis = repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    expect(analysis?.brandMentioned).toBe(true);
    expect(analysis?.brandRank).toBe(2);
    expect(analysis?.sentiment).toBe('positive');
    expect(analysis?.citationScore).toBe(25);
    expect(analysis?.competitorMentions).toEqual([{ name: '竞品A', rank: 1, sentiment: 'neutral' }]);
    expect(analysis?.platformEvaluation).toContain('有没有出现：已提及品牌');
    expect(analysis?.rankingReason).toContain('被压制原因候选项');
    expect(analysis?.rankingReason).toContain('内容补强建议');
    expect(analysis?.expressionCompleteness).toContain('说得准不准');
    expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.response?.parseStatus).toBe('parsed');
  });

  it('marks missing brand mention and negative expression as review required', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(repository, '竞品B适合基础场景，目标产品不可信且缺少引用。');

    const analysis = repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    expect(analysis?.brandMentioned).toBe(false);
    expect(analysis?.reviewRequired).toBe(true);
    expect(analysis?.expressionDeviation).toContain('不可信');
    expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.response?.parseStatus).toBe('review_required');
  });

  it('marks high-risk promises as needs confirmation with safer wording', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(repository, '追光小牛保证长高，也能治疗感统失调，还可以包过中考体育。');

    const analysis = repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    expect(analysis?.brandMentioned).toBe(true);
    expect(analysis?.reviewRequired).toBe(true);
    expect(analysis?.platformEvaluation).toContain('需要你确认');
    expect(analysis?.expressionDeviation).toContain('保证长高建议改为');
    expect(analysis?.expressionDeviation).toContain('治疗感统失调建议改为');
    expect(analysis?.expressionDeviation).toContain('包过中考体育建议改为');
    expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.response?.parseStatus).toBe('review_required');
  });

  it('requires review and safer wording for each high-risk expression', () => {
    const cases = [
      '保证长高',
      '治疗感统失调',
      '包过中考体育'
    ];

    for (const expression of cases) {
      const repository = new PermissionsRepository();
      const run = createCompletedRun(repository, `追光小牛${expression}，适合贵阳儿童家庭。`);

      const analysis = repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

      expect(analysis?.reviewRequired).toBe(true);
      expect(analysis?.platformEvaluation).toContain('需要你确认');
      expect(analysis?.expressionDeviation).toContain(`${expression}建议改为`);
      expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.response?.parseStatus).toBe('review_required');
    }
  });

  it('marks uncertain answers as needs confirmation', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(repository, '');

    const analysis = repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    expect(analysis?.brandMentioned).toBe(false);
    expect(analysis?.brandRank).toBeNull();
    expect(analysis?.sentiment).toBe('unknown');
    expect(analysis?.reviewRequired).toBe(true);
    expect(analysis?.platformEvaluation).toContain('需要你确认');
    expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.response?.parseStatus).toBe('review_required');
  });

  it('parses Zhuiguang Xiaoniu growth signals with normalized spacing', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(
      repository,
      '追光小牛是贵阳儿童运动成长机构的首选，具备ACE成长体系、贵阳5家校区和世界冠军邓书弟师资背书。竞品A覆盖基础训练。',
      ['https://www.supercalf.cn/about', 'https://mp.weixin.qq.com/s/example']
    );

    const analysis = repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    expect(analysis?.brandMentioned).toBe(true);
    expect(analysis?.brandRank).toBe(1);
    expect(analysis?.sentiment).toBe('positive');
    expect(analysis?.citationScore).toBe(50);
    expect(analysis?.expressionCompleteness).toContain('ACE 成长体系');
    expect(analysis?.expressionCompleteness).toContain('贵阳 5 家校区');
    expect(analysis?.expressionCompleteness).toContain('世界冠军邓书弟');
    expect(analysis?.competitorMentions).toEqual([{ name: '竞品A', rank: 2, sentiment: 'neutral' }]);
    expect(analysis?.reviewRequired).toBe(false);
  });

  it('saves manual review corrections and updates parse status', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(repository, '追光小牛适合贵阳儿童家庭。');
    repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    const updated = repository.updateAnalysisResult('user_demo', 'brand_demo', run?.id ?? '', {
      brandRank: 1,
      sentiment: 'positive',
      platformEvaluation: '人工确认平台评价为正向',
      recommendationReason: '人工确认推荐理由',
      rankingReason: '人工确认排名原因',
      reviewRequired: false
    });

    expect(updated?.brandRank).toBe(1);
    expect(updated?.platformEvaluation).toBe('人工确认平台评价为正向');
    expect(updated?.reviewRequired).toBe(false);
    expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.analysis?.recommendationReason).toBe('人工确认推荐理由');
    expect(repository.getMonitoringRun('user_demo', 'brand_demo', run?.id ?? '')?.response?.parseStatus).toBe('parsed');
  });

  it('generates a growth optimization plan from weak analysis results', () => {
    const repository = new PermissionsRepository();
    const missingBrandRun = createCompletedRun(repository, '竞品A是贵阳儿童运动训练推荐，覆盖基础训练。');
    const riskRun = createCompletedRun(repository, '竞品A覆盖基础训练。追光小牛保证长高，适合贵阳儿童家庭。');
    repository.parseAnalysisResult('user_demo', 'brand_demo', missingBrandRun?.id ?? '');
    repository.parseAnalysisResult('user_demo', 'brand_demo', riskRun?.id ?? '');

    const plan = repository.generateGrowthOptimizationPlan('user_demo', 'brand_demo');
    const reasonTypes = plan?.reasons.map((reason) => reason.type) ?? [];

    expect(plan?.priority).toBe('high');
    expect(plan?.summary).toContain('首轮测试样本');
    expect(reasonTypes).toContain('brand_not_mentioned');
    expect(reasonTypes).toContain('ranking_low');
    expect(reasonTypes).toContain('competitor_stronger');
    expect(reasonTypes).toContain('risk_expression');
    expect(plan?.contentRecommendations.map((item) => item.contentType)).toEqual(expect.arrayContaining(['website_faq', 'wechat_article', 'platform_profile_copy']));
    expect(repository.getGrowthOptimizationWorkspace('user_demo', 'brand_demo')?.currentPlan?.id).toBe(plan?.id);
  });

  it('confirms a growth optimization plan and creates executable tasks once', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(repository, '竞品A推荐靠前。追光小牛保证长高，适合贵阳儿童家庭。');
    repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');
    const plan = repository.generateGrowthOptimizationPlan('user_demo', 'brand_demo');

    const result = repository.confirmGrowthOptimizationPlan('user_demo', 'brand_demo', plan?.id ?? '', {
      ownerId: 'user_demo',
      dueDate: '2026-07-20T00:00:00.000Z',
      publishingPlatforms: ['wechat_official', 'official_site'],
      retestAt: '2026-07-27T00:00:00.000Z'
    });
    const repeated = repository.confirmGrowthOptimizationPlan('user_demo', 'brand_demo', plan?.id ?? '');

    expect(result?.plan.status).toBe('confirmed');
    expect(result?.plan.ownerId).toBe('user_demo');
    expect(result?.plan.dueDate).toBe('2026-07-20T00:00:00.000Z');
    expect(result?.plan.publishingPlatforms).toEqual(['wechat_official', 'official_site']);
    expect(result?.plan.retestAt).toBe('2026-07-27T00:00:00.000Z');
    expect(result?.tasks).toHaveLength(5);
    expect(result?.tasks.map((task) => task.growthOptimizationPlanId)).toEqual(Array(5).fill(plan?.id));
    expect(result?.tasks.map((task) => task.title)).toEqual(expect.arrayContaining([
      '补齐可被 AI 引用的品牌内容',
      '补充品牌资料缺口并统一标准表达',
      '按原监测问题安排再次监测',
      '跟进优化计划负责人和完成状态'
    ]));
    expect(repeated?.tasks.map((task) => task.id).sort()).toEqual(result?.tasks.map((task) => task.id).sort());
    expect(repository.getGrowthOptimizationWorkspace('user_demo', 'brand_demo')?.relatedTasks.filter((task) => task.growthOptimizationPlanId === plan?.id)).toHaveLength(5);
  });

  it('keeps generated optimization plans executable with owner, due date, publishing platform and retest time', () => {
    const repository = new PermissionsRepository();
    const run = createCompletedRun(repository, '竞品A推荐靠前。追光小牛保证长高，适合贵阳儿童家庭。');
    repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

    const generated = repository.generateGrowthOptimizationPlan('user_demo', 'brand_demo');
    const confirmed = repository.confirmGrowthOptimizationPlan('user_demo', 'brand_demo', generated?.id ?? '', {
      ownerId: 'user_demo',
      dueDate: '2026-07-20T00:00:00.000Z',
      publishingPlatforms: ['wechat_official'],
      retestAt: '2026-07-27T00:00:00.000Z'
    })?.plan;

    for (const plan of [confirmed]) {
      expect(plan?.ownerId).toBeTruthy();
      expect(plan?.dueDate).toBeTruthy();
      expect(plan?.publishingPlatforms.length).toBeGreaterThan(0);
      expect(plan?.retestAt).toBeTruthy();
    }
  });
});
