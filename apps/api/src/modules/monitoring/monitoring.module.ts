import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { MonitoringController } from './monitoring.controller';
import { MonitoringWorker } from './monitoring.worker';
import { ProductEventsModule } from '../product-events/product-events.module';

@Module({
  imports: [PermissionsModule, PlatformsModule, LLMModule, ProductEventsModule],
  controllers: [MonitoringController],
  providers: [MonitoringWorker],
  exports: [MonitoringWorker]
})
export class MonitoringModule {}
