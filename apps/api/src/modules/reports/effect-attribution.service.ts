import { Injectable } from '@nestjs/common';
import type { BrandId, EffectEvidenceDashboard, ReportDataGap } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { PeriodReportSnapshotService } from './period-report-snapshot.service';

@Injectable()
export class EffectAttributionService {
  private readonly periodReportSnapshotService = new PeriodReportSnapshotService();

  constructor(private readonly permissionsService: PermissionsService) {}

  async getDashboard(userId: string, brandId: BrandId, now = new Date()): Promise<EffectEvidenceDashboard | null> {
    const [reportDashboard, monitoringRuns, contentAssets, publishingDashboard, taskBoard] = await Promise.all([
      Promise.resolve(this.permissionsService.getReportDashboard(userId, brandId)),
      Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId)),
      Promise.resolve(this.permissionsService.listContentAssets(userId, brandId)),
      Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId)),
      Promise.resolve(this.permissionsService.getTaskBoard(userId, brandId))
    ]);
    if (!reportDashboard || !monitoringRuns || !contentAssets || !publishingDashboard || !taskBoard) return null;

    const latestReport = reportDashboard.latest;
    const period = this.periodReportSnapshotService.resolvePeriod(
      latestReport?.periodStart ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`,
      latestReport?.periodEnd ?? now.toISOString().slice(0, 10),
      now
    );
    const source = {
      monitoringRuns,
      contentAssets,
      publishingRecords: publishingDashboard.records,
      tasks: taskBoard.tasks
    };
    const preview = this.periodReportSnapshotService.buildPreview(brandId, period, source);
    const evidence = this.periodReportSnapshotService.buildEffectEvidence(brandId, period, source);
    const dataGaps = uniqueGaps([
      ...preview.dataGaps,
      ...evidence.flatMap((item) => item.dataGaps)
    ]);

    return {
      brandId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      periodSource: latestReport ? 'latest_report' : 'current_month',
      evidence,
      dataGaps
    };
  }
}

function uniqueGaps(gaps: ReportDataGap[]): ReportDataGap[] {
  return gaps.filter((gap, index) => gaps.findIndex((item) => item.section === gap.section && item.reason === gap.reason) === index);
}
