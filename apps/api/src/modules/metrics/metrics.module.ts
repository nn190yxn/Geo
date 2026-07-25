import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [MetricsController]
})
export class MetricsModule {}
