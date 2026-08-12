import { Inject, Injectable } from '@nestjs/common';
import type { BrandId, ProductEffectDashboard, ProductEffectMetric, ProductEvent } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { PRODUCT_EVENT_REPOSITORY, type ProductEventRepositoryPort } from './product-event.repository.port';

@Injectable()
export class ProductEffectService {
  constructor(
    @Inject(PRODUCT_EVENT_REPOSITORY) private readonly repository: ProductEventRepositoryPort,
    private readonly permissionsService: PermissionsService
  ) {}

  async getDashboard(userId: string, brandId: BrandId, from?: string, to?: string): Promise<ProductEffectDashboard | null> {
    const organizationId = await this.permissionsService.getAccessibleBrandOrganizationId(userId, brandId);
    if (!organizationId) return null;
    const period = resolvePeriod(from, to);
    const events = await this.repository.list(organizationId, brandId, period.from, period.to);
    const has = (type: ProductEvent['eventType']) => events.some((event) => event.eventType === type);
    const metric = (key: ProductEffectMetric['key'], label: string, numerator: number, denominator: number, definition: string, gap?: string): ProductEffectMetric => ({
      key, label, value: denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : null, numerator, denominator, denominatorDefinition: definition, ...(gap ? { dataGap: gap } : {})
    });
    const created = has('brand_created');
    const firstMonitoring = has('first_monitoring_completed');
    const recommended = has('recommendation_adopted');
    const published = has('published');
    const retested = has('retest_completed');
    const improved = events.some((event) => event.eventType === 'retest_completed' && event.metadata.status === 'improved');
    const createdAt = events.find((event) => event.eventType === 'brand_created')?.occurredAt;
    const firstMonitoringAt = events.find((event) => event.eventType === 'first_monitoring_completed')?.occurredAt;
    const insightHours = createdAt && firstMonitoringAt ? Number(((Date.parse(firstMonitoringAt) - Date.parse(createdAt)) / 3_600_000).toFixed(2)) : null;
    const dataGaps = [
      ...(created ? [] : ['统计周期内缺少品牌创建事件']),
      ...(firstMonitoring ? [] : ['尚无首轮有效监测事件']),
      ...(retested ? [] : ['尚无再次监测完成事件'])
    ];
    return {
      organizationId, brandId, period: { from: period.from.toISOString(), to: period.to.toISOString() }, sampleSize: events.length, dataGaps,
      metrics: [
        metric('firstMonitoringReachRate', '首轮监测到达率', firstMonitoring ? 1 : 0, created ? 1 : 0, '统计周期内创建品牌数'),
        { key: 'timeToFirstInsightHours', label: '首次有效洞察耗时', value: insightHours, numerator: insightHours ?? 0, denominator: insightHours === null ? 0 : 1, denominatorDefinition: '从品牌创建到首轮有效监测完成的品牌数', ...(insightHours === null ? { dataGap: '需要品牌创建和首轮有效监测事件' } : {}) },
        metric('recommendationAdoptionRate', '建议采纳率', recommended ? 1 : 0, firstMonitoring ? 1 : 0, '完成首轮有效监测的品牌数'),
        metric('publishingCompletionRate', '发布完成率', published ? 1 : 0, has('content_saved') ? 1 : 0, '已保存内容的品牌数'),
        metric('retestCompletionRate', '再次监测完成率', retested ? 1 : 0, published ? 1 : 0, '已发布内容的品牌数'),
        metric('improvedTaskRate', '有改善任务占比', improved ? 1 : 0, retested ? 1 : 0, '已完成再次监测的品牌数')
      ]
    };
  }
}

function resolvePeriod(from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86_400_000);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end) throw new Error('统计周期无效');
  return { from: start, to: end };
}
