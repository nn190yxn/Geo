import { Injectable } from '@nestjs/common';
import type {
  Competitor,
  CompetitorCandidate,
  CompetitorDashboard,
  CompetitorOpportunityContentTaskInput,
  CompetitorPlatformStrength,
  CompetitorQuestionOpportunity,
  ContentGenerationWorkspace,
  MonitoringRunDetail
} from '@geo-platform/shared-types';
import { hasRealMonitoringResponse } from '../monitoring/real-monitoring-response';
import { PermissionsService } from '../permissions/permissions.service';
import { getConfirmedCompetitorNames, normalizeCompetitorName } from './competitor-confirmation';

export { getConfirmedCompetitorNames } from './competitor-confirmation';

@Injectable()
export class CompetitorOpportunityService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async getDashboard(userId: string, brandId: string): Promise<CompetitorDashboard | null> {
    const [base, runs, competitors, initialCandidates] = await Promise.all([
      Promise.resolve(this.permissionsService.getCompetitorDashboard(userId, brandId)),
      Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId)),
      Promise.resolve(this.permissionsService.listCompetitors(userId, brandId)),
      Promise.resolve(this.permissionsService.listCompetitorCandidates(userId, brandId))
    ]);
    if (!base || !runs || !competitors || !initialCandidates) return null;

    const realRuns = runs.filter((run): run is MonitoringRunDetail & { analysis: NonNullable<MonitoringRunDetail['analysis']>; response: NonNullable<MonitoringRunDetail['response']> } => (
      hasRealMonitoringResponse(run) && Boolean(run.analysis && run.response)
    ));
    const detectableCompetitors = [
      ...competitors.map((competitor) => ({ name: competitor.name, aliases: [competitor.name, ...competitor.aliases] })),
      ...initialCandidates.filter((candidate) => candidate.lifecycleStatus !== 'excluded').map((candidate) => ({ name: candidate.name, aliases: [candidate.name] }))
    ];
    const evidenceRuns = realRuns.map((run) => enrichRunCompetitorMentions(run, detectableCompetitors));
    const evidence = evidenceRuns.flatMap((run) => run.analysis.competitorMentions.map((mention) => ({
      competitorName: mention.name,
      runId: run.id,
      capturedAt: run.response.respondedAt
    })));
    const candidates = await Promise.resolve(this.permissionsService.syncCompetitorCandidateEvidence(userId, brandId, evidence)) ?? initialCandidates;
    const confirmedNames = getConfirmedCompetitorNames(competitors, candidates);
    const comparisons = base.comparisons.filter((comparison) => confirmedNames.has(normalizeCompetitorName(comparison.competitorName)));
    const suppressedItems = comparisons.filter((comparison) => comparison.suppressed);
    const rankGaps = comparisons.map((comparison) => comparison.rankGap).filter((value): value is number => value !== null);
    const highRiskIntents = Array.from(suppressedItems.reduce((result, item) => {
      const current = result.get(item.intentId);
      result.set(item.intentId, { intentId: item.intentId, text: item.intentText, suppressionCount: (current?.suppressionCount ?? 0) + 1 });
      return result;
    }, new Map<string, { intentId: string; text: string; suppressionCount: number }>()).values()).sort((left, right) => right.suppressionCount - left.suppressionCount);

    return {
      ...base,
      mentionRate: realRuns.length === 0 ? 0 : Math.round((new Set(comparisons.map((item) => item.runId)).size / realRuns.length) * 100),
      suppressionRate: comparisons.length === 0 ? 0 : Math.round((suppressedItems.length / comparisons.length) * 100),
      averageRankGap: rankGaps.length === 0 ? 0 : Math.round(rankGaps.reduce((sum, value) => sum + value, 0) / rankGaps.length),
      highRiskIntents,
      comparisons,
      candidates,
      questionOpportunities: buildCompetitorQuestionOpportunities(evidenceRuns, confirmedNames),
      topPlatformsByCompetitor: buildCompetitorPlatformStrengths(evidenceRuns, confirmedNames)
    };
  }

  async createOpportunityContentTask(
    userId: string,
    brandId: string,
    input: CompetitorOpportunityContentTaskInput
  ): Promise<ContentGenerationWorkspace | null> {
    const dashboard = await this.getDashboard(userId, brandId);
    const opportunity = dashboard?.questionOpportunities.find((item) => item.promptId === input.promptId);
    if (!opportunity) return null;
    const title = opportunity.type === 'competitor_loss'
      ? `补强“${opportunity.promptText}”竞品失守内容`
      : `巩固“${opportunity.promptText}”品牌独占内容`;
    const strategy = await Promise.resolve(this.permissionsService.createContentStrategy(userId, brandId, {
      optimizationUnitId: opportunity.optimizationUnitId,
      intentId: opportunity.intentId,
      type: 'competitor_response',
      priority: opportunity.type === 'competitor_loss' ? 'high' : 'medium',
      suggestedTitle: title,
      targetPlatform: input.targetPlatform ?? 'website',
      targetKeywords: opportunity.confirmedCompetitorNames,
      relatedPromptIds: [opportunity.promptId]
    }));
    if (!strategy) return null;
    return Promise.resolve(this.permissionsService.createContentGenerationTask(userId, brandId, {
      strategyId: strategy.id,
      targetPlatform: input.targetPlatform ?? strategy.targetPlatform,
      contentType: 'competitor_comparison',
      contentTopic: title,
      targetKeywords: opportunity.confirmedCompetitorNames,
      referenceSources: [
        `opportunity:${opportunity.type}`,
        `prompt:${opportunity.promptId}`,
        ...opportunity.evidenceRunIds.map((runId) => `monitoring-run:${runId}`)
      ]
    }));
  }
}

export function buildCompetitorQuestionOpportunities(
  runs: Array<MonitoringRunDetail & { analysis: NonNullable<MonitoringRunDetail['analysis']> }>,
  confirmedNames: Set<string>
): CompetitorQuestionOpportunity[] {
  const groups = new Map<string, typeof runs>();
  runs.forEach((run) => groups.set(run.promptId, [...(groups.get(run.promptId) ?? []), run]));
  return Array.from(groups.values()).flatMap((group) => {
    const brandMentionCount = group.filter((run) => run.analysis.brandMentioned).length;
    const mentionedNames = [...new Set(group.flatMap((run) => run.analysis.competitorMentions.map((mention) => mention.name))
      .filter((name) => confirmedNames.has(normalizeCompetitorName(name))))];
    const type: CompetitorQuestionOpportunity['type'] | null = brandMentionCount === 0 && mentionedNames.length > 0
      ? 'competitor_loss'
      : brandMentionCount > 0 && mentionedNames.length === 0 ? 'brand_exclusive' : null;
    if (!type) return [];
    return [{
      promptId: group[0].promptId,
      promptText: group[0].promptText,
      optimizationUnitId: group[0].optimizationUnitId,
      intentId: group[0].intentId,
      type,
      sampleCount: group.length,
      brandMentionRate: Math.round((brandMentionCount / group.length) * 100),
      confirmedCompetitorNames: mentionedNames,
      evidenceRunIds: group.map((run) => run.id)
    }];
  }).sort((left, right) => Number(right.type === 'competitor_loss') - Number(left.type === 'competitor_loss') || right.sampleCount - left.sampleCount);
}

export function buildCompetitorPlatformStrengths(
  runs: Array<MonitoringRunDetail & { analysis: NonNullable<MonitoringRunDetail['analysis']> }>,
  confirmedNames: Set<string>
): CompetitorPlatformStrength[] {
  return [...confirmedNames].map((normalizedName) => {
    const displayName = runs.flatMap((run) => run.analysis.competitorMentions).find((mention) => normalizeCompetitorName(mention.name) === normalizedName)?.name ?? normalizedName;
    const markets = [...new Set(runs.map((run) => run.market))];
    return markets.map((market) => {
      const marketRuns = runs.filter((run) => run.market === market);
      const platformCodes = [...new Set(marketRuns.map((run) => run.platformCode))];
      const platforms = platformCodes.map((platformCode) => {
        const platformRuns = marketRuns.filter((run) => run.platformCode === platformCode);
        const mentionSampleCount = platformRuns.filter((run) => run.analysis.competitorMentions.some((mention) => normalizeCompetitorName(mention.name) === normalizedName)).length;
        return {
          platformCode,
          mentionSampleCount,
          comparableSampleCount: platformRuns.length,
          mentionRate: Math.round((mentionSampleCount / platformRuns.length) * 100)
        };
      }).sort((left, right) => right.mentionRate - left.mentionRate || right.comparableSampleCount - left.comparableSampleCount).slice(0, 3);
      return { competitorName: displayName, market, platforms };
    });
  }).flat().filter((item) => item.platforms.length > 0);
}

function enrichRunCompetitorMentions(
  run: MonitoringRunDetail & { analysis: NonNullable<MonitoringRunDetail['analysis']>; response: NonNullable<MonitoringRunDetail['response']> },
  detectableCompetitors: Array<{ name: string; aliases: string[] }>
): typeof run {
  const normalizedAnswer = normalizeCompetitorName(run.response.rawText);
  const existingNames = new Set(run.analysis.competitorMentions.map((mention) => normalizeCompetitorName(mention.name)));
  const detectedMentions: NonNullable<MonitoringRunDetail['analysis']>['competitorMentions'] = [];
  for (const competitor of detectableCompetitors) {
    const normalizedCompetitorName = normalizeCompetitorName(competitor.name);
    const matched = competitor.aliases.map(normalizeCompetitorName).filter(Boolean).some((alias) => normalizedAnswer.includes(alias));
    if (!normalizedCompetitorName || existingNames.has(normalizedCompetitorName) || !matched) continue;
    detectedMentions.push({ name: competitor.name, rank: null, sentiment: 'neutral' });
    existingNames.add(normalizedCompetitorName);
  }
  if (detectedMentions.length === 0) return run;
  return {
    ...run,
    analysis: {
      ...run.analysis,
      competitorMentions: [...run.analysis.competitorMentions, ...detectedMentions]
    }
  };
}
