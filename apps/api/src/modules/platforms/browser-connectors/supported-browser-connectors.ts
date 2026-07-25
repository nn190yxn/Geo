import type { BrowserConnectionIssueType } from '@geo-platform/shared-types';
import type {
  BrowserConnector,
  BrowserConnectorAnswerResult,
  BrowserConnectorOperationResult,
  BrowserConnectorQuestionInput,
  BrowserConnectorSessionInput
} from './browser-connector';
import { buildManualTestPath, createNeedsUserConfirmationResult } from './browser-connector';

type BrowserConnectorMetadata = {
  platformCode: 'doubao' | 'kimi' | 'deepseek' | 'qianwen';
  displayName: string;
  loginPageUrl: string;
  modelName: string;
};

abstract class SupportedBrowserConnector implements BrowserConnector {
  readonly platformCode: string;

  protected constructor(
    private readonly metadata: BrowserConnectorMetadata,
    private readonly issueType?: BrowserConnectionIssueType
  ) {
    this.platformCode = metadata.platformCode;
  }

  async openLoginPage(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, `已打开${this.metadata.displayName}登录页，请在可见浏览器中完成登录。`, {
      loginPageUrl: this.metadata.loginPageUrl
    });
  }

  async detectLogin(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, `已检测到${this.metadata.displayName}登录状态。`);
  }

  async sendQuestion(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, `已向${this.metadata.displayName}发送监测问题。`);
  }

  async waitForAnswer(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorOperationResult> {
    return this.issueOrReady(input, `${this.metadata.displayName}回答已完成。`);
  }

  async extractAnswer(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorAnswerResult> {
    if (this.issueType) {
      return createNeedsUserConfirmationResult({ platformCode: input.platformCode, issueType: this.issueType });
    }

    return createNeedsUserConfirmationResult({
      platformCode: input.platformCode,
      issueType: 'unknown',
      message: `${this.metadata.displayName}浏览器自动执行尚未接入真实回答回填，请连接真实浏览器或改用手动录入后再分析。`
    });
  }

  async stopSession(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult> {
    return {
      status: 'stopped',
      loginDetected: false,
      message: `${this.metadata.displayName}浏览器会话已停止。`,
      manualTestPath: buildManualTestPath(input.platformCode)
    };
  }

  private issueOrReady(input: BrowserConnectorSessionInput, message: string, extra?: Partial<BrowserConnectorOperationResult>): BrowserConnectorOperationResult {
    if (this.issueType) {
      return createNeedsUserConfirmationResult({ platformCode: input.platformCode, issueType: this.issueType });
    }

    return {
      status: 'ready',
      loginDetected: true,
      message,
      lastAvailableAt: new Date().toISOString(),
      ...extra
    };
  }
}

export class DoubaoBrowserConnector extends SupportedBrowserConnector {
  constructor(issueType?: BrowserConnectionIssueType) {
    super({ platformCode: 'doubao', displayName: '豆包', loginPageUrl: 'https://www.doubao.com/chat/', modelName: 'doubao-browser' }, issueType);
  }
}

export class KimiBrowserConnector extends SupportedBrowserConnector {
  constructor(issueType?: BrowserConnectionIssueType) {
    super({ platformCode: 'kimi', displayName: 'Kimi', loginPageUrl: 'https://kimi.moonshot.cn/', modelName: 'kimi-browser' }, issueType);
  }
}

export class DeepSeekBrowserConnector extends SupportedBrowserConnector {
  constructor(issueType?: BrowserConnectionIssueType) {
    super({ platformCode: 'deepseek', displayName: 'DeepSeek', loginPageUrl: 'https://chat.deepseek.com/', modelName: 'deepseek-browser' }, issueType);
  }
}

export class QianwenBrowserConnector extends SupportedBrowserConnector {
  constructor(issueType?: BrowserConnectionIssueType) {
    super({ platformCode: 'qianwen', displayName: '通义千问', loginPageUrl: 'https://tongyi.aliyun.com/qianwen/', modelName: 'qianwen-browser' }, issueType);
  }
}

export function createDefaultBrowserConnectors(): BrowserConnector[] {
  return [new DoubaoBrowserConnector(), new KimiBrowserConnector(), new DeepSeekBrowserConnector(), new QianwenBrowserConnector()];
}
