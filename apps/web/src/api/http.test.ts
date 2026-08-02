import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from './http';

describe('api request recovery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a recoverable failure when the service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const response = await apiGet('/brands');

    expect(response).toEqual({
      success: false,
      data: null,
      error: {
        code: 'API_UNAVAILABLE',
        message: '当前服务暂时无法连接，已保留页面中的现有内容，请重新加载后再试。'
      }
    });
  });

  it('returns a recoverable failure for an unknown response shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({ status: 'ok' }) }));

    const response = await apiGet('/brands');

    expect(response.success).toBe(false);
    if (!response.success) expect(response.error.code).toBe('INVALID_API_RESPONSE');
  });

  it('replaces technical upstream errors with a stable public message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: false,
        data: null,
        error: { code: 'UPSTREAM_ERROR', message: 'Provider returned HTTP 503: internal server error' }
      })
    }));

    const response = await apiGet('/brands');

    expect(response.success).toBe(false);
    if (!response.success) expect(response.error.message).toBe('请求失败，请稍后重试。');
  });
});
