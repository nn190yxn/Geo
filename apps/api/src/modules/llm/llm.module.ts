import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { LLMController } from './llm.controller';
import { LLMOrchestrationService } from './llm-orchestration.service';
import { LLMOutputValidator } from './llm-output-validator';
import { LLMPromptTemplateService } from './llm-prompt-template.service';

@Module({
  imports: [PermissionsModule, PlatformsModule],
  controllers: [LLMController],
  providers: [LLMOrchestrationService, LLMPromptTemplateService, LLMOutputValidator],
  exports: [LLMOrchestrationService]
})
export class LLMModule {}
