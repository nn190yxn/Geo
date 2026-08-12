import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ReportsController } from './reports.controller';
import { EffectAttributionService } from './effect-attribution.service';
import { ProductEventsModule } from '../product-events/product-events.module';

@Module({
  imports: [PermissionsModule, ProductEventsModule],
  controllers: [ReportsController],
  providers: [EffectAttributionService],
  exports: [EffectAttributionService]
})
export class ReportsModule {}
