import { Controller, Get, NotFoundException, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, BrandMetricDashboard, BrandMetricRankingItem } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

type RankingSortKey = 'totalScore' | 'mentionRate' | 'top3Rate' | 'positiveRate' | 'periodChange';

@Controller()
export class MetricsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('brands/:brandId/metrics')
  async getBrandMetricDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<BrandMetricDashboard>> {
    const dashboard = await this.permissionsService.getBrandMetricDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('品牌指标不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: dashboard
    };
  }

  @Get('metrics/brands/ranking')
  async listBrandMetricRanking(
    @Req() request: Request,
    @Query('sortBy') sortBy?: RankingSortKey
  ): Promise<ApiResponse<BrandMetricRankingItem[]>> {
    return {
      success: true,
      data: await this.permissionsService.listBrandMetricRanking(request.context.userId, normalizeSortKey(sortBy))
    };
  }
}

function normalizeSortKey(sortBy?: RankingSortKey): RankingSortKey {
  return sortBy && rankingSortKeys.includes(sortBy) ? sortBy : 'totalScore';
}

const rankingSortKeys: RankingSortKey[] = ['totalScore', 'mentionRate', 'top3Rate', 'positiveRate', 'periodChange'];
