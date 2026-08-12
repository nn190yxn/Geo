import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, CitationDashboard, ContentAsset, ContentAssetInput, ContentStrategy } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { CitationAbsorptionService } from './citation-absorption.service';

@Controller('brands/:brandId/citations')
export class CitationsController {
  constructor(private readonly permissionsService: PermissionsService, private readonly absorptionService: CitationAbsorptionService) {}

  @Get()
  async getCitationDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<CitationDashboard>> {
    const dashboard = await this.permissionsService.getCitationDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('引用分析不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: dashboard
    };
  }

  @Post(':citationId/absorption')
  async analyzeAbsorption(@Req() request: Request, @Param('brandId') brandId: string, @Param('citationId') citationId: string) {
    const source = await this.absorptionService.analyze(request.context.userId, brandId, citationId);
    if (!source) throw new NotFoundException('引用来源不存在或当前用户无权访问');
    return { success: true, data: source };
  }

  @Post(':citationId/absorption/:evidenceId/review')
  async reviewAbsorption(@Req() request: Request, @Param('brandId') brandId: string, @Param('citationId') citationId: string, @Param('evidenceId') evidenceId: string) {
    const source = await this.absorptionService.review(request.context.userId, brandId, citationId, evidenceId);
    if (!source) throw new NotFoundException('引用证据不存在或当前用户无权访问');
    return { success: true, data: source };
  }

  @Post(':citationId/content-asset')
  async bindContentAsset(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('citationId') citationId: string,
    @Body() input: ContentAssetInput
  ): Promise<ApiResponse<ContentAsset>> {
    const asset = await this.permissionsService.bindCitationContentAsset(request.context.userId, brandId, citationId, input);

    if (!asset) {
      throw new NotFoundException('引用来源不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: asset
    };
  }

  @Post(':citationId/enhancement-strategy')
  async createEnhancementStrategy(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('citationId') citationId: string
  ): Promise<ApiResponse<ContentStrategy>> {
    const strategy = await this.permissionsService.createCitationEnhancementStrategy(request.context.userId, brandId, citationId);

    if (!strategy) {
      throw new NotFoundException('引用来源不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: strategy
    };
  }
}
