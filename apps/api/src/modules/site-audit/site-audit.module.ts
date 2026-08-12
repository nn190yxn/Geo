import { Module } from '@nestjs/common';
import { NodeFetchSiteAuditAdapter, SITE_AUDIT_ADAPTER } from './site-audit.adapter';
import { AcceptanceRuleService, SiteAuditService } from './site-audit.service';
import { PermissionsModule } from '../permissions/permissions.module';
import { QuickStartModule } from '../quick-start/quick-start.module';
import { TechnicalAssetService } from './technical-asset.service';
import { SiteAuditController } from './site-audit.controller';
import { DiagnosticScoreRepository } from './diagnostic-score.repository';
import { PrismaDiagnosticScoreRepository } from './prisma-diagnostic-score.repository';
import { DIAGNOSTIC_SCORE_REPOSITORY } from './diagnostic-score.repository.port';
import { DiagnosticScorePolicyService } from './diagnostic-score-policy.service';
import { TasksModule } from '../tasks/tasks.module';

export const diagnosticScoreRepositoryProvider = {
  provide: DIAGNOSTIC_SCORE_REPOSITORY,
  useFactory: (memoryRepository: DiagnosticScoreRepository, prismaRepository: PrismaDiagnosticScoreRepository) =>
    process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? prismaRepository : memoryRepository,
  inject: [DiagnosticScoreRepository, PrismaDiagnosticScoreRepository]
};

@Module({
  imports: [PermissionsModule, QuickStartModule, TasksModule],
  controllers: [SiteAuditController],
  providers: [
    NodeFetchSiteAuditAdapter,
    { provide: SITE_AUDIT_ADAPTER, useExisting: NodeFetchSiteAuditAdapter },
    SiteAuditService,
    AcceptanceRuleService,
    TechnicalAssetService,
    DiagnosticScoreRepository,
    PrismaDiagnosticScoreRepository,
    diagnosticScoreRepositoryProvider,
    DiagnosticScorePolicyService
  ],
  exports: [SITE_AUDIT_ADAPTER, SiteAuditService, AcceptanceRuleService, TechnicalAssetService, DiagnosticScorePolicyService]
})
export class SiteAuditModule {}
