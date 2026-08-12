import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandImportService } from './brand-import.service';
import { DocumentTextExtractorService } from './document-text-extractor.service';
import { TestQuestionService } from './test-question.service';
import { TestThemeService } from './test-theme.service';
import { LLMModule } from '../llm/llm.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { QuickStartModule } from '../quick-start/quick-start.module';
import { KnowledgeChunkService } from './knowledge-chunk.service';
import { KNOWLEDGE_RETRIEVAL_ADAPTER } from './knowledge-retrieval.adapter';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { ProductEventsModule } from '../product-events/product-events.module';

@Module({
  imports: [PermissionsModule, LLMModule, QuickStartModule, ProductEventsModule],
  controllers: [BrandsController],
  providers: [BrandImportService, DocumentTextExtractorService, TestQuestionService, TestThemeService, KnowledgeChunkService, KnowledgeRetrievalService, { provide: KNOWLEDGE_RETRIEVAL_ADAPTER, useValue: null }],
  exports: [TestQuestionService, TestThemeService, KnowledgeChunkService, KnowledgeRetrievalService]
})
export class BrandsModule {}
