import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import type { ContentReadinessService } from '../src/modules/content/content-readiness.service';
import { ContentAssetsPageController } from '../src/modules/content/content.controller';

const request = { context: { userId: 'user-1' } } as never;

describe('ContentAssetsPageController readiness', () => {
  it('delegates a brand-scoped readiness inspection', async () => {
    const inspect = vi.fn(async () => ({ brandId: 'brand-1', assetId: 'asset-1', status: 'ready' }));
    const controller = new ContentAssetsPageController({} as PermissionsService, { inspect } as unknown as ContentReadinessService);
    const input = { body: '待检查正文', targetPlatform: 'wechat' };

    await expect(controller.inspectReadiness(request, 'brand-1', 'asset-1', input)).resolves.toMatchObject({
      success: true, data: { brandId: 'brand-1', assetId: 'asset-1', status: 'ready' }
    });
    expect(inspect).toHaveBeenCalledWith('user-1', 'brand-1', 'asset-1', input);
  });

  it('validates body and maps inaccessible assets to not found', async () => {
    const inspect = vi.fn(async () => null);
    const controller = new ContentAssetsPageController({} as PermissionsService, { inspect } as unknown as ContentReadinessService);

    await expect(controller.inspectReadiness(request, 'brand-1', 'asset-1', { body: ' ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.inspectReadiness(request, 'brand-1', 'asset-1', { body: '正文' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
