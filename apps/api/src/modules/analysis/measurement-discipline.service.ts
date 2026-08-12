import { Injectable } from '@nestjs/common';
import type {
  BrandId,
  CompositeMetricComponent,
  MeasurementAttributionInput,
  MeasurementAttributionRecord,
  MeasurementDisciplineResult,
  MetricTrendSnapshot
} from '@geo-platform/shared-types';
import { buildMeasurementMetrics, buildMeasurementTrendSegments } from '../monitoring/measurement-baseline';
import { MetricIntegrityService, promptMetricWeights } from '../monitoring/metric-integrity.service';
import { buildPromptMeasurementBreakdown } from '../monitoring/prompt-measurement';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class MeasurementDisciplineService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly metricIntegrityService: MetricIntegrityService = new MetricIntegrityService()
  ) {}

  async getResult(userId: string, brandId: BrandId): Promise<MeasurementDisciplineResult | null> {
    const [runs, attribution, brands] = await Promise.all([
      Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId)),
      this.permissionsService.getMeasurementAttribution(userId, brandId),
      Promise.resolve(this.permissionsService.listAccessibleBrandDetails(userId))
    ]);
    if (!runs) return null;
    const brand = brands.find((item) => item.brandId === brandId);
    if (!brand) return null;
    const segments = buildMeasurementTrendSegments(runs);
    const current = segments.at(-1);
    const currentMetrics = current?.metrics ?? buildMeasurementMetrics([]);
    const promptBreakdown = buildPromptMeasurementBreakdown(runs, brand);
    const currentRunIds = new Set(current?.runIds ?? []);
    const currentPromptBreakdown = buildPromptMeasurementBreakdown(runs.filter((run) => currentRunIds.has(run.id)), brand);
    const compositeMetric = this.metricIntegrityService.normalizeCompositeMetric(
      [currentPromptBreakdown.discovery, currentPromptBreakdown.brandProbe].flatMap((section) => section.metrics)
        .filter((metric) => promptMetricWeights[metric.code] !== undefined).map((metric): CompositeMetricComponent => ({
        code: metric.code,
        label: metric.label,
        measurementStatus: metric.measurementStatus,
        value: metric.value,
        configuredWeight: promptMetricWeights[metric.code]
      }))
    );
    const runsByPeriod = new Map<string, typeof runs>();
    runs.forEach((run) => {
      const period = (run.response?.respondedAt ?? run.completedAt ?? run.createdAt).slice(0, 10);
      runsByPeriod.set(period, [...(runsByPeriod.get(period) ?? []), run]);
    });
    const trendSnapshots: MetricTrendSnapshot[] = Array.from(runsByPeriod.entries()).flatMap(([period, periodRuns]) => {
      const runBreakdown = buildPromptMeasurementBreakdown(periodRuns, brand);
      return runBreakdown.series.flatMap((series) => series.metrics.map((metric) => ({
        metricCode: metric.code,
        metricLabel: metric.label,
        period,
        measurementScope: series.measurementScope,
        measurementStatus: metric.measurementStatus,
        value: metric.value,
        runIds: series.runIds
      })));
    });
    return {
      brandId,
      measurementStatus: current?.measurementStatus ?? 'unmeasured',
      conditionChanged: segments.length > 1,
      segments,
      currentMetrics,
      promptBreakdown,
      compositeMetric,
      platformComparisons: this.metricIntegrityService.evaluatePlatformComparisons(promptBreakdown.series),
      metricTrends: this.metricIntegrityService.evaluateMetricTrends(trendSnapshots),
      attribution: attribution ?? undefined
    };
  }

  saveAttribution(userId: string, brandId: BrandId, input: MeasurementAttributionInput): Promise<MeasurementAttributionRecord | null> {
    return this.permissionsService.saveMeasurementAttribution(userId, brandId, input);
  }
}
