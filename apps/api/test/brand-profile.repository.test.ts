import { describe, expect, it } from 'vitest';
import { calculateBrandProfileCompleteness, PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('brand profile completeness', () => {
  it('scores complete profile data at 100', () => {
    const result = calculateBrandProfileCompleteness(
      { businessScope: '儿童体适能训练', targetAudience: '3-12 岁儿童家庭' },
      {
        intro: '专注儿童体适能训练。',
        valueProps: ['分龄训练'],
        offerings: ['基础体能课'],
        proofPoints: ['专业教练体系'],
        targetCustomers: ['儿童家庭'],
        recommendedExpressions: ['儿童运动成长'],
        blockedExpressions: ['速成'],
        contentRules: ['表达真实案例'],
        competitors: ['竞品品牌'],
        faqs: [{ question: '适合几岁？', answer: '适合 3-12 岁。' }]
      }
    );

    expect(result.score).toBe(100);
    expect(result.missingFields).toEqual([]);
  });

  it('identifies missing required knowledge fields', () => {
    const result = calculateBrandProfileCompleteness(
      { businessScope: '', targetAudience: '' },
      {
        intro: '',
        valueProps: [],
        offerings: [],
        proofPoints: [],
        targetCustomers: [],
        recommendedExpressions: [],
        blockedExpressions: [],
        contentRules: [],
        competitors: [],
        faqs: []
      }
    );

    expect(result.score).toBe(0);
    expect(result.missingFields).toContain('品牌介绍');
    expect(result.missingFields).toContain('禁用表达');
    expect(result.prompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'intro',
          label: '品牌介绍',
          impact: expect.stringContaining('品牌基础认知'),
          prompt: expect.stringContaining('品牌是谁')
        }),
        expect.objectContaining({
          field: 'blockedExpressions',
          label: '禁用表达',
          impact: expect.stringContaining('风险边界'),
          prompt: expect.stringContaining('严禁使用')
        })
      ])
    );
  });
});

describe('brand profile repository', () => {
  it('normalizes and saves brand profile data', () => {
    const repository = new PermissionsRepository();
    const profile = repository.saveBrandProfile('user_demo', 'brand_demo', {
      intro: '  品牌介绍  ',
      valueProps: [' 专业训练 ', ''],
      offerings: ['体能课'],
      proofPoints: ['认证教练'],
      targetCustomers: ['儿童家庭'],
      recommendedExpressions: ['科学训练'],
      blockedExpressions: ['包治'],
      contentRules: ['不要夸大承诺'],
      competitors: ['竞品 A'],
      faqs: [{ question: '  怎么预约？ ', answer: ' 到店咨询。 ' }]
    });

    expect(profile?.intro).toBe('品牌介绍');
    expect(profile?.valueProps).toEqual(['专业训练']);
    expect(profile?.faqs[0]).toEqual({ question: '怎么预约？', answer: '到店咨询。' });
    expect(profile?.completenessScore).toBeGreaterThan(0);
  });

  it('returns fill-in prompts when profile completeness is low', () => {
    const repository = new PermissionsRepository();
    const profile = repository.saveBrandProfile('user_demo', 'brand_demo', {
      intro: '追光小牛是贵阳儿童运动品牌。',
      valueProps: [],
      offerings: [],
      proofPoints: [],
      targetCustomers: [],
      recommendedExpressions: [],
      blockedExpressions: [],
      contentRules: [],
      competitors: [],
      faqs: []
    });

    expect(profile?.completenessScore).toBeLessThan(100);
    expect(profile?.completenessPrompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'valueProps',
          label: '核心卖点',
          prompt: expect.stringContaining('品牌优势')
        })
      ])
    );
  });
});
