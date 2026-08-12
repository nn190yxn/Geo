import { Injectable } from '@nestjs/common';
import type { AsyncJob, AsyncJobInput, AsyncJobStatus, AsyncJobType, BrandId } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { QuotaService } from './quota.service';

@Injectable()
export class JobOrchestratorService {
  private readonly retrying = new Set<string>();
  constructor(private readonly permissionsService: PermissionsService, private readonly quota?: QuotaService, private readonly dispatcher?: { dispatch(job: AsyncJob): Promise<void> }) {}

  async enqueue(userId: string, brandId: BrandId, input: AsyncJobInput): Promise<AsyncJob | null> {
    const jobs = await Promise.resolve(this.permissionsService.listAsyncJobs(userId, brandId));
    const existing = jobs?.find((job) => input.idempotencyKey && job.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;
    return Promise.resolve(this.permissionsService.createAsyncJob(userId, brandId, { ...input, status: 'queued' }));
  }

  async start(userId: string, brandId: BrandId, jobId: string, stepCode: string): Promise<AsyncJob | null> {
    const job = await Promise.resolve(this.permissionsService.getAsyncJob(userId, brandId, jobId));
    if (!job || terminal(job.status)) return job;
    return Promise.resolve(this.permissionsService.updateAsyncJob(userId, brandId, jobId, { status: 'running', stepCode, attemptCount: job.attemptCount + 1, progress: { ...(job.progress ?? {}), [stepCode]: 'running' } }));
  }

  async complete(userId: string, brandId: BrandId, jobId: string, stepCode: string, resultSummary: Record<string, unknown> = {}): Promise<AsyncJob | null> {
    const job = await Promise.resolve(this.permissionsService.getAsyncJob(userId, brandId, jobId));
    if (!job || terminal(job.status)) return job;
    return Promise.resolve(this.permissionsService.updateAsyncJob(userId, brandId, jobId, { status: 'succeeded', stepCode, resultSummary, progress: { ...(job.progress ?? {}), [stepCode]: 'succeeded' } }));
  }

  async fail(userId: string, brandId: BrandId, jobId: string, errorCode: string, errorMessage: string, retryable: boolean): Promise<AsyncJob | null> {
    const job = await Promise.resolve(this.permissionsService.getAsyncJob(userId, brandId, jobId));
    if (!job || terminal(job.status)) return job;
    const exhausted = !retryable || job.attemptCount >= job.maxAttempts;
    return Promise.resolve(this.permissionsService.updateAsyncJob(userId, brandId, jobId, {
      status: exhausted ? 'retry-exhausted' : 'queued',
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      nextRunAt: exhausted ? undefined : new Date(Date.now() + 1000 * Math.pow(2, job.attemptCount)).toISOString()
    }));
  }

  async retry(userId: string, brandId: BrandId, jobId: string): Promise<AsyncJob | null> {
    if (this.retrying.has(jobId)) return null;
    this.retrying.add(jobId);
    try {
    const job = await Promise.resolve(this.permissionsService.getAsyncJob(userId, brandId, jobId));
    if (!job || job.status === 'succeeded' || job.status === 'cancelled') return job;
    const previous = { status: job.status, nextRunAt: job.nextRunAt, lastErrorCode: job.lastErrorCode ?? '', lastErrorMessage: job.lastErrorMessage ?? '' };
    const taskKey = job.idempotencyKey ?? `job:${job.id}`;
    await this.quota?.releaseByTaskKey(taskKey);
    const reservation = this.quota && job.jobType !== 'monitoring' ? await this.quota.reserve(userId, brandId, job.jobType, taskKey) : undefined;
    if (reservation?.rejection) return job;
    const queued = await Promise.resolve(this.permissionsService.updateAsyncJob(userId, brandId, jobId, { status: 'queued', nextRunAt: new Date().toISOString(), lastErrorCode: 'manual_retry', lastErrorMessage: '管理员请求重试' }));
    if (!queued) {
      if (reservation?.reservation) await this.quota?.release(reservation.reservation.id);
      return null;
    }
    try {
      await this.dispatcher?.dispatch(queued);
      return queued;
    } catch {
      if (reservation?.reservation) await this.quota?.release(reservation.reservation.id);
      return Promise.resolve(this.permissionsService.updateAsyncJob(userId, brandId, jobId, previous));
    }
    } finally {
      this.retrying.delete(jobId);
    }
  }
}

function terminal(status: AsyncJobStatus): boolean { return status === 'succeeded' || status === 'retry-exhausted'; }
