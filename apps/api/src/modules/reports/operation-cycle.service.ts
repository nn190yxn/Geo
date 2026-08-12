import { Injectable } from '@nestjs/common';

export const operationSteps = ['site_audit', 'monitoring', 'task_acceptance', 'report', 'delivery_bundle'] as const;
export type OperationStep = typeof operationSteps[number];
export type OperationCycleState = { id: string; brandId: string; status: 'queued' | 'running' | 'failed' | 'succeeded'; currentStep: OperationStep; progress: Partial<Record<OperationStep, 'pending' | 'running' | 'succeeded' | 'failed'>>; failureReason?: string; retryStatus: 'not_retried' | 'retrying'; confirmationItems: string[] };

@Injectable()
export class OperationCycleService {
  private readonly cycles = new Map<string, OperationCycleState>();
  create(brandId: string, confirmationItems: string[] = []): OperationCycleState {
    const id = `cycle:${brandId}:${this.cycles.size + 1}`;
    const cycle: OperationCycleState = { id, brandId, status: 'queued', currentStep: operationSteps[0], progress: {}, retryStatus: 'not_retried', confirmationItems };
    this.cycles.set(id, cycle);
    return cycle;
  }
  start(id: string): OperationCycleState | null { const cycle = this.cycles.get(id); if (!cycle || cycle.status === 'succeeded') return cycle ?? null; cycle.status = 'running'; cycle.progress[cycle.currentStep] = 'running'; return cycle; }
  completeStep(id: string): OperationCycleState | null { const cycle = this.cycles.get(id); if (!cycle || cycle.status !== 'running') return cycle ?? null; cycle.progress[cycle.currentStep] = 'succeeded'; const next = operationSteps[operationSteps.indexOf(cycle.currentStep) + 1]; if (!next) { cycle.status = 'succeeded'; return cycle; } cycle.currentStep = next; cycle.progress[next] = 'pending'; return cycle; }
  fail(id: string, reason: string): OperationCycleState | null { const cycle = this.cycles.get(id); if (!cycle) return null; cycle.status = 'failed'; cycle.progress[cycle.currentStep] = 'failed'; cycle.failureReason = reason; return cycle; }
  resume(id: string): OperationCycleState | null { const cycle = this.cycles.get(id); if (!cycle || cycle.status !== 'failed') return cycle ?? null; cycle.status = 'running'; cycle.retryStatus = 'retrying'; cycle.progress[cycle.currentStep] = 'running'; return cycle; }
}
