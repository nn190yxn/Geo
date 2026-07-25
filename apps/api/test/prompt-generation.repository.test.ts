import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('prompt generation repository', () => {
  it('generates brand prompts that include the brand name or aliases', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_child_fitness', {
      name: '深圳儿童体适能机构',
      type: 'location',
      targetKeywords: ['深圳儿童体适能'],
      priority: 'high'
    });
    const intent = repository.createUserIntent('user_demo', 'brand_child_fitness', {
      optimizationUnitId: unit?.id ?? '',
      category: 'local_decision',
      text: '为 6 岁孩子选择运动训练机构',
      monitoringFrequency: 'weekly'
    });
    const template = repository.createPromptTemplate({
      name: '本地机构推荐',
      category: 'local_decision',
      text: '请推荐{city}适合{intent}的机构，并说明选择理由。',
      targetKeywords: ['机构推荐'],
      platformCodes: ['doubao'],
      frequency: 'weekly'
    });

    const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_child_fitness', {
      templateId: template.id,
      intentIds: [intent?.id ?? '']
    });

    expect(prompts).toHaveLength(1);
    expect(prompts?.[0].text).toMatch(/儿童体适能品牌|儿童运动成长品牌/);
    expect(prompts?.[0].brandId).toBe('brand_child_fitness');
    expect(prompts?.[0].intentId).toBe(intent?.id);
  });

  it('updates brand prompt status and keeps generated prompts linked to intent and optimization unit', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: '品牌推荐',
      type: 'brand',
      priority: 'medium'
    });
    const intent = repository.createUserIntent('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      category: 'category_recommendation',
      text: '选择 GEO 管理工具',
      monitoringFrequency: 'manual'
    });
    const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
      templateId: 'template_brand_recommendation',
      intentIds: [intent?.id ?? '']
    });
    const updated = repository.updateBrandPrompt('user_demo', 'brand_demo', prompts?.[0].id ?? '', {
      enabled: false
    });

    expect(updated?.enabled).toBe(false);
    expect(updated?.optimizationUnitId).toBe(unit?.id);
    expect(updated?.intentId).toBe(intent?.id);
  });

  it('keeps intents and prompts isolated by brand access', () => {
    const repository = new PermissionsRepository();

    expect(repository.createUserIntent('other_user', 'brand_demo', {
      optimizationUnitId: 'unit_missing',
      category: 'brand_awareness',
      text: '未授权意图',
      monitoringFrequency: 'weekly'
    })).toBeNull();

    expect(repository.batchGenerateBrandPrompts('other_user', 'brand_demo', {
      templateId: 'template_brand_recommendation'
    })).toBeNull();
  });
});
