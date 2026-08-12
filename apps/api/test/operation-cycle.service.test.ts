import { describe, expect, it } from 'vitest';
import { OperationCycleService } from '../src/modules/reports/operation-cycle.service';

describe('OperationCycleService', () => {
  it('advances configured steps and completes the cycle', () => {
    const service = new OperationCycleService(); const cycle = service.create('brand-a', ['确认发布链接']); service.start(cycle.id);
    for (let index = 0; index < 5; index += 1) service.completeStep(cycle.id);
    expect(cycle).toMatchObject({ status: 'succeeded', progress: { site_audit: 'succeeded', delivery_bundle: 'succeeded' } });
  });
  it('resumes an interrupted step with its failure context', () => {
    const service = new OperationCycleService(); const cycle = service.create('brand-a'); service.start(cycle.id); service.fail(cycle.id, 'monitoring_timeout');
    expect(service.resume(cycle.id)).toMatchObject({ status: 'running', currentStep: 'site_audit', retryStatus: 'retrying', failureReason: 'monitoring_timeout' });
  });
});
