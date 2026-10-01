import { createAutoLock, type AutoLock } from './autoLock.ts';
import { revokeAccessToken } from './token.ts';

/**
 * ログアウト（F-09）。トークンを revoke してからメモリを破棄する。
 * discard はアプリ側のデータ破棄（state のクリア等）。
 */
export async function signOut(discard: () => void): Promise<void> {
  try {
    await revokeAccessToken();
  } finally {
    discard();
  }
}

/** 自動ロック（F-08）。無操作で revoke → discard の順に実行する。 */
export function startAutoLock(discard: () => void, timeoutMs?: number): AutoLock {
  return createAutoLock({
    timeoutMs,
    onLock: () => signOut(discard),
  });
}
