import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CitationsController } from './citations.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [CitationsController]
})
export class CitationsModule {}
