import { describe, expect, it, vi } from 'vitest';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { DemandSnapshotRepository } from '../src/modules/automation/demand-snapshot.repository';
import { DemandSnapshotService } from '../src/modules/automation/demand-snapshot.service';
import { DemandSnapshotsController } from '../src/modules/automation/demand-snapshots.controller';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { BaiduSearchDemandAdapter, GoogleSearchDemandAdapter, ManualSearchDemandAdapter, SearchDemandAdapterRegistry } from '../src/modules/automation/search-demand.adapter';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('DemandSnapshotService', () => {
  it('marks only questions absent from the previous comparable snapshot as rising observations', async () => {
    const { service, repository } = createServices();
    const first = await service.capture('user_demo', 'brand_demo', {
      seedTerm: '儿童体能',
      source: 'manual',
      market: '贵阳',
      candidateQuestions: ['儿童体能课怎么选？', '儿童体能课适合几岁？']
    });
    const second = await service.capture('user_demo', 'brand_demo', {
      seedTerm: '儿童体能',
      source: 'manual',
      market: '贵阳',
      candidateQuestions: ['儿童体能课怎么选?', '贵阳儿童体能训练机构推荐']
    });

    expect(first.candidateQuestions.every((candidate) => !candidate.risingObservation)).toBe(true);
    expect(second.previousSnapshotId).toBe(first.id);
    expect(second.candidateQuestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ question: '儿童体能课怎么选?', risingObservation: false }),
      expect.objectContaining({ question: '贵阳儿童体能训练机构推荐', risingObservation: true })
    ]));
    expect((await repository.get('brand_demo', first.id))?.candidateQuestions.every((candidate) => !candidate.risingObservation)).toBe(true);
  }, 15_000);

  it('isolates previous snapshots by source and market', async () => {
    const { service } = createServices();
    await service.capture('user_demo', 'brand_demo', { seedTerm: '儿童体能', source: 'manual', market: '贵阳', candidateQuestions: ['问题 A'] });
    const otherMarket = await service.capture('user_demo', 'brand_demo', { seedTerm: '儿童体能', source: 'manual', market: '北京', candidateQuestions: ['问题 B'] });

    expect(otherMarket.previousSnapshotId).toBeUndefined();
    expect(otherMarket.candidateQuestions[0].risingObservation).toBe(false);
  });

  it('confirms a candidate idempotently into the visible candidate list and stable question pool', async () => {
    const { service, permissionsRepository, automationRepository } = createServices();
    const snapshot = await service.capture('user_demo', 'brand_demo', {
      seedTerm: '儿童体能',
      source: 'manual',
      market: '贵阳',
      candidateQuestions: ['贵阳儿童体能训练机构怎么选？']
    });
    const candidateId = snapshot.candidateQuestions[0].id;

    const first = await service.confirmCandidate('user_demo', 'brand_demo', snapshot.id, candidateId);
    const second = await service.confirmCandidate('user_demo', 'brand_demo', snapshot.id, candidateId);

    expect(first.candidate.status).toBe('confirmed');
    expect(second.poolItem.poolItemId).toBe(first.poolItem.poolItemId);
    expect(permissionsRepository.listTestQuestionCandidates('user_demo', 'brand_demo')).toContainEqual(expect.objectContaining({
      question: '贵阳儿童体能训练机构怎么选？',
      promptKind: 'discovery',
      selected: false
    }));
    expect(automationRepository.listQuestionPoolItems('brand_demo').filter((item) => item.question.includes('训练机构'))).toHaveLength(1);
    expect(automationRepository.listQuestionSourceRecords('brand_demo', first.poolItem.poolItemId)).toHaveLength(1);
  });

  it('rejects cross-brand snapshot access', async () => {
    const { service } = createServices();
    await expect(service.list('user_demo', 'brand_unavailable')).rejects.toThrow('品牌不存在或当前用户无权访问');
  });

  it('preserves repository history when a search source fails', async () => {
    const { service, repository } = createServices();
    vi.spyOn(SearchDemandAdapterRegistry.prototype, 'require').mockReturnValueOnce({
      source: 'baidu',
      collect: vi.fn().mockRejectedValue(new Error('upstream unavailable'))
    });

    await expect(service.capture('user_demo', 'brand_demo', {
      seedTerm: '儿童体能', source: 'baidu', market: '贵阳'
    })).rejects.toMatchObject({ response: expect.objectContaining({ code: 'SEARCH_DEMAND_SOURCE_FAILED' }) });
    await expect(repository.list('brand_demo')).resolves.toEqual([]);
  });

  it('forwards controller context and route identifiers', async () => {
    const { service } = createServices();
    const controller = new DemandSnapshotsController(service);
    const request = { context: { userId: 'user_demo' } } as never;

    const created = await controller.capture(request, 'brand_demo', {
      seedTerm: '儿童体能', source: 'manual', market: '贵阳', candidateQuestions: ['儿童体能训练怎么选']
    });
    const candidateId = created.data.candidateQuestions[0].id;
    const confirmed = await controller.confirmCandidate(request, 'brand_demo', created.data.id, candidateId);

    expect(confirmed.data.candidate.status).toBe('confirmed');
    await expect(controller.list(request, 'brand_demo')).resolves.toEqual(expect.objectContaining({ success: true }));
  });
});

function createServices() {
  const automationRepository = new AutomationRepository();
  const permissionsRepository = new PermissionsRepository();
  const permissionsService = new PermissionsService(permissionsRepository);
  const confirmationQueue = new ConfirmationQueueService(automationRepository, permissionsRepository);
  const questionPoolService = new QuestionPoolService(
    automationRepository,
    permissionsRepository,
    new TestThemeService(),
    new TestQuestionService(),
    confirmationQueue
  );
  const repository = new DemandSnapshotRepository();
  const registry = new SearchDemandAdapterRegistry(
    new BaiduSearchDemandAdapter(),
    new GoogleSearchDemandAdapter(),
    new ManualSearchDemandAdapter()
  );
  const service = new DemandSnapshotService(repository, registry, questionPoolService, permissionsService);
  return { service, repository, permissionsRepository, automationRepository };
}
