import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, CitationDashboard, ContentAsset, ContentAssetInput, ContentStrategy } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/citations')
export class CitationsController {
  constructor(private readonly permissionsService: PermissionsService) {}

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
