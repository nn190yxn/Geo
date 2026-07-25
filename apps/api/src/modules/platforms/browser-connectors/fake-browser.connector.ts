import type { BrowserConnectionIssueType } from '@geo-platform/shared-types';
import type {
  BrowserConnector,
  BrowserConnectorAnswerResult,
  BrowserConnectorOperationResult,
  BrowserConnectorQuestionInput,
  BrowserConnectorSessionInput
} from './browser-connector';
import {
  createNeedsUserConfirmationResult
} from './browser-connector';

export class FakeBrowserConnector implements BrowserConnector {
  constructor(
    readonly platformCode: string,
    private readonly issueType?: BrowserConnectionIssueType
  ) {}

  async openLoginPage(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, '已打开登录页，请在可见浏览器中完成登录。');
  }

  async detectLogin(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, '已检测到平台登录状态。');
  }

  async sendQuestion(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, '监测问题已发送，正在等待回答。');
  }

  async waitForAnswer(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, '平台回答已完成。');
  }

  async extractAnswer(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorAnswerResult> {
    if (this.issueType) {
      return createNeedsUserConfirmationResult({ platformCode: input.platformCode, issueType: this.issueType });
    }

    return {
      status: 'ready',
      loginDetected: true,
      message: '已读取平台回答。',
      rawText: `Fake browser response: ${input.question}`,
      modelName: `${this.platformCode}-browser`,
      respondedAt: new Date().toISOString(),
      lastAvailableAt: new Date().toISOString()
    };
  }

  async stopSession(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult> {
    return {
      status: 'stopped',
      loginDetected: false,
      message: `${input.platformCode} 浏览器会话已停止。`,
      manualTestPath: `/monitoring?platform=${encodeURIComponent(input.platformCode)}&mode=manual`
    };
  }

  private issueOrReady(input: BrowserConnectorSessionInput, message: string): BrowserConnectorOperationResult {
    if (this.issueType) {
      return createNeedsUserConfirmationResult({ platformCode: input.platformCode, issueType: this.issueType });
    }

    return {
      status: 'ready',
      loginDetected: true,
      message,
      lastAvailableAt: new Date().toISOString()
    };
  }
}
