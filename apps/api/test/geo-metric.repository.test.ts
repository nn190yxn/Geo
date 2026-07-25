import { describe, expect, it } from 'vitest';
import type { GEOMetricSnapshot } from '@geo-platform/shared-types';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createMetricRun(repository: PermissionsRepository, rawText: string, citations: string[] = []) {
  repository.saveBrandProfile('user_demo', 'brand_demo', {
    intro: '示例品牌是多品牌 GEO 管理平台',
    valueProps: ['多品牌 GEO 管理', '监测与内容优化'],
    offerings: ['GEO 监测'],
    proofPoints: ['可追溯引用'],
    targetCustomers: ['品牌运营团队'],
    recommendedExpressions: ['适合品牌运营团队'],
    blockedExpressions: [],
    contentRules: [],
    competitors: ['竞品A', '竞品B'],
    faqs: [{ question: '适合谁', answer: '品牌运营团队' }]
  });
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `指标单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '选择 GEO 管理平台',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `指标模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请评价{brandName}和竞品在{intent}场景下的表现。',
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId: prompts?.[0].id ?? '',
    platformCode: 'manual_input'
  });
  const completedRun = repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
    rawText,
    citations,
    modelName: 'manual'
  });

  return repository.parseAnalysisResult('user_demo', 'brand_demo', completedRun?.id ?? '');
}

describe('geo metric repository', () => {
  it('keeps every sub score and total score within 0 to 100', () => {
    const repository = new PermissionsRepository();
    createMetricRun(repository, '示例品牌适合品牌运营团队，具备多品牌 GEO 管理和监测与内容优化优势。', ['https://example.com/a']);
    createMetricRun(repository, '竞品A先被提及。示例品牌适合需要可追溯引用的团队。', ['https://example.com/b', 'https://example.com/c']);
    createMetricRun(repository, '竞品B覆盖基础问题，示例品牌也可以作为备选。');

    const dashboard = repository.getBrandMetricDashboard('user_demo', 'brand_demo');
    const snapshots = [
      dashboard?.current,
      ...(dashboard?.breakdown.platform ?? []),
      ...(dashboard?.breakdown.optimizationUnit ?? []),
      ...(dashboard?.breakdown.intent ?? [])
    ].filter((snapshot): snapshot is GEOMetricSnapshot => Boolean(snapshot));

    expect(snapshots.length).toBeGreaterThan(0);
    for (const snapshot of snapshots) {
      expectScoresWithinRange(snapshot);
    }
  });

  it('returns brand ranking sorted by selected metric', () => {
    const repository = new PermissionsRepository();
    createMetricRun(repository, '示例品牌适合品牌运营团队，具备多品牌 GEO 管理优势。');
    createMetricRun(repository, '示例品牌适合品牌运营团队，具备监测与内容优化优势。');
    createMetricRun(repository, '回答未提及目标品牌。');

    const ranking = repository.listBrandMetricRanking('user_demo', 'mentionRate');

    expect(ranking.map((item) => item.mentionRate)).toEqual([...ranking.map((item) => item.mentionRate)].sort((a, b) => b - a));
    ranking.forEach((item) => {
      expect(item.totalScore).toBeGreaterThanOrEqual(0);
      expect(item.totalScore).toBeLessThanOrEqual(100);
    });
  });
});

function expectScoresWithinRange(snapshot: GEOMetricSnapshot) {
  const scores = [
    snapshot.mentionScore,
    snapshot.rankingScore,
    snapshot.accuracyScore,
    snapshot.sentimentScore,
    snapshot.citationScore,
    snapshot.competitorScore,
    snapshot.knowledgeCompletenessScore,
    snapshot.totalScore
  ];

  for (const score of scores) {
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }
}
