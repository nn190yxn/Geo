import { Injectable } from '@nestjs/common';
import type {
  BrandId,
  OptimizationTask,
  PublishingRecord,
  RetestMetricDelta,
  RetestMetricSnapshot,
  RetestRecord,
  SprintRetestPlanInput,
  SprintRetestPlanResult,
  SprintRetestTrendDashboard,
  SprintRetestTrendItem,
  VisibilitySprint
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class SprintRetestService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async createRetestPlan(userId: string, brandId: BrandId, sprintId: string, input: SprintRetestPlanInput = {}): Promise<SprintRetestPlanResult | null> {
    const [sprint, taskBoard, publishingDashboard] = await Promise.all([
      this.permissionsService.getVisibilitySprint(userId, brandId, sprintId),
      Promise.resolve(this.permissionsService.getTaskBoard(userId, brandId)),
      Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId))
    ]);
    if (!sprint || !taskBoard || !publishingDashboard) {
      return null;
    }

    const selectedRecordIds = new Set(input.publishingRecordIds?.map((id) => id.trim()).filter(Boolean) ?? []);
    const relatedRecordIds = new Set(sprint.relatedPublishingRecordIds);
    const existingTasks = taskBoard.tasks.filter((task) => sprint.relatedRetestTaskIds.includes(task.id));
    const newTaskIds: string[] = [];
    const tasks: OptimizationTask[] = [];
    let skippedPublishingRecordCount = 0;

    for (const record of publishingDashboard.records) {
      if (!relatedRecordIds.has(record.id)) continue;
      if (selectedRecordIds.size > 0 && !selectedRecordIds.has(record.id)) continue;
      if (record.status === 'draft' || record.status === 'failed') {
        skippedPublishingRecordCount += 1;
        continue;
      }

      const existingTask = existingTasks.find((task) => isTaskForPublishingRecord(task, record));
      if (existingTask) {
        tasks.push(existingTask);
        newTaskIds.push(existingTask.id);
        continue;
      }

      const task = this.permissionsService.createOptimizationTask(userId, brandId, {
        title: buildRetestTaskTitle(record),
        type: 'monitoring_issue',
        ownerId: userId,
        sourceRunId: sprint.relatedMonitoringRunIds[0],
        relatedPlatformCode: record.platform,
        dueDate: input.plannedAt ?? buildDefaultRetestDate(),
        priority: 'high'
      });
      if (!task) {
        skippedPublishingRecordCount += 1;
        continue;
      }

      const updatedTask = this.permissionsService.updateOptimizationTask(userId, brandId, task.id, {
        status: 'retest',
        ...(record.publishedUrl ? { contentLink: record.publishedUrl } : {}),
        processingNote: buildRetestTaskNote(record, input.targetScore)
      }) ?? task;
      tasks.push(updatedTask);
      newTaskIds.push(updatedTask.id);
    }

    const updatedSprint = await this.permissionsService.updateVisibilitySprintRelations(userId, brandId, sprintId, {
      relatedRetestTaskIds: unique([...sprint.relatedRetestTaskIds, ...newTaskIds])
    });

    return {
      brandId,
      sprintId,
      createdTaskCount: tasks.filter((task) => !sprint.relatedRetestTaskIds.includes(task.id)).length,
      skippedPublishingRecordCount,
      tasks,
      sprint: updatedSprint ?? { ...sprint, relatedRetestTaskIds: unique([...sprint.relatedRetestTaskIds, ...newTaskIds]) }
    };
  }

  async getRetestTrendDashboard(userId: string, brandId: BrandId, sprintId: string): Promise<SprintRetestTrendDashboard | null> {
    const [sprint, taskBoard, publishingDashboard] = await Promise.all([
      this.permissionsService.getVisibilitySprint(userId, brandId, sprintId),
      Promise.resolve(this.permissionsService.getTaskBoard(userId, brandId)),
      Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId))
    ]);
    if (!sprint || !taskBoard || !publishingDashboard) {
      return null;
    }

    const retestTasks = taskBoard.tasks.filter((task) => sprint.relatedRetestTaskIds.includes(task.id));
    const items = retestTasks.map((task) => buildTrendItem(task, publishingDashboard.records));

    return {
      brandId,
      sprintId,
      plannedTaskCount: items.length,
      completedRetestCount: items.filter((item) => item.latestRetestRecord?.completedAt).length,
      improvedRetestCount: items.filter((item) => item.status === 'improved').length,
      baselineMetricSummary: sprint.metricSummary,
      items,
      updatedAt: new Date().toISOString()
    };
  }
}

function buildTrendItem(task: OptimizationTask, records: PublishingRecord[]): SprintRetestTrendItem {
  const latestRetestRecord = [...task.retestRecords].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const publishingRecord = records.find((record) => isTaskForPublishingRecord(task, record));
  const status = resolveTrendStatus(latestRetestRecord);

  return {
    task,
    publishingRecord,
    latestRetestRecord,
    status,
    beforeMetrics: latestRetestRecord?.beforeMetrics,
    afterMetrics: latestRetestRecord?.afterMetrics,
    metricDelta: latestRetestRecord?.metricDelta,
    message: buildTrendMessage(status, latestRetestRecord)
  };
}

function resolveTrendStatus(record: RetestRecord | undefined): SprintRetestTrendItem['status'] {
  if (!record?.completedAt) {
    return 'planned';
  }
  if (record.improved || record.passed) {
    return 'improved';
  }

  return 'needs_follow_up';
}

function buildTrendMessage(status: SprintRetestTrendItem['status'], record: RetestRecord | undefined): string {
  if (status === 'planned') return '复测任务已建立，等待真实复测运行结果。';
  if (status === 'improved') return '复测结果有改善，可进入趋势记录和下一轮扩展。';
  if (record?.completedAt) return '复测已完成但改善不足，需要继续调整内容或信源。';

  return '复测已完成。';
}

function buildRetestTaskTitle(record: PublishingRecord): string {
  return `复测发布内容：${record.title}`;
}

function buildRetestTaskNote(record: PublishingRecord, targetScore?: number): string {
  const parts = [`发布记录：${record.id}`, `目标平台：${record.platform}`];
  if (targetScore !== undefined) parts.push(`目标分：${targetScore}`);
  return parts.join('；');
}

function isTaskForPublishingRecord(task: OptimizationTask, record: PublishingRecord): boolean {
  return task.title === buildRetestTaskTitle(record) || Boolean(record.publishedUrl && task.contentLink === record.publishedUrl);
}

function buildDefaultRetestDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeSprintRetestPlanInput(input: SprintRetestPlanInput): SprintRetestPlanInput {
  return {
    ...(input.publishingRecordIds ? { publishingRecordIds: input.publishingRecordIds.map((id) => id.trim()).filter(Boolean) } : {}),
    ...(input.plannedAt?.trim() ? { plannedAt: input.plannedAt.trim() } : {}),
    ...(typeof input.targetScore === 'number' ? { targetScore: input.targetScore } : {})
  };
}
