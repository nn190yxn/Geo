import { describe, expect, it } from 'vitest';
import { ProductEventRecorderService } from '../src/modules/product-events/product-event-recorder.service';
import { ProductEventRepository } from '../src/modules/product-events/product-event.repository';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('ProductEventRecorderService', () => {
  it('按品牌解析组织并仅持久化允许的运营元数据', async () => {
    const recorder = createRecorder({ brand_a: 'org_a' });

    const event = await recorder.record({
      actorUserId: 'user_a',
      brandId: 'brand_a',
      eventType: 'content_saved',
      entityType: 'content_version',
      entityId: 'version_a',
      idempotencyKey: 'content-version:a',
      metadata: {
        contentType: 'faq',
        status: 'saved',
        body: 'private content body',
        credential: 'secret'
      }
    });

    expect(event).toMatchObject({
      organizationId: 'org_a',
      brandId: 'brand_a',
      metadata: { contentType: 'faq', status: 'saved' }
    });
    expect(event?.metadata).not.toHaveProperty('body');
    expect(event?.metadata).not.toHaveProperty('credential');
  });

  it('对同品牌同类型和幂等键重复记录返回同一事件', async () => {
    const recorder = createRecorder({ brand_a: 'org_a' });
    const input = {
      actorUserId: 'user_a',
      brandId: 'brand_a',
      eventType: 'first_monitoring_completed' as const,
      entityType: 'monitoring_run',
      entityId: 'run_a',
      idempotencyKey: 'first-monitoring-completed'
    };

    const first = await recorder.record(input);
    const repeated = await recorder.record(input);

    expect(repeated).toEqual(first);
  });

  it('跳过无法解析组织归属的事件', async () => {
    const recorder = createRecorder({});

    await expect(recorder.record({
      actorUserId: 'user_a',
      brandId: 'brand_unknown',
      eventType: 'operation_failed',
      entityType: 'monitoring_run',
      entityId: 'run_unknown',
      failureCategory: 'timeout',
      idempotencyKey: 'monitoring-failed:unknown'
    })).resolves.toBeNull();
  });

  it('保留失败类别并允许不同品牌复用幂等键', async () => {
    const recorder = createRecorder({ brand_a: 'org_a', brand_b: 'org_b' });
    const failure = await recorder.record({
      actorUserId: 'user_a', brandId: 'brand_a', eventType: 'operation_failed', entityType: 'monitoring_run',
      entityId: 'run_a', failureCategory: 'timeout', idempotencyKey: 'operation:retry'
    });
    const otherBrand = await recorder.record({
      actorUserId: 'user_b', brandId: 'brand_b', eventType: 'operation_failed', entityType: 'publishing_record',
      entityId: 'record_b', failureCategory: 'platform_rejected', idempotencyKey: 'operation:retry'
    });

    expect(failure).toMatchObject({ organizationId: 'org_a', failureCategory: 'timeout' });
    expect(otherBrand).toMatchObject({ organizationId: 'org_b', failureCategory: 'platform_rejected' });
    expect(otherBrand?.id).not.toBe(failure?.id);
  });
});

function createRecorder(organizations: Record<string, string>): ProductEventRecorderService {
  const permissionsService = {
    getAccessibleBrandOrganizationId: async (_userId: string, brandId: string) => organizations[brandId] ?? null
  } as PermissionsService;
  return new ProductEventRecorderService(new ProductEventRepository(), permissionsService);
}
