import { describe, expect, it } from 'vitest';
import { canEnterManualResponse, getMonitoringAnalysisPath, getMonitoringRunExecutionState, normalizeAnalysisSentiment } from './MonitoringRunsCard';

describe('MonitoringRunsCard status helpers', () => {
  it('describes retry-pending monitoring runs', () => {
    expect(getMonitoringRunExecutionState({ status: 'failed', retryStatus: 'retry_pending', errorMessage: 'Provider timeout' })).toEqual({
      label: '稍后再试',
      color: 'gold',
      hint: '平台暂时未返回结果，系统会自动重试'
    });
  });

  it('keeps manual fallback available for failed runs', () => {
    expect(canEnterManualResponse({ status: 'failed', retryStatus: 'retried' })).toBe(true);
    expect(canEnterManualResponse({ status: 'completed', retryStatus: 'not_retried' })).toBe(false);
  });

  it('uses AI response monitoring language for active and completed runs', () => {
    expect(getMonitoringRunExecutionState({ status: 'running', retryStatus: 'not_retried', errorMessage: undefined })).toMatchObject({
      label: '正在监测',
      hint: '系统正在向 AI 平台提交问题'
    });
    expect(getMonitoringRunExecutionState({ status: 'completed', retryStatus: 'not_retried', errorMessage: undefined })).toMatchObject({
      label: '监测完成'
    });
    expect(getMonitoringRunExecutionState({ status: 'failed', retryStatus: 'retried', errorMessage: undefined })).toMatchObject({
      label: '自动监测没成功',
      hint: '可以手动录入 AI 原始回复'
    });
  });

  it('preserves workflow context when entering analysis from monitoring records', () => {
    const context = {
      question: '孩子适合什么课程？',
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1',
      promptId: 'prompt-1',
      runId: 'run-1',
      taskId: 'task-1',
      platformCode: 'doubao'
    };

    expect(getMonitoringAnalysisPath(context)).toBe(
      '/growth-optimization?question=%E5%AD%A9%E5%AD%90%E9%80%82%E5%90%88%E4%BB%80%E4%B9%88%E8%AF%BE%E7%A8%8B%EF%BC%9F&optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1&runId=run-1&taskId=task-1&platformCode=doubao#standard-answer-diagnosis'
    );
    expect(getMonitoringAnalysisPath(context, { id: 'run-2', promptId: 'prompt-2' })).toBe(
      '/growth-optimization?question=%E5%AD%A9%E5%AD%90%E9%80%82%E5%90%88%E4%BB%80%E4%B9%88%E8%AF%BE%E7%A8%8B%EF%BC%9F&optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-2&runId=run-2&taskId=task-1&platformCode=doubao#standard-answer-diagnosis'
    );
  });

  it('accepts operator-facing Chinese sentiment labels', () => {
    expect(normalizeAnalysisSentiment('正向')).toBe('positive');
    expect(normalizeAnalysisSentiment('中性')).toBe('neutral');
    expect(normalizeAnalysisSentiment('负向')).toBe('negative');
    expect(normalizeAnalysisSentiment('unexpected')).toBe('unknown');
  });
});
