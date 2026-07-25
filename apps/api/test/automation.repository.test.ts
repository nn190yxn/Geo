import { describe, expect, it, vi } from 'vitest';
import type { AutomationPackage, TestQuestionPoolItem } from '@geo-platform/shared-types';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { PrismaAutomationRepository } from '../src/modules/automation/prisma-automation.repository';

const now = '2026-07-08T00:00:00.000Z';

describe('automation repository', () => {
  it('stores automation packages, confirmations, rewrites and question pool by brand', () => {
    const repository = new AutomationRepository();
    const automationPackage = createPackage('package_1', 'brand_demo');
    const otherPackage = createPackage('package_2', 'brand_other');

    repository.createPackage(automationPackage);
    repository.createPackage(otherPackage);
    repository.createConfirmation({
      confirmationId: 'confirmation_1',
      packageId: 'package_1',
      brandId: 'brand_demo',
      type: 'test_questions',
      status: 'pending',
      title: '确认监测问题',
      impact: '影响本轮测试覆盖面',
      recommendation: '保留高价值问题',
      evidenceSummary: '系统已精选 6 个问题。',
      payload: { selectedCandidateIds: ['candidate_1'] }
    });
    repository.createRewrite({
      rewriteId: 'rewrite_1',
      brandId: 'brand_demo',
      contentVersionId: 'version_1',
      targetPlatform: 'xiaohongshu',
      title: '追光小牛贵阳儿童运动笔记',
      body: '正文',
      tags: ['贵阳儿童运动'],
      rewriteNotes: ['小红书笔记化'],
      complianceNotes: ['避免保证性表达'],
      status: 'needs_review',
      createdAt: now
    });
    const poolItem = createPoolItem('pool_1', 'brand_demo');
    repository.createQuestionPoolItem(poolItem);
    repository.createQuestionSourceRecord({
      sourceRecordId: 'source_1',
      poolItemId: 'pool_1',
      brandId: 'brand_demo',
      sourceType: 'llm',
      sourceId: 'candidate_1',
      summary: '由 LLM 生成监测问题',
      createdAt: now
    });

    expect(repository.listPackages('brand_demo')).toEqual([automationPackage]);
    expect(repository.getPackage('brand_other', 'package_1')).toBeNull();
    expect(repository.listConfirmations('brand_demo', 'package_1')).toHaveLength(1);
    expect(repository.listRewrites('brand_demo', 'version_1')).toHaveLength(1);
    expect(repository.listQuestionPoolItems('brand_demo')).toEqual([poolItem]);
    expect(repository.listQuestionSourceRecords('brand_demo', 'pool_1')).toHaveLength(1);
  });

  it('mirrors automation writes to prisma while keeping a synchronous runtime view', () => {
    const prisma = createPrismaMock();
    const repository = new PrismaAutomationRepository(prisma as never);
    const automationPackage = createPackage('package_prisma', 'brand_demo');
    const poolItem = createPoolItem('pool_prisma', 'brand_demo');

    repository.createPackage(automationPackage);
    repository.createQuestionPoolItem(poolItem);
    repository.createQuestionSourceRecord({
      sourceRecordId: 'source_prisma',
      poolItemId: 'pool_prisma',
      brandId: 'brand_demo',
      sourceType: 'test_question_candidate',
      sourceId: 'candidate_1',
      summary: '同步候选问题',
      createdAt: now
    });

    expect(repository.getPackage('brand_demo', 'package_prisma')).toEqual(automationPackage);
    expect(repository.listQuestionPoolItems('brand_demo')).toEqual([poolItem]);
    expect(prisma.automationPackage.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'package_prisma' } }));
    expect(prisma.testQuestionPoolItem.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pool_prisma' } }));
    expect(prisma.testQuestionSourceRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'source_prisma' } }));
  });

  it('keeps the synchronous runtime view when prisma mirror writes fail', async () => {
    const prisma = createPrismaMock();
    prisma.automationPackage.upsert.mockRejectedValue(new Error('database unavailable'));
    const repository = new PrismaAutomationRepository(prisma as never);
    const automationPackage = createPackage('package_prisma_failed', 'brand_demo');

    repository.createPackage(automationPackage);
    await Promise.resolve();

    expect(repository.getPackage('brand_demo', 'package_prisma_failed')).toEqual(automationPackage);
    expect(prisma.automationPackage.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'package_prisma_failed' } }));
  });
});

function createPackage(packageId: string, brandId: string): AutomationPackage {
  return {
    packageId,
    brandId,
    status: 'draft',
    source: 'brand_workspace',
    goal: '完成本轮 AI 自动运营',
    targetPlatforms: ['doubao'],
    targetPublishingPlatforms: ['xiaohongshu'],
    currentStep: 'context_collection',
    stepSummaries: [],
    relatedContentTaskIds: [],
    relatedPublishingRecordIds: [],
    createdBy: 'user_demo',
    createdAt: now,
    updatedAt: now
  };
}

function createPoolItem(poolItemId: string, brandId: string): TestQuestionPoolItem {
  return {
    poolItemId,
    brandId,
    question: '贵阳哪里有适合孩子的儿童运动课？',
    angle: 'local',
    purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao'],
    priority: 'high',
    estimatedValue: '验证本地推荐场景',
    source: 'llm',
    status: 'candidate',
    candidateId: 'candidate_1',
    createdAt: now,
    updatedAt: now
  };
}

function createPrismaMock() {
  return {
    automationPackage: {
      upsert: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null)
    },
    automationConfirmation: {
      upsert: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null)
    },
    platformRewriteVersion: {
      upsert: vi.fn().mockResolvedValue(null)
    },
    testQuestionPoolItem: {
      upsert: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null)
    },
    testQuestionSourceRecord: {
      upsert: vi.fn().mockResolvedValue(null)
    }
  };
}
