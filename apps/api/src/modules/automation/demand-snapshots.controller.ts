import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, SearchDemandCandidateConfirmationResult, SearchDemandSnapshot, SearchDemandSnapshotInput } from '@geo-platform/shared-types';
import { DemandSnapshotService } from './demand-snapshot.service';

@Controller('brands/:brandId/demand-snapshots')
export class DemandSnapshotsController {
  constructor(private readonly service: DemandSnapshotService) {}

  @Get()
  async list(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<SearchDemandSnapshot[]>> {
    return success(await this.service.list(request.context.userId, brandId));
  }

  @Post()
  async capture(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: SearchDemandSnapshotInput
  ): Promise<ApiResponse<SearchDemandSnapshot>> {
    return success(await this.service.capture(request.context.userId, brandId, body));
  }

  @Post(':snapshotId/candidates/:candidateId/confirm')
  async confirmCandidate(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('snapshotId') snapshotId: string,
    @Param('candidateId') candidateId: string
  ): Promise<ApiResponse<SearchDemandCandidateConfirmationResult>> {
    return success(await this.service.confirmCandidate(request.context.userId, brandId, snapshotId, candidateId));
  }
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
