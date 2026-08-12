import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PlatformsModule } from '../platforms/platforms.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { LLMController } from './llm.controller';
import { LLMOrchestrationService } from './llm-orchestration.service';
import { LLMOutputValidator } from './llm-output-validator';
import { LLMPromptTemplateService } from './llm-prompt-template.service';
import { ProviderGovernanceService } from './provider-governance.service';
import { ProviderGovernanceController } from './provider-governance.controller';
import { QuotaService } from './quota.service';
import { JobOrchestratorService } from './job-orchestrator.service';
import { RuntimeOperationsService } from './runtime-operations.service';
import { RuntimeOperationsController } from './runtime-operations.controller';
import { ProviderHealthService } from './provider-health.service';
import { QuotaAdjustmentService } from './quota-adjustment.service';
import { ProviderSpendStageService } from './provider-spend-stage.service';

@Module({
  imports: [PermissionsModule, PlatformsModule, PrismaModule],
  controllers: [LLMController, ProviderGovernanceController, RuntimeOperationsController],
  providers: [LLMOrchestrationService, LLMPromptTemplateService, LLMOutputValidator, ProviderGovernanceService, QuotaService, QuotaAdjustmentService, ProviderSpendStageService, JobOrchestratorService, RuntimeOperationsService, ProviderHealthService],
  exports: [LLMOrchestrationService, JobOrchestratorService]
})
export class LLMModule {}
