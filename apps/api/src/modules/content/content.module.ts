import { Module } from '@nestjs/common';
import { LLMModule } from '../llm/llm.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ContentController } from './content.controller';
import { ContentGenerationWorker } from './content-generation.worker';

@Module({
  imports: [PermissionsModule, LLMModule],
  controllers: [ContentController],
  providers: [ContentGenerationWorker],
  exports: [ContentGenerationWorker]
})
export class ContentModule {}
