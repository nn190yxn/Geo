import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { CitationsController } from './citations.controller';
import { CITATION_SOURCE_FETCHER, CitationAbsorptionService, NodeFetchCitationSourceFetcher } from './citation-absorption.service';

@Module({
  imports: [PermissionsModule],
  controllers: [CitationsController],
  providers: [CitationAbsorptionService, { provide: CITATION_SOURCE_FETCHER, useClass: NodeFetchCitationSourceFetcher }]
})
export class CitationsModule {}
