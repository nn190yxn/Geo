import { useEffect, useState } from 'react';

export type AppShellMode = 'mobile' | 'desktop';
export type AppShellGutter = 'mobile' | 'tablet' | 'desktop';

export type AppShellInteractionState = {
  isSiderCollapsed: boolean;
  isMobileNavigationOpen: boolean;
};

export type AppShellInteractionAction =
  | { type: 'toggle-desktop-navigation' }
  | { type: 'open-mobile-navigation' }
  | { type: 'close-mobile-navigation' }
  | { type: 'route-changed' };

export const initialAppShellInteractionState: AppShellInteractionState = {
  isSiderCollapsed: false,
  isMobileNavigationOpen: false
};

export function reduceAppShellInteraction(
  state: AppShellInteractionState,
  action: AppShellInteractionAction
): AppShellInteractionState {
  switch (action.type) {
    case 'toggle-desktop-navigation':
      return { ...state, isSiderCollapsed: !state.isSiderCollapsed };
    case 'open-mobile-navigation':
      return { ...state, isMobileNavigationOpen: true };
    case 'close-mobile-navigation':
    case 'route-changed':
      return { ...state, isMobileNavigationOpen: false };
  }
}

export function getAppShellMode(width: number): AppShellMode {
  return width < 768 ? 'mobile' : 'desktop';
}

export function getAppShellGutter(width: number): AppShellGutter {
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

export function useAppShellMode(): AppShellMode {
  const [mode, setMode] = useState<AppShellMode>(() => (
    typeof window === 'undefined' ? 'desktop' : getAppShellMode(window.innerWidth)
  ));

  useEffect(() => {
    const updateMode = () => setMode(getAppShellMode(window.innerWidth));
    updateMode();
    window.addEventListener('resize', updateMode);
    return () => window.removeEventListener('resize', updateMode);
  }, []);

  return mode;
}
