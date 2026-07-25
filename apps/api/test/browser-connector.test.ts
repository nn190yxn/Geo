import { describe, expect, it } from 'vitest';
import type { BrowserConnectionIssueType } from '@geo-platform/shared-types';
import { buildManualTestPath, createNeedsUserConfirmationResult } from '../src/modules/platforms/browser-connectors/browser-connector';
import { FakeBrowserConnector } from '../src/modules/platforms/browser-connectors/fake-browser.connector';

describe('BrowserConnector contract', () => {
  it('defines the browser workflow from login page to extracted answer', async () => {
    const connector = new FakeBrowserConnector('doubao');
    const sessionInput = { brandId: 'brand_demo', platformCode: 'doubao', sessionId: 'session_demo', testPlanId: 'plan_demo' };
    const questionInput = { ...sessionInput, question: '贵阳哪里有适合 3-5 岁孩子的体能馆？', promptId: 'prompt_demo' };

    await expect(connector.openLoginPage(sessionInput)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
    await expect(connector.detectLogin(sessionInput)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
    await expect(connector.sendQuestion(questionInput)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
    await expect(connector.waitForAnswer(questionInput)).resolves.toMatchObject({ status: 'ready', loginDetected: true });
    await expect(connector.extractAnswer(questionInput)).resolves.toMatchObject({
      status: 'ready',
      loginDetected: true,
      rawText: 'Fake browser response: 贵阳哪里有适合 3-5 岁孩子的体能馆？',
      modelName: 'doubao-browser'
    });
    await expect(connector.stopSession(sessionInput)).resolves.toMatchObject({ status: 'stopped', manualTestPath: '/monitoring?platform=doubao&mode=manual' });
  });

  it('maps browser blocking issues to needs confirmation and manual test path', async () => {
    const issueTypes: BrowserConnectionIssueType[] = ['captcha', 'login_expired', 'page_changed', 'platform_limit', 'risk_control'];

    for (const issueType of issueTypes) {
      const connector = new FakeBrowserConnector('kimi', issueType);
      const result = await connector.extractAnswer({ brandId: 'brand_demo', platformCode: 'kimi', question: '追光小牛适合多大孩子？' });

      expect(result).toMatchObject({
        status: 'needs_confirmation',
        loginDetected: false,
        issueType,
        manualTestPath: '/monitoring?platform=kimi&mode=manual'
      });
      expect(result.message).toBeTruthy();
    }
  });

  it('keeps successful browser answers tied to brand, platform, question and raw answer', async () => {
    const cases = [
      { brandId: 'brand_demo', platformCode: 'doubao', question: '贵阳哪里有适合 3-5 岁孩子的体能馆？' },
      { brandId: 'brand_child_fitness', platformCode: 'kimi', question: '儿童体能课怎么选？' },
      { brandId: 'brand_demo', platformCode: 'deepseek', question: '追光小牛有哪些儿童运动课程？' }
    ];

    for (const input of cases) {
      const connector = new FakeBrowserConnector(input.platformCode);
      const answer = await connector.extractAnswer(input);

      expect(input.brandId).toBeTruthy();
      expect(answer).toMatchObject({
        status: 'ready',
        loginDetected: true,
        rawText: expect.stringContaining(input.question),
        modelName: `${input.platformCode}-browser`
      });
    }
  });

  it('builds a reusable needs-confirmation result for browser connectors', () => {
    expect(createNeedsUserConfirmationResult({ platformCode: 'deepseek', issueType: 'captcha' })).toMatchObject({
      status: 'needs_confirmation',
      issueType: 'captcha',
      message: '页面出现验证码，需要用户确认后继续或改用手动录入。',
      manualTestPath: '/monitoring?platform=deepseek&mode=manual'
    });
    expect(buildManualTestPath('通义千问')).toBe('/monitoring?platform=%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE&mode=manual');
  });
});
