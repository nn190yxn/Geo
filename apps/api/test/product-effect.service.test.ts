import { describe, expect, it } from 'vitest';
import { ProductEffectService } from '../src/modules/product-events/product-effect.service';
import { ProductEventRepository } from '../src/modules/product-events/product-event.repository';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

const from = '2026-08-01T00:00:00.000Z';
const to = '2026-08-31T00:00:00.000Z';

describe('ProductEffectService', () => {
  it('从隔离事件聚合完整闭环指标和首次洞察耗时', async () => {
    const repository = new ProductEventRepository();
    const service = createService(repository);
    const events = [
      ['brand_created', '2026-08-01T00:00:00.000Z'], ['first_monitoring_completed', '2026-08-01T03:00:00.000Z'],
      ['recommendation_adopted', '2026-08-02T00:00:00.000Z'], ['content_saved', '2026-08-03T00:00:00.000Z'],
      ['published', '2026-08-04T00:00:00.000Z'], ['retest_completed', '2026-08-05T00:00:00.000Z']
    ] as const;
    events.forEach(([eventType, occurredAt], index) => repository.record({ organizationId: 'org-a', brandId: 'brand-a', eventType, idempotencyKey: `${eventType}-${index}`, occurredAt, metadata: eventType === 'retest_completed' ? { status: 'improved' } : {} }));

    const dashboard = await service.getDashboard('user-a', 'brand-a', from, to);

    expect(dashboard?.sampleSize).toBe(6);
    expect(dashboard?.metrics).toMatchObject([
      { key: 'firstMonitoringReachRate', value: 100 }, { key: 'timeToFirstInsightHours', value: 3 },
      { key: 'recommendationAdoptionRate', value: 100 }, { key: 'publishingCompletionRate', value: 100 },
      { key: 'retestCompletionRate', value: 100 }, { key: 'improvedTaskRate', value: 100 }
    ]);
  });

  it('排除统计周期外事件并为缺失事件返回数据缺口', async () => {
    const repository = new ProductEventRepository();
    repository.record({ organizationId: 'org-a', brandId: 'brand-a', eventType: 'brand_created', idempotencyKey: 'outside', occurredAt: '2026-07-01T00:00:00.000Z' });
    const dashboard = await createService(repository).getDashboard('user-a', 'brand-a', from, to);

    expect(dashboard?.sampleSize).toBe(0);
    expect(dashboard?.metrics.find((item) => item.key === 'firstMonitoringReachRate')?.value).toBeNull();
    expect(dashboard?.dataGaps).toContain('统计周期内缺少品牌创建事件');
  });

  it('只聚合当前组织和品牌的事件，并以接入到首个有效样本完成计算耗时', async () => {
    const repository = new ProductEventRepository();
    repository.record({ organizationId: 'org-a', brandId: 'brand-a', eventType: 'brand_created', idempotencyKey: 'a-created', occurredAt: '2026-08-02T00:00:00.000Z' });
    repository.record({ organizationId: 'org-a', brandId: 'brand-a', eventType: 'first_monitoring_completed', idempotencyKey: 'a-monitoring', occurredAt: '2026-08-02T01:30:00.000Z' });
    repository.record({ organizationId: 'org-a', brandId: 'brand-b', eventType: 'published', idempotencyKey: 'b-published', occurredAt: '2026-08-02T02:00:00.000Z' });
    repository.record({ organizationId: 'org-b', brandId: 'brand-a', eventType: 'published', idempotencyKey: 'other-org', occurredAt: '2026-08-02T02:00:00.000Z' });

    const dashboard = await createService(repository).getDashboard('user-a', 'brand-a', from, to);

    expect(dashboard?.sampleSize).toBe(2);
    expect(dashboard?.metrics.find((item) => item.key === 'timeToFirstInsightHours')?.value).toBe(1.5);
    expect(dashboard?.metrics.find((item) => item.key === 'publishingCompletionRate')?.value).toBeNull();
  });
});

function createService(repository: ProductEventRepository): ProductEffectService {
  return new ProductEffectService(repository, {
    getAccessibleBrandOrganizationId: async () => 'org-a'
  } as PermissionsService);
}
