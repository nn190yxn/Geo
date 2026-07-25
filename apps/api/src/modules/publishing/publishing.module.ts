import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PublishingController } from './publishing.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [PublishingController]
})
export class PublishingModule {}
