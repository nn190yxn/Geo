import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands/brands.module';
import { ContentModule } from '../content/content.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AutomationController } from './automation.controller';
import { AutomationOrchestratorService } from './automation-orchestrator.service';
import { AutomationRepository } from './automation.repository';
import { AUTOMATION_REPOSITORY } from './automation.repository.port';
import { ConfirmationQueueService } from './confirmation-queue.service';
import { PlatformRewriteService } from './platform-rewrite.service';
import { PrismaAutomationRepository } from './prisma-automation.repository';
import { QuestionPoolService } from './question-pool.service';

export const automationRepositoryProvider = {
  provide: AUTOMATION_REPOSITORY,
  useFactory: (memoryRepository: AutomationRepository, prismaRepository: PrismaAutomationRepository) => {
    return process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository;
  },
  inject: [AutomationRepository, PrismaAutomationRepository]
};

@Module({
  imports: [PermissionsModule, BrandsModule, ContentModule],
  controllers: [AutomationController],
  providers: [
    AutomationRepository,
    PrismaAutomationRepository,
    automationRepositoryProvider,
    AutomationOrchestratorService,
    ConfirmationQueueService,
    PlatformRewriteService,
    QuestionPoolService
  ],
  exports: [AUTOMATION_REPOSITORY, AutomationRepository, PrismaAutomationRepository, AutomationOrchestratorService, ConfirmationQueueService, PlatformRewriteService, QuestionPoolService]
})
export class AutomationModule {}
