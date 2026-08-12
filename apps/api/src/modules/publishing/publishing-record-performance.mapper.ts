import type {
  CitationSource,
  OptimizationTask,
  PublishingRecord,
  PublishingRecordPerformance,
  RetestRecord,
} from '@geo-platform/shared-types';

export function buildPublishingRecordPerformance(
  records: PublishingRecord[],
  citations: Pick<CitationSource, 'contentAssetId' | 'citationCount' | 'promptId'>[],
  tasks: OptimizationTask[],
): PublishingRecordPerformance[] {
  return records.map((record) => {
    const recordCitations = citations.filter((citation) => citation.contentAssetId === record.contentAssetId);
    const relatedTask = tasks.find(
      (task) =>
        task.contentLink === record.publishedUrl ||
        task.contentLink === record.contentAssetId ||
        task.growthOptimizationPlanId === record.generationTaskId,
    );
    const latestRetest = relatedTask?.retestRecords.at(-1);
    const sourceStatus = record.contentAssetId || record.publishedUrl ? 'linked' : 'unidentified';

    return {
      brandId: record.brandId,
      recordId: record.id,
      contentAssetId: record.contentAssetId,
      sourceStatus,
      citationCount: recordCitations.reduce((total, citation) => total + citation.citationCount, 0),
      relatedIntentCount: new Set(recordCitations.map((citation) => citation.promptId)).size,
      retestStatus: getPublishingRetestStatus(latestRetest, record.retestPlanAt),
      latestRetestRecordId: latestRetest?.id,
      nextSuggestion: getPublishingPerformanceSuggestion(sourceStatus, recordCitations.length, latestRetest?.improved),
    };
  });
}

function getPublishingRetestStatus(retestRecord: RetestRecord | undefined, retestPlanAt?: string): PublishingRecordPerformance['retestStatus'] {
  if (!retestRecord) return retestPlanAt ? 'planned' : 'not_planned';
  if (!retestRecord.completedAt) return 'planned';
  if (retestRecord.improved === true) return 'improved';
  if (retestRecord.improved === false) return 'not_improved';
  return 'completed';
}

function getPublishingPerformanceSuggestion(
  sourceStatus: PublishingRecordPerformance['sourceStatus'],
  citationSourceCount: number,
  improved?: boolean,
): string {
  if (sourceStatus === 'unidentified') return '补充发布链接或内容资产关联';
  if (citationSourceCount === 0) return '安排再次监测并观察 AI 是否引用';
  if (improved === false) return '补充事实依据或调整内容标题';
  return '继续跟踪引用表现和再次监测结果';
}
