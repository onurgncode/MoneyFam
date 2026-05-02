import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_MAP: Record<string, string> = {
  '1': '/dashboard',
  '2': '/income',
  '3': '/bills',
  '4': '/expenses',
  '5': '/debts',
  '6': '/people',
  '7': '/reports',
};

/**
 * Wires Cmd+1-7 to navigate, Cmd+, to settings, Cmd+N to new, Cmd+E to export.
 * Listens for `app:nav`, `app:new`, `app:export` events from the main menu via preload.
 */
export function useKeyboardShortcuts(onNew?: () => void, onExport?: () => void): void {
  const navigate = useNavigate();

  // OS menu events
  useEffect(() => {
    const offNav = window.appEvents?.onNav((path) => navigate(path));
    const offNew = window.appEvents?.onNew(() => onNew?.());
    const offExport = window.appEvents?.onExport?.(() => onExport?.());
    return () => {
      offNav?.();
      offNew?.();
      offExport?.();
    };
  }, [navigate, onNew, onExport]);

  // Renderer-side accelerators (in case OS menu didn't fire, e.g. dev DevTools focus)
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (NAV_MAP[e.key]) {
        e.preventDefault();
        navigate(NAV_MAP[e.key]);
      } else if (e.key === ',') {
        e.preventDefault();
        navigate('/settings');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNew?.();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onExport?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onNew, onExport]);
}

declare global {
  interface Window {
    appEvents?: {
      onNav: (cb: (path: string) => void) => () => void;
      onNew: (cb: () => void) => () => void;
      onExport?: (cb: () => void) => () => void;
    };
  }
}
