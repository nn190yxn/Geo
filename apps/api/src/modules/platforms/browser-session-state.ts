import type {
  BrowserConnectionSession,
  BrowserConnectionStatusInput
} from '@geo-platform/shared-types';

export class BrowserSessionTransitionError extends Error {}

export function applyBrowserConnectionEvent(
  session: BrowserConnectionSession,
  input: BrowserConnectionStatusInput,
  timestamp = new Date().toISOString()
): BrowserConnectionSession {
  if (input.event === 'login_confirmed') {
    requireStatus(session, ['opening', 'login_required', 'needs_confirmation', 'expired', 'failed']);
    return {
      ...session,
      status: 'ready',
      loginDetected: true,
      lastOperation: 'login_confirmed',
      lastIssueType: undefined,
      lastMessage: input.lastMessage || '登录状态已确认，可以开始浏览器辅助监测。',
      lastAvailableAt: timestamp,
      updatedAt: timestamp
    };
  }

  if (input.event === 'issue_reported') {
    requireStatus(session, ['opening', 'login_required', 'ready', 'needs_confirmation', 'expired', 'failed']);
    if (!input.lastIssueType) {
      throw new BrowserSessionTransitionError('请说明浏览器辅助监测遇到的问题');
    }
    return {
      ...session,
      status: input.lastIssueType === 'login_expired' ? 'expired' : 'needs_confirmation',
      loginDetected: input.lastIssueType === 'login_expired' ? false : session.loginDetected,
      lastOperation: 'issue_reported',
      lastIssueType: input.lastIssueType,
      lastMessage: input.lastMessage || '浏览器辅助监测需要用户确认，请处理后继续。',
      updatedAt: timestamp
    };
  }

  if (input.event === 'answer_captured') {
    requireStatus(session, ['ready']);
    return {
      ...session,
      status: 'ready',
      loginDetected: true,
      lastOperation: 'answer_captured',
      lastIssueType: undefined,
      lastMessage: input.lastMessage || '真实回答已回填并完成分析。',
      lastAvailableAt: timestamp,
      updatedAt: timestamp
    };
  }

  if (input.event === 'session_stopped') {
    return {
      ...session,
      status: 'stopped',
      loginDetected: false,
      lastOperation: 'session_stopped',
      lastMessage: input.lastMessage || '浏览器辅助监测会话已停止。',
      updatedAt: timestamp
    };
  }

  throw new BrowserSessionTransitionError('浏览器连接事件不受支持');
}

function requireStatus(session: BrowserConnectionSession, allowed: BrowserConnectionSession['status'][]) {
  if (!allowed.includes(session.status)) {
    throw new BrowserSessionTransitionError(`当前会话状态 ${session.status} 无法执行该操作`);
  }
}
