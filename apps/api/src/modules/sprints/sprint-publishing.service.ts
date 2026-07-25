import { Injectable } from '@nestjs/common';
import type {
  BrandId,
  ContentGenerationTask,
  ContentGenerationWorkspace,
  ContentVersion,
  PublishingRecord,
  PublishingRecordStatus,
  SprintPublishingPreparationDashboard,
  SprintPublishingPreparationInput,
  SprintPublishingPreparationItem,
  SprintPublishingPreparationResult,
  SprintPublishingPreparationStatus,
  VisibilitySprint
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class SprintPublishingService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async getPublishingPreparationDashboard(userId: string, brandId: BrandId, sprintId: string): Promise<SprintPublishingPreparationDashboard | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    const publishingDashboard = this.permissionsService.getPublishingDashboard(userId, brandId);
    if (!sprint || !publishingDashboard) {
      return null;
    }

    const relatedRecordIds = new Set(sprint.relatedPublishingRecordIds);
    const records = publishingDashboard.records.filter((record) => relatedRecordIds.has(record.id));
    const items = this.collectContentWorkspaces(userId, brandId, sprint)
      .map((workspace) => buildPreparationItem(workspace.currentTask, workspace.currentVersion, records));

    return {
      brandId,
      sprintId,
      totalContentTaskCount: items.length,
      preparedRecordCount: records.length,
      pendingManualPublishCount: records.filter((record) => record.status === 'pending').length,
      publishedRecordCount: records.filter((record) => record.status === 'published').length,
      failedRecordCount: records.filter((record) => record.status === 'failed').length,
      items,
      updatedAt: new Date().toISOString()
    };
  }

  async preparePublishingRecords(userId: string, brandId: BrandId, sprintId: string, input: SprintPublishingPreparationInput = {}): Promise<SprintPublishingPreparationResult | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    const publishingDashboard = this.permissionsService.getPublishingDashboard(userId, brandId);
    if (!sprint || !publishingDashboard) {
      return null;
    }

    const selectedTaskIds = new Set(input.contentTaskIds?.map((id) => id.trim()).filter(Boolean) ?? []);
    const status = input.status ?? 'draft';
    const allRecords = publishingDashboard.records;
    const newRecordIds: string[] = [];
    const createdRecordIds: string[] = [];
    const records: PublishingRecord[] = [];
    let skippedContentTaskCount = 0;

    for (const workspace of this.collectContentWorkspaces(userId, brandId, sprint)) {
      const task = workspace.currentTask;
      const version = workspace.currentVersion;
      if (selectedTaskIds.size > 0 && !selectedTaskIds.has(task.id)) {
        continue;
      }
      if (!version?.body.trim()) {
        skippedContentTaskCount += 1;
        continue;
      }

      const existing = allRecords.find((record) => record.generationTaskId === task.id && record.versionId === version.id && record.platform === task.targetPlatform);
      if (existing) {
        records.push(existing);
        newRecordIds.push(existing.id);
        continue;
      }

      const record = this.permissionsService.createPublishingRecord(userId, brandId, {
        brandId,
        strategyId: task.strategyId,
        generationTaskId: task.id,
        versionId: version.id,
        title: version.title,
        body: version.body,
        targetPlatform: task.targetPlatform,
        contentType: task.contentType,
        targetKeywords: task.targetKeywords,
        status
      });

      if (record) {
        records.push(record);
        newRecordIds.push(record.id);
        createdRecordIds.push(record.id);
      } else {
        skippedContentTaskCount += 1;
      }
    }

    const updatedSprint = await this.permissionsService.updateVisibilitySprintRelations(userId, brandId, sprintId, {
      relatedPublishingRecordIds: unique([...sprint.relatedPublishingRecordIds, ...newRecordIds])
    });

    return {
      brandId,
      sprintId,
      createdRecordCount: createdRecordIds.length,
      skippedContentTaskCount,
      records,
      sprint: updatedSprint ?? { ...sprint, relatedPublishingRecordIds: unique([...sprint.relatedPublishingRecordIds, ...newRecordIds]) }
    };
  }

  private collectContentWorkspaces(userId: string, brandId: BrandId, sprint: VisibilitySprint): Array<ContentGenerationWorkspace & { currentTask: ContentGenerationTask }> {
    return sprint.relatedContentTaskIds
      .map((taskId) => this.permissionsService.getContentGenerationWorkspace(userId, brandId, taskId))
      .filter((workspace): workspace is ContentGenerationWorkspace & { currentTask: ContentGenerationTask } => Boolean(workspace?.currentTask));
  }
}

function buildPreparationItem(task: ContentGenerationTask, currentVersion: ContentVersion | undefined, records: PublishingRecord[]): SprintPublishingPreparationItem {
  const publishingRecords = records.filter((record) => record.generationTaskId === task.id || (currentVersion && record.versionId === currentVersion.id));
  const recommendedStatus = resolvePreparationStatus(currentVersion, publishingRecords);

  return {
    contentTask: task,
    currentVersion,
    publishingRecords,
    targetPlatform: task.targetPlatform,
    recommendedStatus,
    message: buildPreparationMessage(recommendedStatus)
  };
}

function resolvePreparationStatus(currentVersion: ContentVersion | undefined, records: PublishingRecord[]): SprintPublishingPreparationStatus {
  if (!currentVersion?.body.trim()) {
    return 'needs_draft';
  }
  if (records.some((record) => record.status === 'failed')) {
    return 'failed';
  }
  if (records.some((record) => record.status === 'published')) {
    return 'published';
  }
  if (records.some((record) => record.status === 'pending')) {
    return 'pending_manual_publish';
  }
  if (records.some((record) => record.status === 'draft')) {
    return 'draft_ready';
  }

  return 'draft_ready';
}

function buildPreparationMessage(status: SprintPublishingPreparationStatus): string {
  const messages: Record<SprintPublishingPreparationStatus, string> = {
    needs_draft: '内容任务还没有可用于发布准备的正文草稿。',
    draft_ready: '发布草稿已准备，可进入人工确认或平台发布待办。',
    pending_manual_publish: '已进入待人工发布状态，请在目标平台完成发布并回填结果。',
    published: '内容已标记为已发布，后续可进入复测安排。',
    failed: '发布准备或发布执行失败，需要处理异常后重试。'
  };

  return messages[status];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeSprintPublishingPreparationInput(input: SprintPublishingPreparationInput): SprintPublishingPreparationInput {
  return {
    ...(input.contentTaskIds ? { contentTaskIds: input.contentTaskIds.map((id) => id.trim()).filter(Boolean) } : {}),
    ...(input.status ? { status: normalizePreparationStatus(input.status) } : {})
  };
}

function normalizePreparationStatus(status: PublishingRecordStatus): Extract<PublishingRecordStatus, 'draft' | 'pending'> {
  if (status === 'draft' || status === 'pending') {
    return status;
  }

  return 'draft';
}
