import { describe, expect, it } from 'vitest';
import { getAppShellGutter, getAppShellMode, initialAppShellInteractionState, reduceAppShellInteraction } from './AppShellState';

describe('responsive app shell state', () => {
  it('switches from mobile drawer to desktop sidebar at 768px', () => {
    expect(getAppShellMode(390)).toBe('mobile');
    expect(getAppShellMode(767)).toBe('mobile');
    expect(getAppShellMode(768)).toBe('desktop');
    expect(getAppShellMode(1440)).toBe('desktop');
  });

  it('matches page gutter tokens at visual review widths', () => {
    expect(getAppShellGutter(390)).toBe('mobile');
    expect(getAppShellGutter(768)).toBe('tablet');
    expect(getAppShellGutter(1024)).toBe('tablet');
    expect(getAppShellGutter(1440)).toBe('desktop');
  });

  it('toggles the desktop sidebar without changing mobile drawer state', () => {
    const collapsed = reduceAppShellInteraction(initialAppShellInteractionState, { type: 'toggle-desktop-navigation' });
    expect(collapsed).toEqual({ isSiderCollapsed: true, isMobileNavigationOpen: false });
    expect(reduceAppShellInteraction(collapsed, { type: 'toggle-desktop-navigation' }))
      .toEqual(initialAppShellInteractionState);
  });

  it('opens and closes the mobile drawer across close and route actions', () => {
    const open = reduceAppShellInteraction(initialAppShellInteractionState, { type: 'open-mobile-navigation' });
    expect(open.isMobileNavigationOpen).toBe(true);
    expect(reduceAppShellInteraction(open, { type: 'close-mobile-navigation' }).isMobileNavigationOpen).toBe(false);
    expect(reduceAppShellInteraction(open, { type: 'route-changed' }).isMobileNavigationOpen).toBe(false);
  });
});
