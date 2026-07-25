import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('test question candidate repository', () => {
  it('creates and lists question candidates under an existing test theme', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'location',
      name: '贵阳本地推荐',
      businessExplanation: '验证本地推荐可见度',
      priority: 'high',
      estimatedValue: '判断城市推荐场景表现'
    });

    const candidate = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: theme?.id ?? '',
      question: '贵阳哪里有适合 3-5 岁孩子的体能馆？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      targetPlatforms: ['doubao', 'kimi'],
      priority: 'high',
      estimatedValue: '验证地域品类推荐场景',
      selected: true
    });

    expect(candidate).toMatchObject({ brandId: 'brand_demo', themeId: theme?.id, selected: true, editable: true });
    expect(repository.listTestQuestionCandidates('user_demo', 'brand_demo')).toContainEqual(candidate);
  });

  it('rejects candidates for missing themes and inaccessible brands', () => {
    const repository = new PermissionsRepository();

    expect(repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: 'missing_theme',
      question: '追光小牛是做什么的？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['doubao'],
      priority: 'medium',
      estimatedValue: '验证品牌认知'
    })).toBeNull();

    expect(repository.listTestQuestionCandidates('other_user', 'brand_demo')).toBeNull();
  });

  it('updates editable question candidates', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'brand',
      name: '品牌直问编辑',
      businessExplanation: '验证品牌直问编辑',
      priority: 'medium',
      estimatedValue: '判断品牌认知'
    });
    const candidate = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: theme?.id ?? '',
      question: '追光小牛是做什么的？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['doubao'],
      priority: 'medium',
      estimatedValue: '验证品牌认知'
    });

    const updated = repository.updateTestQuestionCandidate('user_demo', 'brand_demo', candidate?.id ?? '', {
      question: '追光小牛适合几岁孩子？',
      purposes: ['brand_mentioned', 'value_prop_accuracy'],
      targetPlatforms: ['doubao', 'kimi'],
      priority: 'high',
      selected: true
    });

    expect(updated).toMatchObject({
      question: '追光小牛适合几岁孩子？',
      purposes: ['brand_mentioned', 'value_prop_accuracy'],
      targetPlatforms: ['doubao', 'kimi'],
      priority: 'high',
      selected: true
    });
  });

  it('filters and paginates candidates by theme and selection', () => {
    const repository = new PermissionsRepository();
    const firstTheme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'location',
      name: '贵阳推荐分页',
      businessExplanation: '验证本地推荐',
      priority: 'high',
      estimatedValue: '判断本地推荐'
    });
    const secondTheme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'brand',
      name: '品牌认知分页',
      businessExplanation: '验证品牌认知',
      priority: 'medium',
      estimatedValue: '判断品牌认知'
    });

    const low = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: firstTheme?.id ?? '',
      question: '贵阳儿童运动馆怎么选？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['doubao'],
      priority: 'low',
      estimatedValue: '验证低优先级问题',
      selected: true
    });
    const high = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: firstTheme?.id ?? '',
      question: '贵阳哪里有儿童体能训练？',
      purposes: ['rank_first'],
      targetPlatforms: ['kimi'],
      priority: 'high',
      estimatedValue: '验证高优先级问题',
      selected: true
    });
    repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: secondTheme?.id ?? '',
      question: '追光小牛怎么样？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['deepseek'],
      priority: 'medium',
      estimatedValue: '验证品牌问题',
      selected: false
    });

    expect(repository.listTestQuestionCandidates('user_demo', 'brand_demo', { themeId: firstTheme?.id, selected: true, limit: 1 })).toEqual([high]);
    expect(repository.listTestQuestionCandidates('user_demo', 'brand_demo', { themeId: firstTheme?.id, selected: true, offset: 1, limit: 1 })).toEqual([low]);
  });

  it('bulk updates selection under a theme', () => {
    const repository = new PermissionsRepository();
    const firstTheme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'offering',
      name: '课程批量选择',
      businessExplanation: '验证课程问题批量选择',
      priority: 'high',
      estimatedValue: '判断课程问题'
    });
    const secondTheme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'competitor',
      name: '竞品批量选择',
      businessExplanation: '验证竞品问题批量选择',
      priority: 'medium',
      estimatedValue: '判断竞品问题'
    });
    const first = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: firstTheme?.id ?? '',
      question: '贵阳少儿跑酷课推荐哪家？',
      purposes: ['rank_first'],
      targetPlatforms: ['doubao'],
      priority: 'high',
      estimatedValue: '验证课程推荐',
      selected: false
    });
    const second = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: secondTheme?.id ?? '',
      question: '追光小牛和其他儿童体能品牌怎么比？',
      purposes: ['competitor_presence'],
      targetPlatforms: ['kimi'],
      priority: 'medium',
      estimatedValue: '验证竞品对比',
      selected: false
    });

    const updated = repository.updateTestQuestionCandidateSelection('user_demo', 'brand_demo', {
      themeId: firstTheme?.id,
      candidateIds: [first?.id ?? '', second?.id ?? ''],
      selected: true
    });

    expect(updated).toEqual([expect.objectContaining({ id: first?.id, selected: true })]);
    expect(repository.listTestQuestionCandidates('user_demo', 'brand_demo', { selected: true })).toContainEqual(expect.objectContaining({ id: first?.id }));
    expect(repository.listTestQuestionCandidates('user_demo', 'brand_demo', { selected: true })).not.toContainEqual(expect.objectContaining({ id: second?.id }));
  });
});
