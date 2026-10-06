import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken, signIn, signOut, startAutoLock, type AutoLock } from './auth/index.ts';
import { Layout } from './components/Layout.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { WarningsBanner } from './components/WarningsBanner.tsx';
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
  const lockRef = useRef<AutoLock | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const discard = useCallback(() => {
    lockRef.current?.stop();
    lockRef.current = null;
    setIsDemo(false);
    setData(null);
  }, []);

  const loadFrom = useCallback(async (token: string, id: string) => {
    const grids = await fetchSheetGrids(token, id);
    setData(buildParsedData(grids.annual, grids.master));
  }, []);

  const login = useCallback(async () => {
    setBusy(true);
    setError(null);
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
        setData(makeData());
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
    const lock = startAutoLock(() => {
      discard();
      setError('しばらく操作がなかったため、ロックしました。');
    });
    lockRef.current = lock;
    return () => lock.stop();
  }, [loggedIn, discard]);

  return (
    <PrefsProvider>
      {data === null ? (
        <LoginScreen busy={busy} error={error} configured={CONFIGURED} onLogin={() => void login()} onDemo={demo && (() => void demo())} />
      ) : (
        <DataProvider data={data}>
          <Layout onReload={isDemo ? undefined : () => void reload()} onLogout={logout}>
            <WarningsBanner warnings={data.warnings} />
            <Page />
          </Layout>
        </DataProvider>
      )}
    </PrefsProvider>
  );
}
