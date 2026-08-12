import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MonitoringRunDetail, OptimizationUnit } from '@geo-platform/shared-types';
import { DashboardsController } from '../src/modules/dashboards/dashboards.controller';
import { DashboardsService } from '../src/modules/dashboards/dashboards.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import type { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import type { SprintPublishingService } from '../src/modules/sprints/sprint-publishing.service';
import type { SprintRetestService } from '../src/modules/sprints/sprint-retest.service';

const brandId = 'brand-a';
const now = '2026-07-14T10:00:00.000Z';

function createPermissionsService(overrides: Record<string, unknown> = {}): PermissionsService {
  return {
    listAccessibleBrands: vi.fn().mockReturnValue([{ brandId, name: '品牌 A', status: 'active', role: 'owner' }]),
    getBrandProfile: vi.fn().mockReturnValue(null),
    listOptimizationUnits: vi.fn().mockReturnValue([]),
    listMonitoringRuns: vi.fn().mockReturnValue([]),
    getContentGenerationWorkspace: vi.fn().mockReturnValue(null),
    getPublishingDashboard: vi.fn().mockReturnValue(null),
    getPublishingChannelStats: vi.fn().mockResolvedValue([]),
    getCitationDashboard: vi.fn().mockReturnValue(null),
    getTaskBoard: vi.fn().mockReturnValue(null),
    listAnalysisFindings: vi.fn().mockResolvedValue([]),
    getCurrentVisibilitySprint: vi.fn().mockResolvedValue(null),
    listUserIntents: vi.fn().mockReturnValue([]),
    listBrandPrompts: vi.fn().mockReturnValue([]),
    listBrandMediaAssets: vi.fn().mockResolvedValue([]),
    listContentAssetPageItems: vi.fn().mockResolvedValue([]),
    listOwnedMediaAccounts: vi.fn().mockResolvedValue([]),
    listMediaPlatformRules: vi.fn().mockResolvedValue([]),
    getAnalysisWorkbenchDashboard: vi.fn().mockResolvedValue(null),
    getReportDashboard: vi.fn().mockReturnValue(null),
    ...overrides,
  } as unknown as PermissionsService;
}

function createService(permissionsService: PermissionsService, pendingConfirmations: unknown[] = []): DashboardsService {
  const sprintPublishingService = {
    getPublishingPreparationDashboard: vi.fn().mockResolvedValue(null),
  } as unknown as SprintPublishingService;
  const sprintRetestService = {
    getRetestTrendDashboard: vi.fn().mockResolvedValue(null),
  } as unknown as SprintRetestService;
  const confirmationQueueService = {
    listPending: vi.fn().mockReturnValue(pendingConfirmations),
  } as unknown as ConfirmationQueueService;
  return new DashboardsService(permissionsService, sprintPublishingService, sprintRetestService, confirmationQueueService);
}

function createRun(platformCode: string): MonitoringRunDetail {
  return {
    id: `run-${platformCode}`,
    brandId,
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    promptId: 'prompt-1',
    promptText: '推荐一个品牌',
    platformCode,
    status: 'completed',
    createdAt: now,
    response: {
      id: `response-${platformCode}`,
      runId: `run-${platformCode}`,
      brandId,
      rawText: 'AI 回复',
      citations: [],
      respondedAt: now,
      parseStatus: 'parsed',
      createdAt: now,
    },
    analysis: {} as MonitoringRunDetail['analysis'],
  };
}

describe('DashboardsService', () => {
  it('聚合新手首页并排除示例回答', async () => {
    const unit = { id: 'unit-1', brandId } as OptimizationUnit;
    const service = createService(
      createPermissionsService({
        listOptimizationUnits: vi.fn().mockReturnValue([unit]),
        listMonitoringRuns: vi.fn().mockReturnValue([createRun('doubao'), createRun('mock_ai')]),
      }),
    );

    const dashboard = await service.getBeginnerHomeDashboard('user-a', brandId);

    expect(dashboard.monitoringObjectCount).toBe(1);
    expect(dashboard.realResponseStatus).toMatchObject({ total: 1, collected: 1 });
    expect(dashboard.nextAction.actionType).toBe('complete_profile');
  });

  it('在子数据缺失时返回可渲染的内容运营空态', async () => {
    const service = createService(createPermissionsService());

    const dashboard = await service.getContentOperationDashboard('user-a', brandId);

    expect(dashboard).toMatchObject({ brandId, tasks: [], materials: [], assets: [], publishingStats: [] });
    expect(dashboard.templates.length).toBeGreaterThan(0);
    expect(dashboard.publishingPreparation).toBeUndefined();
    expect(dashboard.retest).toBeUndefined();
  });

  it('从监测对象页面模型中移除示例平台', async () => {
    const service = createService(
      createPermissionsService({
        listOptimizationUnits: vi.fn().mockReturnValue([{ id: 'unit-1', brandId, name: '核心业务' }]),
        listUserIntents: vi.fn().mockReturnValue([
          { id: 'intent-1', brandId, optimizationUnitId: 'unit-1', platformMetrics: [{ platformCode: 'doubao' }, { platformCode: 'mock_ai' }] },
        ]),
        listBrandPrompts: vi.fn().mockReturnValue([
          { id: 'prompt-1', brandId, optimizationUnitId: 'unit-1', platformCodes: ['doubao', 'mock_ai'] },
        ]),
      }),
    );

    const dashboard = await service.getMonitoringObjectDashboard('user-a', brandId);

    expect(dashboard.objects[0]?.intents[0]?.platformMetrics.map((metric) => metric.platformCode)).toEqual(['doubao']);
    expect(dashboard.objects[0]?.prompts[0]?.platformCodes).toEqual(['doubao']);
  });

  it('将底层聚合异常转换为用户可理解的稳定错误码', async () => {
    const service = createService(
      createPermissionsService({ getBrandProfile: vi.fn().mockImplementation(() => { throw new Error('database unavailable'); }) }),
    );

    const error = await service.getBeginnerHomeDashboard('user-a', brandId).catch((caught) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      code: 'DASHBOARD_TEMPORARILY_UNAVAILABLE',
      message: '页面数据暂时无法加载，请稍后重试',
    });
  });

  it('在服务层拒绝跨品牌聚合访问', async () => {
    const service = createService(createPermissionsService({ listAccessibleBrands: vi.fn().mockReturnValue([]) }));

    const error = await service.getBeginnerHomeDashboard('user-a', brandId).catch((caught) => caught);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).message).toBe('当前用户无权访问该品牌工作区');
  });

  it('聚合行动主页并让人工确认优先于执行任务', async () => {
    const service = createService(
      createPermissionsService({
        getBrandProfile: vi.fn().mockReturnValue({ brandId, completenessScore: 100, missingFields: [] }),
        listOptimizationUnits: vi.fn().mockReturnValue([{ id: 'unit-1', brandId }]),
        listMonitoringRuns: vi.fn().mockReturnValue([createRun('doubao')]),
        getTaskBoard: vi.fn().mockReturnValue({ brandId, tasks: [{
          id: 'task-1', brandId, title: '执行优化', type: 'manual', status: 'todo', retestRecords: [], createdAt: now, updatedAt: now,
        }] }),
      }),
      [{
        confirmationId: 'confirm-1', packageId: 'package-1', brandId, type: 'analysis_review', status: 'pending',
        title: '确认分析', impact: '影响内容', recommendation: '人工确认', evidenceSummary: '证据', payload: { runId: 'run-doubao' },
      }],
    );

    const dashboard = await service.getBrandActionDashboard('user-a', brandId);

    expect(dashboard.primaryAction.id).toBe('confirmation:confirm-1');
    expect(dashboard.todos.map((item) => item.id)).toContain('task:task-1');
    expect(dashboard.latestValidSample?.runId).toBe('run-doubao');
  });

  it('部分来源失败时保留成功数据和失败来源', async () => {
    const service = createService(createPermissionsService({
      getBrandProfile: vi.fn().mockReturnValue({ brandId, completenessScore: 100, missingFields: [] }),
      listOptimizationUnits: vi.fn().mockReturnValue([{ id: 'unit-1', brandId }]),
      listMonitoringRuns: vi.fn().mockReturnValue([createRun('doubao')]),
      getReportDashboard: vi.fn().mockImplementation(() => { throw new Error('report unavailable'); }),
    }));

    const dashboard = await service.getBrandActionDashboard('user-a', brandId);

    expect(dashboard.primaryAction.id).toBe('review:latest-results');
    expect(dashboard.latestValidSample?.runId).toBe('run-doubao');
    expect(dashboard.sourceFailures).toEqual(['reportDashboard']);
  });

  it('全部核心来源失败时返回稳定 503', async () => {
    const failure = () => { throw new Error('source unavailable'); };
    const service = createService(createPermissionsService({
      getBrandProfile: vi.fn(failure),
      listOptimizationUnits: vi.fn(failure),
      listMonitoringRuns: vi.fn(failure),
      getContentGenerationWorkspace: vi.fn(failure),
      getPublishingDashboard: vi.fn(failure),
      getTaskBoard: vi.fn(failure),
    }));

    const error = await service.getBrandActionDashboard('user-a', brandId).catch((caught) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      code: 'DASHBOARD_TEMPORARILY_UNAVAILABLE',
      message: '页面数据暂时无法加载，请稍后重试',
    });
  });

  it('行动接口拒绝跨品牌访问并返回净化统一响应', async () => {
    const deniedService = createService(createPermissionsService({ listAccessibleBrands: vi.fn().mockReturnValue([]) }));
    await expect(deniedService.getBrandActionDashboard('user-a', brandId)).rejects.toBeInstanceOf(ForbiddenException);

    const dashboardsService = createService(createPermissionsService());
    const controller = new DashboardsController(dashboardsService);
    const response = await controller.getActions({ context: { userId: 'user-a' } } as never, brandId);
    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({ brandId, primaryAction: { id: 'blocker:brand-profile' } });
  });

  it('按品牌过滤分析诊断数据并生成统一响应', async () => {
    const dashboardsService = createService(
      createPermissionsService({
        getAnalysisWorkbenchDashboard: vi.fn().mockResolvedValue({
          brandId,
          findings: [
            { id: 'finding-a', brandId, type: 'fact', title: '事实待确认', evidence: [], severity: 'high', recommendedActions: [] },
            { id: 'finding-b', brandId: 'brand-b', type: 'fact', title: '其他品牌', evidence: [], severity: 'high', recommendedActions: [] },
          ],
          recommendedActions: [],
        }),
      }),
    );
    const controller = new DashboardsController(dashboardsService);

    const response = await controller.getAnalysisDiagnosis(
      { context: { userId: 'user-a' } } as never,
      brandId,
    );

    expect(response.success).toBe(true);
    expect(response.data.findings.map((finding) => finding.id)).toEqual(['finding-a']);
  });
});
