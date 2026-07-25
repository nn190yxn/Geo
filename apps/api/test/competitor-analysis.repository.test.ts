import { describe, expect, it, vi } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createIsolatedBrand(repository: PermissionsRepository) {
  const brand = repository.createBrand('user_demo', {
    name: '示例品牌',
    industry: 'GEO',
    website: 'https://example.com',
    targetCities: ['贵阳'],
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

function prepareCompetitorScenario(repository: PermissionsRepository, brandId: string) {
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
  const competitor = repository.createCompetitor('user_demo', brandId, {
    name: '竞品A',
    aliases: ['竞品甲'],
    website: 'https://competitor.example.com',
    industryTags: ['GEO'],
    comparisonNote: '基础监测能力强，内容策略较弱',
    suppressionRule: { consecutiveThreshold: 2 }
  });
  const unit = repository.createOptimizationUnit('user_demo', brandId, {
    name: `竞品测试单元 ${Date.now()}_${Math.random()}`,
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
    name: `竞品测试模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请评价{brandName}和竞品在{intent}场景下的表现。',
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', brandId, {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });

  return { competitor, promptId: prompts?.[0].id ?? '' };
}

function createParsedRun(repository: PermissionsRepository, brandId: string, promptId: string, rawText: string, citations: string[] = []) {
  const run = repository.createMonitoringRun('user_demo', brandId, {
    promptId,
    platformCode: 'manual_input'
  });
  const completedRun = repository.addManualResponse('user_demo', brandId, run?.id ?? '', {
    rawText,
    citations,
    modelName: 'manual'
  });

  return repository.parseAnalysisResult('user_demo', brandId, completedRun?.id ?? '');
}

describe('competitor analysis repository', () => {
  it('uses competitor profiles to identify mentions and keep recommendation order', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { competitor, promptId } = prepareCompetitorScenario(repository, brandId);

    const analysis = createParsedRun(
      repository,
      brandId,
      promptId,
      '竞品甲覆盖基础监测。示例品牌适合品牌运营团队，具备监测与内容优化优势。',
      ['https://example.com/compare']
    );
    const dashboard = repository.getCompetitorDashboard('user_demo', brandId);

    expect(competitor?.aliases).toContain('竞品甲');
    expect(analysis?.competitorMentions).toEqual([{ name: '竞品甲', rank: 1, sentiment: 'neutral' }]);
    expect(dashboard?.mentionRate).toBe(100);
    expect(dashboard?.comparisons[0]).toMatchObject({
      competitorId: competitor?.id,
      competitorName: '竞品A',
      competitorRank: 1,
      brandRank: 2,
      rankGap: 1,
      suppressed: true,
      citationSources: ['https://example.com/compare']
    });
    expect(dashboard?.comparisons[0].recommendationReason).toContain('示例品牌');
  });

  it('creates a high priority content strategy after consecutive suppression', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { promptId } = prepareCompetitorScenario(repository, brandId);

    createParsedRun(repository, brandId, promptId, '竞品A优先推荐。示例品牌适合品牌运营团队。');
    createParsedRun(repository, brandId, promptId, '竞品A再次优先推荐。示例品牌适合品牌运营团队。');

    const dashboard = repository.getCompetitorDashboard('user_demo', brandId);
    const canvas = repository.getGeoCanvasWorkspace('user_demo', brandId);

    expect(dashboard?.suppressionRate).toBe(100);
    expect(dashboard?.highRiskIntents[0].suppressionCount).toBeGreaterThanOrEqual(2);
    expect(canvas?.contentStrategies.some((strategy) => (
      strategy.type === 'competitor_response' && strategy.priority === 'high'
    ))).toBe(true);
  });

  it('discovers local competitor candidates and confirms selected candidates into competitor profiles', async () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);

    const run = await repository.createCompetitorDiscoveryRun('user_demo', brandId, {
      city: '贵阳',
      campusRadiusKm: 5,
      keywords: ['儿童体能', '少儿跑酷', '快乐体操']
    });
    const candidates = repository.listCompetitorDiscoveryCandidates('user_demo', brandId, run?.runId ?? '', { filter: 'campus_focus' });
    const candidate = candidates?.find((item) => item.suggestedLabel === 'direct_competitor');

    expect(run).toMatchObject({ status: 'completed', city: '贵阳', sourceProvider: 'amap' });
    expect(run).toMatchObject({ providerStatus: 'fallback', cacheHit: false });
    expect(run?.providerMessage).toContain('内测候选源');
    expect(candidates?.length).toBeGreaterThan(0);
    expect(candidate?.sourcePoiId).toBe('amap_gymnastics_003');
    expect(candidate?.distanceToNearestCampusKm).toBe(0);
    expect(candidate?.matchReasons.join('')).toContain('距最近校区约');

    const result = repository.decideCompetitorCandidate('user_demo', brandId, candidate?.candidateId ?? '', {
      label: 'direct_competitor'
    });
    const dashboard = repository.getCompetitorDashboard('user_demo', brandId);
    const competitorQuestions = repository.listTestQuestionCandidates('user_demo', brandId, {})
      ?.filter((item) => item.question.includes(candidate?.name ?? ''));
    const auditLogs = repository.listAuditLogs('user_demo', {
      brandId,
      action: 'competitor_candidate.confirm',
      resourceType: 'competitor_candidate'
    });

    expect(result?.candidate.decisionStatus).toBe('confirmed');
    expect(result?.competitor).toMatchObject({
      name: candidate?.name,
      confirmationLabel: 'direct_competitor',
      sourceProvider: 'amap',
      isCampusFocus: true
    });
    expect(dashboard?.competitors.some((competitor) => competitor.sourceCandidateId === candidate?.candidateId)).toBe(true);
    expect(competitorQuestions?.some((item) => item.purposes.includes('competitor_presence'))).toBe(true);
    expect(competitorQuestions?.some((item) => item.question.includes('怎么选'))).toBe(true);
    expect(auditLogs.some((log) => log.resourceId === candidate?.candidateId && log.metadata.label === 'direct_competitor')).toBe(true);
  });

  it('reuses cached competitor discovery candidates for the same search conditions', async () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const input = { city: '贵阳', campusRadiusKm: 5, keywords: ['儿童体能', '少儿跑酷'] };

    const firstRun = await repository.createCompetitorDiscoveryRun('user_demo', brandId, input);
    const secondRun = await repository.createCompetitorDiscoveryRun('user_demo', brandId, input);
    const secondCandidates = repository.listCompetitorDiscoveryCandidates('user_demo', brandId, secondRun?.runId ?? '');

    expect(firstRun?.cacheHit).toBe(false);
    expect(secondRun?.cacheHit).toBe(true);
    expect(secondCandidates?.length).toBe(firstRun?.candidateCount);
    expect(secondCandidates?.every((candidate) => candidate.runId === secondRun?.runId)).toBe(true);
  });

  it('keeps excluded competitor candidates out of competitor profiles', async () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const run = await repository.createCompetitorDiscoveryRun('user_demo', brandId, { city: '贵阳' });
    const candidates = repository.listCompetitorDiscoveryCandidates('user_demo', brandId, run?.runId ?? '');
    const unrelatedCandidate = candidates?.find((item) => item.name.includes('艺术'));

    const result = repository.decideCompetitorCandidate('user_demo', brandId, unrelatedCandidate?.candidateId ?? '', {
      label: 'excluded',
      excludedReason: '艺术培训，不纳入儿童运动竞品'
    });
    const excluded = repository.listCompetitorDiscoveryCandidates('user_demo', brandId, run?.runId ?? '', { filter: 'excluded' });
    const dashboard = repository.getCompetitorDashboard('user_demo', brandId);
    const auditLogs = repository.listAuditLogs('user_demo', {
      brandId,
      action: 'competitor_candidate.exclude',
      resourceType: 'competitor_candidate'
    });

    expect(result?.candidate).toMatchObject({
      decisionStatus: 'excluded',
      excludedReason: '艺术培训，不纳入儿童运动竞品'
    });
    expect(excluded?.map((item) => item.candidateId)).toContain(unrelatedCandidate?.candidateId);
    expect(dashboard?.competitors.some((competitor) => competitor.sourceCandidateId === unrelatedCandidate?.candidateId)).toBe(false);
    expect(auditLogs.some((log) => log.resourceId === unrelatedCandidate?.candidateId && log.metadata.excludedReason === '艺术培训，不纳入儿童运动竞品')).toBe(true);
  });

  it('creates content benchmark strategy for national benchmark competitors', async () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const run = await repository.createCompetitorDiscoveryRun('user_demo', brandId, { city: '贵阳' });
    const candidates = repository.listCompetitorDiscoveryCandidates('user_demo', brandId, run?.runId ?? '', { filter: 'national_benchmark' });
    const candidate = candidates?.find((item) => item.suggestedLabel === 'national_benchmark');

    const result = repository.decideCompetitorCandidate('user_demo', brandId, candidate?.candidateId ?? '', {
      label: 'national_benchmark'
    });
    const strategies = repository.listContentStrategies('user_demo', brandId, { type: 'competitor_response' });
    const strategy = strategies?.find((item) => item.suggestedTitle.includes(candidate?.name ?? ''));

    expect(result?.competitor).toMatchObject({
      confirmationLabel: 'national_benchmark',
      isNationalBenchmark: true
    });
    expect(strategy).toMatchObject({
      priority: 'medium',
      targetPlatform: 'wechat_official'
    });
    expect(strategy?.targetKeywords).toEqual(expect.arrayContaining(['示例品牌', candidate?.name, '品牌对标']));
  });

  it('uses configured Amap POI provider without exposing server API keys in memory mode', async () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const apiKey = 'amap-secret-for-test';
    vi.stubEnv('GEO_AMAP_API_KEY', apiKey);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        pois: [
          {
            id: 'amap_memory_real_001',
            name: '真实地图儿童体能馆',
            address: '贵阳市观山湖区儿童运动中心',
            cityname: '贵阳',
            type: '儿童体适能',
            location: '106.640,26.650'
          },
          {
            id: 'amap_memory_unrelated_001',
            name: 'XDS喜德盛自行车',
            address: '金朱东路190号',
            cityname: '贵阳',
            type: '购物服务;专卖店;自行车专卖店',
            location: '106.637,26.655'
          },
          {
            id: 'amap_memory_unrelated_002',
            name: '康语儿童言语社交训练中心',
            address: '群升世纪广场',
            cityname: '贵阳',
            type: '医疗保健服务;医疗保健服务场所',
            location: '106.619,26.636'
          },
          {
            id: 'amap_memory_unrelated_003',
            name: '大米和小米儿童成长中心',
            address: '飞山街祥源大厦',
            cityname: '贵阳',
            type: '科教文化服务;科教文化场所',
            location: '106.706,26.579'
          }
        ]
      })
    }));

    try {
      const run = await repository.createCompetitorDiscoveryRun('user_demo', brandId, {
        city: '贵阳',
        keywords: ['儿童体能'],
        forceRefresh: true
      });
      const candidates = repository.listCompetitorDiscoveryCandidates('user_demo', brandId, run?.runId ?? '');
      const publicPayload = JSON.stringify({ run, candidates });

      expect(run).toMatchObject({ providerStatus: 'configured', candidateCount: 1 });
      expect(run?.providerMessage).toContain('已通过高德地图服务端 POI provider 获取候选机构');
      expect(candidates).toMatchObject([
        expect.objectContaining({ sourcePoiId: 'amap_memory_real_001', name: '真实地图儿童体能馆', distanceToNearestCampusKm: 0 })
      ]);
      expect(candidates?.some((candidate) => candidate.sourcePoiId.includes('unrelated'))).toBe(false);
      expect(publicPayload).not.toContain(apiKey);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });
});
