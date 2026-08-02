import { describe, expect, it } from 'vitest';
import type { ApiResponse } from '@geo-platform/shared-types';
import { getApiErrorMessage, pageStateActionMap } from './PageState';

describe('page state helpers', () => {
  it('extracts api error messages for page alerts', () => {
    const response: ApiResponse<unknown> = {
      success: false,
      data: null,
      error: {
        code: 'REQUEST_ERROR',
        message: '品牌数据加载失败',
        requestId: 'request_test'
      }
    };

    expect(getApiErrorMessage(response)).toBe('品牌数据加载失败');
  });

  it('uses a stable fallback when no failed response is available', () => {
    expect(getApiErrorMessage(undefined, '请重试')).toBe('请重试');
  });

  it('provides stable recovery actions for common page states', () => {
    expect(pageStateActionMap).toEqual({
      retry: { label: '重新加载' },
      supplementBrandProfile: { label: '补充品牌资料', path: '/brand-profile' },
      startMonitoring: { label: '开始 AI 回复监测', path: '/monitoring' },
      createContent: { label: '创建内容草稿', path: '/content-generation' },
      recordPublishingResult: { label: '录入发布结果', path: '/publishing?tab=records' }
    });
  });

  it('hides technical error details from public alerts', () => {
    const response: ApiResponse<unknown> = {
      success: false,
      data: null,
      error: {
        code: 'REQUEST_ERROR',
        message: 'Provider returned HTTP 503: internal server error',
        requestId: 'request_test'
      }
    };

    expect(getApiErrorMessage(response, '数据暂时无法加载，请重新加载。')).toBe('数据暂时无法加载，请重新加载。');
  });
});
