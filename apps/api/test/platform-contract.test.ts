import { describe, expect, it } from 'vitest';
import type {
  BeginnerFriendlyPlatform,
  BrandImportDraft,
  BrowserConnectionSession,
  GrowthContentType,
  GrowthOptimizationPlanInput,
  PlatformConfig,
  PlatformConfigInput,
  TestPlanInput,
  TestQuestionCandidateInput
} from '@geo-platform/shared-types';

type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

const responseHidesCredentialRef: HasKey<PlatformConfig, 'credentialRef'> = false;
const responseExposesMaskedCredentialState: HasKey<PlatformConfig, 'credentialRefMasked'> = true;
const inputAcceptsCredentialRef: HasKey<PlatformConfigInput, 'credentialRef'> = true;
const browserSessionHidesCredentialRef: HasKey<BrowserConnectionSession, 'credentialRef'> = false;

describe('platform credential public contract', () => {
  it('keeps raw credential refs out of public platform config responses', () => {
    const publicConfig: PlatformConfig = {
      id: 'platform_demo',
      brandId: 'brand_demo',
      platformCode: 'mock_ai',
      name: '示例回答',
      mode: 'mock',
      availableMethods: ['api'],
      connectionStatus: 'ready',
      connectionStatusLabel: '可自动监测',
      nextAction: '开发环境可直接执行示例监测。',
      rateLimitPerMinute: 60,
      enabled: true,
      hasCredential: true,
      credentialRefMasked: '***',
      createdAt: '2026-07-03T00:00:00.000Z',
      updatedAt: '2026-07-03T00:00:00.000Z'
    };

    expect(responseHidesCredentialRef).toBe(false);
    expect(responseExposesMaskedCredentialState).toBe(true);
    expect(inputAcceptsCredentialRef).toBe(true);
    expect(Object.keys(publicConfig)).not.toContain('credentialRef');
    expect(publicConfig).toMatchObject({ hasCredential: true, credentialRefMasked: '***' });
  });
});

describe('beginner friendly GEO workflow contract', () => {
  it('covers import, testing, browser connection, and growth planning inputs', () => {
    const defaultPlatforms: BeginnerFriendlyPlatform[] = ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'];
    const contentTypes: GrowthContentType[] = [
      'wechat_article',
      'xiaohongshu_note',
      'website_faq',
      'short_video_script',
      'platform_profile_copy',
      'image_creative_brief'
    ];
    const importDraft: BrandImportDraft = {
      id: 'draft_demo',
      brandId: 'brand_demo',
      sourceId: 'source_demo',
      fileName: 'brand.md',
      format: 'markdown',
      status: 'ready_for_confirmation',
      fields: [
        {
          key: 'intro',
          label: '品牌简介',
          value: '追光小牛儿童运动成长课',
          confidence: 'high',
          confirmationRequired: false
        }
      ],
      confidenceSummary: { high: 1, medium: 0, low: 0, needsConfirmation: 0 },
      missingFields: [],
      createdAt: '2026-07-04T00:00:00.000Z',
      updatedAt: '2026-07-04T00:00:00.000Z'
    };
    const questionInput: TestQuestionCandidateInput = {
      themeId: 'theme_demo',
      question: '贵阳哪里有适合 3-5 岁孩子的体能馆',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      targetPlatforms: defaultPlatforms,
      priority: 'high',
      estimatedValue: '验证地域品类推荐场景'
    };
    const testPlanInput: TestPlanInput = {
      candidateIds: ['candidate_demo'],
      platformCodes: defaultPlatforms,
      executionMethod: 'browser'
    };
    const growthPlanInput: GrowthOptimizationPlanInput = {
      dueDate: '2026-07-12T00:00:00.000Z',
      publishingPlatforms: ['公众号', '小红书'],
      retestAt: '2026-07-19T00:00:00.000Z',
      contentRecommendations: [
        {
          contentType: 'wechat_article',
          title: '贵阳儿童体能课选择指南',
          targetPlatform: '公众号',
          targetKeywords: ['贵阳儿童体能', '追光小牛'],
          reason: '补齐地域品类内容'
        }
      ]
    };

    expect(browserSessionHidesCredentialRef).toBe(false);
    expect(defaultPlatforms).toEqual(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']);
    expect(contentTypes).toContain('image_creative_brief');
    expect(importDraft.fields[0]?.key).toBe('intro');
    expect(questionInput.purposes).toContain('rank_first');
    expect(testPlanInput.executionMethod).toBe('browser');
    expect(growthPlanInput.contentRecommendations?.[0]?.contentType).toBe('wechat_article');
  });
});
