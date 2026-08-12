import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function preparePublishingScenario(repository: PermissionsRepository) {
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `发布测试单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    targetKeywords: ['发布中心', '账号接入'],
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '管理内容发布账号',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `发布模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请说明{brandName}如何支持{intent}。',
    targetKeywords: ['发布中心'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });
  const strategy = repository.createContentStrategy('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    intentId: intent?.id ?? '',
    type: 'enhancement',
    priority: 'medium',
    suggestedTitle: '发布中心内容生成稿',
    targetPlatform: 'wechat',
    targetKeywords: ['发布中心', '账号接入'],
    relatedPromptIds: [prompts?.[0].id ?? '']
  });
  const workspace = repository.createContentGenerationTask('user_demo', 'brand_demo', {
    strategyId: strategy?.id ?? '',
    targetPlatform: 'wechat',
    contentType: 'wechat_article'
  });

  return {
    taskId: workspace?.currentTask?.id ?? '',
    versionId: workspace?.currentVersion?.id ?? '',
    publishPayload: workspace?.publishPayload
  };
}

describe('publishing repository', () => {
  it('includes website accounts in publishing platform aggregation', () => {
    const repository = new PermissionsRepository();
    const dashboard = repository.getPublishingDashboard('user_demo', 'brand_demo');

    expect(dashboard?.platforms).toContainEqual(expect.objectContaining({
      platform: 'website',
      name: '官网',
      loginMode: 'manual',
      accountCount: 1,
      hasAuthError: false
    }));
  });

  it('tracks account auth errors and supports reauthorization', () => {
    const repository = new PermissionsRepository();
    const account = repository.connectPublishingAccount('user_demo', 'brand_demo', {
      platform: 'wechat',
      accountName: '示例公众号',
      loginMode: 'oauth',
      authStatus: 'error',
      errorMessage: '授权 token 已失效'
    });
    const dashboardWithError = repository.getPublishingDashboard('user_demo', 'brand_demo');

    expect(account).toMatchObject({
      platform: 'wechat',
      accountName: '示例公众号',
      authStatus: 'error',
      errorMessage: '授权 token 已失效'
    });
    expect(dashboardWithError?.platforms.find((platform) => platform.platform === 'wechat')?.hasAuthError).toBe(true);
    const reauthorized = repository.reauthorizePublishingAccount('user_demo', 'brand_demo', account?.id ?? '');

    expect(reauthorized).toMatchObject({
      authStatus: 'connected',
      errorMessage: undefined
    });
  });

  it('updates the direct publishing mode for an existing authorized account', () => {
    const repository = new PermissionsRepository();
    const account = repository.connectPublishingAccount('user_demo', 'brand_demo', {
      platform: 'website',
      accountName: '品牌官网',
      publishingMode: 'manual'
    });

    const updated = repository.updatePublishingAccountMode('user_demo', 'brand_demo', account?.id ?? '', {
      publishingMode: 'automatic'
    });
    const record = repository.createPublishingRecord('user_demo', 'brand_demo', {
      accountId: account?.id,
      title: '自动发布内容',
      body: '正文',
      targetPlatform: 'website'
    });

    expect(updated?.publishingMode).toBe('automatic');
    expect(record?.publishingMode).toBe('automatic');
  });

  it('creates publishing records linked to content task, version, account and generated asset', () => {
    const repository = new PermissionsRepository();
    const { taskId, versionId, publishPayload } = preparePublishingScenario(repository);
    const account = repository.connectPublishingAccount('user_demo', 'brand_demo', {
      platform: 'wechat',
      accountName: '品牌公众号'
    });
    const record = repository.createPublishingRecord('user_demo', 'brand_demo', {
      ...publishPayload,
      accountId: account?.id,
      confirmation: {
        publishingMode: 'manual',
        materialRequirementsConfirmed: true,
        retestPlanAt: '2026-07-25T09:00:00.000Z'
      },
      status: 'pending'
    });

    expect(record).toMatchObject({
      brandId: 'brand_demo',
      accountId: account?.id,
      accountName: '品牌公众号',
      generationTaskId: taskId,
      versionId,
      contentVersion: versionId,
      materialRequirementsConfirmed: true,
      retestPlanAt: '2026-07-25T09:00:00.000Z',
      confirmedAt: expect.any(String),
      platform: 'wechat',
      status: 'pending'
    });
    expect(record?.contentAssetId).toBeTruthy();
    const published = repository.updatePublishingRecordStatus('user_demo', 'brand_demo', record?.id ?? '', {
      status: 'published',
      publishedUrl: 'https://example.com/published/article'
    });
    const dashboard = repository.getPublishingDashboard('user_demo', 'brand_demo');

    expect(published).toMatchObject({
      status: 'published',
      publishedUrl: 'https://example.com/published/article'
    });
    expect(published?.publishedAt).toBeTruthy();
    expect(dashboard?.records.map((item) => item.id)).toContain(record?.id);
  });
});
