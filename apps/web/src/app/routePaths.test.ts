import { describe, expect, it } from 'vitest';
import {
  contentGenerationPath,
  brandGrowthOptimizationPath,
  brandMonitoringPath,
  growthOptimizationPath,
  monitoringPath,
  publishingPath,
  readWorkflowRouteContext,
  tasksPath,
  userIntentsPath
} from './routePaths';

describe('workflow route paths', () => {
  it('carries the optimization unit into user intent creation', () => {
    expect(userIntentsPath({ optimizationUnitId: 'unit 1', action: 'create' }))
      .toBe('/user-intents?optimizationUnitId=unit+1&action=create');
  });

  it('carries monitoring context and a target section', () => {
    expect(monitoringPath({
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1',
      promptId: 'prompt-1',
      mode: 'manual'
    }, 'manual-test-entry')).toBe('/monitoring?optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1&mode=manual#manual-test-entry');
  });

  it('builds a brand-scoped monitoring question deep link', () => {
    expect(brandMonitoringPath('brand demo', { question: '平均排第几？' }, 'monitoring-runs-card'))
      .toBe('/brands/brand%20demo/monitoring?question=%E5%B9%B3%E5%9D%87%E6%8E%92%E7%AC%AC%E5%87%A0%EF%BC%9F#monitoring-runs-card');
  });

  it('builds a brand-scoped analysis question deep link', () => {
    expect(brandGrowthOptimizationPath('brand-1', { question: '哪些回答需要修正？' }, 'standard-answer-diagnosis'))
      .toBe('/brands/brand-1/growth-optimization?question=%E5%93%AA%E4%BA%9B%E5%9B%9E%E7%AD%94%E9%9C%80%E8%A6%81%E4%BF%AE%E6%AD%A3%EF%BC%9F#standard-answer-diagnosis');
  });

  it('links diagnosis, content, publishing, and retest with stable identifiers', () => {
    expect(growthOptimizationPath({ runId: 'run-1', promptId: 'prompt-1' }))
      .toBe('/growth-optimization?promptId=prompt-1&runId=run-1');
    expect(contentGenerationPath({ planId: 'plan-1', taskId: 'task-1' }))
      .toBe('/content-generation?planId=plan-1&taskId=task-1');
    expect(publishingPath({ generationTaskId: 'task-1', versionId: 'version-1', publishingRecordId: 'record-1', tab: 'records' }))
      .toBe('/publishing?generationTaskId=task-1&versionId=version-1&publishingRecordId=record-1&tab=records');
    expect(tasksPath({ generationTaskId: 'task-1', publishingRecordId: 'record-1', action: 'create' }))
      .toBe('/tasks?generationTaskId=task-1&publishingRecordId=record-1&action=create');
  });

  it('reads known workflow context and ignores unrelated query values', () => {
    expect(readWorkflowRouteContext('?taskId=task-1&mode=retest&tab=records&unknown=value')).toEqual({
      question: undefined,
      optimizationUnitId: undefined,
      intentId: undefined,
      promptId: undefined,
      runId: undefined,
      planId: undefined,
      taskId: 'task-1',
      generationTaskId: undefined,
      versionId: undefined,
      publishingRecordId: undefined,
      platformCode: undefined,
      mode: 'retest',
      action: undefined,
      tab: 'records'
    });
  });
});
