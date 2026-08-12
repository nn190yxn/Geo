import { Module } from '@nestjs/common';
import { ProductEventRecorderService } from './product-event-recorder.service';
import { ProductEffectService } from './product-effect.service';
import { ProductEffectsController } from './product-effects.controller';
import { ProductEventRepository } from './product-event.repository';
import { PrismaProductEventRepository } from './prisma-product-event.repository';
import { PRODUCT_EVENT_REPOSITORY } from './product-event.repository.port';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [ProductEffectsController],
  providers: [
    ProductEventRepository,
    PrismaProductEventRepository,
    {
      provide: PRODUCT_EVENT_REPOSITORY,
      useFactory: (memoryRepository: ProductEventRepository, prismaRepository: PrismaProductEventRepository) =>
        process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository,
      inject: [ProductEventRepository, PrismaProductEventRepository]
    },
    ProductEventRecorderService,
    ProductEffectService
  ],
  exports: [ProductEventRecorderService]
})
export class ProductEventsModule {}
