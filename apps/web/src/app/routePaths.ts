export const firstVersionRoutePaths = [
  '/brands',
  '/brand-profile',
  '/canvas',
  '/monitoring',
  '/growth-optimization',
  '/user-intents',
  '/optimization-units',
  '/competitor-profile',
  '/competitors',
  '/citations',
  '/evaluations',
  '/facts',
  '/content',
  '/content-assets',
  '/content-generation',
  '/content-optimization',
  '/publishing',
  '/owned-media',
  '/media-platforms',
  '/site-audit',
  '/model-settings',
  '/tasks',
  '/feedback',
  '/reports',
  '/advisor'
] as const;

export type FirstVersionRoutePath = (typeof firstVersionRoutePaths)[number];

type RouteValue = string | undefined;

export type WorkflowRouteContext = {
  question?: string;
  optimizationUnitId?: string;
  intentId?: string;
  promptId?: string;
  runId?: string;
  planId?: string;
  taskId?: string;
  generationTaskId?: string;
  versionId?: string;
  publishingRecordId?: string;
  platformCode?: string;
  mode?: 'automatic' | 'manual' | 'records' | 'retest';
  action?: 'create' | 'open';
  tab?: 'records' | 'accounts' | 'platform-guidance' | 'platform-detail';
};

export function userIntentsPath(context: Pick<WorkflowRouteContext, 'optimizationUnitId' | 'action'> = {}) {
  return buildWorkflowPath('/user-intents', { optimizationUnitId: context.optimizationUnitId, action: context.action });
}

export function monitoringPath(
  context: Pick<WorkflowRouteContext, 'question' | 'optimizationUnitId' | 'intentId' | 'promptId' | 'runId' | 'planId' | 'taskId' | 'platformCode' | 'mode'> = {},
  section?: 'test-question-candidate-card' | 'manual-test-entry' | 'monitoring-runs-card'
) {
  return buildWorkflowPath('/monitoring', {
    question: context.question,
    optimizationUnitId: context.optimizationUnitId,
    intentId: context.intentId,
    promptId: context.promptId,
    runId: context.runId,
    planId: context.planId,
    taskId: context.taskId,
    platformCode: context.platformCode,
    mode: context.mode
  }, section);
}

export function brandMonitoringPath(
  brandId: string,
  context: Pick<WorkflowRouteContext, 'question' | 'optimizationUnitId' | 'intentId' | 'promptId' | 'runId' | 'planId' | 'taskId' | 'platformCode' | 'mode'> = {},
  section?: 'test-question-candidate-card' | 'manual-test-entry' | 'monitoring-runs-card'
) {
  const path = monitoringPath(context, section);
  return `/brands/${encodeURIComponent(brandId)}${path}`;
}

export function growthOptimizationPath(
  context: Pick<WorkflowRouteContext, 'question' | 'optimizationUnitId' | 'intentId' | 'promptId' | 'runId'> = {},
  section?: 'optimization-plans' | 'standard-answer-diagnosis'
) {
  return buildWorkflowPath('/growth-optimization', {
    question: context.question,
    optimizationUnitId: context.optimizationUnitId,
    intentId: context.intentId,
    promptId: context.promptId,
    runId: context.runId
  }, section);
}

export function brandGrowthOptimizationPath(
  brandId: string,
  context: Pick<WorkflowRouteContext, 'question' | 'optimizationUnitId' | 'intentId' | 'promptId' | 'runId'> = {},
  section?: 'optimization-plans' | 'standard-answer-diagnosis'
) {
  const path = growthOptimizationPath(context, section);
  return `/brands/${encodeURIComponent(brandId)}${path}`;
}

export function contentGenerationPath(context: Pick<WorkflowRouteContext, 'optimizationUnitId' | 'intentId' | 'runId' | 'planId' | 'taskId'> = {}) {
  return buildWorkflowPath('/content-generation', {
    optimizationUnitId: context.optimizationUnitId,
    intentId: context.intentId,
    runId: context.runId,
    planId: context.planId,
    taskId: context.taskId
  });
}

export function publishingPath(context: Pick<WorkflowRouteContext, 'generationTaskId' | 'versionId' | 'publishingRecordId' | 'tab'> = {}) {
  return buildWorkflowPath('/publishing', {
    generationTaskId: context.generationTaskId,
    versionId: context.versionId,
    publishingRecordId: context.publishingRecordId,
    tab: context.tab
  });
}

export function tasksPath(context: Pick<WorkflowRouteContext, 'taskId' | 'generationTaskId' | 'publishingRecordId' | 'promptId' | 'runId' | 'platformCode' | 'action'> = {}) {
  return buildWorkflowPath('/tasks', {
    taskId: context.taskId,
    generationTaskId: context.generationTaskId,
    publishingRecordId: context.publishingRecordId,
    promptId: context.promptId,
    runId: context.runId,
    platformCode: context.platformCode,
    action: context.action
  });
}

export function workflowStagePath(path: FirstVersionRoutePath, context: WorkflowRouteContext = {}) {
  return buildWorkflowPath(path, { ...context });
}

export function readWorkflowRouteContext(search: string): WorkflowRouteContext {
  const params = new URLSearchParams(search);
  return {
    question: readParam(params, 'question'),
    optimizationUnitId: readParam(params, 'optimizationUnitId'),
    intentId: readParam(params, 'intentId'),
    promptId: readParam(params, 'promptId'),
    runId: readParam(params, 'runId'),
    planId: readParam(params, 'planId'),
    taskId: readParam(params, 'taskId'),
    generationTaskId: readParam(params, 'generationTaskId'),
    versionId: readParam(params, 'versionId'),
    publishingRecordId: readParam(params, 'publishingRecordId'),
    platformCode: readParam(params, 'platformCode'),
    mode: readParam(params, 'mode') as WorkflowRouteContext['mode'],
    action: readParam(params, 'action') as WorkflowRouteContext['action'],
    tab: readParam(params, 'tab') as WorkflowRouteContext['tab']
  };
}

function buildWorkflowPath(path: FirstVersionRoutePath, context: Record<string, RouteValue>, section?: string) {
  const params = new URLSearchParams();
  Object.entries(context).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${section ? `#${section}` : ''}`;
}

function readParam(params: URLSearchParams, key: string) {
  return params.get(key) || undefined;
}
