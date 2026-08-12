import { describe, expect, it } from 'vitest';
import { ContextualGuidanceService } from '../src/modules/automation/contextual-guidance.service';
import { ErrorRecoveryService } from '../src/modules/automation/error-recovery.service';
import { InfrastructureBoundaryService } from '../src/modules/automation/infrastructure-boundary.service';

describe('contextual guidance and infrastructure boundaries', () => {
  it('recommends the next brand action from state', () => expect(new ContextualGuidanceService().forState({ hasProfile: true, hasMonitoring: false, hasContent: false, hasPublishing: false, needsRetest: false })).toMatchObject({ nextStep: '开始监测', metricDefinition: '真实回复数' }));
  it('maps public error codes to safe recovery steps', () => expect(new ErrorRecoveryService().resolve('provider_credential_missing')).toMatchObject({ category: '平台连接', steps: expect.any(Array) }));
  it('keeps adapters stable until explicit scale thresholds are reached', () => expect(new InfrastructureBoundaryService().select({ knowledgeChunks: 10_000, relationshipQueries: 1_000, objectAssetBytes: 1_073_741_824, retrievalLatencyMs: 500 })).toEqual({ retrieval: 'postgres_adapter', graph: 'postgres_adapter', assets: 'postgres_adapter' }));
});
