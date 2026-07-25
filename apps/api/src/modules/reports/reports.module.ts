import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [ReportsController]
})
export class ReportsModule {}
