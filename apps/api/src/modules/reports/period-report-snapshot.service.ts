import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  BrandId,
  ContentAsset,
  EffectEvidence,
  MonitoringRunDetail,
  OptimizationTask,
  PublishingRecord,
  ReportDataGap,
  ReportScopePreview,
  RetestRecord
} from '@geo-platform/shared-types';
import { hasRealMonitoringResponseSample } from '@geo-platform/shared-types';

export const REPORT_METHODOLOGY_VERSION = 'period-report-v1';

export type ReportPeriod = {
  periodStart: string;
  periodEnd: string;
  startInclusive: Date;
  endExclusive: Date;
};

export type ReportScopeSource = {
  monitoringRuns: MonitoringRunDetail[];
  contentAssets: ContentAsset[];
  publishingRecords: PublishingRecord[];
  tasks: OptimizationTask[];
};

@Injectable()
export class PeriodReportSnapshotService {
  readonly methodologyVersion = REPORT_METHODOLOGY_VERSION;

  resolvePeriod(periodStart?: string, periodEnd?: string, now = new Date()): ReportPeriod {
    const fallbackDate = now.toISOString().slice(0, 10);
    const start = parseDateOnly(periodStart?.trim() || fallbackDate, '统计开始日期');
    const end = parseDateOnly(periodEnd?.trim() || fallbackDate, '统计结束日期');
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('统计开始日期必须早于或等于统计结束日期');
    }

    return {
      periodStart: toDateOnly(start),
      periodEnd: toDateOnly(end),
      startInclusive: start,
      endExclusive: new Date(end.getTime() + 24 * 60 * 60 * 1000)
    };
  }

  includes(period: ReportPeriod, value?: string | Date | null): boolean {
    if (!value) return false;
    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isFinite(timestamp)
      && timestamp >= period.startInclusive.getTime()
      && timestamp < period.endExclusive.getTime();
  }

  buildPreview(brandId: BrandId, period: ReportPeriod, source: ReportScopeSource): ReportScopePreview {
    const monitoringRuns = source.monitoringRuns.filter((run) => this.includes(period, run.completedAt ?? run.startedAt ?? run.createdAt));
    const validSamples = monitoringRuns.filter(hasRealMonitoringResponseSample).filter((run) => Boolean(run.analysis));
    const contentAssets = source.contentAssets.filter((asset) => this.includes(period, asset.createdAt));
    const publishingRecords = source.publishingRecords.filter((record) => this.includes(period, record.publishedAt ?? record.createdAt));
    const tasks = source.tasks.filter((task) => this.includes(period, task.updatedAt));
    const completedRetests = source.tasks.flatMap((task) => task.retestRecords.filter((record) => this.includes(period, record.completedAt)));
    const sampleTimes = validSamples
      .map((run) => run.response?.respondedAt ?? run.completedAt ?? run.createdAt)
      .sort();
    const dataGaps = buildScopeDataGaps(validSamples.length, publishingRecords.length, completedRetests.length);

    return {
      brandId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      monitoringRunCount: monitoringRuns.length,
      validSampleCount: validSamples.length,
      contentAssetCount: contentAssets.length,
      publishingRecordCount: publishingRecords.length,
      taskChangeCount: tasks.length,
      completedRetestCount: completedRetests.length,
      dataGaps,
      recordIds: {
        monitoringRunIds: monitoringRuns.map((run) => run.id),
        contentAssetIds: contentAssets.map((asset) => asset.id),
        publishingRecordIds: publishingRecords.map((record) => record.id),
        taskIds: tasks.map((task) => task.id),
        retestRecordIds: completedRetests.map((record) => record.id)
      },
      sampleSummary: {
        monitoringRunCount: monitoringRuns.length,
        validSampleCount: validSamples.length,
        validSampleRunIds: validSamples.map((run) => run.id),
        firstSampleAt: sampleTimes[0],
        lastSampleAt: sampleTimes[sampleTimes.length - 1]
      }
    };
  }

  buildEffectEvidence(brandId: BrandId, period: ReportPeriod, source: ReportScopeSource): EffectEvidence[] {
    const runsById = new Map(source.monitoringRuns.map((run) => [run.id, run]));
    const assetsById = new Map(source.contentAssets.map((asset) => [asset.id, asset]));

    return source.tasks.flatMap((task) => task.retestRecords
      .filter((record) => this.includes(period, record.completedAt))
      .map((record) => this.toEffectEvidence(brandId, task, record, source.publishingRecords, runsById, assetsById)));
  }

  private toEffectEvidence(
    brandId: BrandId,
    task: OptimizationTask,
    record: RetestRecord,
    publishingRecords: PublishingRecord[],
    runsById: Map<string, MonitoringRunDetail>,
    assetsById: Map<string, ContentAsset>
  ): EffectEvidence {
    const linkedPublishingRecords = publishingRecords.filter((item) => {
      const asset = assetsById.get(item.contentAssetId);
      return Boolean(task.contentLink && (item.publishedUrl === task.contentLink || asset?.url === task.contentLink));
    });
    const sourceRun = runsById.get(record.sourceRunId);
    const retestRun = runsById.get(record.retestRunId);
    const baselineValid = Boolean(sourceRun && hasRealMonitoringResponseSample(sourceRun) && sourceRun.analysis);
    const retestValid = Boolean(retestRun && hasRealMonitoringResponseSample(retestRun) && retestRun.analysis);
    const dataGaps: ReportDataGap[] = [];
    if (!baselineValid) dataGaps.push({ section: '基线证据', reason: '基线运行缺少真实回答或分析结果' });
    if (!retestValid) dataGaps.push({ section: '再次监测证据', reason: '再次监测运行缺少真实回答或分析结果' });
    if (linkedPublishingRecords.length === 0) dataGaps.push({ section: '发布证据', reason: '优化任务尚未关联可追溯的发布记录' });

    return {
      brandId,
      taskId: task.id,
      taskTitle: task.title,
      sourceRunId: record.sourceRunId,
      retestRunId: record.retestRunId,
      contentAssetIds: Array.from(new Set(linkedPublishingRecords.map((item) => item.contentAssetId))),
      publishingRecords: linkedPublishingRecords.map((item) => ({
        id: item.id,
        platform: item.platform,
        versionId: item.versionId,
        contentVersion: item.contentVersion,
        publishedUrl: item.publishedUrl,
        publishedAt: item.publishedAt
      })),
      baselineMetrics: record.beforeMetrics,
      afterMetrics: record.afterMetrics,
      metricDelta: record.metricDelta,
      sampleSummary: { baselineValid, retestValid },
      evidenceStatus: dataGaps.length === 0 ? 'complete' : 'partial',
      dataGaps
    };
  }
}

function parseDateOnly(value: string, label: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new BadRequestException(`${label}必须使用 YYYY-MM-DD 格式`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new BadRequestException(`${label}不是有效日历日期`);
  }
  return date;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildScopeDataGaps(validSampleCount: number, publishingRecordCount: number, completedRetestCount: number): ReportDataGap[] {
  const gaps: ReportDataGap[] = [];
  if (validSampleCount === 0) gaps.push({ section: '有效样本', reason: '统计周期内没有包含真实回答和分析结果的监测样本' });
  if (publishingRecordCount === 0) gaps.push({ section: '发布记录', reason: '统计周期内没有可追溯的发布记录' });
  if (completedRetestCount === 0) gaps.push({ section: '效果验证', reason: '统计周期内没有已完成的再次监测' });
  return gaps;
}
