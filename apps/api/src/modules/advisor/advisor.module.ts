import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AdvisorController } from './advisor.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [AdvisorController]
})
export class AdvisorModule {}
