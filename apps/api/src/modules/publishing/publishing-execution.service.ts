import { Injectable } from '@nestjs/common';
import type { PublishingExecutionResult, PublishingExecutionStatusInput, PublishingRecord } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { PublishingAdapterRegistry } from './adapters/publishing-adapter.registry';
import { ProductEventRecorderService } from '../product-events/product-event-recorder.service';

export class PublishingExecutionError extends Error {
  constructor(message: string, readonly kind: 'not_found' | 'invalid_request' = 'invalid_request') {
    super(message);
    this.name = 'PublishingExecutionError';
  }
}

@Injectable()
export class PublishingExecutionService {
  private readonly inFlight = new Map<string, Promise<PublishingExecutionResult>>();

  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly adapterRegistry: PublishingAdapterRegistry,
    private readonly productEventRecorder?: ProductEventRecorderService
  ) {}

  execute(userId: string, brandId: string, recordId: string): Promise<PublishingExecutionResult> {
    const lockKey = `${brandId}:${recordId}`;
    const existing = this.inFlight.get(lockKey);
    if (existing) return existing;

    const execution = this.executeRecord(userId, brandId, recordId).finally(() => this.inFlight.delete(lockKey));
    this.inFlight.set(lockKey, execution);
    return execution;
  }

  private async executeRecord(userId: string, brandId: string, recordId: string): Promise<PublishingExecutionResult> {
    const dashboard = await this.permissionsService.getPublishingDashboard(userId, brandId);
    if (!dashboard) throw new PublishingExecutionError('发布中心不存在或当前用户无权访问', 'not_found');

    const record = dashboard.records.find((item) => item.id === recordId);
    if (!record) throw new PublishingExecutionError('发布记录不存在或当前用户无权访问', 'not_found');
    if (record.status === 'published' && record.publishedUrl) {
      return { outcome: 'already_published', idempotencyKey: record.id, record };
    }
    if (!record.confirmedAt || !record.contentVersion || !record.materialRequirementsConfirmed || !record.retestPlanAt) {
      return this.fail(userId, brandId, record, '发布前确认尚未完成，请确认账号、内容版本、发布方式、素材要求和再次监测计划');
    }
    if (!record.accountId) return this.fail(userId, brandId, record, '发布记录尚未选择发布账号');

    const account = dashboard.accounts.find((item) => item.id === record.accountId);
    if (!account) return this.fail(userId, brandId, record, '发布账号不存在或已被移除');
    if (account.authStatus !== 'connected') return this.fail(userId, brandId, record, '发布账号授权不可用，请重新授权后再发布');
    if (account.publishingMode !== record.publishingMode) return this.fail(userId, brandId, record, '发布方式已发生变化，请重新确认后再发布');
    if (!account.publishingMode || account.publishingMode === 'manual') return this.fail(userId, brandId, record, '当前账号使用人工发布模式，请切换为半自动或自动发布');
    if (account.platform !== record.platform) return this.fail(userId, brandId, record, '发布记录的目标平台与所选账号不一致');
    if (!record.title.trim() || !record.body.trim()) return this.fail(userId, brandId, record, '发布标题和正文不能为空');

    const adapter = this.adapterRegistry.select(record.platform);
    if (!adapter) {
      return this.fail(userId, brandId, record, `平台 ${record.platform} 尚未配置直连发布 Adapter`);
    }

    const attemptedAt = new Date().toISOString();
    await this.requireUpdatedRecord(userId, brandId, record.id, { status: 'queued', lastAttemptAt: attemptedAt });
    await this.requireUpdatedRecord(userId, brandId, record.id, { status: 'publishing', lastAttemptAt: attemptedAt });

    try {
      const request = {
        idempotencyKey: record.id,
        brandId,
        accountId: account.id,
        accountName: account.accountName,
        platform: record.platform,
        title: record.title,
        body: record.body
      };
      const capability = adapter.getCapability(record.platform);
      const result = capability.resultMode === 'draft' ? await adapter.createDraft(request) : await adapter.publish(request);
      const publishedAt = new Date().toISOString();
      const publishedRecord = await this.requireUpdatedRecord(userId, brandId, record.id, {
        status: capability.resultMode === 'draft' ? 'draft' : 'published',
        externalPlatformId: result.externalPlatformId,
        publishedUrl: result.publishedUrl,
        lastAttemptAt: attemptedAt,
        ...(capability.resultMode === 'draft' ? {} : { publishedAt })
      });
      if (capability.resultMode === 'draft') return { outcome: 'draft_created', idempotencyKey: record.id, record: publishedRecord };
      await this.productEventRecorder?.record({ actorUserId: userId, brandId, eventType: 'published', entityType: 'publishing_record', entityId: record.id, idempotencyKey: `published:${record.id}`, metadata: { platformCode: record.platform, status: 'published' } });
      return { outcome: 'published', idempotencyKey: record.id, record: publishedRecord };
    } catch (error) {
      const message = error instanceof Error ? error.message : '发布平台调用失败';
      return this.fail(userId, brandId, record, message, attemptedAt);
    }
  }

  private async fail(userId: string, brandId: string, record: PublishingRecord, errorMessage: string, attemptedAt = new Date().toISOString()): Promise<PublishingExecutionResult> {
    const failedRecord = await this.requireUpdatedRecord(userId, brandId, record.id, {
      status: 'failed',
      errorMessage,
      lastAttemptAt: attemptedAt
    });
    await this.productEventRecorder?.record({ actorUserId: userId, brandId, eventType: 'operation_failed', entityType: 'publishing_record', entityId: record.id, failureCategory: 'adapter', idempotencyKey: `publishing-failed:${record.id}:${attemptedAt}`, metadata: { platformCode: record.platform, stage: 'publishing' } });
    return { outcome: 'failed', idempotencyKey: record.id, record: failedRecord };
  }

  private async requireUpdatedRecord(
    userId: string,
    brandId: string,
    recordId: string,
    input: PublishingExecutionStatusInput
  ): Promise<PublishingRecord> {
    const record = await this.permissionsService.updatePublishingRecordStatus(userId, brandId, recordId, input);
    if (!record) throw new PublishingExecutionError('发布记录状态更新失败', 'not_found');
    return record;
  }
}
