import { describe, expect, it } from 'vitest';
import { OperationScheduleService } from '../src/modules/reports/operation-schedule.service';
import { FormalReportService } from '../src/modules/reports/formal-report.service';

describe('operation delivery boundaries', () => {
  it('uses weekly audits and biweekly answer sampling by default', () => expect(new OperationScheduleService().defaultPlan()).toMatchObject({ siteAudit: 'weekly', answerSampling: 'biweekly' }));
  it('estimates sampling cost before accepting a frequency change', () => expect(new OperationScheduleService().preview({ siteAudit: 'monthly', answerSampling: 'weekly', questionCount: 3, platformCount: 2, rounds: 4 })).toMatchObject({ estimatedCost: 24, trendImpact: expect.any(String) }));
  it('keeps diagnostic, optimization, and execution documents on one frozen reference', () => {
    const service = new FormalReportService(); const shared = { snapshotId: 'snapshot-a', methodologyVersion: 'v1', manifestId: 'bundle-a', periodStart: '2026-08-01', periodEnd: '2026-08-07' };
    const documents = ['diagnostic', 'optimization', 'execution'].map((kind) => service.create(kind as any, shared));
    expect(new Set(documents.map((document) => `${document.snapshotId}:${document.methodologyVersion}:${document.manifestId}:${document.periodStart}:${document.periodEnd}`)).size).toBe(1);
  });
});
