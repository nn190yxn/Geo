import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CompetitorsController } from './competitors.controller';
import { CompetitorOpportunityService } from './competitor-opportunity.service';

@Module({
  imports: [PermissionsModule],
  controllers: [CompetitorsController],
  providers: [CompetitorOpportunityService]
})
export class CompetitorsModule {}
