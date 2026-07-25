import { afterEach, describe, expect, it } from 'vitest';
import type { ApiResponse, HealthCheck } from '@geo-platform/shared-types';
import { HealthController } from '../src/modules/health/health.controller';

describe('health contract', () => {
  const originalGeoAiConfigured = process.env.GEO_AI_PLATFORM_CONFIGURED;
  const originalStepfunApiKey = process.env.STEPFUN_API_KEY;

  afterEach(() => {
    restoreEnv('GEO_AI_PLATFORM_CONFIGURED', originalGeoAiConfigured);
    restoreEnv('STEPFUN_API_KEY', originalStepfunApiKey);
  });

  it('uses the shared API response envelope', () => {
    const response: ApiResponse<HealthCheck> = {
      success: true,
      data: {
        status: 'degraded',
        service: 'geo-platform-api',
        repositoryDriver: 'memory',
        runtimeEnvironment: 'test',
        dependencies: {
          database: 'not_configured',
          queue: 'in_memory',
          aiPlatforms: 'not_configured',
          mapProvider: 'fallback',
          logging: 'console'
        },
        missingConfiguration: ['GEO_AI_PLATFORM_CONFIGURED']
      }
    };

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('degraded');
  });

  it('treats STEPFUN_API_KEY as configured AI platform readiness', () => {
    delete process.env.GEO_AI_PLATFORM_CONFIGURED;
    process.env.STEPFUN_API_KEY = 'test-stepfun-env-value';

    const response = new HealthController().getHealth();

    expect(response.data.dependencies.aiPlatforms).toBe('configured');
    expect(response.data.missingConfiguration).not.toContain('GEO_AI_PLATFORM_CONFIGURED');
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe('error contract', () => {
  it('keeps failed responses in the shared envelope', () => {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'REQUEST_ERROR',
        message: 'Bad request',
        requestId: 'request_demo'
      }
    };

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('REQUEST_ERROR');
  });
});
