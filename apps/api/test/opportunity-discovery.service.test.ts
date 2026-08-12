import { describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, Competitor, CompetitorCandidate, ContentAsset, MonitoringRunDetail, TestQuestionCandidate } from '@geo-platform/shared-types';
import { OpportunityDiscoveryService } from '../src/modules/analysis/opportunity-discovery.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('OpportunityDiscoveryService', () => {
  it('builds competitor themes, cited domains, positions and sorted content opportunities from real samples', async () => {
    const service = createService({
      runs: [
        createRun({ id: 'run_1', platformCode: 'doubao', question: '儿童运动机构怎么选？', brandMentioned: false, brandRank: null }),
        createRun({ id: 'run_2', platformCode: 'kimi', question: '儿童运动机构怎么选？', brandMentioned: true, brandRank: 2 }),
        createRun({ id: 'run_mock', platformCode: 'mock_ai' }),
        createRun({ id: 'run_empty', rawText: '   ' })
      ],
      candidates: [createCandidate('candidate_1', 'brand'), createCandidate('candidate_2', 'competitor_comparison')],
      assets: [createContentAsset()]
    });

    const result = await service.getMap('user_1', 'brand_1');

    expect(result).toMatchObject({ brandId: 'brand_1', measurementStatus: 'insufficient', sampleCount: 2, generationMethod: 'deterministic' });
    expect(result?.questionDimensions).toEqual(expect.arrayContaining([
      { dimension: 'brand', questionCount: 1 },
      { dimension: 'competitor_comparison', questionCount: 1 }
    ]));
    expect(result?.competitorThemes[0]).toMatchObject({
      competitorName: '竞品 A',
      theme: '竞品拥有更完整的课程与师资信源',
      evidenceCount: 2,
      platformDistribution: expect.arrayContaining([{ platformCode: 'doubao', sampleCount: 1 }, { platformCode: 'kimi', sampleCount: 1 }])
    });
    expect(result?.citedDomains[0]).toMatchObject({
      domain: 'brand.example.com',
      sourceType: 'official_site',
      citationCount: 2,
      runCount: 2,
      contentAssetCovered: true
    });
    expect(result?.citedDomains[0]?.positions).toEqual([
      expect.objectContaining({ runId: 'run_1', citationIndex: 1, label: '回答引用列表第 1 位' }),
      expect.objectContaining({ runId: 'run_2', citationIndex: 1, label: '回答引用列表第 1 位' })
    ]);
    expect(result?.contentOpportunities.map((item) => item.type)).toEqual(['brand_absent', 'competitor_dominant', 'content_gap', 'fact_inconsistent']);
    expect(result?.contentOpportunities.find((item) => item.type === 'competitor_dominant')?.runIds).toEqual(['run_1', 'run_2']);
    expect(result?.channelRecommendations[0]).toMatchObject({ domain: 'brand.example.com', basis: 'brand_sample', evidenceCount: 2 });
  });

  it('adds explicit public industry references when real citation evidence is sparse', async () => {
    const run = createRun({ citations: [], competitorMentions: [], brandMentioned: true, brandRank: 1, accuracyScore: 100, citationScore: 100 });
    const result = await createService({ runs: [run], candidates: [], assets: [] }).getMap('user_1', 'brand_1');

    expect(result?.citedDomains).toEqual([]);
    expect(result?.channelRecommendations).toHaveLength(3);
    expect(result?.channelRecommendations.every((item) => item.basis === 'industry_reference' && item.evidenceCount === 0)).toBe(true);
  });

  it('excludes candidate and excluded competitor mentions from analysis opportunities', async () => {
    const result = await createService({
      runs: [createRun({ competitorMentions: [
        { name: '竞品 A', rank: 1, sentiment: 'positive' },
        { name: '待确认竞品', rank: 1, sentiment: 'positive' }
      ] })],
      candidates: [],
      assets: [],
      competitorCandidates: [createCompetitorCandidate('待确认竞品', 'candidate')]
    }).getMap('user_1', 'brand_1');

    expect(result?.competitorThemes.map((item) => item.competitorName)).toEqual(['竞品 A']);
    expect(result?.contentOpportunities.find((item) => item.type === 'competitor_dominant')?.evidence.join(' ')).not.toContain('待确认竞品');
  });

  it.each([
    [0, 'unmeasured'],
    [1, 'insufficient'],
    [2, 'insufficient'],
    [3, 'valid'],
    [5, 'valid']
  ] as const)('maps %i real samples to the %s measurement state', async (sampleCount, measurementStatus) => {
    const runs = Array.from({ length: sampleCount }, (_, index) => createRun({ id: `run_${index}` }));
    runs.push(createRun({ id: 'run_mock', platformCode: 'mock_ai' }), createRun({ id: 'run_empty', rawText: '   ' }));

    const result = await createService({ runs, candidates: [], assets: [] }).getMap('user_1', 'brand_1');

    expect(result).toMatchObject({ sampleCount, measurementStatus });
  });

  it('keeps every real cited source ahead of public industry references', async () => {
    const result = await createService({
      runs: [
        createRun({ id: 'run_1', citations: ['https://source-a.example/article', 'https://source-b.example/guide'] }),
        createRun({ id: 'run_2', citations: ['https://source-a.example/faq'] })
      ],
      candidates: [],
      assets: []
    }).getMap('user_1', 'brand_1');
    const recommendations = result?.channelRecommendations ?? [];
    const firstReferenceIndex = recommendations.findIndex((item) => item.basis === 'industry_reference');

    expect(firstReferenceIndex).toBe(2);
    expect(recommendations.slice(0, firstReferenceIndex).every((item) => item.basis === 'industry_sample' && item.evidenceCount > 0)).toBe(true);
    expect(recommendations.slice(firstReferenceIndex).every((item) => item.basis === 'industry_reference' && item.evidenceCount === 0)).toBe(true);
  });

  it('preserves the brand access boundary', async () => {
    const permissionsService = {
      listMonitoringRuns: vi.fn().mockReturnValue(null),
      listTestQuestionCandidates: vi.fn().mockReturnValue([]),
      listContentAssets: vi.fn().mockReturnValue([]),
      listCompetitors: vi.fn().mockReturnValue([]),
      listCompetitorCandidates: vi.fn().mockReturnValue([])
    } as unknown as PermissionsService;

    await expect(new OpportunityDiscoveryService(permissionsService).getMap('user_other', 'brand_1')).resolves.toBeNull();
  });
});

function createService(input: {
  runs: MonitoringRunDetail[];
  candidates: TestQuestionCandidate[];
  assets: ContentAsset[];
  competitors?: Competitor[];
  competitorCandidates?: CompetitorCandidate[];
}) {
  return new OpportunityDiscoveryService({
    listMonitoringRuns: vi.fn().mockReturnValue(input.runs),
    listTestQuestionCandidates: vi.fn().mockReturnValue(input.candidates),
    listContentAssets: vi.fn().mockReturnValue(input.assets),
    listCompetitors: vi.fn().mockReturnValue(input.competitors ?? [createCompetitor()]),
    listCompetitorCandidates: vi.fn().mockReturnValue(input.competitorCandidates ?? [])
  } as unknown as PermissionsService);
}

function createCompetitor(): Competitor {
  return {
    id: 'competitor_1', brandId: 'brand_1', name: '竞品 A', aliases: ['Competitor A'], website: 'https://competitor.example',
    industryTags: [], comparisonNote: '', suppressionRule: { consecutiveThreshold: 2, minimumRankGap: 1 },
    createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
}

function createCompetitorCandidate(name: string, lifecycleStatus: CompetitorCandidate['lifecycleStatus']): CompetitorCandidate {
  return {
    candidateId: `candidate_${name}`, runId: 'discovery_1', brandId: 'brand_1', sourceProvider: 'manual', name,
    address: '贵阳', city: '贵阳', matchedKeywords: [], score: 80, suggestedLabel: 'direct_competitor', matchReasons: [],
    confidence: 'medium', isCampusFocus: true, decisionStatus: 'pending', lifecycleStatus, evidenceSampleIds: [],
    createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
}

function createRun(overrides: {
  id?: string;
  platformCode?: string;
  question?: string;
  rawText?: string;
  citations?: string[];
  competitorMentions?: AnalysisResult['competitorMentions'];
  brandMentioned?: boolean;
  brandRank?: number | null;
  accuracyScore?: number;
  citationScore?: number;
} = {}): MonitoringRunDetail {
  const id = overrides.id ?? 'run_1';
  const platformCode = overrides.platformCode ?? 'doubao';
  const scope = {
    platformCode, modelName: 'model-1', collectionMethod: 'api' as const, searchEnabled: true,
    market: 'CN', language: 'zh-CN', evidenceLevel: 'reproducible_api' as const, manualConfirmed: true, baselineVersion: 'baseline-1'
  };
  return {
    id, brandId: 'brand_1', optimizationUnitId: 'unit_1', intentId: 'intent_1', promptId: `prompt_${id}`,
    promptText: overrides.question ?? `儿童运动机构怎么选？${id}`, status: 'completed', createdAt: '2026-08-03T00:00:00.000Z', ...scope,
    response: {
      id: `response_${id}`, runId: id, brandId: 'brand_1', rawText: overrides.rawText ?? '真实 AI 回复',
      citations: overrides.citations ?? ['https://brand.example.com/faq', 'https://zh.wikipedia.org/wiki/example'],
      respondedAt: '2026-08-03T01:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-08-03T01:00:00.000Z', ...scope
    },
    analysis: createAnalysis(id, overrides)
  };
}

function createAnalysis(runId: string, overrides: Parameters<typeof createRun>[0]): AnalysisResult {
  return {
    id: `analysis_${runId}`, responseId: `response_${runId}`, runId, brandId: 'brand_1',
    brandMentioned: overrides.brandMentioned ?? false, brandRank: overrides.brandRank ?? null, sentiment: 'neutral',
    accuracyScore: overrides.accuracyScore ?? 45, citationScore: overrides.citationScore ?? 40,
    platformEvaluation: '品牌信息覆盖不足', recommendationReason: '竞品拥有更完整的课程与师资信源',
    rankingReason: '竞品排名领先', expressionCompleteness: '核心课程未覆盖', expressionDeviation: '课程年龄范围不一致',
    competitorMentions: overrides.competitorMentions ?? [{ name: '竞品 A', rank: 1, sentiment: 'positive' }],
    reviewRequired: false, updatedAt: '2026-08-03T01:00:00.000Z'
  };
}

function createCandidate(id: string, discoveryDimension: TestQuestionCandidate['discoveryDimension']): TestQuestionCandidate {
  return {
    id, brandId: 'brand_1', themeId: 'theme_1', question: `候选问题 ${id}`, purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao'], priority: 'high', estimatedValue: '高价值', discoveryDimension,
    editable: true, selected: false, createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
}

function createContentAsset(): ContentAsset {
  return {
    id: 'asset_1', brandId: 'brand_1', title: '官网 FAQ', type: 'faq', platform: 'official_site',
    url: 'https://brand.example.com/faq', targetKeywords: [], status: 'published',
    createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
}
