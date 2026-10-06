import { useMemo, useSyncExternalStore } from 'react';

export const ROUTES = [
  { path: '/', label: 'ホーム' },
  { path: '/composition', label: '構成' },
  { path: '/holdings', label: '銘柄' },
] as const;

export type RoutePath = (typeof ROUTES)[number]['path'];

/** `#/holdings?unclassified=1` → パスとクエリに分ける。未知のパスは '/'。純粋関数。 */
export function parseHash(hash: string): { path: RoutePath; query: string } {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  const pathPart = (q === -1 ? raw : raw.slice(0, q)) || '/';
  const query = q === -1 ? '' : raw.slice(q + 1);
  const path = ROUTES.find((r) => r.path === pathPart)?.path ?? '/';
  return { path, query };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;

/** HashRouter 相当。GitHub Pages で 404 にならないよう、パスは # 以降に持つ。 */
export function useRoute(): RoutePath {
  return parseHash(useSyncExternalStore(subscribe, getHash, () => '')).path;
}

/**
 * 画面の初期状態を渡すためのクエリ（例: 未分類で絞り込む）。
 * URL に置くのは表示条件のフラグだけ。金額・銘柄名・トークンは入れない。
 */
export function useRouteQuery(): URLSearchParams {
  const { query } = parseHash(useSyncExternalStore(subscribe, getHash, () => ''));
  return useMemo(() => new URLSearchParams(query), [query]);
}

export function hrefFor(path: RoutePath, query?: Record<string, string>): string {
  const qs = query ? new URLSearchParams(query).toString() : '';
  return qs ? `#${path}?${qs}` : `#${path}`;
}
