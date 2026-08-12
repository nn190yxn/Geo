import { describe, expect, it } from 'vitest';
import { ProviderSpendStageService } from '../src/modules/llm/provider-spend-stage.service';

describe('ProviderSpendStageService', () => {
  it('P26: grants at most one active lease for the same task step attempt', async () => {
    const service = new ProviderSpendStageService();
    const first = await service.acquire('task-a', 'generate', 1);
    const duplicate = await service.acquire('task-a', 'generate', 1);
    expect(first.acquired).toBe(true);
    expect(duplicate.acquired).toBe(false);
  });

  it('retains incurred provider cost after completion', async () => {
    const service = new ProviderSpendStageService();
    const lease = await service.acquire('task-a', 'generate', 1);
    await expect(service.recordCost('task-a', 'generate', 1, lease.stage.token, 'deepseek', 0.25)).resolves.toMatchObject({ incurredCost: 0.25, completed: true });
  });

  it('allows a new lease after the previous lease expires', async () => {
    const service = new ProviderSpendStageService();
    await service.acquire('task-expired', 'generate', 1, -1);
    await expect(service.acquire('task-expired', 'generate', 1)).resolves.toMatchObject({ acquired: true });
  });
});
