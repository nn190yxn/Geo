import { describe, expect, it, vi } from 'vitest';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import { QuickStartRepository } from '../src/modules/quick-start/quick-start.repository';
import { QuickStartService } from '../src/modules/quick-start/quick-start.service';
import type { WebsiteDiscoveryService } from '../src/modules/quick-start/website-discovery.service';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P12: quick-start facts preserve provenance and confirmation state ${validatesCriteria(['15.2'])}`, () => {
  it('preserves source evidence and each supported confirmation state across discovered candidates', async () => {
    const discoverySamples = [
      ['品牌官网', '本地儿童运动服务'],
      ['示例商城', '家庭健康产品与服务'],
      ['服务主页', '企业数字化解决方案'],
      ['Official Site', 'Trusted products for local customers'],
      ['品牌介绍', '餐饮门店与会员服务'],
      ['产品中心', '工业设备与技术支持']
    ] as const;
    const statuses = ['pending', 'confirmed', 'edited', 'rejected'] as const;

    for (const [title, description] of discoverySamples) {
      const service = createService(title, description);
      await service.create('user_1', 'brand_1');
      let session = await service.saveStep('user_1', 'brand_1', 'website', {
        version: 1,
        data: {
          brandName: '示例品牌',
          websiteUrl: 'https://example.com',
          targetMarkets: ['上海'],
          competitors: []
        }
      });

      for (const candidate of session.draft.facts?.candidates ?? []) {
        expect(candidate.status).toBe('pending');
        expect(candidate.sourceId).toBe('source_1');
        expect(candidate.sourceType).toBe('webpage');
        expect(candidate.url).toBe('https://example.com/');
        expect(candidate.title).toBe(title);
        expect(candidate.excerpt).toBe(description);
      }

      const original = session.draft.facts!.candidates[0]!;
      for (const status of statuses) {
        session = await service.saveStep('user_1', 'brand_1', 'facts', {
          version: session.version,
          data: {
            candidates: [{
              ...original,
              extractedValue: '被修改的原始值',
              sourceId: '被修改的来源',
              excerpt: '被修改的证据',
              status,
              editedValue: status === 'edited' ? '用户确认后的值' : undefined
            }]
          }
        });
        expect(session.draft.facts?.candidates[0]).toMatchObject({
          status,
          extractedValue: original.extractedValue,
          sourceId: original.sourceId,
          sourceType: original.sourceType,
          url: original.url,
          title: original.title,
          excerpt: original.excerpt
        });
      }
    }
  });
});

function createService(title: string, description: string) {
  const sources: Array<Record<string, unknown>> = [];
  const permissions = {
    listAccessibleBrands: vi.fn(async () => [{ brandId: 'brand_1', name: '示例品牌', status: 'active', role: 'operator' }]),
    updateBrand: vi.fn(async (_userId, brandId, input) => ({ brandId, ...input })),
    listKnowledgeSources: vi.fn(async () => sources),
    createKnowledgeSource: vi.fn(async (_userId, brandId, input) => {
      const source = { id: 'source_1', brandId, ...input };
      sources.push(source);
      return source;
    }),
    updateKnowledgeSourceStatus: vi.fn(async () => null)
  } as unknown as PermissionsService;
  const discovery = {
    discover: vi.fn(async () => ({
      url: 'https://example.com/',
      title,
      description,
      excerpt: description
    }))
  } as unknown as WebsiteDiscoveryService;
  return new QuickStartService(new QuickStartRepository(), permissions, discovery);
}
