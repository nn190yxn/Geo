import { Injectable } from '@nestjs/common';
import type { BrandId, RuntimeOperationsDashboard } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { JobOrchestratorService } from './job-orchestrator.service';
import { ProviderGovernanceService } from './provider-governance.service';
import { QuotaService } from './quota.service';

@Injectable()
export class RuntimeOperationsService {
  constructor(private readonly permissionsService: PermissionsService, private readonly providers: ProviderGovernanceService, private readonly quota: QuotaService, private readonly jobs: JobOrchestratorService) {}

  async dashboard(userId: string, brandId: BrandId): Promise<RuntimeOperationsDashboard | null> {
    const [providers, allJobs, quota, publishing] = await Promise.all([
      this.providers.list(userId, brandId),
      Promise.resolve(this.permissionsService.listAsyncJobs(userId, brandId)),
      this.quota.summary(userId, brandId),
      Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId))
    ]);
    if (!providers || !allJobs || !quota || !publishing) return null;
    return {
      providers,
      queuedJobs: allJobs.filter((job) => job.status === 'queued' || job.status === 'running'),
      failedJobs: allJobs.filter((job) => job.status === 'failed' || job.status === 'retry-exhausted'),
      quota,
      publishingAccounts: publishing.accounts.map((account) => ({ id: account.id, name: account.accountName, authStatus: account.authStatus })),
      dependencies: { database: process.env.DATABASE_URL ? 'ready' : 'not_configured', queue: process.env.GEO_QUEUE_DRIVER ? 'configured' : 'in_memory', aiPlatforms: providers.some((provider) => provider.healthStatus === 'healthy') ? 'configured' : 'attention' }
    };
  }

  retry(userId: string, brandId: BrandId, jobId: string) { return this.jobs.retry(userId, brandId, jobId); }
  cancel(userId: string, brandId: BrandId, jobId: string) { return Promise.resolve(this.permissionsService.updateAsyncJob(userId, brandId, jobId, { status: 'cancelled' })); }
}
