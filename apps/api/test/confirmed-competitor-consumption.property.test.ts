import { describe, expect, it } from 'vitest';
import type {
  AnalysisResult,
  Competitor,
  CompetitorCandidate,
  CompetitorCandidateLifecycleStatus,
  MonitoringRunDetail
} from '@geo-platform/shared-types';
import {
  buildCompetitorPlatformStrengths,
  buildCompetitorQuestionOpportunities,
  getConfirmedCompetitorNames
} from '../src/modules/competitors/competitor-opportunity.service';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P23: competitor consumers use confirmed competitors only ${validatesCriteria(['29.1', '29.2', '29.3'])}`, () => {
  it('allows formal, sample-confirmed, and user-confirmed competitors across analysis and content evidence', () => {
    const statuses: CompetitorCandidateLifecycleStatus[] = ['candidate', 'sample_confirmed', 'user_confirmed', 'excluded'];
    const formalCompetitor = createCompetitor();

    for (let mask = 0; mask < 256; mask += 1) {
      let state = mask;
      const candidates = statuses.map((lifecycleStatus, index) => {
        const selectedStatus = statuses[state % statuses.length];
        state = Math.floor(state / statuses.length);
        return createCandidate(`候选 ${index}`, selectedStatus ?? lifecycleStatus);
      });
      const confirmedNames = getConfirmedCompetitorNames([formalCompetitor], candidates);
      const expectedNames = new Set([
        '正式竞品', 'formal rival',
        ...candidates.filter((candidate) => ['sample_confirmed', 'user_confirmed'].includes(candidate.lifecycleStatus)).map((candidate) => candidate.name.toLocaleLowerCase())
      ]);

      expect(confirmedNames).toEqual(expectedNames);

      const mentionedNames = ['正式竞品', ...candidates.map((candidate) => candidate.name)];
      const runs = [createRun(mentionedNames)];
      const opportunities = buildCompetitorQuestionOpportunities(runs, confirmedNames);
      const strengths = buildCompetitorPlatformStrengths(runs, confirmedNames);
      const consumedNames = new Set([
        ...(opportunities[0]?.confirmedCompetitorNames ?? []).map((name) => name.toLocaleLowerCase()),
        ...strengths.map((item) => item.competitorName.toLocaleLowerCase())
      ]);

      expect([...consumedNames].every((name) => expectedNames.has(name))).toBe(true);
      expect([...candidates.filter((candidate) => ['candidate', 'excluded'].includes(candidate.lifecycleStatus))]
        .every((candidate) => !consumedNames.has(candidate.name.toLocaleLowerCase()))).toBe(true);
    }
  });
});

function createCompetitor(): Competitor {
  return {
    id: 'competitor-1', brandId: 'brand-1', name: '正式竞品', aliases: ['Formal Rival'], website: 'https://rival.example',
    industryTags: [], comparisonNote: '', suppressionRule: { consecutiveThreshold: 2, minimumRankGap: 1 },
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z'
  };
}

function createCandidate(name: string, lifecycleStatus: CompetitorCandidateLifecycleStatus): CompetitorCandidate {
  return {
    candidateId: `candidate-${name}`, runId: 'discovery-1', brandId: 'brand-1', sourceProvider: 'manual', name,
    address: '贵阳', city: '贵阳', matchedKeywords: [], score: 80, suggestedLabel: 'direct_competitor', matchReasons: [],
    confidence: 'medium', isCampusFocus: true, decisionStatus: lifecycleStatus === 'user_confirmed' ? 'confirmed' : lifecycleStatus === 'excluded' ? 'excluded' : 'pending',
    lifecycleStatus, evidenceSampleIds: lifecycleStatus === 'sample_confirmed' ? ['run-1'] : [],
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z'
  };
}

function createRun(competitorNames: string[]): MonitoringRunDetail & { analysis: AnalysisResult } {
  const measurementScope = {
    platformCode: 'doubao', modelName: 'model-v1', collectionMethod: 'api' as const, clientSurface: 'api' as const,
    searchEnabled: true, market: 'CN', language: 'zh-CN', evidenceLevel: 'reproducible_api' as const,
    manualConfirmed: null, baselineVersion: 'baseline-1'
  };
  return {
    id: 'run-1', brandId: 'brand-1', optimizationUnitId: 'unit-1', intentId: 'intent-1', promptId: 'prompt-1',
    promptText: '同类机构怎么选？', status: 'completed', createdAt: '2026-08-01T00:00:00.000Z', ...measurementScope,
    response: {
      id: 'response-1', runId: 'run-1', brandId: 'brand-1', rawText: '真实回答', citations: [],
      respondedAt: '2026-08-01T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-08-01T00:00:00.000Z', ...measurementScope
    },
    analysis: {
      id: 'analysis-1', responseId: 'response-1', runId: 'run-1', brandId: 'brand-1', brandMentioned: false, brandRank: null,
      sentiment: 'neutral', accuracyScore: 80, citationScore: 50, platformEvaluation: '', recommendationReason: '', rankingReason: '',
      expressionCompleteness: '', expressionDeviation: '',
      competitorMentions: competitorNames.map((name, index) => ({ name, rank: index + 1, sentiment: 'neutral' as const })),
      reviewRequired: false, updatedAt: '2026-08-01T00:00:00.000Z'
    }
  };
}
