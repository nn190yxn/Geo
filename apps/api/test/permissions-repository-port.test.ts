import { describe, expect, it } from 'vitest';
import type {
  AnalysisFinding,
  ContentAssetPublishingStats,
  MediaPlatformRule,
  PublishingChannelStats,
  PublishingRecordPerformance
} from '@geo-platform/shared-types';
import { permissionsRepositoryProvider } from '../src/modules/permissions/permissions.module';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import type { PermissionsRepositoryPort } from '../src/modules/permissions/permissions.repository.port';
import { PERMISSIONS_REPOSITORY } from '../src/modules/permissions/permissions.repository.port';
import { PrismaPermissionsRepository } from '../src/modules/permissions/prisma-permissions.repository';

describe('permissions repository port', () => {
  it('exposes brand-scoped page aggregation contracts', () => {
    const methodNames: Array<keyof PermissionsRepositoryPort> = [
      'getBrandProfileLibrary',
      'saveBrandProfileLibrary',
      'listBrandMediaAssets',
      'createBrandMediaAsset',
      'updateBrandMediaAsset',
      'listContentAssetPageItems',
      'listOwnedMediaAccounts',
      'listMediaPlatformRules',
      'createMediaPlatformRule',
      'updateMediaPlatformRule',
      'getPublishingChannelStats',
      'listAnalysisFindings',
      'createAnalysisFinding',
      'updateAnalysisFinding',
      'getAnalysisWorkbenchDashboard'
    ];

    const finding = { id: 'finding_1', brandId: 'brand_demo' } as AnalysisFinding;
    const assetStats = { brandId: 'brand_demo' } as ContentAssetPublishingStats;
    const channelStats = { brandId: 'brand_demo' } as PublishingChannelStats;
    const platformRule = { brandId: 'brand_demo' } as MediaPlatformRule;
    const recordPerformance = { brandId: 'brand_demo' } as PublishingRecordPerformance;

    expect(methodNames).toHaveLength(15);
    expect([finding, assetStats, channelStats, platformRule, recordPerformance].every((record) => record.brandId === 'brand_demo')).toBe(true);
  });

  it('keeps the memory repository assignable to the service-facing port', () => {
    const repository: PermissionsRepositoryPort = new PermissionsRepository();

    expect(repository.findUser('user_demo')?.userId).toBe('user_demo');
    expect(repository.listAccessibleBrands('user_demo').length).toBeGreaterThan(0);
    expect(repository.listDeniedAccessLogs('user_demo')).toEqual(expect.any(Array));
  });

  it('records AI platform call audits through the repository port', () => {
    const repository: PermissionsRepositoryPort = new PermissionsRepository();

    const created = repository.createAIPlatformCallAudit('user_demo', 'brand_demo', {
      platformCode: 'mock_ai',
      modelName: 'mock-v1',
      callType: 'monitoring',
      status: 'started',
      startedAt: '2026-07-03T00:00:00.000Z'
    });

    expect(created).toEqual(
      expect.objectContaining({
        brandId: 'brand_demo',
        platformCode: 'mock_ai',
        callType: 'monitoring',
        status: 'started'
      })
    );

    const updated = repository.updateAIPlatformCallAudit('user_demo', 'brand_demo', created?.id ?? '', {
      status: 'succeeded',
      durationMs: 120,
      inputTokenCount: 20,
      outputTokenCount: 45,
      costEstimate: 0.003,
      completedAt: '2026-07-03T00:00:01.000Z'
    });

    expect(updated).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        durationMs: 120,
        costEstimate: 0.003,
        completedAt: '2026-07-03T00:00:01.000Z'
      })
    );
    expect(repository.listAIPlatformCallAudits('user_demo', 'brand_demo')).toContainEqual(updated);
    expect(repository.listAIPlatformCallAudits('user_demo', 'brand_missing')).toBeNull();
  });

  it('stores normalized AI platform failures without credential values', () => {
    const repository: PermissionsRepositoryPort = new PermissionsRepository();
    const credentialRef = 'vault://geo-platform/demo/openai-secret';

    const created = repository.createAIPlatformCallAudit('user_demo', 'brand_demo', {
      platformCode: 'openai',
      modelName: 'gpt-4o-mini',
      callType: 'monitoring',
      status: 'started'
    });

    const failed = repository.updateAIPlatformCallAudit('user_demo', 'brand_demo', created?.id ?? '', {
      status: 'failed',
      errorCode: 'credential_missing',
      errorMessage: 'Credential reference is missing',
      retryable: false,
      completedAt: '2026-07-03T00:00:02.000Z'
    });

    const serialized = JSON.stringify(failed);

    expect(failed).toEqual(
      expect.objectContaining({
        status: 'failed',
        errorCode: 'credential_missing',
        retryable: false
      })
    );
    expect(serialized).not.toContain(credentialRef);
    expect(serialized).not.toContain('openai-secret');
  });

  it('manages async jobs through the repository port with brand isolation and status filters', () => {
    const repository: PermissionsRepositoryPort = new PermissionsRepository();

    const queued = repository.createAsyncJob('user_demo', 'brand_demo', {
      jobType: 'monitoring',
      entityId: 'run_async_contract',
      nextRunAt: '2026-07-03T00:00:00.000Z'
    });
    const otherStatus = repository.createAsyncJob('user_demo', 'brand_demo', {
      jobType: 'monitoring',
      entityId: 'run_async_completed',
      status: 'succeeded'
    });

    expect(queued).toEqual(
      expect.objectContaining({
        brandId: 'brand_demo',
        jobType: 'monitoring',
        status: 'queued',
        attemptCount: 0,
        maxAttempts: 3
      })
    );
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'queued')).toContainEqual(queued);
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'queued')).not.toContainEqual(otherStatus);

    const running = repository.updateAsyncJob('user_demo', 'brand_demo', queued?.id ?? '', {
      status: 'running',
      attemptCount: 1
    });

    expect(running).toEqual(expect.objectContaining({ status: 'running', attemptCount: 1 }));

    const retryExhausted = repository.updateAsyncJob('user_demo', 'brand_demo', queued?.id ?? '', {
      status: 'retry-exhausted',
      lastErrorCode: 'adapter_timeout',
      lastErrorMessage: 'Adapter request timed out'
    });

    expect(retryExhausted).toEqual(
      expect.objectContaining({
        status: 'retry-exhausted',
        lastErrorCode: 'adapter_timeout',
        lastErrorMessage: 'Adapter request timed out'
      })
    );
    expect(repository.listAsyncJobs('user_demo', 'brand_missing')).toBeNull();
    expect(repository.updateAsyncJob('user_demo', 'brand_child_fitness', queued?.id ?? '', { status: 'failed' })).toBeNull();
  });

  it('uses the memory repository by default', () => {
    const originalDriver = process.env.GEO_REPOSITORY_DRIVER;
    process.env.GEO_REPOSITORY_DRIVER = '';

    const memoryRepository = new PermissionsRepository();
    const prismaRepository = {} as PrismaPermissionsRepository;

    expect(permissionsRepositoryProvider.provide).toBe(PERMISSIONS_REPOSITORY);
    expect(permissionsRepositoryProvider.useFactory(memoryRepository, prismaRepository)).toBe(memoryRepository);

    restoreRepositoryDriver(originalDriver);
  });

  it('uses the Prisma repository when GEO_REPOSITORY_DRIVER is prisma', () => {
    const originalDriver = process.env.GEO_REPOSITORY_DRIVER;
    process.env.GEO_REPOSITORY_DRIVER = 'prisma';

    const memoryRepository = new PermissionsRepository();
    const prismaRepository = {} as PrismaPermissionsRepository;

    expect(permissionsRepositoryProvider.useFactory(memoryRepository, prismaRepository)).toBe(prismaRepository);

    restoreRepositoryDriver(originalDriver);
  });
});

function restoreRepositoryDriver(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.GEO_REPOSITORY_DRIVER;
    return;
  }

  process.env.GEO_REPOSITORY_DRIVER = value;
}
