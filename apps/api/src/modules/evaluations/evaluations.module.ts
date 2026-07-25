import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { EvaluationsController } from './evaluations.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [EvaluationsController]
})
export class EvaluationsModule {}
