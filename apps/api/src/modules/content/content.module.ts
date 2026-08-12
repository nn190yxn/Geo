import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { QuickStartModule } from '../quick-start/quick-start.module';
import { BrandsModule } from '../brands/brands.module';
import { ProductEventsModule } from '../product-events/product-events.module';
import { ContentAssetsPageController, ContentController } from './content.controller';
import { ContentGenerationWorker } from './content-generation.worker';
import { ContentReadinessService } from './content-readiness.service';

@Module({
  imports: [PermissionsModule, LLMModule, QuickStartModule, BrandsModule, ProductEventsModule],
  controllers: [ContentController, ContentAssetsPageController],
  providers: [ContentGenerationWorker, ContentReadinessService],
  exports: [ContentGenerationWorker, ContentReadinessService]
})
export class ContentModule {}
