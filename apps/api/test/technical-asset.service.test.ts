import { describe, expect, it, vi } from 'vitest';
import type {
  BrandProfile,
  CreateTechnicalAssetInput,
  QuickStartFactCandidate,
  QuickStartSession,
  TechnicalAssetRecord
} from '@geo-platform/shared-types';
import type { PermissionsRepositoryPort } from '../src/modules/permissions/permissions.repository.port';
import type { QuickStartRepositoryPort } from '../src/modules/quick-start/quick-start.repository.port';
import { TechnicalAssetService } from '../src/modules/site-audit/technical-asset.service';

describe('TechnicalAssetService', () => {
  it('generates six deployable assets using confirmed and edited facts only', async () => {
    const { service, createTechnicalContentAsset } = harness([
      fact('name', '旧名称', 'edited', '新名称'),
      fact('website', 'https://example.com', 'confirmed'),
      fact('intro', '可信品牌介绍', 'confirmed'),
      fact('targetMarkets', '贵阳，成都', 'confirmed'),
      fact('untrusted', '待确认内容', 'pending'),
      fact('rejected', '已拒绝内容', 'rejected')
    ]);

    const records = await service.generate('user-1', 'brand-1', { targetPage: 'https://example.com/about#intro' });

    expect(records).toHaveLength(6);
    expect(createTechnicalContentAsset).toHaveBeenCalledTimes(6);
    const inputs = createTechnicalContentAsset.mock.calls.map(([,, input]) => input);
    expect(inputs.every((input) => input.reviewStatus === 'pending' && input.sourceFacts.length === 4)).toBe(true);
    expect(inputs.flatMap((input) => input.sourceFacts).some((item) => item.fieldKey === 'untrusted')).toBe(false);
    expect(inputs.flatMap((input) => input.sourceFacts).some((item) => item.fieldKey === 'rejected')).toBe(false);
    expect(inputs.every((input) => !input.body.includes('待确认内容'))).toBe(true);
    expect(inputs.every((input) => !input.body.includes('已拒绝内容'))).toBe(true);
    expect(inputs.every((input) => !input.body.includes('旧名称'))).toBe(true);
    expect(inputs.find((input) => input.type === 'llms_txt')).toMatchObject({ targetPage: 'https://example.com/llms.txt' });
    expect(inputs.find((input) => input.type === 'llms_txt')?.body).toContain('# 新名称');
    expect(JSON.parse(inputs.find((input) => input.type === 'organization_jsonld')?.body ?? '{}')).toMatchObject({
      '@type': 'Organization',
      name: '新名称',
      areaServed: ['贵阳', '成都']
    });
    expect(JSON.parse(inputs.find((input) => input.type === 'faqpage_jsonld')?.body ?? '{}')['@type']).toBe('FAQPage');
    expect(JSON.parse(inputs.find((input) => input.type === 'article_jsonld')?.body ?? '{}')['@type']).toBe('Article');
    expect(records.every((record) => record.version.version === 1)).toBe(true);
  });

  it('supports selecting a deterministic subset of asset types', async () => {
    const { service, createTechnicalContentAsset } = harness(coreFacts());
    const records = await service.generate('user-1', 'brand-1', {
      targetPage: 'https://example.com/',
      assetTypes: ['organization_jsonld', 'faq_content_block', 'organization_jsonld']
    });

    expect(records).toHaveLength(2);
    expect(createTechnicalContentAsset.mock.calls.map(([,, input]) => input.type)).toEqual([
      'organization_jsonld', 'faq_content_block'
    ]);
  });

  it('rejects cross-origin targets before persisting assets', async () => {
    const { service, createTechnicalContentAsset } = harness(coreFacts());
    await expect(service.generate('user-1', 'brand-1', { targetPage: 'https://other.example/about' }))
      .rejects.toMatchObject({ response: { code: 'TECHNICAL_ASSET_TARGET_INVALID' } });
    expect(createTechnicalContentAsset).not.toHaveBeenCalled();
  });

  it('requires confirmed core facts', async () => {
    const { service } = harness([fact('name', '待确认品牌', 'pending')]);
    await expect(service.generate('user-1', 'brand-1', { targetPage: 'https://example.com/' }))
      .rejects.toMatchObject({ response: { code: 'TECHNICAL_ASSET_CONFIRMED_FACTS_REQUIRED' } });
  });
});

function harness(candidates: QuickStartFactCandidate[]) {
  const createTechnicalContentAsset = vi.fn(async (_userId: string, brandId: string, input: CreateTechnicalAssetInput): Promise<TechnicalAssetRecord> => {
    const timestamp = '2026-08-03T00:00:00.000Z';
    const id = `asset-${input.type}`;
    return {
      asset: {
        id,
        brandId,
        title: input.title,
        type: input.type,
        platform: 'official_site',
        url: input.targetPage,
        targetKeywords: [],
        sourceFacts: input.sourceFacts,
        reviewStatus: input.reviewStatus,
        status: 'draft',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      version: { id: `version-${input.type}`, contentAssetId: id, version: 1, body: input.body, createdAt: timestamp }
    };
  });
  const permissionsRepository = {
    getBrandProfile: vi.fn(() => profile()),
    createTechnicalContentAsset
  } as unknown as PermissionsRepositoryPort;
  const quickStartRepository = {
    findByBrandId: vi.fn(async () => session(candidates)),
    create: vi.fn(),
    update: vi.fn()
  } as unknown as QuickStartRepositoryPort;
  return { service: new TechnicalAssetService(quickStartRepository, permissionsRepository), createTechnicalContentAsset };
}

function coreFacts(): QuickStartFactCandidate[] {
  return [
    fact('name', '示例品牌', 'confirmed'),
    fact('website', 'https://example.com', 'confirmed'),
    fact('intro', '示例品牌介绍', 'confirmed')
  ];
}

function fact(
  fieldKey: string,
  extractedValue: string,
  status: QuickStartFactCandidate['status'],
  editedValue?: string
): QuickStartFactCandidate {
  return {
    id: `fact-${fieldKey}`,
    fieldKey,
    extractedValue,
    editedValue,
    confidence: 0.9,
    status,
    isCritical: ['name', 'website', 'intro'].includes(fieldKey),
    sourceId: 'source-1',
    sourceType: 'webpage',
    url: 'https://example.com/',
    title: '示例官网',
    excerpt: `${fieldKey} 来源摘录`
  };
}

function session(candidates: QuickStartFactCandidate[]): QuickStartSession {
  return {
    id: 'session-1',
    brandId: 'brand-1',
    currentStep: 'facts',
    status: 'in_progress',
    draft: { facts: { candidates } },
    version: 1,
    startedAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z'
  };
}

function profile(): BrandProfile {
  return {
    brandId: 'brand-1', intro: '', valueProps: [], offerings: [], proofPoints: [], targetCustomers: [],
    recommendedExpressions: [], blockedExpressions: [], contentRules: [], competitors: [], faqs: [],
    completenessScore: 0, missingFields: [], completenessPrompts: [], updatedAt: '2026-08-03T00:00:00.000Z'
  };
}
