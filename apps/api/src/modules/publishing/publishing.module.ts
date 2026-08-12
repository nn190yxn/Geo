import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { OwnedMediaController, PublishingController } from './publishing.controller';
import { PUBLISHING_ADAPTERS, PublishingAdapterRegistry } from './adapters/publishing-adapter.registry';
import { readWebhookPublishingConfigs, WebhookPublishingAdapter } from './adapters/webhook-publishing.adapter';
import { GitHubContentsPublishingAdapter, readChannelConfigs, WeChatOfficialPublishingAdapter, WordPressPublishingAdapter } from './adapters/channel-publishing.adapters';
import { PublishingExecutionService } from './publishing-execution.service';
import { ProductEventsModule } from '../product-events/product-events.module';

@Module({
  imports: [PermissionsModule, ProductEventsModule],
  controllers: [PublishingController, OwnedMediaController],
  providers: [
    PublishingExecutionService,
    PublishingAdapterRegistry,
    {
      provide: PUBLISHING_ADAPTERS,
      useFactory: () => [
        new WordPressPublishingAdapter(readChannelConfigs(process.env.GEO_WORDPRESS_PUBLISHING_CONFIGS)),
        new GitHubContentsPublishingAdapter(readChannelConfigs(process.env.GEO_GITHUB_PUBLISHING_CONFIGS)),
        new WeChatOfficialPublishingAdapter(),
        new WebhookPublishingAdapter(readWebhookPublishingConfigs())
      ]
    }
  ]
})
export class PublishingModule {}
