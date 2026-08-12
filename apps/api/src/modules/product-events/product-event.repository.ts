import { Injectable } from '@nestjs/common';
import type { ProductEvent, ProductEventInput } from '@geo-platform/shared-types';
import type { ProductEventRepositoryPort } from './product-event.repository.port';

@Injectable()
export class ProductEventRepository implements ProductEventRepositoryPort {
  private readonly events: ProductEvent[] = [];

  record(input: ProductEventInput & { organizationId: string }): ProductEvent {
    const existing = this.events.find((event) => event.brandId === input.brandId && event.eventType === input.eventType && event.idempotencyKey === input.idempotencyKey);
    if (existing) return existing;

    const event: ProductEvent = {
      id: `product_event_${this.events.length + 1}`,
      organizationId: input.organizationId,
      brandId: input.brandId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      failureCategory: input.failureCategory,
      metadata: sanitizeMetadata(input.metadata),
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt ?? new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  list(organizationId: string, brandId: string, from: Date, to: Date): ProductEvent[] {
    return this.events.filter((event) => event.organizationId === organizationId && event.brandId === brandId && event.occurredAt >= from.toISOString() && event.occurredAt < to.toISOString());
  }
}

function sanitizeMetadata(metadata: ProductEventInput['metadata']): ProductEvent['metadata'] {
  return Object.fromEntries(
    Object.entries(metadata ?? {}).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
  ) as ProductEvent['metadata'];
}
