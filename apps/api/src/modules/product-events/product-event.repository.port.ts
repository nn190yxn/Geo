import type { ProductEvent, ProductEventInput } from '@geo-platform/shared-types';

export const PRODUCT_EVENT_REPOSITORY = Symbol('PRODUCT_EVENT_REPOSITORY');

export interface ProductEventRepositoryPort {
  record(input: ProductEventInput & { organizationId: string }): ProductEvent | Promise<ProductEvent>;
  list(organizationId: string, brandId: string, from: Date, to: Date): ProductEvent[] | Promise<ProductEvent[]>;
}
