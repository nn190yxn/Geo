import { describe, expect, it, vi } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PlatformsController } from '../src/modules/platforms/platforms.controller';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P6: page aggregation records preserve brand ownership ${validatesCriteria(['B1'])}`, () => {
  it('keeps every generated business record in its authorized brand workspace', () => {
    const repository = new PermissionsRepository();
    const brandId = 'brand_demo';

    for (const suffix of ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']) {
      const platform = `platform_${suffix}`;
      const mediaAsset = repository.createBrandMediaAsset('user_demo', brandId, {
        title: `品牌素材 ${suffix}`,
        assetType: 'image',
        applicablePlatforms: [platform],
        contentUsage: '品牌介绍',
        source: '品牌团队'
      });
      const contentAsset = repository.createContentAsset('user_demo', brandId, {
        title: `内容资产 ${suffix}`,
        type: 'website_faq',
        platform,
        url: `https://example.com/${suffix}`,
        userIntent: `了解品牌 ${suffix}`
      });
      const account = repository.connectPublishingAccount('user_demo', brandId, {
        platform,
        accountName: `公众号 ${suffix}`
      });
      const rule = repository.createMediaPlatformRule('user_demo', brandId, {
        platform,
        name: `公众号规则 ${suffix}`,
        contentFormats: ['article'],
        intentFit: '品牌认知',
        recommendedFrequency: '每周一次',
        coverRatio: '2.35:1',
        publishingNote: '发布前复核引用'
      });
      const finding = repository.createAnalysisFinding('user_demo', brandId, {
        type: 'fact',
        title: `事实待核验 ${suffix}`,
        evidence: ['缺少可信来源'],
        severity: 'medium',
        recommendedActions: []
      });

      for (const record of [mediaAsset, contentAsset, account, rule, finding]) {
        expect(record, `${suffix} record should be created`).not.toBeNull();
        expect(record?.brandId, `${suffix} record should retain brand ownership`).toBe(brandId);
      }

      expect(repository.listBrandMediaAssets('user_suspended', brandId)).toBeNull();
      expect(repository.listContentAssetPageItems('user_suspended', brandId)).toBeNull();
      expect(repository.listOwnedMediaAccounts('user_suspended', brandId)).toBeNull();
      expect(repository.listMediaPlatformRules('user_suspended', brandId)).toBeNull();
      expect(repository.listAnalysisFindings('user_suspended', brandId)).toBeNull();
    }
  });

  it('rejects cross-brand updates for every mutable aggregation record', () => {
    const repository = new PermissionsRepository();
    const sourceBrandId = 'brand_demo';
    const targetBrand = repository.createBrand('user_demo', {
      name: '目标品牌',
      industry: '企业服务',
      businessScope: '品牌运营',
      targetAudience: '运营人员'
    });
    const mediaAsset = repository.createBrandMediaAsset('user_demo', sourceBrandId, {
      title: '来源品牌素材',
      assetType: 'image',
      applicablePlatforms: ['website'],
      contentUsage: '品牌介绍',
      source: '品牌团队'
    });
    const rule = repository.createMediaPlatformRule('user_demo', sourceBrandId, {
      platform: 'wechat_official',
      name: '公众号规则',
      contentFormats: ['article'],
      intentFit: '品牌认知',
      recommendedFrequency: '每周一次',
      coverRatio: '2.35:1',
      publishingNote: '发布前复核引用'
    });
    const finding = repository.createAnalysisFinding('user_demo', sourceBrandId, {
      type: 'citation',
      title: '引用待补充',
      evidence: [],
      severity: 'high',
      recommendedActions: []
    });

    expect(repository.updateBrandMediaAsset('user_demo', targetBrand.brandId, mediaAsset?.id ?? '', { title: '越权素材' })).toBeNull();
    expect(repository.updateMediaPlatformRule('user_demo', targetBrand.brandId, rule?.platform ?? '', { name: '越权规则' })).toBeNull();
    expect(repository.updateAnalysisFinding('user_demo', targetBrand.brandId, finding?.id ?? '', { title: '越权 finding' })).toBeNull();
  });
});

describe(`Property P7: public platform responses remove runtime credentials ${validatesCriteria(['11.3'])}`, () => {
  it('sanitizes every sensitive field variant at the controller boundary', async () => {
    const sensitiveFields = [
      'apiKey',
      'API_KEY',
      'credentialRef',
      'credential_reference',
      'cookies',
      'storageState',
      'storage_state_path',
      'browserProfilePath',
      'browser_profile_dir',
      'authorizationHeader',
      'clientSecret',
      'accessToken',
      'refresh_token',
      'providerPayload',
      'password'
    ] as const;
    const privateMarkers = sensitiveFields.map((field, index) => `private-value-${index}-${field}`);
    const runtimeFields = Object.fromEntries(sensitiveFields.map((field, index) => [field, privateMarkers[index]]));
    const permissionsService = {
      listPlatformConfigs: vi.fn().mockResolvedValue([
        {
          id: 'platform-1',
          brandId: 'brand-a',
          platformCode: 'doubao',
          hasCredential: true,
          credentialRefMasked: '***',
          connectionStatus: 'ready',
          ...runtimeFields,
          runtime: { ...runtimeFields },
          sessions: [{ ...runtimeFields, status: 'connected' }]
        }
      ])
    };
    const controller = new PlatformsController(permissionsService as never, {} as never);

    const response = await controller.listPlatformConfigs({ context: { userId: 'user-a', brandId: 'brand-a' } } as never);
    const serialized = JSON.stringify(response);

    for (const marker of privateMarkers) {
      expect(serialized, `${marker} should be removed`).not.toContain(marker);
    }
    expect(response).toMatchObject({
      success: true,
      data: [{ brandId: 'brand-a', hasCredential: true, credentialRefMasked: '***', connectionStatus: 'ready', runtime: {}, sessions: [{ status: 'connected' }] }]
    });
  });
});
