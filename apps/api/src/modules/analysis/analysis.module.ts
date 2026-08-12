import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { AnalysisController } from './analysis.controller';
import { SampleEvidenceService } from './sample-evidence.service';
import { MeasurementDisciplineService } from './measurement-discipline.service';
import { OpportunityDiscoveryService } from './opportunity-discovery.service';
import { MetricIntegrityService } from '../monitoring/metric-integrity.service';
import { ChannelRoadmapService } from './channel-roadmap.service';

@Module({
  imports: [PermissionsModule],
  controllers: [AnalysisController],
  providers: [SampleEvidenceService, MeasurementDisciplineService, OpportunityDiscoveryService, ChannelRoadmapService, MetricIntegrityService]
})
export class AnalysisModule {}
