import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_IDLE_MS,
  DEFAULT_WARN_BEFORE_MS,
  getAccessToken,
  signIn,
  signOut,
  startAutoLock,
  type AutoLock,
  type LockReason,
} from './auth/index.ts';
import { Layout } from './components/Layout.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { buildParsedData } from './loadData.ts';
import Composition from './pages/Composition.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Holdings from './pages/Holdings.tsx';
import type { ParsedAnnual } from './parser/index.ts';
import { useRoute } from './router.ts';
import { ANNUAL_SHEET_TITLE, MASTER_SHEET_TITLE, clearSpreadsheetId, fetchSheetGrids, loadSpreadsheetId, pickSpreadsheet, SheetsApiError } from './sheets/index.ts';
import { DataProvider } from './state/data.tsx';
import { PrefsProvider } from './state/prefs.tsx';

function Page() {
  switch (useRoute()) {
    case '/composition':
      return <Composition />;
    case '/holdings':
      return <Holdings />;
    default:
      return <Dashboard />;
  }
}

const CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const LOCK_MESSAGES: Record<LockReason, string> = {
  idle: 'しばらく操作がなかったため、ロックしました。データとログイン情報は破棄済みです。',
  manual: 'ロックしました。データとログイン情報は破棄済みです。',
};

function errorMessage(e: unknown): string {
  if (e instanceof SheetsApiError) {
    if (e.needsReauth) return `シートを読み取れませんでした (${e.status})。もう一度ログインして、シートを選び直してください。`;
    // 存在しないシート名は 400（Unable to parse range）で返ることが多い
    if (e.status === 400 || e.status === 404) {
      return `シート「${ANNUAL_SHEET_TITLE}」または「${MASTER_SHEET_TITLE}」が見つかりません (${e.status})。シート名を確認してください。`;
    }
    return `シートの読み込みに失敗しました (${e.status})。`;
  }
  return e instanceof Error ? e.message : '読み込みに失敗しました。';
}

/** データとトークンはメモリ（state / モジュール変数）にだけ置く。 */
export default function App() {
  const [data, setData] = useState<ParsedAnnual | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ロック後にログイン画面で出す案内（エラーではない）
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const lockRef = useRef<AutoLock | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const discard = useCallback(() => {
    lockRef.current?.stop();
    lockRef.current = null;
    setIsDemo(false);
    setData(null);
    setLastFetchedAt(null);
  }, []);

  const loadFrom = useCallback(async (token: string, id: string) => {
    const grids = await fetchSheetGrids(token, id);
    setData(buildParsedData(grids.annual, grids.master));
    setLastFetchedAt(new Date());
  }, []);

  const login = useCallback(async () => {
    setBusy(true);
    setError(null);
    setLockNotice(null);
    try {
      await signIn();
      const token = getAccessToken();
      if (!token) throw new Error('ログインに失敗しました。');
      const id = loadSpreadsheetId() ?? (await pickSpreadsheet(token));
      if (!id) {
        await signOut(discard);
        return;
      }
      try {
        await loadFrom(token, id);
      } catch (e) {
        // 保存済みの ID が使えない（削除・権限なし）ときは、選び直せるように ID を捨てる
        if (e instanceof SheetsApiError && e.needsReauth) clearSpreadsheetId();
        throw e;
      }
    } catch (e) {
      setError(errorMessage(e));
      await signOut(discard);
    } finally {
      setBusy(false);
    }
  }, [discard, loadFrom]);

  const demo = import.meta.env.DEV
    ? async () => {
        const { makeData } = await import('./domain/fixtures/sampleData.ts');
        setIsDemo(true);
        setLockNotice(null);
        setData(makeData());
        setLastFetchedAt(new Date());
      }
    : undefined;

  const logout = useCallback(() => {
    void signOut(discard);
  }, [discard]);

  const reload = useCallback(async () => {
    const token = getAccessToken();
    const id = loadSpreadsheetId();
    if (!token || !id) {
      await signOut(discard);
      setError('ログインの有効期限が切れました。もう一度ログインしてください。');
      return;
    }
    setBusy(true);
    try {
      await loadFrom(token, id);
    } catch (e) {
      setError(errorMessage(e));
      await signOut(discard);
    } finally {
      setBusy(false);
    }
  }, [discard, loadFrom]);

  // 自動ロック（F-08）: データ表示中だけ、15分の無操作で revoke → 破棄
  const loggedIn = data !== null;
  useEffect(() => {
    if (!loggedIn) return;
    const lock = startAutoLock(
      (reason) => {
        discard();
        setLockNotice(LOCK_MESSAGES[reason]);
      },
      { timeoutMs: DEFAULT_IDLE_MS, warnBeforeMs: DEFAULT_WARN_BEFORE_MS },
    );
    lockRef.current = lock;
    return () => lock.stop();
  }, [loggedIn, discard]);

  // Layout に渡す自動ロックの窓口。実体は effect の中で作るので ref 経由で読む（残り時間の表示で App を再描画しない）
  const autoLock = useMemo<AutoLock>(
    () => ({
      timeoutMs: DEFAULT_IDLE_MS,
      warnBeforeMs: DEFAULT_WARN_BEFORE_MS,
      touch: () => lockRef.current?.touch(),
      // 開始前は満タン扱い（ロック後は Layout ごと消える）
      remainingMs: () => lockRef.current?.remainingMs() ?? DEFAULT_IDLE_MS,
      lockNow: () => lockRef.current?.lockNow(),
      stop: () => lockRef.current?.stop(),
    }),
    [],
  );

  return (
    <PrefsProvider>
      {data === null ? (
        <LoginScreen
          busy={busy}
          error={error}
          lockNotice={lockNotice}
          configured={CONFIGURED}
          onLogin={() => void login()}
          onDemo={demo && (() => void demo())}
        />
      ) : (
        <DataProvider data={data}>
          <Layout
            onReload={isDemo ? undefined : () => void reload()}
            onLogout={logout}
            busy={busy}
            lastFetchedAt={lastFetchedAt}
            autoLock={autoLock}
          >
            <Page />
          </Layout>
        </DataProvider>
      )}
    </PrefsProvider>
  );
}
