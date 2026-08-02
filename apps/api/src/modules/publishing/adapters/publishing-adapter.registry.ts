import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PublishingAdapter } from './publishing.adapter';

export const PUBLISHING_ADAPTERS = Symbol('PUBLISHING_ADAPTERS');

@Injectable()
export class PublishingAdapterRegistry {
  constructor(@Optional() @Inject(PUBLISHING_ADAPTERS) private readonly adapters: PublishingAdapter[] = []) {}

  select(platform: string): PublishingAdapter | null {
    return this.adapters.find((adapter) => adapter.supports(platform)) ?? null;
  }
}
