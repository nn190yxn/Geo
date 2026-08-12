import { describe, expect, it, vi } from 'vitest';
import type { MeasurementScope, MonitoringRunDetail } from '@geo-platform/shared-types';
import { SampleEvidenceService } from '../src/modules/analysis/sample-evidence.service';
import {
  buildMeasurementTrendSegments,
  isComparableMeasurementScope
} from '../src/modules/monitoring/measurement-baseline';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P13: metric samples preserve complete evidence ${validatesCriteria(['21.1', '21.6'])}`, () => {
  it('associates every trend sample with its response, measurement scope, and evidence level', async () => {
    const scopes = measurementScopes();
    const runs = scopes.map((scope, index) => createRun(`run-${index}`, scope, `原始回答 ${index}`));
    const segments = buildMeasurementTrendSegments(runs);
    const metricRunIds = segments.flatMap((segment) => segment.runIds);
    const evidence = await createEvidenceService(runs).getEvidence('user-1', 'brand-1', metricRunIds);

    expect(new Set(metricRunIds)).toEqual(new Set(runs.map((run) => run.id)));
    expect(evidence?.missingRunIds).toEqual([]);
    expect(evidence?.items).toHaveLength(runs.length);

    for (const run of runs) {
      const item = evidence?.items.find((candidate) => candidate.runId === run.id);
      expect(item).toBeDefined();
      expect(item?.rawAnswer).toBe(run.response?.rawText);
      expect(item?.citations).toEqual(run.response?.citations);
      expect(item?.measurementScope).toEqual(pickScope(run.response!));
      expect(item?.measurementScope.evidenceLevel).toBe(run.response?.evidenceLevel);
    }
  });
});

describe(`Property P14: trend segments contain compatible baseline samples ${validatesCriteria(['21.3'])}`, () => {
  it('partitions every generated sample by baseline version and comparable measurement conditions', () => {
    const scopes = measurementScopes();
    const runs = scopes.map((scope, index) => createRun(`run-${index}`, scope, `回答 ${index}`));
    const runsById = new Map(runs.map((run) => [run.id, run]));
    const segments = buildMeasurementTrendSegments([...runs].reverse());

    expect(new Set(segments.flatMap((segment) => segment.runIds))).toEqual(new Set(runs.map((run) => run.id)));

    for (const segment of segments) {
      const segmentRuns = segment.runIds.map((runId) => runsById.get(runId)!);
      expect(segmentRuns.length).toBeGreaterThan(0);
      for (const run of segmentRuns) {
        expect(run.response?.baselineVersion).toBe(segment.baselineVersion);
        expect(isComparableMeasurementScope(segment.measurementScope, run.response!)).toBe(true);
      }
      for (const left of segmentRuns) {
        for (const right of segmentRuns) {
          expect(isComparableMeasurementScope(left.response!, right.response!)).toBe(true);
        }
      }
    }
  });
});

function measurementScopes(): MeasurementScope[] {
  const platforms = ['doubao', 'kimi'];
  const models = ['model-a', 'model-b'];
  const searchModes = [true, false];
  const baselines = ['baseline-1', 'baseline-2'];
  const scopes: MeasurementScope[] = [];

  for (const platformCode of platforms) {
    for (const modelName of models) {
      for (const searchEnabled of searchModes) {
        for (const baselineVersion of baselines) {
          const index = scopes.length;
          scopes.push({
            platformCode,
            modelName,
            collectionMethod: index % 2 === 0 ? 'api' : 'browser',
            clientSurface: index % 2 === 0 ? 'api' : 'web',
            searchEnabled,
            market: index % 3 === 0 ? 'CN' : 'SG',
            language: index % 4 === 0 ? 'zh-CN' : 'en-SG',
            evidenceLevel: index % 2 === 0 ? 'reproducible_api' : 'manual_or_browser',
            manualConfirmed: index % 2 === 0 ? null : true,
            baselineVersion
          });
        }
      }
    }
  }
  return scopes;
}

function createRun(id: string, scope: MeasurementScope, rawText: string): MonitoringRunDetail {
  const createdAt = `2026-08-${String((Number(id.split('-')[1]) % 28) + 1).padStart(2, '0')}T00:00:00.000Z`;
  return {
    id,
    brandId: 'brand-1',
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    promptId: `prompt-${id}`,
    promptKind: 'discovery',
    promptText: `测试问题 ${id}`,
    status: 'completed',
    createdAt,
    ...scope,
    response: {
      id: `response-${id}`,
      runId: id,
      brandId: 'brand-1',
      rawText,
      citations: [`https://source.example/${id}`],
      respondedAt: createdAt,
      parseStatus: 'parsed',
      createdAt,
      ...scope
    },
    analysis: {
      id: `analysis-${id}`,
      responseId: `response-${id}`,
      runId: id,
      brandId: 'brand-1',
      brandMentioned: true,
      brandRank: 1,
      sentiment: 'positive',
      accuracyScore: 90,
      citationScore: 80,
      platformEvaluation: '',
      recommendationReason: '',
      rankingReason: '',
      expressionCompleteness: '',
      expressionDeviation: '',
      competitorMentions: [],
      reviewRequired: false,
      updatedAt: createdAt
    }
  };
}

function createEvidenceService(runs: MonitoringRunDetail[]): SampleEvidenceService {
  return new SampleEvidenceService({ listMonitoringRuns: vi.fn(() => runs) } as unknown as PermissionsService);
}

function pickScope(scope: MeasurementScope): MeasurementScope {
  return {
    platformCode: scope.platformCode,
    modelName: scope.modelName,
    collectionMethod: scope.collectionMethod,
    clientSurface: scope.clientSurface,
    searchEnabled: scope.searchEnabled,
    market: scope.market,
    language: scope.language,
    evidenceLevel: scope.evidenceLevel,
    manualConfirmed: scope.manualConfirmed,
    baselineVersion: scope.baselineVersion
  };
}
