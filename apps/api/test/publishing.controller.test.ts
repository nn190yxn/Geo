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
  versionId: 'version_1',
  accountId: 'account_1',
  title: '自动发布内容',
  body: '正文',
  platform: 'website',
  publishingMode: 'automatic',
  contentVersion: 'version_1',
  materialRequirementsConfirmed: true,
  retestPlanAt: '2026-07-25T09:00:00.000Z',
  confirmedAt: '2026-07-18T09:00:00.000Z',
  status: 'draft',
  createdAt: '2026-07-18T09:00:00.000Z',
  updatedAt: '2026-07-18T09:00:00.000Z'
};

describe('PublishingController', () => {
  it('executes a newly created record when its account uses automatic publishing', async () => {
    const publishedRecord = { ...record, status: 'published' as const, publishedUrl: 'https://example.com/articles/1' };
    const permissionsService = {
      getPublishingDashboard: vi.fn(() => ({ brandId: 'brand_1', platforms: [], accounts: [{ id: 'account_1', brandId: 'brand_1', platform: 'website', accountName: '品牌官网', loginMode: 'oauth', publishingMode: 'automatic', authStatus: 'connected', createdAt: record.createdAt, updatedAt: record.updatedAt }], records: [] })),
      createPublishingRecord: vi.fn(() => record)
    } as unknown as PermissionsService;
    const publishingExecutionService = {
      execute: vi.fn(async () => ({ outcome: 'published', idempotencyKey: record.id, record: publishedRecord }))
    } as unknown as PublishingExecutionService;
    const controller = new PublishingController(permissionsService, publishingExecutionService);

    const response = await controller.createRecord(
      { context: { userId: 'user_1' } } as Request,
      'brand_1',
      { accountId: 'account_1', versionId: 'version_1', title: record.title, body: record.body, targetPlatform: record.platform, confirmation: { publishingMode: 'automatic', materialRequirementsConfirmed: true, retestPlanAt: '2026-07-25T09:00:00.000Z' } }
    );

    expect(publishingExecutionService.execute).toHaveBeenCalledWith('user_1', 'brand_1', 'record_1');
    expect(response).toEqual({ success: true, data: publishedRecord });
  });

  it('does not allow record creation to predeclare a published execution state', async () => {
    const permissionsService = {
      getPublishingDashboard: vi.fn(() => ({ brandId: 'brand_1', platforms: [], accounts: [], records: [] })),
      createPublishingRecord: vi.fn(() => ({ ...record, publishingMode: 'assisted' as const }))
    } as unknown as PermissionsService;
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
    const permissionsService = { getPublishingDashboard: vi.fn(() => ({ brandId: 'brand_1', platforms: [], accounts: [{ id: 'account_1', brandId: 'brand_1', platform: 'website', accountName: '品牌官网', loginMode: 'oauth', publishingMode: 'automatic', authStatus: 'connected', createdAt: record.createdAt, updatedAt: record.updatedAt }], records: [record] })), updatePublishingRecordStatus: vi.fn() } as unknown as PermissionsService;
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

  it('requires complete confirmation before creating a pending publishing task', async () => {
    const permissionsService = {
      getPublishingDashboard: vi.fn(() => ({ brandId: 'brand_1', platforms: [], accounts: [], records: [] })),
      createPublishingRecord: vi.fn()
    } as unknown as PermissionsService;
    const controller = new PublishingController(permissionsService, { execute: vi.fn() } as unknown as PublishingExecutionService);

    await expect(controller.createRecord(
      { context: { userId: 'user_1' } } as Request,
      'brand_1',
      { title: '待发布内容', body: '正文', targetPlatform: 'website', status: 'pending' }
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(permissionsService.createPublishingRecord).not.toHaveBeenCalled();
  });

  it('saves a complete confirmation snapshot on an existing draft', async () => {
    const account = { id: 'account_1', brandId: 'brand_1', platform: 'website', accountName: '品牌官网', loginMode: 'oauth' as const, publishingMode: 'automatic' as const, authStatus: 'connected' as const, createdAt: record.createdAt, updatedAt: record.updatedAt };
    const confirmedRecord = { ...record, contentVersion: 'version_1', confirmedAt: '2026-07-18T10:00:00.000Z' };
    const permissionsService = {
      getPublishingDashboard: vi.fn(() => ({ brandId: 'brand_1', platforms: [], accounts: [account], records: [{ ...record, confirmedAt: undefined }] })),
      confirmPublishingRecord: vi.fn(() => confirmedRecord)
    } as unknown as PermissionsService;
    const controller = new PublishingController(permissionsService, { execute: vi.fn() } as unknown as PublishingExecutionService);

    const response = await controller.confirmRecord(
      { context: { userId: 'user_1' } } as Request,
      'brand_1',
      'record_1',
      { accountId: 'account_1', publishingMode: 'automatic', materialRequirementsConfirmed: true, retestPlanAt: '2026-07-25T09:00:00.000Z' }
    );

    expect(permissionsService.confirmPublishingRecord).toHaveBeenCalledWith('user_1', 'brand_1', 'record_1', expect.objectContaining({ accountId: 'account_1', publishingMode: 'automatic' }));
    expect(response.data).toEqual(confirmedRecord);
  });

  it('requires a matching execution confirmation before invoking the adapter service', async () => {
    const permissionsService = { getPublishingDashboard: vi.fn(() => ({ brandId: 'brand_1', platforms: [], accounts: [], records: [record] })) } as unknown as PermissionsService;
    const publishingExecutionService = { execute: vi.fn() } as unknown as PublishingExecutionService;
    const controller = new PublishingController(permissionsService, publishingExecutionService);
    const request = { context: { userId: 'user_1' } } as Request;

    await expect(controller.executeRecord(request, 'brand_1', 'record_1', { confirmed: false, accountId: 'account_1', contentVersion: 'version_1', targetPlatform: 'website' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.executeRecord(request, 'brand_1', 'record_1', { confirmed: true, accountId: 'other', contentVersion: 'version_1', targetPlatform: 'website' })).rejects.toBeInstanceOf(BadRequestException);
    expect(publishingExecutionService.execute).not.toHaveBeenCalled();
  });
});
