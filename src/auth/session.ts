import { createAutoLock, type AutoLock, type LockReason } from './autoLock.ts';
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

export type StartAutoLockOptions = { timeoutMs?: number; warnBeforeMs?: number };

/** 自動ロック（F-08）。無操作（または lockNow）で revoke → discard の順に実行する。 */
export function startAutoLock(discard: (reason: LockReason) => void, options: StartAutoLockOptions = {}): AutoLock {
  return createAutoLock({
    ...options,
    onLock: (reason) => signOut(() => discard(reason)),
  });
}
