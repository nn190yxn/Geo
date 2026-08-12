import { describe, expect, it, vi } from 'vitest';
import { MeasurementDisciplineService } from '../src/modules/analysis/measurement-discipline.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('MeasurementDisciplineService', () => {
  it('returns explicit unmeasured metrics and the latest observational attribution', async () => {
    const attribution = {
      id: 'attr-1', brandId: 'brand_demo', baselineWindowStart: '2026-07-01', baselineWindowEnd: '2026-07-31',
      observationWindowStart: '2026-08-01', observationWindowEnd: '2026-08-31', controlQuestions: ['对照问题'], externalEvents: [],
      conclusionType: 'observational_correlation' as const, updatedBy: 'user_demo', createdAt: '2026-08-03', updatedAt: '2026-08-03'
    };
    const permissionsService = {
      listMonitoringRuns: vi.fn().mockReturnValue([]),
      listAccessibleBrandDetails: vi.fn().mockReturnValue([{ brandId: 'brand_demo', name: '示例品牌', aliases: [], website: 'https://example.com' }]),
      getMeasurementAttribution: vi.fn().mockResolvedValue(attribution)
    } as unknown as PermissionsService;
    const result = await new MeasurementDisciplineService(permissionsService).getResult('user_demo', 'brand_demo');
    expect(result?.measurementStatus).toBe('unmeasured');
    expect(result?.currentMetrics.every((item) => item.value === null)).toBe(true);
    expect(result?.promptBreakdown.discovery.measurementStatus).toBe('unmeasured');
    expect(result?.promptBreakdown.brandProbe.measurementStatus).toBe('unmeasured');
    expect(result?.attribution?.conclusionType).toBe('observational_correlation');
  });

  it('preserves the brand access boundary', async () => {
    const permissionsService = {
      listMonitoringRuns: vi.fn().mockReturnValue(null),
      listAccessibleBrandDetails: vi.fn().mockReturnValue([]),
      getMeasurementAttribution: vi.fn().mockResolvedValue(null)
    } as unknown as PermissionsService;
    await expect(new MeasurementDisciplineService(permissionsService).getResult('user_other', 'brand_demo')).resolves.toBeNull();
  });
});
