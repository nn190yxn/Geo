import { Inject, Injectable } from '@nestjs/common';
import type { ProductEvent, ProductEventInput } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { PRODUCT_EVENT_REPOSITORY, type ProductEventRepositoryPort } from './product-event.repository.port';

const metadataKeys = new Set(['platformCode', 'collectionMethod', 'contentType', 'reportType', 'status', 'stage']);

@Injectable()
export class ProductEventRecorderService {
  constructor(
    @Inject(PRODUCT_EVENT_REPOSITORY) private readonly repository: ProductEventRepositoryPort,
    private readonly permissionsService: PermissionsService
  ) {}

  async record(input: ProductEventInput): Promise<ProductEvent | null> {
    const organizationId = await this.permissionsService.getAccessibleBrandOrganizationId(input.actorUserId ?? '', input.brandId);
    if (!organizationId) return null;
    const metadata = Object.fromEntries(
      Object.entries(input.metadata ?? {}).filter(([key, value]) => metadataKeys.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
    ) as Record<string, string | number | boolean>;

    return this.repository.record({ ...input, organizationId, metadata });
  }
}
