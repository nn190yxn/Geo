import { Injectable } from '@nestjs/common';
import type { BrandId, MeasurementScope, MonitoringRunDetail, SampleEvidenceResult } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class SampleEvidenceService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async getEvidence(userId: string, brandId: BrandId, requestedRunIds: string[]): Promise<SampleEvidenceResult | null> {
    const runs = await Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId));
    if (!runs) return null;

    const normalizedRunIds = [...new Set(requestedRunIds.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    const requested = normalizedRunIds.length > 0 ? new Set(normalizedRunIds) : null;
    const selectedRuns = runs.filter((run) => !requested || requested.has(run.id));
    const items = selectedRuns
      .filter((run): run is MonitoringRunDetail & { response: NonNullable<MonitoringRunDetail['response']> } => Boolean(run.response?.rawText.trim()))
      .map((run) => ({
        runId: run.id,
        promptId: run.promptId,
        promptKind: run.promptKind,
        question: run.promptText,
        platformCode: run.response.platformCode,
        modelName: run.response.modelName,
        collectedAt: run.response.respondedAt,
        rawAnswer: run.response.rawText,
        citations: run.response.citations,
        analysis: run.analysis,
        measurementScope: pickMeasurementScope(run.response)
      }))
      .sort((left, right) => right.collectedAt.localeCompare(left.collectedAt));

    return {
      brandId,
      measurementStatus: items.length === 0 ? 'unmeasured' : items.length < 3 ? 'insufficient' : 'valid',
      requestedRunIds: normalizedRunIds,
      missingRunIds: normalizedRunIds.filter((id) => !items.some((item) => item.runId === id)),
      items
    };
  }
}

function pickMeasurementScope(scope: MeasurementScope): MeasurementScope {
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
