import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  SearchDemandCandidateConfirmationResult,
  SearchDemandSnapshot,
  SearchDemandSnapshotInput
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { normalizeQuestionText } from '../brands/test-question.service';
import { DEMAND_SNAPSHOT_REPOSITORY, type DemandSnapshotRepositoryPort } from './demand-snapshot.repository.port';
import { QuestionPoolService } from './question-pool.service';
import { SearchDemandAdapterRegistry } from './search-demand.adapter';

@Injectable()
export class DemandSnapshotService {
  constructor(
    @Inject(DEMAND_SNAPSHOT_REPOSITORY) private readonly repository: DemandSnapshotRepositoryPort,
    private readonly adapterRegistry: SearchDemandAdapterRegistry,
    private readonly questionPoolService: QuestionPoolService,
    private readonly permissionsService: PermissionsService
  ) {}

  async capture(userId: string, brandId: string, input: SearchDemandSnapshotInput): Promise<SearchDemandSnapshot> {
    this.requireBrandAccess(userId, brandId);
    const normalizedInput = normalizeInput(input);
    let collected: string[];
    try {
      collected = (await this.adapterRegistry.require(normalizedInput.source).collect(normalizedInput)).candidateQuestions;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'SEARCH_DEMAND_SOURCE_FAILED';
      throw new ServiceUnavailableException({ code: 'SEARCH_DEMAND_SOURCE_FAILED', message: '搜索补全来源暂时不可用，请稍后重试或使用人工录入', details: { reason } });
    }
    const uniqueQuestions = deduplicateQuestions(collected);
    if (uniqueQuestions.length === 0) throw new BadRequestException('当前来源没有返回可保存的搜索补全候选');

    const previous = (await this.repository.list(brandId)).find((snapshot) => (
      normalizeQuestionText(snapshot.seedTerm) === normalizeQuestionText(normalizedInput.seedTerm)
      && snapshot.source === normalizedInput.source
      && snapshot.market.toLocaleLowerCase() === normalizedInput.market.toLocaleLowerCase()
    ));
    const previousQuestions = new Set(previous?.candidateQuestions.map((candidate) => candidate.normalizedQuestion) ?? []);
    const now = new Date().toISOString();
    const snapshotId = `demand_snapshot_${randomUUID()}`;
    const snapshot: SearchDemandSnapshot = {
      id: snapshotId,
      brandId,
      seedTerm: normalizedInput.seedTerm,
      source: normalizedInput.source,
      market: normalizedInput.market,
      capturedAt: now,
      previousSnapshotId: previous?.id,
      createdAt: now,
      candidateQuestions: uniqueQuestions.map(({ question, normalizedQuestion }) => ({
        id: `demand_candidate_${randomUUID()}`,
        snapshotId,
        brandId,
        question,
        normalizedQuestion,
        risingObservation: Boolean(previous) && !previousQuestions.has(normalizedQuestion),
        status: 'candidate',
        createdAt: now
      }))
    };
    const created = await this.repository.create(snapshot);
    this.audit(userId, brandId, 'demand_snapshot.capture', created.id, {
      seedTerm: created.seedTerm,
      source: created.source,
      market: created.market,
      candidateCount: created.candidateQuestions.length,
      risingObservationCount: created.candidateQuestions.filter((candidate) => candidate.risingObservation).length,
      previousSnapshotId: created.previousSnapshotId
    });
    return created;
  }

  async list(userId: string, brandId: string): Promise<SearchDemandSnapshot[]> {
    this.requireBrandAccess(userId, brandId);
    return this.repository.list(brandId);
  }

  async confirmCandidate(userId: string, brandId: string, snapshotId: string, candidateId: string): Promise<SearchDemandCandidateConfirmationResult> {
    this.requireBrandAccess(userId, brandId);
    const snapshot = await this.repository.get(brandId, snapshotId);
    const candidate = snapshot?.candidateQuestions.find((item) => item.id === candidateId);
    if (!snapshot || !candidate) throw new NotFoundException('搜索需求候选不存在或不属于当前品牌');

    const poolItem = this.questionPoolService.addConfirmedSearchDemandQuestion(userId, brandId, {
      question: candidate.question,
      seedTerm: snapshot.seedTerm,
      market: snapshot.market,
      source: snapshot.source,
      snapshotId,
      candidateId
    });
    const confirmedAt = candidate.confirmedAt ?? new Date().toISOString();
    const updated = await this.repository.confirmCandidate(brandId, snapshotId, candidateId, poolItem.poolItemId, confirmedAt);
    const confirmedCandidate = updated?.candidateQuestions.find((item) => item.id === candidateId);
    if (!updated || !confirmedCandidate) throw new NotFoundException('搜索需求候选确认失败');
    this.audit(userId, brandId, 'demand_snapshot.candidate.confirm', candidateId, { snapshotId, poolItemId: poolItem.poolItemId });
    return { snapshot: updated, candidate: confirmedCandidate, poolItem };
  }

  private requireBrandAccess(userId: string, brandId: string): void {
    const accessible = this.permissionsService.listAccessibleBrandDetails(userId).some((brand) => brand.brandId === brandId);
    if (!accessible) throw new NotFoundException('品牌不存在或当前用户无权访问');
  }

  private audit(userId: string, brandId: string, action: string, resourceId: string, metadata: Record<string, unknown>): void {
    this.permissionsService.createAuditLog(userId, {
      brandId,
      organizationId: null,
      actorUserId: userId,
      action,
      resourceType: 'search_demand_snapshot',
      resourceId,
      result: 'success',
      metadata
    });
  }
}

function normalizeInput(input: SearchDemandSnapshotInput): SearchDemandSnapshotInput {
  const seedTerm = input?.seedTerm?.trim();
  const market = input?.market?.trim();
  if (!seedTerm) throw new BadRequestException('请填写搜索词根');
  if (!market) throw new BadRequestException('请填写搜索市场');
  if (!['baidu', 'google', 'manual'].includes(input.source)) throw new BadRequestException('搜索补全来源不受支持');
  if (input.source === 'manual' && (!input.candidateQuestions || input.candidateQuestions.length === 0)) {
    throw new BadRequestException('人工录入至少需要一个候选问句');
  }
  return { ...input, seedTerm, market };
}

function deduplicateQuestions(questions: string[]): Array<{ question: string; normalizedQuestion: string }> {
  const unique = new Map<string, string>();
  questions.forEach((question) => {
    const trimmed = question.trim();
    const normalizedQuestion = normalizeQuestionText(trimmed);
    if (trimmed && normalizedQuestion && !unique.has(normalizedQuestion)) unique.set(normalizedQuestion, trimmed);
  });
  return Array.from(unique, ([normalizedQuestion, question]) => ({ question, normalizedQuestion }));
}
