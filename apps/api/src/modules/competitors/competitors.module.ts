import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CompetitorsController } from './competitors.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [CompetitorsController]
})
export class CompetitorsModule {}
