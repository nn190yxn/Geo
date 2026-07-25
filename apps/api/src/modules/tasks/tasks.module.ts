import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { TasksController } from './tasks.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [TasksController]
})
export class TasksModule {}
