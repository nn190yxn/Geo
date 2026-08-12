import { describe, expect, it, vi } from 'vitest';
import { AnalysisController } from '../src/modules/analysis/analysis.controller';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import type { SampleEvidenceService } from '../src/modules/analysis/sample-evidence.service';
import type { MeasurementDisciplineService } from '../src/modules/analysis/measurement-discipline.service';
import type { OpportunityDiscoveryService } from '../src/modules/analysis/opportunity-discovery.service';
import type { ChannelRoadmapService } from '../src/modules/analysis/channel-roadmap.service';

const request = { context: { userId: 'user_1' } } as never;

describe('AnalysisController sample evidence', () => {
  it('parses run references and returns brand-scoped evidence', async () => {
    const getEvidence = vi.fn(async () => ({
      brandId: 'brand_1', measurementStatus: 'insufficient' as const,
      requestedRunIds: ['run_1', 'run_2'], missingRunIds: [], items: []
    }));
    const controller = new AnalysisController(
      {} as PermissionsService,
      { getEvidence } as unknown as SampleEvidenceService,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(controller.getSampleEvidence(request, 'brand_1', 'run_1, run_2')).resolves.toMatchObject({
      success: true,
      data: { brandId: 'brand_1' }
    });
    expect(getEvidence).toHaveBeenCalledWith('user_1', 'brand_1', ['run_1', ' run_2']);
  });

  it('attaches source run references to generated findings', async () => {
    const permissionsService = {
      getCompetitorDashboard: vi.fn(() => ({ brandId: 'brand_1', highRiskIntents: [], comparisons: [], suppressionRate: 0 })),
      getCitationDashboard: vi.fn(() => ({
        brandId: 'brand_1',
        sources: [{
          id: 'source_1', runId: 'run_1', title: '官网', promptText: '问题', platformCode: 'doubao',
          citationCount: 1, sourceType: 'official_site', url: 'https://example.com'
        }]
      })),
      getEvaluationDashboard: vi.fn(() => ({ brandId: 'brand_1', issues: [] }))
    } as unknown as PermissionsService;
    const controller = new AnalysisController(permissionsService, {} as SampleEvidenceService, {} as never, {} as never, {} as never);

    const response = await controller.getAnalysisDiagnosis(request, 'brand_1');

    expect(response.data.findings[0]).toMatchObject({ id: 'citation-source_1', relatedRunIds: ['run_1'] });
  });

  it('returns comparable segments and saves observational attribution', async () => {
    const getResult = vi.fn().mockResolvedValue({ brandId: 'brand_1', measurementStatus: 'unmeasured', conditionChanged: false, segments: [], currentMetrics: [] });
    const saveAttribution = vi.fn().mockImplementation(async (_userId, brandId, input) => ({
      id: 'attribution_1', brandId, ...input, conclusionType: 'observational_correlation', updatedBy: 'user_1', createdAt: '2026-08-03', updatedAt: '2026-08-03'
    }));
    const controller = new AnalysisController(
      {} as PermissionsService,
      {} as SampleEvidenceService,
      { getResult, saveAttribution } as unknown as MeasurementDisciplineService,
      {} as never,
      {} as never
    );
    await expect(controller.getMeasurementDiscipline(request, 'brand_1')).resolves.toMatchObject({ data: { conditionChanged: false } });
    await expect(controller.saveMeasurementAttribution(request, 'brand_1', {
      baselineWindowStart: '2026-07-01', baselineWindowEnd: '2026-07-31',
      observationWindowStart: '2026-08-01', observationWindowEnd: '2026-08-31',
      controlQuestions: [' 问题一 ', '问题一'], externalEvents: [], conclusion: ' 观察改善 '
    })).resolves.toMatchObject({ data: { conclusionType: 'observational_correlation' } });
    expect(saveAttribution).toHaveBeenCalledWith('user_1', 'brand_1', expect.objectContaining({ controlQuestions: ['问题一'], conclusion: '观察改善' }));
  });

  it('returns the brand opportunity map', async () => {
    const getMap = vi.fn().mockResolvedValue({
      brandId: 'brand_1', measurementStatus: 'valid', sampleCount: 3, questionDimensions: [], diagnosticTypes: [],
      competitorThemes: [], citedDomains: [], channelRecommendations: [], contentOpportunities: [], generationMethod: 'deterministic'
    });
    const controller = new AnalysisController(
      {} as PermissionsService,
      {} as SampleEvidenceService,
      {} as MeasurementDisciplineService,
      { getMap } as unknown as OpportunityDiscoveryService,
      {} as ChannelRoadmapService
    );

    await expect(controller.getOpportunityMap(request, 'brand_1')).resolves.toMatchObject({
      success: true,
      data: { brandId: 'brand_1', generationMethod: 'deterministic' }
    });
    expect(getMap).toHaveBeenCalledWith('user_1', 'brand_1');
  });

  it('returns the brand channel roadmap', async () => {
    const getRoadmap = vi.fn().mockResolvedValue({
      brandId: 'brand_1', measurementStatus: 'valid', sampleCount: 3, items: [],
      generatedAt: '2026-08-04T00:00:00.000Z', generationMethod: 'deterministic'
    });
    const controller = new AnalysisController(
      {} as PermissionsService,
      {} as SampleEvidenceService,
      {} as MeasurementDisciplineService,
      {} as OpportunityDiscoveryService,
      { getRoadmap } as unknown as ChannelRoadmapService
    );

    await expect(controller.getChannelRoadmap(request, 'brand_1')).resolves.toMatchObject({
      success: true,
      data: { brandId: 'brand_1', items: [] }
    });
    expect(getRoadmap).toHaveBeenCalledWith('user_1', 'brand_1');
  });
});
