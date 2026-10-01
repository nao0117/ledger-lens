import type { ReactNode } from 'react';
import { hrefFor, ROUTES, useRoute } from '../router.ts';
import { useData } from '../state/data.tsx';
import { usePrefs, type Theme } from '../state/prefs.tsx';

const THEME_LABELS: Record<Theme, string> = { system: '自動', light: 'ライト', dark: 'ダーク' };
const THEMES: Theme[] = ['system', 'light', 'dark'];

type Props = {
  children: ReactNode;
  onReload?: () => void;
  onLogout?: () => void;
};

export function Layout({ children, onReload, onLogout }: Props) {
  const route = useRoute();
  const { data, baseDate, setBaseDate } = useData();
  const { mask, setMask, theme, setTheme } = usePrefs();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Ledger Lens</h1>
        <div className="toolbar">
          <label className="field">
            <span className="field-label">基準日</span>
            <select value={baseDate ?? ''} onChange={(e) => setBaseDate(e.target.value)} disabled={baseDate === null}>
              {[...data.dates].reverse().map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button type="button" aria-pressed={mask} onClick={() => setMask(!mask)}>
            {mask ? '金額を表示' : '金額を隠す'}
          </button>
          <label className="field">
            <span className="field-label">テーマ</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {THEME_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          {onReload && (
            <button type="button" onClick={onReload}>
              再読み込み
            </button>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout}>
              ログアウト
            </button>
          )}
        </div>
        <nav className="tabs" aria-label="画面">
          {ROUTES.map((r) => (
            <a key={r.path} href={hrefFor(r.path)} aria-current={r.path === route ? 'page' : undefined}>
              {r.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
