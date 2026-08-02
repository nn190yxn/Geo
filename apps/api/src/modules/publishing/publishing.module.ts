import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { OwnedMediaController, PublishingController } from './publishing.controller';
import { PUBLISHING_ADAPTERS, PublishingAdapterRegistry } from './adapters/publishing-adapter.registry';
import { readWebhookPublishingConfigs, WebhookPublishingAdapter } from './adapters/webhook-publishing.adapter';
import { PublishingExecutionService } from './publishing-execution.service';

@Module({
  imports: [PermissionsModule],
  controllers: [PublishingController, OwnedMediaController],
  providers: [
    PublishingExecutionService,
    PublishingAdapterRegistry,
    {
      provide: PUBLISHING_ADAPTERS,
      useFactory: () => [new WebhookPublishingAdapter(readWebhookPublishingConfigs())]
    }
  ]
})
export class PublishingModule {}
