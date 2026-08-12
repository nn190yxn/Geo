import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  AnalysisDiagnosisDashboard,
  BrandActionDashboard,
  BeginnerHomeDashboard,
  BrandId,
  ContentOperationDashboard,
  ContentOperationTemplate,
  MonitoringObjectDashboard,
  PublishingOperationDashboard,
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { ConfirmationQueueService } from '../automation/confirmation-queue.service';
import { hasRealMonitoringResponse } from '../monitoring/real-monitoring-response';
import { buildPublishingRecordPerformance } from '../publishing/publishing-record-performance.mapper';
import { SprintPublishingService } from '../sprints/sprint-publishing.service';
import { SprintRetestService } from '../sprints/sprint-retest.service';
import { calculateSprintMetricSummary } from '../sprints/sprint-metrics.service';
import {
  buildAnalysisDiagnosisDashboard,
  buildBrandActionDashboard,
  buildBeginnerHomeDashboard,
  buildContentOperationDashboard,
  buildMonitoringObjectDashboard,
  buildPublishingOperationDashboard,
} from './dashboard.mapper';

const contentTemplates: ContentOperationTemplate[] = [
  { contentType: 'wechat_article', title: '公众号推文', targetPlatforms: ['wechat_official'] },
  { contentType: 'xiaohongshu_post', title: '小红书图文', targetPlatforms: ['xiaohongshu'] },
  { contentType: 'website_faq', title: '官网 FAQ', targetPlatforms: ['official_site_faq'] },
  { contentType: 'short_video_script', title: '短视频脚本', targetPlatforms: ['douyin', 'bilibili', 'wechat_video'] },
];

@Injectable()
export class DashboardsService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly sprintPublishingService: SprintPublishingService,
    private readonly sprintRetestService: SprintRetestService,
    private readonly confirmationQueueService: ConfirmationQueueService,
  ) {}

  async getBeginnerHomeDashboard(userId: string, brandId: BrandId): Promise<BeginnerHomeDashboard> {
    return this.aggregate(async () => {
      await this.ensureBrandAccess(userId, brandId);
      const [profile, optimizationUnits, runs, contentWorkspace, publishingDashboard, publishingStats, citationDashboard, taskBoard, findings, currentSprint] =
        await Promise.all([
          Promise.resolve(this.permissionsService.getBrandProfile(userId, brandId)),
          Promise.resolve(this.permissionsService.listOptimizationUnits(userId, brandId)),
          Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId)),
          Promise.resolve(this.permissionsService.getContentGenerationWorkspace(userId, brandId)),
          Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId)),
          this.permissionsService.getPublishingChannelStats(userId, brandId),
          Promise.resolve(this.permissionsService.getCitationDashboard(userId, brandId)),
          Promise.resolve(this.permissionsService.getTaskBoard(userId, brandId)),
          this.permissionsService.listAnalysisFindings(userId, brandId),
          this.permissionsService.getCurrentVisibilitySprint(userId, brandId),
        ]);

      const realResponseRuns = (runs ?? []).filter(hasRealMonitoringResponse);
      return buildBeginnerHomeDashboard({
        brandId,
        profile: profile ?? undefined,
        monitoringObjectCount: optimizationUnits?.length ?? 0,
        realResponseRuns,
        contentTasks: contentWorkspace?.tasks ?? [],
        publishingStats: publishingStats ?? [],
        publishingPerformance: buildPublishingRecordPerformance(
          publishingDashboard?.records ?? [],
          citationDashboard?.sources ?? [],
          taskBoard?.tasks ?? [],
        ),
        analysisFindings: findings ?? [],
        currentSprint: currentSprint
          ? { ...currentSprint, metricSummary: calculateSprintMetricSummary(currentSprint, realResponseRuns) }
          : undefined,
      });
    });
  }

  async getBrandActionDashboard(userId: string, brandId: BrandId): Promise<BrandActionDashboard> {
    return this.aggregate(async () => {
      await this.ensureBrandAccess(userId, brandId);
      const sources = [
        ['profile', () => this.permissionsService.getBrandProfile(userId, brandId)],
        ['optimizationUnits', () => this.permissionsService.listOptimizationUnits(userId, brandId)],
        ['monitoringRuns', () => this.permissionsService.listMonitoringRuns(userId, brandId)],
        ['contentWorkspace', () => this.permissionsService.getContentGenerationWorkspace(userId, brandId)],
        ['publishingDashboard', () => this.permissionsService.getPublishingDashboard(userId, brandId)],
        ['taskBoard', () => this.permissionsService.getTaskBoard(userId, brandId)],
        ['pendingConfirmations', () => this.confirmationQueueService.listPending(userId, brandId)],
        ['currentSprint', () => this.permissionsService.getCurrentVisibilitySprint(userId, brandId)],
        ['reportDashboard', () => this.permissionsService.getReportDashboard(userId, brandId)],
        ['publishingStats', () => this.permissionsService.getPublishingChannelStats(userId, brandId)],
        ['citationDashboard', () => this.permissionsService.getCitationDashboard(userId, brandId)],
        ['analysisFindings', () => this.permissionsService.listAnalysisFindings(userId, brandId)],
      ] as const;
      const results = await Promise.allSettled(sources.map(async ([, loader]): Promise<unknown> => loader()));
      const accessFailure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected' && result.reason instanceof ForbiddenException,
      );
      if (accessFailure) throw accessFailure.reason;
      if (results.slice(0, 6).every((result) => result.status === 'rejected')) {
        throw new ServiceUnavailableException({
          code: 'DASHBOARD_TEMPORARILY_UNAVAILABLE',
          message: '页面数据暂时无法加载，请稍后重试',
        });
      }

      const value = <T>(index: number, fallback: T): T => {
        const result = results[index];
        return result?.status === 'fulfilled' ? (result.value as T) ?? fallback : fallback;
      };
      const profile = value<ReturnType<PermissionsService['getBrandProfile']>>(0, null);
      const optimizationUnits = value<NonNullable<ReturnType<PermissionsService['listOptimizationUnits']>>>(1, []);
      const monitoringRuns = value<NonNullable<ReturnType<PermissionsService['listMonitoringRuns']>>>(2, []);
      const contentWorkspace = value<ReturnType<PermissionsService['getContentGenerationWorkspace']>>(3, null);
      const publishingDashboard = value<ReturnType<PermissionsService['getPublishingDashboard']>>(4, null);
      const taskBoard = value<ReturnType<PermissionsService['getTaskBoard']>>(5, null);
      const pendingConfirmations = value<ReturnType<ConfirmationQueueService['listPending']>>(6, []);
      const currentSprint = value<Awaited<ReturnType<PermissionsService['getCurrentVisibilitySprint']>>>(7, null);
      const reportDashboard = value<ReturnType<PermissionsService['getReportDashboard']>>(8, null);
      const publishingStats = value<Awaited<ReturnType<PermissionsService['getPublishingChannelStats']>>>(9, []) ?? [];
      const citationDashboard = value<Awaited<ReturnType<PermissionsService['getCitationDashboard']>>>(10, null);
      const analysisFindings = value<Awaited<ReturnType<PermissionsService['listAnalysisFindings']>>>(11, []) ?? [];
      const realResponseRuns = monitoringRuns.filter(hasRealMonitoringResponse);
      const sprint = currentSprint
        ? { ...currentSprint, metricSummary: calculateSprintMetricSummary(currentSprint, realResponseRuns) }
        : undefined;
      const publishingPerformance = buildPublishingRecordPerformance(
        publishingDashboard?.records ?? [],
        citationDashboard?.sources ?? [],
        taskBoard?.tasks ?? [],
      );
      const beginnerHome = buildBeginnerHomeDashboard({
        brandId,
        profile: profile ?? undefined,
        monitoringObjectCount: optimizationUnits.length,
        realResponseRuns,
        contentTasks: contentWorkspace?.tasks ?? [],
        publishingStats,
        publishingPerformance,
        analysisFindings,
        currentSprint: sprint,
      });

      return buildBrandActionDashboard({
        brandId,
        beginnerHome,
        profile: profile ?? undefined,
        optimizationUnits,
        monitoringRuns,
        contentTasks: contentWorkspace?.tasks ?? [],
        publishingRecords: publishingDashboard?.records ?? [],
        optimizationTasks: taskBoard?.tasks ?? [],
        pendingConfirmations,
        currentSprint: sprint,
        reportDashboard: reportDashboard ?? undefined,
        sourceFailures: results.flatMap((result, index) => result.status === 'rejected' ? [sources[index][0]] : []),
      });
    });
  }

  async getMonitoringObjectDashboard(userId: string, brandId: BrandId): Promise<MonitoringObjectDashboard> {
    return this.aggregate(async () => {
      await this.ensureBrandAccess(userId, brandId);
      const [optimizationUnits, intents, prompts, taskBoard] = await Promise.all([
        Promise.resolve(this.permissionsService.listOptimizationUnits(userId, brandId)),
        Promise.resolve(this.permissionsService.listUserIntents(userId, brandId)),
        Promise.resolve(this.permissionsService.listBrandPrompts(userId, brandId)),
        Promise.resolve(this.permissionsService.getTaskBoard(userId, brandId)),
      ]);
      return buildMonitoringObjectDashboard({
        brandId,
        optimizationUnits: optimizationUnits ?? [],
        intents: (intents ?? []).map((intent) => ({
          ...intent,
          platformMetrics: intent.platformMetrics.filter((metric) => metric.platformCode !== 'mock_ai'),
        })),
        prompts: (prompts ?? []).map((prompt) => ({
          ...prompt,
          platformCodes: prompt.platformCodes.filter((platformCode) => platformCode !== 'mock_ai'),
        })),
        contentTasks: taskBoard?.tasks ?? [],
      });
    });
  }

  async getContentOperationDashboard(userId: string, brandId: BrandId): Promise<ContentOperationDashboard> {
    return this.aggregate(async () => {
      await this.ensureBrandAccess(userId, brandId);
      const currentSprint = await this.permissionsService.getCurrentVisibilitySprint(userId, brandId);
      const [workspace, materials, assets, publishingStats, publishingPreparation, retest] = await Promise.all([
        Promise.resolve(this.permissionsService.getContentGenerationWorkspace(userId, brandId)),
        this.permissionsService.listBrandMediaAssets(userId, brandId),
        this.permissionsService.listContentAssetPageItems(userId, brandId),
        this.permissionsService.getPublishingChannelStats(userId, brandId),
        currentSprint
          ? this.sprintPublishingService.getPublishingPreparationDashboard(userId, brandId, currentSprint.sprintId)
          : Promise.resolve(null),
        currentSprint
          ? this.sprintRetestService.getRetestTrendDashboard(userId, brandId, currentSprint.sprintId)
          : Promise.resolve(null),
      ]);
      return buildContentOperationDashboard({
        brandId,
        tasks: workspace?.tasks ?? [],
        templates: contentTemplates,
        materials: materials ?? [],
        assets: assets ?? [],
        publishingPreparation: publishingPreparation ?? undefined,
        publishingStats: publishingStats ?? [],
        retest: retest ?? undefined,
      });
    });
  }

  async getPublishingOperationDashboard(userId: string, brandId: BrandId): Promise<PublishingOperationDashboard> {
    return this.aggregate(async () => {
      await this.ensureBrandAccess(userId, brandId);
      const currentSprint = await this.permissionsService.getCurrentVisibilitySprint(userId, brandId);
      const [accounts, platformRules, publishingDashboard, citationDashboard, taskBoard, channelStats, retest] = await Promise.all([
        this.permissionsService.listOwnedMediaAccounts(userId, brandId),
        this.permissionsService.listMediaPlatformRules(userId, brandId),
        Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId)),
        Promise.resolve(this.permissionsService.getCitationDashboard(userId, brandId)),
        Promise.resolve(this.permissionsService.getTaskBoard(userId, brandId)),
        this.permissionsService.getPublishingChannelStats(userId, brandId),
        currentSprint
          ? this.sprintRetestService.getRetestTrendDashboard(userId, brandId, currentSprint.sprintId)
          : Promise.resolve(null),
      ]);
      return buildPublishingOperationDashboard({
        brandId,
        accounts: accounts ?? [],
        platformRules: platformRules ?? [],
        records: publishingDashboard?.records ?? [],
        citations: citationDashboard?.sources ?? [],
        performance: buildPublishingRecordPerformance(
          publishingDashboard?.records ?? [],
          citationDashboard?.sources ?? [],
          taskBoard?.tasks ?? [],
        ),
        channelStats: channelStats ?? [],
        retest: retest ?? undefined,
      });
    });
  }

  async getAnalysisDiagnosisDashboard(userId: string, brandId: BrandId): Promise<AnalysisDiagnosisDashboard> {
    return this.aggregate(async () => {
      await this.ensureBrandAccess(userId, brandId);
      const workbench = await this.permissionsService.getAnalysisWorkbenchDashboard(userId, brandId);
      const findings = workbench?.findings ?? (await this.permissionsService.listAnalysisFindings(userId, brandId)) ?? [];
      return buildAnalysisDiagnosisDashboard(brandId, findings);
    });
  }

  private async aggregate<T>(loader: () => Promise<T>): Promise<T> {
    try {
      return await loader();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException({
        code: 'DASHBOARD_TEMPORARILY_UNAVAILABLE',
        message: '页面数据暂时无法加载，请稍后重试',
      });
    }
  }

  private async ensureBrandAccess(userId: string, brandId: BrandId): Promise<void> {
    const accessibleBrands = await Promise.resolve(this.permissionsService.listAccessibleBrands(userId));
    if (!accessibleBrands.some((brand) => brand.brandId === brandId)) {
      throw new ForbiddenException('当前用户无权访问该品牌工作区');
    }
  }
}
