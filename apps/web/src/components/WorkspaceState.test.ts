import { describe, expect, it } from 'vitest';
import { getQueryGroupWorkspaceState, getWorkspaceStateVisibility, normalizeCompleteness } from './WorkspaceState';

describe('workspace template state helpers', () => {
  it('keeps partial content visible beside its notice', () => {
    expect(getWorkspaceStateVisibility('partial')).toEqual({
      showContent: true,
      showLoading: false,
      showEmpty: false,
      showPartial: true,
      showError: false
    });
  });

  it('shows one exclusive blocking state', () => {
    expect(getWorkspaceStateVisibility('loading')).toEqual({
      showContent: false,
      showLoading: true,
      showEmpty: false,
      showPartial: false,
      showError: false
    });
    expect(getWorkspaceStateVisibility('error')).toEqual({
      showContent: false,
      showLoading: false,
      showEmpty: false,
      showPartial: false,
      showError: true
    });
    expect(getWorkspaceStateVisibility('empty')).toEqual({
      showContent: false,
      showLoading: false,
      showEmpty: true,
      showPartial: false,
      showError: false
    });
    expect(getWorkspaceStateVisibility('ready')).toEqual({
      showContent: true,
      showLoading: false,
      showEmpty: false,
      showPartial: false,
      showError: false
    });
  });

  it('normalizes completeness to an integer percentage', () => {
    expect(normalizeCompleteness(-10)).toBe(0);
    expect(normalizeCompleteness(48.6)).toBe(49);
    expect(normalizeCompleteness(120)).toBe(100);
    expect(normalizeCompleteness(Number.NaN)).toBeUndefined();
    expect(normalizeCompleteness()).toBeUndefined();
  });

  it('derives an exclusive state for multi-query pages', () => {
    const success = { success: true as const, data: [] };
    const failure = { success: false as const, data: null, error: { code: 'FAILED', message: '加载失败' } };

    expect(getQueryGroupWorkspaceState([{ isLoading: true }], false)).toBe('loading');
    expect(getQueryGroupWorkspaceState([{ isLoading: false, response: failure }], false)).toBe('error');
    expect(getQueryGroupWorkspaceState([
      { isLoading: false, response: success },
      { isLoading: false, response: failure }
    ], true)).toBe('partial');
    expect(getQueryGroupWorkspaceState([{ isLoading: false, response: success }], false)).toBe('empty');
    expect(getQueryGroupWorkspaceState([{ isLoading: false, response: success }], true)).toBe('ready');
  });
});
