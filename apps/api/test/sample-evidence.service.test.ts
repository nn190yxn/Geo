import { describe, expect, it, vi } from 'vitest';
import type { MonitoringRunDetail } from '@geo-platform/shared-types';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import { SampleEvidenceService } from '../src/modules/analysis/sample-evidence.service';

describe('SampleEvidenceService', () => {
  it('returns response-level measurement scope and reports missing references', async () => {
    const service = createService([runFixture()]);
    const result = await service.getEvidence('user_1', 'brand_1', ['run_1', 'run_missing', 'run_1']);

    expect(result).toMatchObject({
      brandId: 'brand_1',
      measurementStatus: 'insufficient',
      requestedRunIds: ['run_1', 'run_missing'],
      missingRunIds: ['run_missing']
    });
    expect(result?.items[0]).toMatchObject({
      runId: 'run_1',
      promptKind: 'discovery',
      question: '哪个儿童运动品牌值得推荐？',
      platformCode: 'doubao',
      modelName: 'response-model',
      collectedAt: '2026-08-03T01:00:00.000Z',
      rawAnswer: '推荐示例品牌。',
      measurementScope: {
        collectionMethod: 'browser',
        clientSurface: 'web',
        evidenceLevel: 'manual_or_browser',
        manualConfirmed: true
      }
    });
  });

  it('returns unmeasured for an empty valid response scope', async () => {
    const run = runFixture();
    run.response = { ...run.response!, rawText: '  ' };
    const result = await createService([run]).getEvidence('user_1', 'brand_1', []);

    expect(result?.measurementStatus).toBe('unmeasured');
    expect(result?.items).toEqual([]);
  });

  it('preserves the repository access denial result', async () => {
    const permissionsService = { listMonitoringRuns: vi.fn(() => null) } as unknown as PermissionsService;
    const service = new SampleEvidenceService(permissionsService);

    await expect(service.getEvidence('user_2', 'brand_1', [])).resolves.toBeNull();
  });
});

function createService(runs: MonitoringRunDetail[]) {
  return new SampleEvidenceService({ listMonitoringRuns: vi.fn(() => runs) } as unknown as PermissionsService);
}

function runFixture(): MonitoringRunDetail {
  return {
    id: 'run_1', brandId: 'brand_1', optimizationUnitId: 'unit_1', intentId: 'intent_1', promptId: 'prompt_1',
    promptKind: 'discovery', promptText: '哪个儿童运动品牌值得推荐？', platformCode: 'doubao', modelName: 'planned-model',
    collectionMethod: 'api', clientSurface: 'api', searchEnabled: null, market: 'CN', language: 'zh-CN',
    evidenceLevel: 'reproducible_api', manualConfirmed: null, baselineVersion: 'baseline-1',
    status: 'completed', createdAt: '2026-08-03T00:00:00.000Z',
    response: {
      id: 'response_1', runId: 'run_1', brandId: 'brand_1', rawText: '推荐示例品牌。',
      citations: ['https://example.com/source'], respondedAt: '2026-08-03T01:00:00.000Z',
      parseStatus: 'parsed', createdAt: '2026-08-03T01:00:00.000Z', platformCode: 'doubao',
      modelName: 'response-model', collectionMethod: 'browser', clientSurface: 'web', searchEnabled: true, market: 'CN',
      language: 'zh-CN', evidenceLevel: 'manual_or_browser', manualConfirmed: true, baselineVersion: 'baseline-1'
    }
  };
}
