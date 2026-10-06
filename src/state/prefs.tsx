import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Period } from '../domain/index.ts';

export type Theme = 'system' | 'light' | 'dark';
/** 銘柄画面の表示単位。security: 口座をまたいで同じ銘柄をまとめる / account: 口座ごと */
export type HoldingsGrouping = 'security' | 'account';

type Prefs = { mask: boolean; theme: Theme; period: Period; holdingsGrouping: HoldingsGrouping };
type PrefsContextValue = Prefs & {
  setMask: (mask: boolean) => void;
  setTheme: (theme: Theme) => void;
  setPeriod: (period: Period) => void;
  setHoldingsGrouping: (holdingsGrouping: HoldingsGrouping) => void;
};

// localStorage に保存してよいのは表示設定だけ（金額やトークンは入れない）。
const STORAGE_KEY = 'ledger-lens:prefs';
const DEFAULTS: Prefs = { mask: false, theme: 'system', period: '3y', holdingsGrouping: 'security' };

function load(): Prefs {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof raw !== 'object' || raw === null) return DEFAULTS;
    const r = raw as Partial<Record<keyof Prefs, unknown>>;
    return {
      mask: typeof r.mask === 'boolean' ? r.mask : DEFAULTS.mask,
      theme: r.theme === 'light' || r.theme === 'dark' || r.theme === 'system' ? r.theme : DEFAULTS.theme,
      period: r.period === '1y' || r.period === '3y' || r.period === 'all' ? r.period : DEFAULTS.period,
      holdingsGrouping:
        r.holdingsGrouping === 'security' || r.holdingsGrouping === 'account' ? r.holdingsGrouping : DEFAULTS.holdingsGrouping,
    };
  } catch {
    return DEFAULTS;
  }
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // 保存できなくても動作には影響しない
    }
  }, [prefs]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  const value = useMemo<PrefsContextValue>(
    () => ({
      ...prefs,
      setMask: (mask) => setPrefs((p) => ({ ...p, mask })),
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      setPeriod: (period) => setPrefs((p) => ({ ...p, period })),
      setHoldingsGrouping: (holdingsGrouping) => setPrefs((p) => ({ ...p, holdingsGrouping })),
    }),
    [prefs],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('PrefsProvider の外で usePrefs を使っています');
  return ctx;
}
