import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandImportService } from './brand-import.service';
import { TestQuestionService } from './test-question.service';
import { TestThemeService } from './test-theme.service';
import { LLMModule } from '../llm/llm.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule, LLMModule],
  controllers: [BrandsController],
  providers: [BrandImportService, TestQuestionService, TestThemeService],
  exports: [TestQuestionService, TestThemeService]
})
export class BrandsModule {}
