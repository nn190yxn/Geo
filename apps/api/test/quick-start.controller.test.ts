import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { QuickStartController } from '../src/modules/quick-start/quick-start.controller';
import type { QuickStartService } from '../src/modules/quick-start/quick-start.service';

const session = {
  id: 'session_1',
  brandId: 'brand_1',
  currentStep: 'website' as const,
  status: 'in_progress' as const,
  draft: {},
  version: 1,
  startedAt: '2026-08-03T00:00:00.000Z',
  updatedAt: '2026-08-03T00:00:00.000Z'
};

const request = { context: { userId: 'user_1' } } as Request;

describe('QuickStartController', () => {
  it('exposes create, restore, and step-save API responses', async () => {
    const service = {
      create: vi.fn(async () => session),
      get: vi.fn(async () => session),
      saveStep: vi.fn(async () => ({ ...session, currentStep: 'facts', version: 2 }))
    } as unknown as QuickStartService;
    const controller = new QuickStartController(service);

    expect(await controller.create(request, 'brand_1', {})).toEqual({ success: true, data: session });
    expect(await controller.get(request, 'brand_1')).toEqual({ success: true, data: session });
    expect(await controller.saveStep(request, 'brand_1', 'website', { version: 1, data: websiteData() }))
      .toMatchObject({ success: true, data: { version: 2, currentStep: 'facts' } });
  });

  it('returns not found when no resumable session exists', async () => {
    const service = { get: vi.fn(async () => null) } as unknown as QuickStartService;
    const controller = new QuickStartController(service);
    await expect(controller.get(request, 'brand_1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

function websiteData() {
  return { brandName: 'Example', websiteUrl: 'https://example.com', targetMarkets: ['Shanghai'] };
}
