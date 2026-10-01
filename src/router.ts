import { useSyncExternalStore } from 'react';

export const ROUTES = [
  { path: '/', label: 'ダッシュボード' },
  { path: '/trend', label: '推移' },
  { path: '/composition', label: '構成' },
  { path: '/holdings', label: '銘柄一覧' },
] as const;

export type RoutePath = (typeof ROUTES)[number]['path'];

function currentPath(): RoutePath {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  return ROUTES.find((r) => r.path === raw)?.path ?? '/';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/** HashRouter 相当。GitHub Pages で 404 にならないよう、パスは # 以降に持つ。 */
export function useRoute(): RoutePath {
  return useSyncExternalStore(subscribe, currentPath, () => '/');
}

export function hrefFor(path: RoutePath): string {
  return `#${path}`;
}
