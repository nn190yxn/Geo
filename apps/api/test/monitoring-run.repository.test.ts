import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createPromptForPlatforms(repository: PermissionsRepository, platformCodes: string[]) {
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `监测对象 ${platformCodes.join('-')}`,
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
    name: `监测模板 ${platformCodes.join('-')}`,
    category: 'category_recommendation',
    text: '请评价{brandName}在{intent}场景下的适配度。',
    platformCodes,
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });

  return prompts?.[0];
}

describe('monitoring run repository', () => {
  it('creates completed monitoring runs with mock responses linked to the run and brand', () => {
    const repository = new PermissionsRepository();
    const prompt = createPromptForPlatforms(repository, ['mock_ai']);

    const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
      promptId: prompt?.id ?? '',
      platformCode: 'mock_ai'
    });

    expect(run?.status).toBe('completed');
    expect(run).not.toHaveProperty('run');
    expect(run?.brandId).toBe('brand_demo');
    expect(run?.promptId).toBe(prompt?.id);
    expect(run?.response?.runId).toBe(run?.id);
    expect(run?.response?.brandId).toBe(run?.brandId);
    expect(run?.response?.rawText).toContain('演示回答');
    expect(run).toMatchObject({
      modelName: 'mock-v1',
      collectionMethod: 'mock',
      searchEnabled: null,
      market: 'unknown',
      language: 'unknown',
      evidenceLevel: 'demo',
      manualConfirmed: null,
      baselineVersion: expect.stringMatching(/^baseline-/)
    });
    expect(run?.response).toMatchObject({
      platformCode: 'mock_ai',
      modelName: 'mock-v1',
      collectionMethod: 'mock',
      evidenceLevel: 'demo'
    });
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'succeeded')).toContainEqual(
      expect.objectContaining({ jobType: 'monitoring', entityId: run?.id })
    );
  });

  it('keeps manual monitoring runs reviewable until a manual response is recorded', () => {
    const repository = new PermissionsRepository();
    const prompt = createPromptForPlatforms(repository, ['manual_input']);
    const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
      promptId: prompt?.id ?? '',
      platformCode: 'manual_input',
      searchEnabled: false,
      market: 'CN-GZ',
      language: 'zh-CN',
      baselineVersion: 'baseline-2026-08'
    });

    expect(run?.status).toBe('review_required');
    expect(run?.response).toBeUndefined();
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'succeeded')).toContainEqual(
      expect.objectContaining({ jobType: 'monitoring', entityId: run?.id })
    );

    const completedRun = repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
      rawText: '示例品牌适合需要多品牌 GEO 管理的运营团队。',
      citations: ['https://example.com'],
      modelName: 'manual-model',
      collectionMethod: 'manual',
      searchEnabled: true,
      market: 'CN-SH',
      language: 'zh-CN',
      evidenceLevel: 'manual_or_browser',
      manualConfirmed: true
    });

    expect(completedRun?.status).toBe('completed');
    expect(completedRun?.response?.runId).toBe(run?.id);
    expect(completedRun?.response?.citations).toEqual(['https://example.com']);
    expect(run).toMatchObject({
      collectionMethod: 'manual',
      searchEnabled: false,
      market: 'CN-GZ',
      language: 'zh-CN',
      baselineVersion: 'baseline-2026-08'
    });
    expect(completedRun?.response).toMatchObject({
      platformCode: 'manual_input',
      modelName: 'manual-model',
      collectionMethod: 'manual',
      searchEnabled: true,
      market: 'CN-SH',
      language: 'zh-CN',
      evidenceLevel: 'manual_or_browser',
      manualConfirmed: true,
      baselineVersion: expect.stringMatching(/^baseline-/)
    });
    expect(completedRun?.response?.baselineVersion).not.toBe(run?.baselineVersion);
  });

  it('records api adapter failures with prompt and retry metadata', () => {
    const repository = new PermissionsRepository();
    const platform = repository.createPlatformConfig('user_demo', 'brand_demo', {
      platformCode: 'api_platform_test',
      name: 'API 平台监测',
      mode: 'api',
      modelName: 'api-model',
      credentialRef: 'secret-ref'
    });
    const prompt = createPromptForPlatforms(repository, ['api_platform_test']);
    const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
      promptId: prompt?.id ?? '',
      platformCode: platform?.platformCode ?? ''
    });

    expect(run?.status).toBe('failed');
    expect(run?.promptId).toBe(prompt?.id);
    expect(run?.errorMessage).toContain('自动监测暂未接入');
    expect(run?.retryStatus).toBe('retry_pending');
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'failed')).toContainEqual(
      expect.objectContaining({ jobType: 'monitoring', entityId: run?.id, lastErrorCode: 'adapter_not_ready' })
    );
  });

  it('keeps monitoring runs isolated by brand access', () => {
    const repository = new PermissionsRepository();
    const prompt = createPromptForPlatforms(repository, ['mock_ai']);

    expect(repository.createMonitoringRun('other_user', 'brand_demo', {
      promptId: prompt?.id ?? '',
      platformCode: 'mock_ai'
    })).toBeNull();
    expect(repository.listMonitoringRuns('other_user', 'brand_demo')).toBeNull();
  });
});
