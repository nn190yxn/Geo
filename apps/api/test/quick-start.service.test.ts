import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import { QuickStartRepository } from '../src/modules/quick-start/quick-start.repository';
import { QuickStartService } from '../src/modules/quick-start/quick-start.service';
import type { WebsiteDiscoveryResult, WebsiteDiscoveryService } from '../src/modules/quick-start/website-discovery.service';

const defaultDiscovery: WebsiteDiscoveryResult = {
  url: 'https://example.com/',
  title: 'Example Brand Official Website',
  description: 'Example Brand provides trusted local services.',
  excerpt: 'Example Brand provides trusted local services.'
};

function createHarness(
  accessible = true,
  role: 'operator' | 'viewer' = 'operator',
  discovery: WebsiteDiscoveryResult | Error = defaultDiscovery
) {
  const sources: any[] = [];
  const permissions = {
    listAccessibleBrands: vi.fn(async () => accessible
      ? [{ brandId: 'brand_1', name: 'Old Brand', status: 'active', role }]
      : []),
    updateBrand: vi.fn(async (_userId, brandId, input) => ({ brandId, ...input })),
    listKnowledgeSources: vi.fn(async () => sources),
    createKnowledgeSource: vi.fn(async (_userId, brandId, input) => {
      const source = {
        id: 'source_1',
        brandId,
        ...input,
        status: input.status ?? 'pending',
        createdAt: '2026-08-03T00:00:00.000Z',
        updatedAt: '2026-08-03T00:00:00.000Z'
      };
      sources.push(source);
      return source;
    }),
    updateKnowledgeSourceStatus: vi.fn(async (_userId, _brandId, sourceId, status, errorMessage) => {
      const source = sources.find((item) => item.id === sourceId);
      if (!source) return null;
      source.status = status;
      source.errorMessage = errorMessage;
      return source;
    }),
    listPlatformConfigs: vi.fn(async () => [platformConfig('doubao', '豆包', 'ready')]),
    createTestPlan: vi.fn(async (_userId, brandId, input) => ({
      id: 'plan_1',
      brandId,
      name: input.name,
      status: 'ready',
      questions: input.questions,
      platformCodes: input.platformCodes,
      connectionSummary: [{
        platformCode: 'doubao',
        name: '豆包',
        methods: ['api'],
        status: 'ready',
        hasCredential: true,
        message: '可以自动监测。'
      }],
      executionMethod: input.executionMethod,
      estimatedDurationMinutes: input.questions.length * input.platformCodes.length * 2,
      confirmationItems: [],
      monitoringRunIds: [],
      createdBy: 'user_1',
      createdAt: '2026-08-03T00:00:00.000Z',
      updatedAt: '2026-08-03T00:00:00.000Z'
    }))
  } as unknown as PermissionsService;
  const discoveryService = {
    discover: discovery instanceof Error
      ? vi.fn().mockRejectedValue(discovery)
      : vi.fn().mockResolvedValue(discovery)
  } as unknown as WebsiteDiscoveryService;
  return {
    permissions,
    discoveryService,
    sources,
    service: new QuickStartService(new QuickStartRepository(), permissions, discoveryService)
  };
}

const websiteData = {
  brandName: 'Example Brand',
  websiteUrl: 'https://example.com',
  targetMarkets: ['Shanghai', 'Shanghai'],
  competitors: ['Competitor A']
};

function fact(status: 'pending' | 'confirmed' | 'rejected' | 'edited' = 'pending') {
  return {
    id: 'fact_1',
    fieldKey: 'brand.positioning',
    extractedValue: 'Original positioning',
    editedValue: status === 'edited' ? 'Edited positioning' : undefined,
    confidence: 0.92,
    status,
    isCritical: true,
    sourceId: 'source_1',
    sourceType: 'webpage' as const,
    url: 'https://example.com/',
    title: 'Official website',
    excerpt: 'Original positioning from the official website.'
  };
}

describe('QuickStartService', () => {
  it('creates, resumes, and independently saves all four steps', async () => {
    const { permissions, service } = createHarness();
    const created = await service.create('user_1', 'brand_1');
    expect((await service.create('user_1', 'brand_1')).id).toBe(created.id);

    const website = await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });
    expect(website).toMatchObject({ version: 2, currentStep: 'facts' });
    expect(website.draft.website).toMatchObject({
      websiteUrl: 'https://example.com/',
      targetMarkets: ['Shanghai'],
      crawlStatus: 'completed',
      knowledgeSourceId: 'source_1'
    });
    expect(website.draft.website?.sourcePagePlan).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ sourceRole: 'home', included: true, processingStatus: 'planned' }),
        expect.objectContaining({ sourceRole: 'product', included: false, processingStatus: 'planned' }),
        expect.objectContaining({ sourceRole: 'about', included: false, processingStatus: 'planned' })
      ])
    });
    expect(permissions.updateBrand).toHaveBeenCalledWith('user_1', 'brand_1', {
      name: 'Example Brand',
      website: 'https://example.com/',
      targetCities: ['Shanghai']
    });

    const confirmedCandidates = website.draft.facts!.candidates.map((candidate) => ({
      ...candidate,
      status: 'confirmed' as const
    }));
    const facts = await service.saveStep('user_1', 'brand_1', 'facts', {
      version: 2,
      data: { candidates: [...confirmedCandidates, fact('confirmed')] }
    });
    expect(facts.draft.questions?.items).toHaveLength(6);
    expect(facts.draft.questions?.items.map((item) => item.category)).toEqual([
      'brand',
      'category',
      'location',
      'buying_decision',
      'competitor_comparison',
      'pain_point'
    ]);
    const questions = await service.saveStep('user_1', 'brand_1', 'questions', {
      version: 3,
      data: { items: [{ id: 'question_1', category: 'category', question: 'Which provider is recommended?', enabled: true, targetPlatforms: ['doubao'] }] }
    });
    const readiness = await service.saveStep('user_1', 'brand_1', 'readiness', {
      version: 4,
      data: { completed: true }
    });

    expect(facts.draft.facts?.candidates).toHaveLength(5);
    expect(questions.draft.questions?.items[0]?.id).toBe('question_1');
    expect(questions.draft.readiness).toMatchObject({
      completed: false,
      targetPlatforms: ['doubao'],
      estimatedSampleCount: 1,
      executionMethod: 'api'
    });
    expect(readiness).toMatchObject({ version: 5, currentStep: 'readiness', status: 'completed' });
    expect(readiness.draft.readiness).toMatchObject({ testPlanId: 'plan_1', completed: true });
    expect(readiness.completedAt).toBeDefined();
    expect(await service.get('user_1', 'brand_1')).toEqual(readiness);
  });

  it('returns a 409 conflict for stale saves', async () => {
    const { service } = createHarness();
    await service.create('user_1', 'brand_1');
    await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });

    await expect(service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('validates fact provenance and preserves extracted provenance when editing', async () => {
    const { service } = createHarness();
    await service.create('user_1', 'brand_1');
    await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });

    await expect(service.saveStep('user_1', 'brand_1', 'facts', {
      version: 2,
      data: { candidates: [{ ...fact(), sourceId: 'source_other' }] }
    })).rejects.toBeInstanceOf(BadRequestException);

    await service.saveStep('user_1', 'brand_1', 'facts', { version: 2, data: { candidates: [fact()] } });
    const edited = await service.saveStep('user_1', 'brand_1', 'facts', {
      version: 3,
      data: {
        candidates: [{
          ...fact('edited'),
          extractedValue: 'Tampered value',
          sourceId: 'source_other',
          excerpt: 'Tampered excerpt'
        }]
      }
    });

    expect(edited.draft.facts?.candidates.find((candidate) => candidate.id === 'fact_1')).toMatchObject({
      status: 'edited',
      editedValue: 'Edited positioning',
      extractedValue: 'Original positioning',
      sourceId: 'source_1',
      excerpt: 'Original positioning from the official website.'
    });
  });

  it('blocks readiness while critical facts remain unconfirmed', async () => {
    const { service } = createHarness();
    await service.create('user_1', 'brand_1');
    await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });
    await service.saveStep('user_1', 'brand_1', 'facts', { version: 2, data: { candidates: [fact('pending')] } });

    await expect(service.saveStep('user_1', 'brand_1', 'readiness', {
      version: 3,
      data: { completed: true }
    })).rejects.toMatchObject({ response: { code: 'QUICK_START_READINESS_BLOCKED' } });
  });

  it('keeps inaccessible brands isolated', async () => {
    const { service } = createHarness(false);
    await expect(service.create('user_2', 'brand_1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.get('user_2', 'brand_1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps viewer access read-only even without middleware brand context', async () => {
    const repository = new QuickStartRepository();
    await repository.create('brand_1');
    const { permissions, discoveryService } = createHarness(true, 'viewer');
    const service = new QuickStartService(repository, permissions, discoveryService);

    await expect(service.get('user_1', 'brand_1')).resolves.toMatchObject({ brandId: 'brand_1' });
    await expect(service.create('user_1', 'brand_1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores discovered source state and pending fact provenance', async () => {
    const { permissions, service, sources } = createHarness();
    await service.create('user_1', 'brand_1');
    const saved = await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });

    expect(permissions.updateKnowledgeSourceStatus).toHaveBeenNthCalledWith(
      1,
      'user_1',
      'brand_1',
      'source_1',
      'processing'
    );
    expect(permissions.updateKnowledgeSourceStatus).toHaveBeenNthCalledWith(
      2,
      'user_1',
      'brand_1',
      'source_1',
      'completed'
    );
    expect(sources[0]).toMatchObject({ status: 'completed' });
    expect(saved.draft.facts?.candidates.map((candidate) => candidate.fieldKey)).toEqual([
      'name',
      'website',
      'targetMarkets',
      'intro'
    ]);
    expect(saved.draft.facts?.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'quick_start_name',
        status: 'pending',
        isCritical: true,
        sourceId: 'source_1',
        sourceType: 'webpage',
        url: 'https://example.com/',
        title: 'Example Brand Official Website',
        excerpt: 'Example Brand provides trusted local services.'
      })
    ]));
  });

  it('degrades discovery failures to a failed source and manual pending facts', async () => {
    const { service, sources } = createHarness(true, 'operator', new Error('socket details'));
    await service.create('user_1', 'brand_1');
    const saved = await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });

    expect(saved.draft.website?.crawlStatus).toBe('failed');
    expect(saved.draft.facts?.candidates).toHaveLength(3);
    expect(saved.draft.facts?.candidates.every((candidate) => candidate.status === 'pending')).toBe(true);
    expect(sources[0]).toMatchObject({
      status: 'failed',
      errorMessage: '官网发现失败，请人工确认或录入品牌事实'
    });
  });

  it('preserves confirmed discovered candidates when the website step is saved again', async () => {
    const { service } = createHarness();
    await service.create('user_1', 'brand_1');
    const first = await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });
    const name = first.draft.facts!.candidates.find((candidate) => candidate.id === 'quick_start_name')!;
    await service.saveStep('user_1', 'brand_1', 'facts', {
      version: 2,
      data: { candidates: [{ ...name, status: 'confirmed' }] }
    });

    const second = await service.saveStep('user_1', 'brand_1', 'website', {
      version: 3,
      data: { ...websiteData, brandName: 'Changed Brand Name' }
    });
    expect(second.draft.facts?.candidates.find((candidate) => candidate.id === 'quick_start_name')).toMatchObject({
      status: 'confirmed',
      extractedValue: 'Example Brand'
    });
  });

  it('confirms an editable same-origin source page scope and rejects cross-origin pages', async () => {
    const { service, sources } = createHarness();
    await service.create('user_1', 'brand_1');
    const discovered = await service.saveStep('user_1', 'brand_1', 'website', { version: 1, data: websiteData });
    const items = discovered.draft.website!.sourcePagePlan!.items;
    expect(discovered.draft.website?.sourcePagePlan?.confirmedAt).toBeUndefined();
    expect(sources).toHaveLength(1);
    const adjusted = items
      .filter((item) => ['home', 'about'].includes(item.sourceRole))
      .map((item) => item.sourceRole === 'home'
        ? { ...item, included: true, processingStatus: 'completed' as const }
        : { ...item, included: true, processingStatus: 'failed' as const, errorMessage: '页面暂时不可访问' });
    adjusted.push({
      id: 'manual_faq',
      url: 'https://example.com/support/faq',
      title: 'Support FAQ',
      sourceRole: 'faq',
      selectionReason: '由用户人工加入官网来源范围。',
      included: true,
      processingStatus: 'planned'
    });

    const confirmed = await service.saveStep('user_1', 'brand_1', 'website', {
      version: discovered.version,
      data: { ...websiteData, sourcePagePlan: { items: adjusted } }
    });
    expect(confirmed.draft.website?.sourcePagePlan?.confirmedAt).toBeDefined();
    expect(confirmed.draft.website?.sourcePagePlan?.items.find((item) => item.id === 'manual_faq')).toMatchObject({
      url: 'https://example.com/support/faq',
      sourceRole: 'faq',
      included: true
    });
    expect(confirmed.draft.website?.sourcePagePlan?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRole: 'home', processingStatus: 'completed' }),
      expect.objectContaining({ sourceRole: 'about', processingStatus: 'failed', errorMessage: '页面暂时不可访问' })
    ]));
    expect(confirmed.draft.website?.sourcePagePlan?.items.some((item) => item.sourceRole === 'product')).toBe(false);
    expect(sources).toHaveLength(1);

    await expect(service.saveStep('user_1', 'brand_1', 'website', {
      version: confirmed.version,
      data: {
        ...websiteData,
        sourcePagePlan: { items: [{ ...adjusted[0], url: 'https://other.example.com/about' }] }
      }
    })).rejects.toMatchObject({ response: { code: 'QUICK_START_SOURCE_PAGE_ORIGIN_INVALID' } });
  });
});

function platformConfig(platformCode: string, name: string, connectionStatus: 'ready' | 'browser_available') {
  return {
    id: `platform_${platformCode}`,
    brandId: 'brand_1',
    platformCode,
    name,
    mode: connectionStatus === 'ready' ? 'api' : 'semi_auto',
    availableMethods: connectionStatus === 'ready' ? ['api'] : ['browser', 'manual'],
    connectionStatus,
    connectionStatusLabel: connectionStatus,
    nextAction: connectionStatus === 'ready' ? '可以自动监测。' : '使用浏览器辅助监测。',
    rateLimitPerMinute: 10,
    enabled: true,
    hasCredential: connectionStatus === 'ready',
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z'
  };
}
