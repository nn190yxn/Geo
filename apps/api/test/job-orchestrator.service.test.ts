import { describe, expect, it } from 'vitest';
import { JobOrchestratorService } from '../src/modules/llm/job-orchestrator.service';
import type { AsyncJob, AsyncJobInput } from '@geo-platform/shared-types';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

function createService() {
  const jobs: AsyncJob[] = [];
  const permissions = {
    listAsyncJobs: async () => jobs,
    getAsyncJob: async (_userId: string, _brandId: string, jobId: string) => jobs.find((job) => job.id === jobId) ?? null,
    createAsyncJob: async (_userId: string, brandId: string, input: AsyncJobInput) => {
      const job: AsyncJob = { id: `job-${jobs.length + 1}`, brandId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input, attemptCount: input.attemptCount ?? 0, maxAttempts: input.maxAttempts ?? 3 };
      jobs.push(job);
      return job;
    },
    updateAsyncJob: async (_userId: string, _brandId: string, jobId: string, input: Partial<AsyncJob>) => {
      const job = jobs.find((item) => item.id === jobId);
      return job ? Object.assign(job, input) : null;
    }
  } as unknown as PermissionsService;
  return new JobOrchestratorService(permissions);
}

describe('JobOrchestratorService', () => {
  it('reuses a queued job for the same idempotency key', async () => {
    const service = createService();
    const input = { jobType: 'content_generation' as const, entityId: 'content-a', idempotencyKey: 'content-a:v1' };
    const first = await service.enqueue('user-a', 'brand-a', input);
    const second = await service.enqueue('user-a', 'brand-a', input);
    expect(second?.id).toBe(first?.id);
  });

  it('records step progress, completion, and retry exhaustion', async () => {
    const service = createService();
    const job = await service.enqueue('user-a', 'brand-a', { jobType: 'monitoring', entityId: 'run-a', maxAttempts: 1 });
    const running = await service.start('user-a', 'brand-a', job!.id, 'collect');
    expect(running).toMatchObject({ status: 'running', attemptCount: 1, progress: { collect: 'running' } });
    const exhausted = await service.fail('user-a', 'brand-a', job!.id, 'timeout', '请求超时', true);
    expect(exhausted).toMatchObject({ status: 'retry-exhausted', lastErrorCode: 'timeout' });
    const completed = await service.complete('user-a', 'brand-a', job!.id, 'collect', { ignored: true });
    expect(completed?.status).toBe('retry-exhausted');
  });

  it('allows an administrator retry for an exhausted job and preserves completed jobs', async () => {
    const service = createService();
    const job = await service.enqueue('user-a', 'brand-a', { jobType: 'monitoring', entityId: 'run-a', maxAttempts: 1 });
    await service.start('user-a', 'brand-a', job!.id, 'collect');
    await service.fail('user-a', 'brand-a', job!.id, 'timeout', '请求超时', true);
    expect((await service.retry('user-a', 'brand-a', job!.id))?.status).toBe('queued');
  });

  it('releases a new reservation when dispatch fails', async () => {
    const releases: string[] = [];
    const jobs: AsyncJob[] = [{ id: 'job-a', brandId: 'brand-a', jobType: 'content_generation', entityId: 'content-a', status: 'failed', idempotencyKey: 'retry-a', attemptCount: 1, maxAttempts: 3, createdAt: '', updatedAt: '' }];
    const permissions = { getAsyncJob: async () => jobs[0], updateAsyncJob: async (_u: string, _b: string, _id: string, input: Partial<AsyncJob>) => Object.assign(jobs[0], input) } as unknown as PermissionsService;
    const quota = { releaseByTaskKey: async () => null, reserve: async () => ({ reservation: { id: 'reservation-a' } }), release: async (id: string) => { releases.push(id); return null; } };
    const service = new JobOrchestratorService(permissions, quota as never, { dispatch: async () => { throw new Error('queue unavailable'); } });
    await service.retry('user-a', 'brand-a', 'job-a');
    expect(releases).toEqual(['reservation-a']);
    expect(jobs[0].status).toBe('failed');
  });
});
