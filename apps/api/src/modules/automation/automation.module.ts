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
import { DemandSnapshotsController } from './demand-snapshots.controller';
import { DemandSnapshotService } from './demand-snapshot.service';
import { DemandSnapshotRepository } from './demand-snapshot.repository';
import { DEMAND_SNAPSHOT_REPOSITORY } from './demand-snapshot.repository.port';
import { PrismaDemandSnapshotRepository } from './prisma-demand-snapshot.repository';
import { BaiduSearchDemandAdapter, GoogleSearchDemandAdapter, ManualSearchDemandAdapter, SearchDemandAdapterRegistry } from './search-demand.adapter';

export const automationRepositoryProvider = {
  provide: AUTOMATION_REPOSITORY,
  useFactory: (memoryRepository: AutomationRepository, prismaRepository: PrismaAutomationRepository) => {
    return process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository;
  },
  inject: [AutomationRepository, PrismaAutomationRepository]
};

export const demandSnapshotRepositoryProvider = {
  provide: DEMAND_SNAPSHOT_REPOSITORY,
  useFactory: (memoryRepository: DemandSnapshotRepository, prismaRepository: PrismaDemandSnapshotRepository) =>
    process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository,
  inject: [DemandSnapshotRepository, PrismaDemandSnapshotRepository]
};

@Module({
  imports: [PermissionsModule, BrandsModule, ContentModule],
  controllers: [AutomationController, DemandSnapshotsController],
  providers: [
    AutomationRepository,
    PrismaAutomationRepository,
    automationRepositoryProvider,
    AutomationOrchestratorService,
    ConfirmationQueueService,
    PlatformRewriteService,
    QuestionPoolService,
    DemandSnapshotRepository,
    PrismaDemandSnapshotRepository,
    demandSnapshotRepositoryProvider,
    BaiduSearchDemandAdapter,
    GoogleSearchDemandAdapter,
    ManualSearchDemandAdapter,
    SearchDemandAdapterRegistry,
    DemandSnapshotService
  ],
  exports: [AUTOMATION_REPOSITORY, AutomationRepository, PrismaAutomationRepository, AutomationOrchestratorService, ConfirmationQueueService, PlatformRewriteService, QuestionPoolService]
})
export class AutomationModule {}
