import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, ProductEffectDashboard } from '@geo-platform/shared-types';
import { ProductEffectService } from './product-effect.service';

@Controller('brands/:brandId/product-effects')
export class ProductEffectsController {
  constructor(private readonly productEffectService: ProductEffectService) {}

  @Get()
  async getDashboard(@Req() request: Request, @Param('brandId') brandId: string, @Query('from') from?: string, @Query('to') to?: string): Promise<ApiResponse<ProductEffectDashboard>> {
    try {
      const dashboard = await this.productEffectService.getDashboard(request.context.userId, brandId, from, to);
      if (!dashboard) throw new NotFoundException('品牌不存在或当前用户无权访问');
      return { success: true, data: dashboard };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('统计周期无效，请使用有效的起止时间');
    }
  }
}
