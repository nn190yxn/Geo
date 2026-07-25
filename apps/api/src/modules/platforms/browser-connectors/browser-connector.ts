import type { BrandId, BrowserConnectionIssueType, BrowserConnectionStatus, RunPromptResult } from '@geo-platform/shared-types';

export type BrowserConnectorSessionInput = {
  brandId: BrandId;
  platformCode: string;
  sessionId?: string;
  testPlanId?: string;
};

export type BrowserConnectorQuestionInput = BrowserConnectorSessionInput & {
  question: string;
  promptId?: string;
};

export type BrowserConnectorOperationResult = {
  status: BrowserConnectionStatus;
  loginDetected: boolean;
  issueType?: BrowserConnectionIssueType;
  message: string;
  loginPageUrl?: string;
  manualTestPath?: string;
  lastAvailableAt?: string;
};

export type BrowserConnectorAnswerResult = BrowserConnectorOperationResult & Partial<RunPromptResult>;

export interface BrowserConnector {
  platformCode: string;
  openLoginPage(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult>;
  detectLogin(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult>;
  sendQuestion(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorOperationResult>;
  waitForAnswer(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorOperationResult>;
  extractAnswer(input: BrowserConnectorQuestionInput): Promise<BrowserConnectorAnswerResult>;
  stopSession(input: BrowserConnectorSessionInput): Promise<BrowserConnectorOperationResult>;
}

export function createNeedsUserConfirmationResult(input: {
  platformCode: string;
  issueType: BrowserConnectionIssueType;
  message?: string;
}): BrowserConnectorOperationResult {
  return {
    status: 'needs_confirmation',
    loginDetected: false,
    issueType: input.issueType,
    message: input.message ?? browserIssueMessages[input.issueType],
    manualTestPath: buildManualTestPath(input.platformCode)
  };
}

export function buildManualTestPath(platformCode: string): string {
  return `/monitoring?platform=${encodeURIComponent(platformCode)}&mode=manual`;
}

const browserIssueMessages: Record<BrowserConnectionIssueType, string> = {
  captcha: '页面出现验证码，需要用户确认后继续或改用手动录入。',
  risk_control: '平台触发风控提示，已暂停自动操作，请改用手动录入路径。',
  login_expired: '登录状态已失效，需要重新登录后继续监测。',
  platform_limit: '平台限制当前自动操作，已切换到手动录入路径。',
  page_changed: '平台页面结构发生变化，需要确认页面后再继续。',
  unknown: '浏览器连接异常，需要用户确认后继续或改用手动录入。'
};
