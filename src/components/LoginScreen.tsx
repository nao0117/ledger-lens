type Props = {
  busy: boolean;
  error: string | null;
  configured: boolean;
  onLogin: () => void;
  onDemo?: () => void;
};

export function LoginScreen({ busy, error, configured, onLogin, onDemo }: Props) {
  return (
    <main className="landing">
      <h1>Ledger Lens</h1>
      <p>Google スプレッドシートの資産データを、グラフで確認するための個人用ダッシュボードです。</p>
      <p className="note">データはブラウザのメモリ上でだけ扱い、端末や外部サーバーには保存しません。</p>
      {!configured && (
        <p role="alert" className="notice">
          Google の設定（VITE_GOOGLE_CLIENT_ID など）がありません。.env.local を確認してください。
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="button" className="primary" onClick={onLogin} disabled={busy || !configured}>
          {busy ? '読み込み中…' : 'Google でログイン'}
        </button>
        {onDemo && (
          <button type="button" onClick={onDemo} disabled={busy}>
            ダミーデータで表示（開発用）
          </button>
        )}
      </div>
    </main>
  );
}
