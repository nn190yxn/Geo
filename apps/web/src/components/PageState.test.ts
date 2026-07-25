import { describe, expect, it } from 'vitest';
import type { ApiResponse } from '@geo-platform/shared-types';
import { getApiErrorMessage } from './PageState';

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
});
