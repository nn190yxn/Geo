import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { LLMOrchestrationService } from '../src/modules/llm/llm-orchestration.service';
import { MonitoringController } from '../src/modules/monitoring/monitoring.controller';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

const request = { context: { userId: 'user_1' } } as Request;

describe('MonitoringController measurement scope', () => {
  it('normalizes run measurement conditions before persistence', async () => {
    const createMonitoringRun = vi.fn(async () => runFixture());
    const controller = createController({ createMonitoringRun });

    await controller.createMonitoringRun(request, 'brand_1', {
      promptId: ' prompt_1 ',
      platformCode: ' doubao ',
      modelName: ' model-v1 ',
      collectionMethod: 'api',
      clientSurface: 'api',
      searchEnabled: true,
      market: ' CN ',
      language: ' zh-CN ',
      evidenceLevel: 'reproducible_api',
      manualConfirmed: null,
      baselineVersion: ' baseline-1 '
    });

    expect(createMonitoringRun).toHaveBeenCalledWith('user_1', 'brand_1', {
      promptId: 'prompt_1',
      platformCode: 'doubao',
      modelName: 'model-v1',
      collectionMethod: 'api',
      clientSurface: 'api',
      searchEnabled: true,
      market: 'CN',
      language: 'zh-CN',
      evidenceLevel: 'reproducible_api',
      manualConfirmed: null,
      baselineVersion: 'baseline-1'
    });
  });

  it('marks public response capture as manual evidence', async () => {
    const addManualResponse = vi.fn(async () => runFixture());
    const controller = createController({ addManualResponse });

    await controller.addManualResponse(request, 'brand_1', 'run_1', {
      rawText: ' answer ',
      modelName: ' model-v1 ',
      collectionMethod: 'api',
      clientSurface: 'web',
      evidenceLevel: 'reproducible_api',
      searchEnabled: false,
      market: ' CN ',
      language: ' zh-CN ',
      manualConfirmed: true,
      baselineVersion: ' baseline-1 '
    });

    expect(addManualResponse).toHaveBeenCalledWith('user_1', 'brand_1', 'run_1', expect.objectContaining({
      rawText: 'answer',
      modelName: 'model-v1',
      collectionMethod: 'manual',
      clientSurface: 'web',
      evidenceLevel: 'manual_or_browser',
      manualConfirmed: true
    }));
  });

  it('rejects unsupported measurement enums', async () => {
    const controller = createController({ createMonitoringRun: vi.fn() });

    await expect(controller.createMonitoringRun(request, 'brand_1', {
      promptId: 'prompt_1',
      platformCode: 'doubao',
      collectionMethod: 'crawler' as never
    })).rejects.toBeInstanceOf(BadRequestException);

    await expect(controller.createMonitoringRun(request, 'brand_1', {
      promptId: 'prompt_1',
      platformCode: 'doubao',
      clientSurface: 'desktop' as never
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createController(methods: Record<string, unknown>) {
  return new MonitoringController(
    methods as unknown as PermissionsService,
    {} as LLMOrchestrationService
  );
}

function runFixture() {
  return {
    id: 'run_1',
    brandId: 'brand_1',
    optimizationUnitId: 'unit_1',
    intentId: 'intent_1',
    promptId: 'prompt_1',
    promptText: 'question',
    platformCode: 'doubao',
    modelName: 'model-v1',
    collectionMethod: 'api' as const,
    clientSurface: 'api' as const,
    promptKind: 'discovery' as const,
    searchEnabled: true,
    market: 'CN',
    language: 'zh-CN',
    evidenceLevel: 'reproducible_api' as const,
    manualConfirmed: null,
    baselineVersion: 'baseline-1',
    status: 'completed' as const,
    createdAt: '2026-08-03T00:00:00.000Z'
  };
}
