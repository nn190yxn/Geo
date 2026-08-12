import { describe, expect, it, vi } from 'vitest';
import type { PublishingAccount, PublishingDashboard, PublishingRecord, PublishingStatusInput } from '@geo-platform/shared-types';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import type { PublishingAdapter } from '../src/modules/publishing/adapters/publishing.adapter';
import { PublishingAdapterRegistry } from '../src/modules/publishing/adapters/publishing-adapter.registry';
import { PublishingExecutionService } from '../src/modules/publishing/publishing-execution.service';

const timestamp = '2026-07-18T09:00:00.000Z';

function buildAccount(overrides: Partial<PublishingAccount> = {}): PublishingAccount {
  return {
    id: 'account_1',
    brandId: 'brand_1',
    platform: 'website',
    accountName: '品牌官网',
    loginMode: 'oauth',
    publishingMode: 'assisted',
    authStatus: 'connected',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

function buildRecord(overrides: Partial<PublishingRecord> = {}): PublishingRecord {
  return {
    id: 'record_1',
    brandId: 'brand_1',
    contentAssetId: 'asset_1',
    accountId: 'account_1',
    title: '品牌内容',
    body: '可直接发布的正文',
    platform: 'website',
    accountName: '品牌官网',
    publishingMode: 'assisted',
    contentVersion: 'version_1',
    materialRequirementsConfirmed: true,
    retestPlanAt: '2026-07-25T09:00:00.000Z',
    confirmedAt: timestamp,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

function createHarness(options: { account?: PublishingAccount; record?: PublishingRecord; adapter?: PublishingAdapter } = {}) {
  const account = options.account ?? buildAccount();
  let record = options.record ?? buildRecord();
  const dashboard: PublishingDashboard = {
    brandId: 'brand_1',
    platforms: [],
    accounts: [account],
    records: [record]
  };
  const statusUpdates: PublishingStatusInput[] = [];
  const permissionsService = {
    getPublishingDashboard: vi.fn(() => ({ ...dashboard, records: [record] })),
    updatePublishingRecordStatus: vi.fn((_userId: string, _brandId: string, _recordId: string, input: PublishingStatusInput) => {
      statusUpdates.push(input);
      record = { ...record, ...input, updatedAt: new Date().toISOString() };
      return record;
    })
  } as unknown as PermissionsService;
  const adapter = options.adapter ?? {
    supports: (platform: string) => platform === 'website',
    getCapability: () => ({ platform: 'website', connectionStatus: 'available' as const, supportsConnectionValidation: true, supportsDraftCreation: true, supportsStatusQuery: false, resultMode: 'published' as const, recoveryAction: '发布' }),
    publish: vi.fn(async () => ({ externalPlatformId: 'external_1', publishedUrl: 'https://example.com/articles/1' }))
  };
  const service = new PublishingExecutionService(permissionsService, new PublishingAdapterRegistry([adapter]));
  return { adapter, service, statusUpdates };
}

describe('PublishingExecutionService', () => {
  it('publishes through an adapter with the record id as idempotency key', async () => {
    const { adapter, service, statusUpdates } = createHarness();

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result).toMatchObject({ outcome: 'published', idempotencyKey: 'record_1' });
    expect(adapter.publish).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'record_1', accountId: 'account_1' }));
    expect(statusUpdates.map((input) => input.status)).toEqual(['queued', 'publishing', 'published']);
    expect(result.record).toMatchObject({ status: 'published', externalPlatformId: 'external_1', publishedUrl: 'https://example.com/articles/1' });
  });

  it('returns an already published record without calling the adapter', async () => {
    const { adapter, service } = createHarness({ record: buildRecord({ status: 'published', publishedUrl: 'https://example.com/existing' }) });

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result.outcome).toBe('already_published');
    expect(adapter.publish).not.toHaveBeenCalled();
  });

  it('records an authorization prerequisite failure on the publishing record', async () => {
    const { adapter, service } = createHarness({ account: buildAccount({ authStatus: 'expired' }) });

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result).toMatchObject({
      outcome: 'failed',
      record: { status: 'failed', errorMessage: '发布账号授权不可用，请重新授权后再发布' }
    });
    expect(adapter.publish).not.toHaveBeenCalled();
  });

  it('blocks execution until the publishing confirmation snapshot is complete', async () => {
    const { adapter, service } = createHarness({ record: buildRecord({ confirmedAt: undefined }) });

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result).toMatchObject({ outcome: 'failed', record: { status: 'failed', errorMessage: expect.stringContaining('发布前确认尚未完成') } });
    expect(adapter.publish).not.toHaveBeenCalled();
  });

  it('does not trust a published status without a verifiable URL', async () => {
    const { adapter, service } = createHarness({ record: buildRecord({ status: 'published' }) });

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result.outcome).toBe('published');
    expect(adapter.publish).toHaveBeenCalledOnce();
  });

  it('records adapter failures as a failed execution', async () => {
    const adapter: PublishingAdapter = {
      supports: () => true,
      getCapability: () => ({ platform: 'website', connectionStatus: 'available', supportsConnectionValidation: true, supportsDraftCreation: true, supportsStatusQuery: false, resultMode: 'published', recoveryAction: '发布' }),
      validateConnection: async () => ({ status: 'connected' }),
      createDraft: vi.fn(),
      publish: vi.fn(async () => { throw new Error('上游平台暂时不可用'); })
      , getStatus: async () => ({ status: 'unknown' })
    };
    const { service, statusUpdates } = createHarness({ adapter });

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result.outcome).toBe('failed');
    expect(result.record).toMatchObject({ status: 'failed', errorMessage: '上游平台暂时不可用' });
    expect(statusUpdates.map((input) => input.status)).toEqual(['queued', 'publishing', 'failed']);
  });

  it('keeps channel draft results in draft status until the channel confirms publication', async () => {
    const adapter: PublishingAdapter = {
      supports: () => true,
      getCapability: () => ({ platform: 'website', connectionStatus: 'available', supportsConnectionValidation: true, supportsDraftCreation: true, supportsStatusQuery: false, resultMode: 'draft', recoveryAction: '确认草稿' }),
      validateConnection: async () => ({ status: 'connected' }),
      createDraft: vi.fn(async () => ({ externalPlatformId: 'draft-1', publishedUrl: 'https://example.com/drafts/1' })),
      publish: vi.fn(),
      getStatus: async () => ({ status: 'draft' })
    };
    const { service, statusUpdates } = createHarness({ adapter });

    const result = await service.execute('user_1', 'brand_1', 'record_1');

    expect(result).toMatchObject({ outcome: 'draft_created', record: { status: 'draft', publishedUrl: 'https://example.com/drafts/1' } });
    expect(adapter.createDraft).toHaveBeenCalledOnce();
    expect(adapter.publish).not.toHaveBeenCalled();
    expect(statusUpdates.map((input) => input.status)).toEqual(['queued', 'publishing', 'draft']);
  });
});
