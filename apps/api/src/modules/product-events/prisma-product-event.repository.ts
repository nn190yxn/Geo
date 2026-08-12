import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProductEvent, ProductEventInput } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { ProductEventRepositoryPort } from './product-event.repository.port';

@Injectable()
export class PrismaProductEventRepository implements ProductEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: ProductEventInput & { organizationId: string }): Promise<ProductEvent> {
    const event = await this.prisma.productEvent.upsert({
      where: {
        brandId_eventType_idempotencyKey: {
          brandId: input.brandId,
          eventType: input.eventType,
          idempotencyKey: input.idempotencyKey
        }
      },
      create: {
        organizationId: input.organizationId,
        brandId: input.brandId,
        actorUserId: input.actorUserId ?? null,
        eventType: input.eventType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        failureCategory: input.failureCategory ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonObject,
        idempotencyKey: input.idempotencyKey,
        ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {})
      },
      update: {}
    });

    return {
      id: event.id,
      organizationId: event.organizationId,
      brandId: event.brandId,
      actorUserId: event.actorUserId ?? undefined,
      eventType: event.eventType as ProductEvent['eventType'],
      entityType: event.entityType ?? undefined,
      entityId: event.entityId ?? undefined,
      failureCategory: event.failureCategory as ProductEvent['failureCategory'],
      metadata: event.metadata as ProductEvent['metadata'],
      idempotencyKey: event.idempotencyKey,
      occurredAt: event.occurredAt.toISOString()
    };
  }

  async list(organizationId: string, brandId: string, from: Date, to: Date): Promise<ProductEvent[]> {
    const events = await this.prisma.productEvent.findMany({
      where: { organizationId, brandId, occurredAt: { gte: from, lt: to } },
      orderBy: { occurredAt: 'asc' }
    });
    return events.map((event) => ({
      id: event.id, organizationId: event.organizationId, brandId: event.brandId, actorUserId: event.actorUserId ?? undefined,
      eventType: event.eventType as ProductEvent['eventType'], entityType: event.entityType ?? undefined, entityId: event.entityId ?? undefined,
      failureCategory: event.failureCategory as ProductEvent['failureCategory'], metadata: event.metadata as ProductEvent['metadata'],
      idempotencyKey: event.idempotencyKey, occurredAt: event.occurredAt.toISOString()
    }));
  }
}
