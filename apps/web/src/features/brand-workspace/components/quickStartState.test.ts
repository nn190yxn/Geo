import type { QuickStartFactCandidate, QuickStartSession } from '@geo-platform/shared-types';
import { describe, expect, it } from 'vitest';
import {
  getQuickStartReadiness,
  isQuickStartVersionConflict,
  restoreQuickStartEditorState,
  updateQuickStartFact
} from './quickStartState';

describe('quick start state', () => {
  it('restores the current step and every saved draft input', () => {
    const session = createSession();
    const restored = restoreQuickStartEditorState(session);

    expect(restored).toMatchObject({
      activeStep: 'questions',
      website: {
        brandName: '追光小牛',
        websiteUrl: 'https://example.com/',
        targetMarkets: ['贵阳'],
        competitors: ['竞品甲']
      },
      questions: [{ id: 'question-1', category: 'category', question: '贵阳儿童运动品牌怎么选？', enabled: true, targetPlatforms: ['doubao'] }]
    });
    expect(restored.facts[0]).toMatchObject({ id: 'fact-1', extractedValue: '儿童运动成长中心' });
    expect(restored.website.sourcePagePlan?.items[0]).toMatchObject({ id: 'source-page-home', sourceRole: 'home' });
  });

  it('changes only confirmation fields while preserving extracted source evidence', () => {
    const original = createFact();
    const [edited] = updateQuickStartFact([original], original.id, { status: 'edited', editedValue: '儿童体能训练品牌' });

    expect(edited).toMatchObject({
      status: 'edited',
      editedValue: '儿童体能训练品牌',
      extractedValue: '儿童运动成长中心',
      sourceId: 'source-1',
      sourceType: 'webpage',
      url: 'https://example.com/about',
      title: '关于追光小牛',
      excerpt: '专注 3 至 12 岁儿童运动成长。'
    });
    expect(original.status).toBe('pending');
    expect(original.editedValue).toBeUndefined();
  });

  it('blocks completion for pending or rejected critical facts and permits confirmed facts', () => {
    expect(getQuickStartReadiness([createFact({ status: 'pending' })]).canComplete).toBe(false);
    expect(getQuickStartReadiness([createFact({ status: 'rejected' })]).canComplete).toBe(false);
    expect(getQuickStartReadiness([createFact({ status: 'confirmed' })])).toMatchObject({ canComplete: true, confirmedCount: 1 });
  });

  it('recognizes the server conflict code used for stale versions', () => {
    expect(isQuickStartVersionConflict('QUICK_START_VERSION_CONFLICT')).toBe(true);
    expect(isQuickStartVersionConflict('REQUEST_ERROR')).toBe(false);
  });
});

function createSession(): QuickStartSession {
  return {
    id: 'session-1',
    brandId: 'brand_demo',
    currentStep: 'questions',
    status: 'in_progress',
    version: 4,
    startedAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:10:00.000Z',
    draft: {
      website: {
        brandName: '追光小牛',
        websiteUrl: 'https://example.com/',
        targetMarkets: ['贵阳'],
        competitors: ['竞品甲'],
        crawlStatus: 'completed',
        knowledgeSourceId: 'source-1',
        sourcePagePlan: {
          items: [{
            id: 'source-page-home',
            url: 'https://example.com/',
            title: '官网首页',
            sourceRole: 'home',
            selectionReason: '首页用于确认品牌主体、核心定位和主要业务。',
            included: true,
            processingStatus: 'planned'
          }]
        }
      },
      facts: { candidates: [createFact()] },
      questions: { items: [{ id: 'question-1', category: 'category', question: '贵阳儿童运动品牌怎么选？', enabled: true, targetPlatforms: ['doubao'] }] }
    }
  };
}

function createFact(overrides: Partial<QuickStartFactCandidate> = {}): QuickStartFactCandidate {
  return {
    id: 'fact-1',
    fieldKey: 'intro',
    extractedValue: '儿童运动成长中心',
    confidence: 0.91,
    status: 'pending',
    isCritical: true,
    sourceId: 'source-1',
    sourceType: 'webpage',
    url: 'https://example.com/about',
    title: '关于追光小牛',
    excerpt: '专注 3 至 12 岁儿童运动成长。',
    ...overrides
  };
}
