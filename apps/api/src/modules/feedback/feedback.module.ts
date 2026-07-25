import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { FeedbackController } from './feedback.controller';

@Module({
  imports: [PermissionsModule],
  controllers: [FeedbackController]
})
export class FeedbackModule {}
