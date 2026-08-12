import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PublishingAdapter } from './publishing.adapter';
import type { PublishingAdapterCapability } from '@geo-platform/shared-types';

export const PUBLISHING_ADAPTERS = Symbol('PUBLISHING_ADAPTERS');

@Injectable()
export class PublishingAdapterRegistry {
  constructor(@Optional() @Inject(PUBLISHING_ADAPTERS) private readonly adapters: PublishingAdapter[] = []) {}

  select(platform: string): PublishingAdapter | null {
    return this.adapters.find((adapter) => adapter.supports(platform)) ?? null;
  }

  listCapabilities(platforms: string[]): PublishingAdapterCapability[] {
    return [...new Set(platforms)].map((platform) => this.select(platform)?.getCapability(platform) ?? ({
      platform,
      connectionStatus: 'unconfigured',
      supportsConnectionValidation: false,
      supportsDraftCreation: false,
      supportsStatusQuery: false,
      resultMode: 'manual_handoff',
      recoveryAction: '配置发布渠道连接或通过人工方式发布'
    }));
  }
}
