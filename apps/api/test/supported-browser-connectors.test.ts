import { describe, expect, it } from 'vitest';
import { BrowserConnectorRegistry, BrowserConnectorSelectionError, createDefaultBrowserConnectors } from '../src/modules/platforms/browser-connectors/browser-connector.registry';
import {
  DeepSeekBrowserConnector,
  DoubaoBrowserConnector,
  KimiBrowserConnector,
  QianwenBrowserConnector
} from '../src/modules/platforms/browser-connectors/supported-browser-connectors';

const sessionInput = { brandId: 'brand_demo', platformCode: 'doubao', sessionId: 'browser_session_demo', testPlanId: 'plan_demo' };

describe('supported browser connectors', () => {
  it('registers the first-version browser platforms', () => {
    const registry = new BrowserConnectorRegistry(createDefaultBrowserConnectors());

    expect(registry.listConnectors().map((connector) => connector.platformCode)).toEqual(['doubao', 'kimi', 'deepseek', 'qianwen']);
    expect(registry.selectConnector('doubao')).toBeInstanceOf(DoubaoBrowserConnector);
    expect(registry.selectConnector('kimi')).toBeInstanceOf(KimiBrowserConnector);
    expect(registry.selectConnector('deepseek')).toBeInstanceOf(DeepSeekBrowserConnector);
    expect(registry.selectConnector('qianwen')).toBeInstanceOf(QianwenBrowserConnector);
    expect(() => registry.requireConnector('unknown')).toThrow(BrowserConnectorSelectionError);
  });

  it('supports login and question sending without fabricating extracted answers', async () => {
    const connectors = createDefaultBrowserConnectors();

    for (const connector of connectors) {
      const input = { ...sessionInput, platformCode: connector.platformCode };
      const questionInput = { ...input, question: '贵阳哪里有适合 3-5 岁孩子的体能馆？', promptId: 'prompt_demo' };

      await expect(connector.openLoginPage(input)).resolves.toMatchObject({ status: 'ready', loginDetected: true, loginPageUrl: expect.stringMatching(/^https:\/\//) });
      await expect(connector.detectLogin(input)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
      await expect(connector.sendQuestion(questionInput)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
      await expect(connector.waitForAnswer(questionInput)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
      await expect(connector.extractAnswer(questionInput)).resolves.toMatchObject({
        status: 'needs_confirmation',
        loginDetected: false,
        message: expect.stringContaining('尚未接入真实回答回填'),
        manualTestPath: `/monitoring?platform=${connector.platformCode}&mode=manual`
      });
      await expect(connector.stopSession(input)).resolves.toMatchObject({ status: 'stopped', manualTestPath: `/monitoring?platform=${connector.platformCode}&mode=manual` });
    }
  });

  it('stops automation and returns manual path when a platform blocks browser testing', async () => {
    await expect(new DoubaoBrowserConnector('captcha').sendQuestion({ ...sessionInput, question: '追光小牛适合多大孩子？' })).resolves.toMatchObject({
      status: 'needs_confirmation',
      issueType: 'captcha',
      manualTestPath: '/monitoring?platform=doubao&mode=manual'
    });

    await expect(new KimiBrowserConnector('risk_control').extractAnswer({ ...sessionInput, platformCode: 'kimi', question: '追光小牛适合多大孩子？' })).resolves.toMatchObject({
      status: 'needs_confirmation',
      issueType: 'risk_control',
      manualTestPath: '/monitoring?platform=kimi&mode=manual'
    });

    await expect(new DeepSeekBrowserConnector('platform_limit').waitForAnswer({ ...sessionInput, platformCode: 'deepseek', question: '追光小牛适合多大孩子？' })).resolves.toMatchObject({
      status: 'needs_confirmation',
      issueType: 'platform_limit',
      manualTestPath: '/monitoring?platform=deepseek&mode=manual'
    });

    await expect(new QianwenBrowserConnector('page_changed').detectLogin({ ...sessionInput, platformCode: 'qianwen' })).resolves.toMatchObject({
      status: 'needs_confirmation',
      issueType: 'page_changed',
      manualTestPath: '/monitoring?platform=qianwen&mode=manual'
    });
  });
});
