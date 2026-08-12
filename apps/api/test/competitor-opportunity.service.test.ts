import { describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, CompetitorCandidate, CompetitorDashboard, MonitoringRunDetail } from '@geo-platform/shared-types';
import {
  buildCompetitorPlatformStrengths,
  buildCompetitorQuestionOpportunities,
  CompetitorOpportunityService
} from '../src/modules/competitors/competitor-opportunity.service';
import { CompetitorsController } from '../src/modules/competitors/competitors.controller';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('CompetitorOpportunityService', () => {
  it('marks competitor loss and brand exclusive opportunities from confirmed competitors only', () => {
    const confirmedNames = new Set(['竞品 a']);
    const runs = [
      createRun({ id: 'loss_1', promptId: 'prompt_loss', brandMentioned: false, competitorNames: ['竞品 A', '未确认竞品'] }),
      createRun({ id: 'loss_2', promptId: 'prompt_loss', brandMentioned: false, competitorNames: ['竞品 A'] }),
      createRun({ id: 'exclusive_1', promptId: 'prompt_exclusive', brandMentioned: true, competitorNames: ['未确认竞品'] })
    ];

    expect(buildCompetitorQuestionOpportunities(runs, confirmedNames)).toEqual([
      expect.objectContaining({ promptId: 'prompt_loss', type: 'competitor_loss', brandMentionRate: 0, confirmedCompetitorNames: ['竞品 A'], sampleCount: 2 }),
      expect.objectContaining({ promptId: 'prompt_exclusive', type: 'brand_exclusive', brandMentionRate: 100, confirmedCompetitorNames: [], sampleCount: 1 })
    ]);
  });

  it('returns the three highest mention-rate platforms per confirmed competitor and market', () => {
    const runs = [
      createRun({ id: 'run_1', platformCode: 'doubao', competitorNames: ['竞品 A'] }),
      createRun({ id: 'run_2', platformCode: 'doubao', competitorNames: ['竞品 A'] }),
      createRun({ id: 'run_3', platformCode: 'kimi', competitorNames: ['竞品 A'] }),
      createRun({ id: 'run_4', platformCode: 'deepseek', competitorNames: [] }),
      createRun({ id: 'run_5', platformCode: 'qwen', competitorNames: [] })
    ];

    const [strength] = buildCompetitorPlatformStrengths(runs, new Set(['竞品 a']));

    expect(strength.platforms).toHaveLength(3);
    expect(strength.platforms[0]).toMatchObject({ platformCode: 'doubao', mentionRate: 100, mentionSampleCount: 2, comparableSampleCount: 2 });
    expect(strength.platforms.map((item) => item.platformCode)).toEqual(['doubao', 'kimi', 'deepseek']);
  });

  it('syncs sample evidence and filters comparison metrics to confirmed candidates', async () => {
    const candidate = createCandidate({ lifecycleStatus: 'sample_confirmed', evidenceSampleIds: ['run_1'] });
    const syncCompetitorCandidateEvidence = vi.fn().mockReturnValue([candidate]);
    const service = new CompetitorOpportunityService({
      getCompetitorDashboard: vi.fn().mockReturnValue(createDashboard()),
      listMonitoringRuns: vi.fn().mockReturnValue([createRun({ id: 'run_1', rawText: '真实回答推荐竞品 A', competitorNames: [] })]),
      listCompetitors: vi.fn().mockReturnValue([]),
      listCompetitorCandidates: vi.fn().mockReturnValue([createCandidate()]),
      syncCompetitorCandidateEvidence
    } as unknown as PermissionsService);

    const dashboard = await service.getDashboard('user_1', 'brand_1');

    expect(syncCompetitorCandidateEvidence).toHaveBeenCalledWith('user_1', 'brand_1', [expect.objectContaining({ competitorName: '竞品 A', runId: 'run_1' })]);
    expect(dashboard?.comparisons.map((item) => item.competitorName)).toEqual(['竞品 A']);
    expect(dashboard?.candidates[0]).toMatchObject({ lifecycleStatus: 'sample_confirmed', evidenceSampleIds: ['run_1'] });
  });

  it('creates a competitor-response strategy and evidence-linked content task', async () => {
    const createContentStrategy = vi.fn().mockReturnValue({ id: 'strategy_1', targetPlatform: 'website' });
    const createContentGenerationTask = vi.fn().mockReturnValue({ brandId: 'brand_1', tasks: [] });
    const service = new CompetitorOpportunityService({ createContentStrategy, createContentGenerationTask } as unknown as PermissionsService);
    vi.spyOn(service, 'getDashboard').mockResolvedValue({
      ...createDashboard(),
      questionOpportunities: [{
        promptId: 'prompt_1', promptText: '儿童运动机构怎么选？', optimizationUnitId: 'unit_1', intentId: 'intent_1',
        type: 'competitor_loss', sampleCount: 2, brandMentionRate: 0, confirmedCompetitorNames: ['竞品 A'], evidenceRunIds: ['run_1', 'run_2']
      }]
    });

    await expect(service.createOpportunityContentTask('user_1', 'brand_1', { promptId: 'prompt_1' })).resolves.toEqual({ brandId: 'brand_1', tasks: [] });
    expect(createContentStrategy).toHaveBeenCalledWith('user_1', 'brand_1', expect.objectContaining({ type: 'competitor_response', priority: 'high', relatedPromptIds: ['prompt_1'] }));
    expect(createContentGenerationTask).toHaveBeenCalledWith('user_1', 'brand_1', expect.objectContaining({
      strategyId: 'strategy_1', contentType: 'competitor_comparison', referenceSources: ['opportunity:competitor_loss', 'prompt:prompt_1', 'monitoring-run:run_1', 'monitoring-run:run_2']
    }));
  });
});

describe('CompetitorsController opportunities', () => {
  it('returns the evidence dashboard and forwards the route prompt to content task creation', async () => {
    const dashboard = createDashboard();
    const getDashboard = vi.fn().mockResolvedValue(dashboard);
    const createOpportunityContentTask = vi.fn().mockResolvedValue({ brandId: 'brand_1', tasks: [], versions: [], exports: [] });
    const controller = new CompetitorsController({} as PermissionsService, { getDashboard, createOpportunityContentTask } as unknown as CompetitorOpportunityService);
    const request = { context: { userId: 'user_1' } } as never;

    await expect(controller.getCompetitorDashboard(request, 'brand_1')).resolves.toEqual({ success: true, data: dashboard });
    await expect(controller.createOpportunityContentTask(request, 'brand_1', 'prompt_1', { targetPlatform: 'website' })).resolves.toMatchObject({ success: true, data: { brandId: 'brand_1' } });
    expect(createOpportunityContentTask).toHaveBeenCalledWith('user_1', 'brand_1', { promptId: 'prompt_1', targetPlatform: 'website' });
  });
});

function createDashboard(): CompetitorDashboard {
  return {
    brandId: 'brand_1', competitors: [], mentionRate: 0, suppressionRate: 0, averageRankGap: 0, highRiskIntents: [],
    comparisons: [createComparison('竞品 A'), createComparison('未确认竞品')], candidates: [], questionOpportunities: [], topPlatformsByCompetitor: []
  };
}

function createComparison(competitorName: string): CompetitorDashboard['comparisons'][number] {
  return {
    competitorName, promptId: 'prompt_1', promptText: '儿童运动机构怎么选？', platformCode: 'doubao', optimizationUnitId: 'unit_1',
    intentId: 'intent_1', intentText: '选购对比', brandRank: 2, competitorRank: 1, rankGap: 1, suppressed: true,
    recommendationReason: '竞品证据更完整', citationSources: [], runId: 'run_1', capturedAt: '2026-08-03T01:00:00.000Z'
  };
}

function createCandidate(overrides: Partial<CompetitorCandidate> = {}): CompetitorCandidate {
  return {
    candidateId: 'candidate_1', runId: 'discovery_1', brandId: 'brand_1', sourceProvider: 'amap', name: '竞品 A', address: '贵阳', city: '贵阳',
    matchedKeywords: ['儿童运动'], score: 90, suggestedLabel: 'direct_competitor', matchReasons: ['同城同品类'], confidence: 'high', isCampusFocus: true,
    decisionStatus: 'pending', lifecycleStatus: 'candidate', evidenceSampleIds: [], createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides
  };
}

function createRun(overrides: { id?: string; promptId?: string; platformCode?: string; rawText?: string; brandMentioned?: boolean; competitorNames?: string[] } = {}): MonitoringRunDetail & { analysis: AnalysisResult } {
  const id = overrides.id ?? 'run_1';
  const platformCode = overrides.platformCode ?? 'doubao';
  const promptId = overrides.promptId ?? 'prompt_1';
  const scope = {
    platformCode, modelName: 'model-1', collectionMethod: 'api' as const, clientSurface: 'api' as const, searchEnabled: true,
    market: 'CN', language: 'zh-CN', evidenceLevel: 'reproducible_api' as const, manualConfirmed: true, baselineVersion: 'baseline-1'
  };
  return {
    id, brandId: 'brand_1', optimizationUnitId: 'unit_1', intentId: 'intent_1', promptId, promptText: `${promptId} 问题`, status: 'completed', createdAt: '2026-08-03T00:00:00.000Z', ...scope,
    response: { id: `response_${id}`, runId: id, brandId: 'brand_1', rawText: overrides.rawText ?? '真实 AI 回复', citations: [], respondedAt: '2026-08-03T01:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-08-03T01:00:00.000Z', ...scope },
    analysis: {
      id: `analysis_${id}`, responseId: `response_${id}`, runId: id, brandId: 'brand_1', brandMentioned: overrides.brandMentioned ?? false, brandRank: null,
      sentiment: 'neutral', accuracyScore: 80, citationScore: 50, platformEvaluation: '真实样本', recommendationReason: '竞品证据更完整', rankingReason: '竞品领先',
      expressionCompleteness: '待补强', expressionDeviation: '', competitorMentions: (overrides.competitorNames ?? ['竞品 A']).map((name, index) => ({ name, rank: index + 1, sentiment: 'neutral' as const })),
      reviewRequired: false, updatedAt: '2026-08-03T01:00:00.000Z'
    }
  };
}
