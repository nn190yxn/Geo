import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AnalysisController } from './analysis.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [AnalysisController]
})
export class AnalysisModule {}
