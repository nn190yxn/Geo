import { describe, expect, it, vi } from 'vitest';
import { apiGet } from './http';
import { useBrandContextStore } from '../stores/brandContextStore';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

const pageQueries = [
  { domain: '开始', path: (brandId: string) => `/brands/${brandId}/workspace` },
  { domain: '监测', path: (brandId: string) => `/brands/${brandId}/monitoring-runs` },
  { domain: '内容', path: (brandId: string) => `/brands/${brandId}/content/generation` },
  { domain: '发布', path: (brandId: string) => `/brands/${brandId}/publishing` },
  { domain: '分析', path: (brandId: string) => `/brands/${brandId}/evaluations` },
  { domain: '支持工具', path: (brandId: string) => `/brands/${brandId}/advisor-records` }
] as const;

const brandIds = ['brand', 'tenant', 'workspace', 'account']
  .flatMap((prefix) => ['alpha', 'beta', 'cn-01', '2026', 'a1b2', 'long-context-id'].map((suffix) => `${prefix}-${suffix}`));

describe(`Property P1: current brand context reaches every main data query ${validatesCriteria(['8.1'])}`, () => {
  it('为任意核心页面查询同时保留品牌化路径和当前品牌请求头', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ success: true, data: null })
    })) as unknown as ReturnType<typeof vi.fn>;
    vi.stubGlobal('fetch', fetchMock);

    try {
      for (const brandId of brandIds) {
        useBrandContextStore.getState().setActiveBrandId(brandId);

        for (const pageQuery of pageQueries) {
          const path = pageQuery.path(brandId);
          await apiGet(path);
          const [requestUrl, requestInit] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
          const headers = requestInit.headers as Record<string, string>;

          expect(requestUrl, `${pageQuery.domain}页面未保留 ${brandId} 路径`).toBe(`/api/v1${path}`);
          expect(headers['x-brand-id'], `${pageQuery.domain}页面未注入当前品牌`).toBe(brandId);
        }
      }

      expect(fetchMock).toHaveBeenCalledTimes(brandIds.length * pageQueries.length);
    } finally {
      vi.unstubAllGlobals();
      useBrandContextStore.getState().setActiveBrandId('brand_demo');
    }
  });
});
