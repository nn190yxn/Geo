import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  Competitor,
  CompetitorCandidate,
  CompetitorCandidateConfirmationResult,
  CompetitorCandidateDecisionInput,
  CompetitorDashboard,
  CompetitorDiscoveryCandidatesQuery,
  CompetitorDiscoveryRun,
  CompetitorDiscoveryRunInput,
  CompetitorInput,
  CompetitorOpportunityContentTaskInput,
  ContentGenerationWorkspace
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { CompetitorOpportunityService } from './competitor-opportunity.service';

@Controller('brands/:brandId/competitors')
export class CompetitorsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly competitorOpportunityService: CompetitorOpportunityService = new CompetitorOpportunityService(permissionsService)
  ) {}

  @Get()
  async listCompetitors(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<Competitor[]>> {
    const competitors = await this.permissionsService.listCompetitors(request.context.userId, brandId);

    if (!competitors) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: competitors
    };
  }

  @Post()
  async createCompetitor(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: CompetitorInput
  ): Promise<ApiResponse<Competitor>> {
    const competitor = await this.permissionsService.createCompetitor(request.context.userId, brandId, input);

    if (!competitor) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: competitor
    };
  }

  @Patch(':competitorId')
  async updateCompetitor(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('competitorId') competitorId: string,
    @Body() input: Partial<CompetitorInput>
  ): Promise<ApiResponse<Competitor>> {
    const competitor = await this.permissionsService.updateCompetitor(request.context.userId, brandId, competitorId, input);

    if (!competitor) {
      throw new NotFoundException('竞品不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: competitor
    };
  }

  @Post('discovery-runs')
  async createDiscoveryRun(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: CompetitorDiscoveryRunInput = {}
  ): Promise<ApiResponse<CompetitorDiscoveryRun>> {
    const run = await this.permissionsService.createCompetitorDiscoveryRun(request.context.userId, brandId, input);

    if (!run) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: run
    };
  }

  @Get('discovery-runs/:runId/candidates')
  async listDiscoveryCandidates(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('runId') runId: string,
    @Query('filter') filter?: CompetitorDiscoveryCandidatesQuery['filter']
  ): Promise<ApiResponse<CompetitorCandidate[]>> {
    const candidates = await this.permissionsService.listCompetitorDiscoveryCandidates(request.context.userId, brandId, runId, { filter });

    if (!candidates) {
      throw new NotFoundException('发现任务不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: candidates
    };
  }

  @Patch('candidates/:candidateId/decision')
  async decideCandidate(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('candidateId') candidateId: string,
    @Body() input: CompetitorCandidateDecisionInput
  ): Promise<ApiResponse<CompetitorCandidateConfirmationResult>> {
    const result = await this.permissionsService.decideCompetitorCandidate(request.context.userId, brandId, candidateId, input);

    if (!result) {
      throw new NotFoundException('候选机构不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  @Get('analysis')
  async getCompetitorDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<CompetitorDashboard>> {
    const dashboard = await this.competitorOpportunityService.getDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('竞品分析不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: dashboard
    };
  }

  @Post('opportunities/:promptId/content-task')
  async createOpportunityContentTask(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('promptId') promptId: string,
    @Body() input: Pick<CompetitorOpportunityContentTaskInput, 'targetPlatform'> = {}
  ): Promise<ApiResponse<ContentGenerationWorkspace>> {
    const result = await this.competitorOpportunityService.createOpportunityContentTask(request.context.userId, brandId, { promptId, ...input });
    if (!result) throw new NotFoundException('问题机会不存在或当前用户无权访问');
    return { success: true, data: result };
  }
}
