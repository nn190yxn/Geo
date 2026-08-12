import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaQuickStartRepository } from './prisma-quick-start.repository';
import { QuickStartController } from './quick-start.controller';
import { QuickStartRepository } from './quick-start.repository';
import { QUICK_START_REPOSITORY } from './quick-start.repository.port';
import { QuickStartService } from './quick-start.service';
import {
  NodeFetchWebsiteDiscoveryAdapter,
  WEBSITE_DISCOVERY_ADAPTER,
  WebsiteDiscoveryService
} from './website-discovery.service';

export const quickStartRepositoryProvider = {
  provide: QUICK_START_REPOSITORY,
  useFactory: (memoryRepository: QuickStartRepository, prismaRepository: PrismaQuickStartRepository) =>
    process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository,
  inject: [QuickStartRepository, PrismaQuickStartRepository]
};

@Module({
  imports: [PermissionsModule],
  controllers: [QuickStartController],
  providers: [
    QuickStartRepository,
    PrismaQuickStartRepository,
    quickStartRepositoryProvider,
    NodeFetchWebsiteDiscoveryAdapter,
    { provide: WEBSITE_DISCOVERY_ADAPTER, useExisting: NodeFetchWebsiteDiscoveryAdapter },
    WebsiteDiscoveryService,
    QuickStartService
  ],
  exports: [QUICK_START_REPOSITORY, QuickStartService]
})
export class QuickStartModule {}
