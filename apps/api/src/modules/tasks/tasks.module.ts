import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { TasksController } from './tasks.controller';
import { RetestEvidenceService } from './retest-evidence.service';
import { AcceptanceHistoryRepository } from './acceptance-history.repository';
import { PrismaAcceptanceHistoryRepository } from './prisma-acceptance-history.repository';
import { ACCEPTANCE_HISTORY_REPOSITORY } from './acceptance-history.repository.port';
import { AcceptanceHistoryService } from './acceptance-history.service';
import { ProductEventsModule } from '../product-events/product-events.module';

export const acceptanceHistoryRepositoryProvider = {
  provide: ACCEPTANCE_HISTORY_REPOSITORY,
  useFactory: (memoryRepository: AcceptanceHistoryRepository, prismaRepository: PrismaAcceptanceHistoryRepository) =>
    process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository,
  inject: [AcceptanceHistoryRepository, PrismaAcceptanceHistoryRepository]
};

@Module({
  imports: [PermissionsModule, ProductEventsModule],
  controllers: [TasksController],
  providers: [
    RetestEvidenceService,
    AcceptanceHistoryRepository,
    PrismaAcceptanceHistoryRepository,
    acceptanceHistoryRepositoryProvider,
    AcceptanceHistoryService
  ],
  exports: [AcceptanceHistoryService]
})
export class TasksModule {}
