import { afterEach, describe, expect, it } from 'vitest';
import { ManualInputAdapter } from '../src/modules/platforms/adapters/manual-input.adapter';
import { MockAdapter } from '../src/modules/platforms/adapters/mock.adapter';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('platform config repository', () => {
  const originalStepfunApiKey = process.env.STEPFUN_API_KEY;

  afterEach(() => {
    if (originalStepfunApiKey === undefined) {
      delete process.env.STEPFUN_API_KEY;
      return;
    }

    process.env.STEPFUN_API_KEY = originalStepfunApiKey;
  });

  it('preloads common AI platforms for newly created brands', () => {
    const repository = new PermissionsRepository();
    const brand = repository.createBrand('user_demo', {
      name: '追光小牛运动成长中心',
      aliases: ['追光小牛'],
      industry: '儿童运动成长',
      targetCities: ['深圳'],
      businessScope: '儿童体适能、运动成长课程',
      targetAudience: '3-12 岁儿童家庭'
    });

    const configs = repository.listPlatformConfigs('user_demo', brand.brandId);
    const platformCodes = configs?.map((config) => config.platformCode);

    expect(platformCodes).toEqual(expect.arrayContaining(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun', 'manual_input', 'mock_ai']));
    expect(configs).toContainEqual(
      expect.objectContaining({ platformCode: 'deepseek', endpointUrl: 'https://api.deepseek.com/chat/completions' })
    );
    expect(configs).toContainEqual(
      expect.objectContaining({ platformCode: 'qianwen', name: '通义千问', endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', modelName: 'qwen-plus' })
    );
    expect(configs).toContainEqual(
      expect.objectContaining({ platformCode: 'stepfun', name: '阶跃星辰', endpointUrl: 'https://api.stepfun.com/v1/chat/completions', modelName: 'step-3.7-flash' })
    );
    expect(configs).toContainEqual(
      expect.objectContaining({
        platformCode: 'doubao',
        connectionStatus: 'browser_available',
        connectionStatusLabel: '可用浏览器辅助监测',
        availableMethods: ['api', 'browser', 'manual'],
        endpointUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        modelName: 'doubao-seed-1-6',
        hasCredential: false
      })
    );
    for (const platformCode of ['doubao', 'kimi', 'deepseek', 'qianwen']) {
      const config = configs?.find((item) => item.platformCode === platformCode);

      expect(config?.availableMethods).toEqual(['api', 'browser', 'manual']);
      expect(config?.nextAction).toContain('补齐平台密钥');
      expect(config?.endpointUrl).toBeTruthy();
      expect(config?.modelName).toBeTruthy();
    }
    expect(configs).toContainEqual(
      expect.objectContaining({ platformCode: 'stepfun', connectionStatus: 'needs_configuration', connectionStatusLabel: '需要补充信息', availableMethods: ['api'], hasCredential: false })
    );
    expect(configs).toContainEqual(
      expect.objectContaining({ platformCode: 'manual_input', connectionStatus: 'manual_available', connectionStatusLabel: '可手动录入', availableMethods: ['manual'] })
    );
    expect(configs).toContainEqual(
      expect.objectContaining({ platformCode: 'mock_ai', connectionStatus: 'ready', connectionStatusLabel: '可自动监测', availableMethods: ['api'] })
    );
  });

  it('uses STEPFUN_API_KEY as the default StepFun credential reference when available', () => {
    process.env.STEPFUN_API_KEY = 'test-stepfun-env-value';
    const repository = new PermissionsRepository();
    const brand = repository.createBrand('user_demo', {
      name: '追光小牛运动成长中心',
      aliases: ['追光小牛'],
      industry: '儿童运动成长',
      targetCities: ['深圳'],
      businessScope: '儿童体适能、运动成长课程',
      targetAudience: '3-12 岁儿童家庭'
    });

    const config = repository.listPlatformConfigs('user_demo', brand.brandId)?.find((item) => item.platformCode === 'stepfun');
    const runtimeConfig = repository.getPlatformRuntimeConfig('user_demo', brand.brandId, 'stepfun');

    expect(config).toMatchObject({ hasCredential: true, credentialRefMasked: '***', connectionStatus: 'ready' });
    expect(config).not.toHaveProperty('credentialRef');
    expect(runtimeConfig?.credentialRef).toBe('STEPFUN_API_KEY');
  });

  it('creates platform configs and hides credential references from public responses', () => {
    const repository = new PermissionsRepository();
    const config = repository.createPlatformConfig('user_demo', 'brand_demo', {
      platformCode: 'deepseek_test',
      name: 'DeepSeek 测试',
      mode: 'api',
      endpointUrl: 'https://api.deepseek.com/chat/completions',
      modelName: 'deepseek-chat',
      rateLimitPerMinute: 30,
      credentialRef: 'secret-token-ref'
    });

    expect(config?.brandId).toBe('brand_demo');
    expect(config?.platformCode).toBe('deepseek_test');
    expect(config?.name).toBe('DeepSeek 测试');
    expect(config?.endpointUrl).toBe('https://api.deepseek.com/chat/completions');
    expect(config).not.toHaveProperty('platformKey');
    expect(config?.hasCredential).toBe(true);
    expect(config?.credentialRefMasked).toBe('***');
    expect(config?.connectionStatus).toBe('ready');
    expect(config?.connectionStatusLabel).toBe('可自动监测');
    expect(config?.availableMethods).toEqual(['api']);
    expect(config).not.toHaveProperty('credentialRef');

    const runtimeConfig = repository.getPlatformRuntimeConfigById('user_demo', 'brand_demo', config?.id ?? '');
    expect(runtimeConfig?.credentialRef).toBe('secret-token-ref');
  });

  it('validates api configs by requiring a credential reference', () => {
    const repository = new PermissionsRepository();
    const config = repository.createPlatformConfig('user_demo', 'brand_child_fitness', {
      platformCode: 'api_without_credential',
      name: '未配置凭据 API',
      mode: 'api',
      endpointUrl: 'https://api.deepseek.com/chat/completions',
      modelName: 'deepseek-chat'
    });
    const validation = repository.validatePlatformConfig('user_demo', 'brand_child_fitness', config?.id ?? '');

    expect(validation?.ok).toBe(false);
    expect(validation?.message).toBe('请先填写平台密钥');
    expect(repository.listPlatformConfigs('user_demo', 'brand_child_fitness')).toContainEqual(
      expect.objectContaining({ platformCode: 'api_without_credential', connectionStatus: 'needs_configuration', nextAction: '请先填写平台密钥' })
    );
  });

  it('validates api configs by requiring endpoint and model fields', () => {
    const repository = new PermissionsRepository();
    const missingEndpoint = repository.createPlatformConfig('user_demo', 'brand_child_fitness', {
      platformCode: 'api_without_endpoint',
      name: '未配置接口 API',
      mode: 'api',
      modelName: 'deepseek-chat',
      credentialRef: 'secret-token-ref'
    });
    const missingModel = repository.createPlatformConfig('user_demo', 'brand_child_fitness', {
      platformCode: 'api_without_model',
      name: '未配置模型 API',
      mode: 'api',
      endpointUrl: 'https://api.deepseek.com/chat/completions',
      credentialRef: 'secret-token-ref'
    });

    expect(repository.validatePlatformConfig('user_demo', 'brand_child_fitness', missingEndpoint?.id ?? '')?.message).toBe('请先填写平台接口地址');
    expect(repository.validatePlatformConfig('user_demo', 'brand_child_fitness', missingModel?.id ?? '')?.message).toBe('请先填写模型名称');
  });

  it('validates browser-assisted platform configs with user-facing wording', () => {
    const repository = new PermissionsRepository();
    const config = repository.listPlatformConfigs('user_demo', 'brand_demo')?.find((item) => item.platformCode === 'deepseek');
    const validation = repository.validatePlatformConfig('user_demo', 'brand_demo', config?.id ?? '');

    expect(validation).toEqual(
      expect.objectContaining({
        ok: true,
        mode: 'semi_auto',
        message: '当前平台已设置为浏览器辅助监测，请通过打开浏览器完成登录和监测。'
      })
    );
  });

  it('keeps platform configs isolated by brand access', () => {
    const repository = new PermissionsRepository();

    expect(repository.listPlatformConfigs('other_user', 'brand_demo')).toBeNull();
    expect(repository.createPlatformConfig('other_user', 'brand_demo', {
      platformCode: 'unauthorized_platform',
      name: '未授权平台',
      mode: 'mock'
    })).toBeNull();
  });
});

describe('platform adapters', () => {
  it('returns deterministic mock responses', async () => {
    const adapter = new MockAdapter();
    const result = await adapter.runPrompt({
      brandId: 'brand_demo',
      platformCode: 'mock_ai',
      promptText: '请评价示例品牌'
    });

    expect(result.rawText).toContain('演示回答');
    expect(result.modelName).toBe('mock-v1');
  });

  it('marks manual prompt runs as waiting for manual input', async () => {
    const adapter = new ManualInputAdapter();
    const result = await adapter.runPrompt({
      brandId: 'brand_demo',
      platformCode: 'manual_input',
      promptText: '请人工补充回答'
    });

    expect(result.rawText).toContain('等待手动录入');
    expect(result.modelName).toBe('manual');
  });
});
