import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AutomationModule } from '../automation/automation.module';
import { SprintsModule } from '../sprints/sprints.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';

@Module({
  imports: [PermissionsModule, SprintsModule, AutomationModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
