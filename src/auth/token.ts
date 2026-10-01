import { getGoogle, type TokenClient } from './googleTypes.ts';
import { GIS_SCRIPT_URL, loadScript } from './loadScript.ts';

/** スコープは drive.file だけ（CLAUDE.md ルール3）。広げないこと。 */
export const SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** アクセストークンはこのモジュール変数（メモリ）にだけ置く。 */
let accessToken: string | null = null;
let expiresAt = 0;
let client: TokenClient | null = null;
let pendingRequest: { resolve: () => void; reject: (e: Error) => void } | null = null;

const EXPIRY_MARGIN_MS = 30_000;

export class AuthError extends Error {
  override name = 'AuthError';
}

/** 有効なトークンを返す。無い・期限切れなら null。 */
export function getAccessToken(): string | null {
  if (accessToken && Date.now() < expiresAt - EXPIRY_MARGIN_MS) return accessToken;
  return null;
}

export function isSignedIn(): boolean {
  return getAccessToken() !== null;
}

/** メモリ上のトークンを捨てる（revoke はしない）。 */
export function clearToken(): void {
  accessToken = null;
  expiresAt = 0;
}

async function ensureClient(): Promise<TokenClient> {
  if (client) return client;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new AuthError('VITE_GOOGLE_CLIENT_ID が設定されていません');
  await loadScript(GIS_SCRIPT_URL);
  const oauth2 = getGoogle()?.accounts?.oauth2;
  if (!oauth2) throw new AuthError('Google ログインを初期化できませんでした');
  client = oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: (r) => {
      const p = pendingRequest;
      pendingRequest = null;
      if (r.error || !r.access_token) {
        p?.reject(new AuthError('Google ログインに失敗しました'));
        return;
      }
      accessToken = r.access_token;
      expiresAt = Date.now() + (Number(r.expires_in) || 3600) * 1000;
      p?.resolve();
    },
    error_callback: () => {
      const p = pendingRequest;
      pendingRequest = null;
      p?.reject(new AuthError('ログインがキャンセルされました'));
    },
  });
  return client;
}

/** ログインしてアクセストークンをメモリに保持する。ユーザー操作（クリック）から呼ぶこと。 */
export async function signIn(options: { prompt?: '' | 'consent' | 'select_account' } = {}): Promise<void> {
  const c = await ensureClient();
  await new Promise<void>((resolve, reject) => {
    pendingRequest?.reject(new AuthError('新しいログイン要求に置き換えられました'));
    pendingRequest = { resolve, reject };
    c.requestAccessToken({ prompt: options.prompt ?? '' });
  });
}

/**
 * トークンを失効させてからメモリ上のトークンを破棄する。
 * revoke の応答が来なくても（オフライン等）、一定時間後にはメモリを破棄して戻る。
 */
export async function revokeAccessToken(timeoutMs = 5000): Promise<void> {
  const token = accessToken;
  try {
    const oauth2 = getGoogle()?.accounts?.oauth2;
    if (token && oauth2) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        try {
          oauth2.revoke(token, () => {
            clearTimeout(timer);
            resolve();
          });
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
    }
  } finally {
    clearToken();
  }
}
