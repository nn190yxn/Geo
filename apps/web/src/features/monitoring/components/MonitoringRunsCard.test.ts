import { describe, expect, it } from 'vitest';
import { canEnterManualResponse, getMonitoringRunExecutionState } from './MonitoringRunsCard';

describe('MonitoringRunsCard status helpers', () => {
  it('describes retry-pending monitoring runs', () => {
    expect(getMonitoringRunExecutionState({ status: 'failed', retryStatus: 'retry_pending', errorMessage: 'Provider timeout' })).toEqual({
      label: '稍后再试',
      color: 'gold',
      hint: 'Provider timeout'
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
});
