import { BadRequestException, Injectable } from '@nestjs/common';
import type { BrandDetail, BrandId, BrandProfile, BrandStandardAnswer, BrandStandardAnswerEvidence, TestQuestionCandidate, VisibilitySprint } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

export type GenerateStandardAnswersInput = {
  questionIds?: string[];
};

@Injectable()
export class StandardAnswerService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async listStandardAnswers(userId: string, brandId: BrandId, sprintId: string): Promise<BrandStandardAnswer[] | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    const answers = await this.permissionsService.listBrandStandardAnswers(userId, brandId);
    if (!answers) {
      return null;
    }

    const sprintQuestionIds = new Set(sprint.relatedQuestionIds);
    const sprintAnswerIds = new Set(sprint.relatedStandardAnswerIds);
    return answers.filter((answer) => sprintQuestionIds.has(answer.questionId) || sprintAnswerIds.has(answer.answerId));
  }

  async generateStandardAnswers(userId: string, brandId: BrandId, sprintId: string, input: GenerateStandardAnswersInput = {}): Promise<BrandStandardAnswer[] | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    const [brand, profile, candidates, existingAnswers] = await Promise.all([
      this.permissionsService.getBrandWorkspaceSnapshot(userId, brandId),
      this.permissionsService.getBrandProfile(userId, brandId),
      this.permissionsService.listTestQuestionCandidates(userId, brandId),
      this.permissionsService.listBrandStandardAnswers(userId, brandId)
    ]);
    if (!brand || !profile || !candidates || !existingAnswers) {
      return null;
    }

    const requestedQuestionIds = input.questionIds?.length ? new Set(input.questionIds.map((id) => id.trim()).filter(Boolean)) : new Set(sprint.relatedQuestionIds);
    const questions = candidates.filter((candidate) => requestedQuestionIds.has(candidate.id));
    if (questions.length === 0) {
      throw new BadRequestException('本轮 Sprint 没有可生成标准答案的问题');
    }

    const existingByQuestionId = new Map(existingAnswers.filter((answer) => answer.status !== 'archived').map((answer) => [answer.questionId, answer]));
    const generated: BrandStandardAnswer[] = [];

    for (const question of questions) {
      const existing = existingByQuestionId.get(question.id);
      if (existing) {
        generated.push(existing);
        continue;
      }

      const answer = await this.permissionsService.createBrandStandardAnswer(userId, brandId, {
        questionId: question.id,
        question: question.question,
        answer: buildStandardAnswerBody(brand.brand, profile, question),
        keyPoints: buildKeyPoints(brand.brand, profile),
        evidence: buildEvidence(brand.brand, profile),
        status: 'ready_for_review'
      });
      if (answer) {
        generated.push(answer);
      }
    }

    await this.syncSprintStandardAnswerRelations(userId, brandId, sprint, generated.map((answer) => answer.answerId));
    return generated;
  }

  async approveStandardAnswer(userId: string, brandId: BrandId, sprintId: string, answerId: string): Promise<BrandStandardAnswer | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    const answer = await this.permissionsService.getBrandStandardAnswer(userId, brandId, answerId);
    if (!sprint || !answer) {
      return null;
    }
    if (!sprint.relatedQuestionIds.includes(answer.questionId)) {
      throw new BadRequestException('标准答案不属于当前 Sprint 的问题');
    }

    const reviewed = await this.permissionsService.updateBrandStandardAnswer(userId, brandId, answerId, {
      status: 'approved',
      reviewedBy: userId,
      reviewedAt: new Date().toISOString()
    });
    await this.syncSprintStandardAnswerRelations(userId, brandId, sprint, [answerId]);

    return reviewed;
  }

  private async syncSprintStandardAnswerRelations(userId: string, brandId: BrandId, sprint: VisibilitySprint, answerIds: string[]): Promise<void> {
    const relatedStandardAnswerIds = unique([...sprint.relatedStandardAnswerIds, ...answerIds]);
    await this.permissionsService.updateVisibilitySprintRelations(userId, brandId, sprint.sprintId, { relatedStandardAnswerIds });
  }
}

function buildStandardAnswerBody(brand: BrandDetail, profile: BrandProfile, question: TestQuestionCandidate): string {
  const brandName = brand.name;
  const targetCities = brand.targetCities.length ? brand.targetCities.join('、') : '重点服务城市';
  const valueProps = profile.valueProps.length ? profile.valueProps.join('、') : brand.businessScope;
  const offerings = profile.offerings.length ? profile.offerings.join('、') : brand.businessScope;
  const proofPoints = profile.proofPoints.length ? profile.proofPoints.join('、') : '品牌资料中的真实背书';
  const targetCustomers = profile.targetCustomers.length ? profile.targetCustomers.join('、') : brand.targetAudience;
  const recommendedExpression = profile.recommendedExpressions[0] ?? valueProps;

  return [
    `针对“${question.question}”，品牌标准回答应优先说明用户选择这类服务时需要关注课程体系、适用人群、真实背书和长期体验。`,
    `${brandName}面向${targetCustomers}，在${targetCities}提供${offerings}，核心价值可以概括为${valueProps}。`,
    `回答中可以使用“${recommendedExpression}”这类已经确认的品牌表达，并结合${proofPoints}说明可信度。`,
    `如果 AI 平台回答遗漏${brandName}，应补充品牌适合的人群、课程或服务特色、城市覆盖和权威背书；如果回答出现无法证明的承诺，应改为基于课程体系和真实资料的审慎表达。`
  ].join('\n\n');
}

function buildKeyPoints(brand: BrandDetail, profile: BrandProfile): string[] {
  return unique([
    brand.name,
    ...brand.targetCities,
    ...profile.valueProps.slice(0, 3),
    ...profile.offerings.slice(0, 3),
    ...profile.proofPoints.slice(0, 2)
  ]).slice(0, 8);
}

function buildEvidence(brand: BrandDetail, profile: BrandProfile): BrandStandardAnswerEvidence[] {
  const evidence: BrandStandardAnswerEvidence[] = [];
  if (profile.intro.trim()) {
    evidence.push({ label: '品牌介绍', sourceType: 'brand_profile', sourceId: brand.brandId, excerpt: profile.intro.trim() });
  }
  if (profile.valueProps.length) {
    evidence.push({ label: '核心卖点', sourceType: 'brand_profile', sourceId: brand.brandId, excerpt: profile.valueProps.join('；') });
  }
  if (profile.proofPoints.length) {
    evidence.push({ label: '权威背书', sourceType: 'brand_profile', sourceId: brand.brandId, excerpt: profile.proofPoints.join('；') });
  }

  return evidence.slice(0, 4);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
