import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { PublishingRecord } from '@geo-platform/shared-types';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import { PublishingController } from '../src/modules/publishing/publishing.controller';
import type { PublishingExecutionService } from '../src/modules/publishing/publishing-execution.service';

const record: PublishingRecord = {
  id: 'record_1',
  brandId: 'brand_1',
  contentAssetId: 'asset_1',
  accountId: 'account_1',
  title: '自动发布内容',
  body: '正文',
  platform: 'website',
  publishingMode: 'automatic',
  status: 'draft',
  createdAt: '2026-07-18T09:00:00.000Z',
  updatedAt: '2026-07-18T09:00:00.000Z'
};

describe('PublishingController', () => {
  it('executes a newly created record when its account uses automatic publishing', async () => {
    const publishedRecord = { ...record, status: 'published' as const, publishedUrl: 'https://example.com/articles/1' };
    const permissionsService = { createPublishingRecord: vi.fn(() => record) } as unknown as PermissionsService;
    const publishingExecutionService = {
      execute: vi.fn(async () => ({ outcome: 'published', idempotencyKey: record.id, record: publishedRecord }))
    } as unknown as PublishingExecutionService;
    const controller = new PublishingController(permissionsService, publishingExecutionService);

    const response = await controller.createRecord(
      { context: { userId: 'user_1' } } as Request,
      'brand_1',
      { accountId: 'account_1', title: record.title, body: record.body, targetPlatform: record.platform }
    );

    expect(publishingExecutionService.execute).toHaveBeenCalledWith('user_1', 'brand_1', 'record_1');
    expect(response).toEqual({ success: true, data: publishedRecord });
  });

  it('does not allow record creation to predeclare a published execution state', async () => {
    const permissionsService = { createPublishingRecord: vi.fn(() => ({ ...record, publishingMode: 'assisted' as const })) } as unknown as PermissionsService;
    const publishingExecutionService = { execute: vi.fn() } as unknown as PublishingExecutionService;
    const controller = new PublishingController(permissionsService, publishingExecutionService);

    await controller.createRecord(
      { context: { userId: 'user_1' } } as Request,
      'brand_1',
      { accountId: 'account_1', title: record.title, body: record.body, targetPlatform: record.platform, status: 'published' }
    );

    expect(permissionsService.createPublishingRecord).toHaveBeenCalledWith('user_1', 'brand_1', expect.objectContaining({ status: undefined }));
  });

  it('requires a real HTTP URL when manually recording a published result', async () => {
    const permissionsService = { updatePublishingRecordStatus: vi.fn() } as unknown as PermissionsService;
    const controller = new PublishingController(permissionsService, { execute: vi.fn() } as unknown as PublishingExecutionService);
    const request = { context: { userId: 'user_1' } } as Request;

    await expect(controller.updateRecordStatus(request, 'brand_1', 'record_1', { status: 'published' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.updateRecordStatus(request, 'brand_1', 'record_1', { status: 'published', publishedUrl: 'draft://record_1' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(permissionsService.updatePublishingRecordStatus).not.toHaveBeenCalled();
  });

  it('keeps execution-only states private to the publishing service', async () => {
    const permissionsService = { updatePublishingRecordStatus: vi.fn() } as unknown as PermissionsService;
    const controller = new PublishingController(permissionsService, { execute: vi.fn() } as unknown as PublishingExecutionService);

    await expect(controller.updateRecordStatus(
      { context: { userId: 'user_1' } } as Request,
      'brand_1',
      'record_1',
      { status: 'publishing' }
    )).rejects.toBeInstanceOf(BadRequestException);
  });
});
