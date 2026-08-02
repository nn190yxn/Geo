import { describe, expect, it } from 'vitest';
import type { AnalysisFinding, EvaluationIssue, OptimizationTask } from '@geo-platform/shared-types';
import { getBeginnerActionRoute } from '../features/brand-workspace/components/BeginnerHomeState';
import { getOptimizationUnitWorkflowPaths } from '../features/brand-workspace/components/OptimizationUnitsCard';
import { getUserIntentWorkflowPaths } from '../features/brand-workspace/components/UserIntentPromptCard';
import { getMonitoringAnalysisPath } from '../features/monitoring/components/MonitoringRunsCard';
import { getAnalysisFindingActionPath } from '../features/growth-optimization/pages/GrowthOptimizationPage';
import { getEvaluationIssueActions } from '../features/evaluations/pages/EvaluationAnalysisPage';
import { getContentPublishPreparationPath } from '../features/content-generation/pages/ContentGenerationPage';
import { getPublishingRetestPath } from '../features/publishing/pages/PublishingCenterPage';
import { getTaskRetestMonitoringPath } from '../features/tasks/pages/TaskRetestPage';
import { readWorkflowRouteContext, workflowStagePath, type WorkflowRouteContext } from './routePaths';

const expectedContext: WorkflowRouteContext = {
  question: '贵阳儿童体能课程怎么选？',
  optimizationUnitId: 'unit-1',
  intentId: 'intent-1',
  promptId: 'prompt-1',
  runId: 'run-1',
  platformCode: 'doubao'
};

describe('first-round workflow routes', () => {
  it('connects the beginner home to publishing and same-question monitoring', () => {
    expect(getBeginnerActionRoute({ actionType: 'complete_profile', label: '', reason: '' })).toBe('/brand-profile');
    expect(workflowStagePath('/optimization-units')).toBe('/optimization-units');
    expect(getOptimizationUnitWorkflowPaths('unit-1').createIntent)
      .toBe('/user-intents?optimizationUnitId=unit-1&action=create');

    const monitoringPath = getUserIntentWorkflowPaths({ id: 'intent-1', optimizationUnitId: 'unit-1' }, 'prompt-1').automaticMonitoring;
    expectRoute(monitoringPath, { optimizationUnitId: 'unit-1', intentId: 'intent-1', promptId: 'prompt-1', mode: 'automatic' }, '#monitoring-runs-card');

    const analysisPath = getMonitoringAnalysisPath(expectedContext);
    expectRoute(analysisPath, expectedContext, '#standard-answer-diagnosis');

    const contentPath = getAnalysisFindingActionPath(
      createFinding(),
      { actionType: 'generate_content', label: '生成内容' },
      readContext(analysisPath)
    );
    expectRoute(contentPath, expectedContext);

    const publishingPath = getContentPublishPreparationPath(
      readContext(contentPath),
      { generationTaskId: 'generation-1', versionId: 'version-1' },
      'publishing-1'
    );
    expectRoute(publishingPath, { ...expectedContext, generationTaskId: 'generation-1', versionId: 'version-1', publishingRecordId: 'publishing-1', tab: 'records' });

    const taskPath = getPublishingRetestPath({ id: 'publishing-1', generationTaskId: 'generation-1' }, readContext(publishingPath));
    expectRoute(taskPath, { ...expectedContext, generationTaskId: 'generation-1', versionId: 'version-1', publishingRecordId: 'publishing-1', action: 'create' });

    const retestPath = getTaskRetestMonitoringPath(createTask(), readContext(taskPath));
    expectRoute(retestPath, { ...expectedContext, taskId: 'task-1', generationTaskId: 'generation-1', versionId: 'version-1', publishingRecordId: 'publishing-1', mode: 'retest' }, '#monitoring-runs-card');
  });

  it('connects analysis anomalies to content, fact correction, and retest entries', () => {
    const finding = createFinding();
    expectRoute(
      getAnalysisFindingActionPath(finding, { actionType: 'generate_content', label: '生成内容任务' }, expectedContext),
      expectedContext
    );
    expectRoute(
      getAnalysisFindingActionPath(finding, { actionType: 'update_knowledge', label: '更新品牌资料' }, expectedContext),
      expectedContext
    );
    expectRoute(
      getAnalysisFindingActionPath(finding, { actionType: 'schedule_retest', label: '创建复测任务' }, expectedContext),
      { ...expectedContext, action: 'create' }
    );

    const issueActions = getEvaluationIssueActions(createIssue(), expectedContext);
    expect(issueActions[0]).toEqual({ kind: 'mutation', type: 'knowledge', label: '更新标准答案' });
    for (const action of issueActions.slice(1)) {
      expect(action.kind).toBe('link');
      if (action.kind === 'link') expectRoute(action.href, expectedContext);
    }
  });
});

function expectRoute(path: string, context: WorkflowRouteContext, hash = '') {
  const url = new URL(path, 'https://geo.example.test');
  expect(readWorkflowRouteContext(url.search)).toMatchObject(context);
  expect(url.hash).toBe(hash);
}

function readContext(path: string) {
  return readWorkflowRouteContext(new URL(path, 'https://geo.example.test').search);
}

function createFinding(): AnalysisFinding {
  return {
    id: 'finding-1',
    brandId: 'brand-1',
    optimizationUnitId: 'unit-1',
    platformCode: 'doubao',
    type: 'citation',
    title: '事实依据不足',
    evidence: ['缺少权威来源'],
    severity: 'high',
    recommendedActions: []
  };
}

function createIssue(): EvaluationIssue {
  return {
    id: 'issue-1',
    brandId: 'brand-1',
    responseId: 'response-1',
    runId: 'run-1',
    promptId: 'prompt-1',
    promptText: expectedContext.question ?? '',
    platformCode: 'doubao',
    issueType: 'misinformation',
    rawFragment: '课程事实错误',
    suggestedExpression: '使用品牌资料中的准确表述',
    severity: 'high',
    status: 'open',
    createdAt: '2026-07-18T00:00:00.000Z',
    updatedAt: '2026-07-18T00:00:00.000Z'
  };
}

function createTask(): OptimizationTask {
  return {
    id: 'task-1',
    brandId: 'brand-1',
    optimizationUnitId: 'unit-1',
    relatedPromptId: 'prompt-1',
    sourceRunId: 'run-1',
    relatedPlatformCode: 'doubao',
    title: '发布后再次监测',
    type: 'content_strategy',
    status: 'retest',
    priority: 'high',
    retestRecords: [],
    createdAt: '2026-07-18T00:00:00.000Z',
    updatedAt: '2026-07-18T00:00:00.000Z'
  };
}
