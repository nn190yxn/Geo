import { describe, expect, it } from 'vitest';
import type { BrowserConnectionSession } from '@geo-platform/shared-types';
import { applyBrowserConnectionEvent, BrowserSessionTransitionError } from '../src/modules/platforms/browser-session-state';

const session: BrowserConnectionSession = {
  id: 'session_1',
  brandId: 'brand_1',
  platformCode: 'doubao',
  status: 'login_required',
  loginDetected: false,
  authorizedScope: { brandId: 'brand_1', testPlanIds: ['plan_1'], platformCodes: ['doubao'] },
  createdAt: '2026-07-18T00:00:00.000Z',
  updatedAt: '2026-07-18T00:00:00.000Z'
};

describe('browser session state', () => {
  it('derives ready state from a confirmed user login', () => {
    expect(applyBrowserConnectionEvent(session, { event: 'login_confirmed' })).toMatchObject({
      status: 'ready',
      loginDetected: true,
      lastOperation: 'login_confirmed'
    });
  });

  it('requires a ready session before accepting a captured answer', () => {
    expect(() => applyBrowserConnectionEvent(session, { event: 'answer_captured' }))
      .toThrow(BrowserSessionTransitionError);
  });

  it('maps an expired login issue to expired state', () => {
    expect(applyBrowserConnectionEvent({ ...session, status: 'ready', loginDetected: true }, {
      event: 'issue_reported',
      lastIssueType: 'login_expired'
    })).toMatchObject({ status: 'expired', loginDetected: false });
  });
});
