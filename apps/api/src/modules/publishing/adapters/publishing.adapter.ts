import type { PublishingAdapterCapability } from '@geo-platform/shared-types';

export type PublishingAdapterRequest = {
  idempotencyKey: string;
  brandId: string;
  accountId: string;
  accountName: string;
  platform: string;
  title: string;
  body: string;
};

export type PublishingAdapterResult = {
  externalPlatformId?: string;
  publishedUrl: string;
};

export type PublishingAdapterConnectionResult = {
  status: 'connected' | 'failed';
  failureCategory?: 'authentication' | 'rate_limited' | 'timeout' | 'platform' | 'unknown';
};

export type PublishingAdapterStatusResult = {
  status: 'draft' | 'published' | 'failed' | 'unknown';
  publishedUrl?: string;
  failureCategory?: PublishingAdapterConnectionResult['failureCategory'];
};

export class PublishingAdapterError extends Error {
  constructor(message: string, readonly failureCategory: NonNullable<PublishingAdapterConnectionResult['failureCategory']>) {
    super(message);
    this.name = 'PublishingAdapterError';
  }
}

export interface PublishingAdapter {
  supports(platform: string): boolean;
  getCapability(platform: string): PublishingAdapterCapability;
  validateConnection(platform: string): Promise<PublishingAdapterConnectionResult>;
  createDraft(request: PublishingAdapterRequest): Promise<PublishingAdapterResult>;
  publish(request: PublishingAdapterRequest): Promise<PublishingAdapterResult>;
  getStatus(platform: string, externalPlatformId: string): Promise<PublishingAdapterStatusResult>;
}
