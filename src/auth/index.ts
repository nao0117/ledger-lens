export { SCOPE, signIn, revokeAccessToken, getAccessToken, isSignedIn, clearToken, AuthError } from './token.ts';
export { createAutoLock, formatRemaining, DEFAULT_IDLE_MS, DEFAULT_WARN_BEFORE_MS } from './autoLock.ts';
export type { AutoLock, AutoLockOptions, LockReason } from './autoLock.ts';
export { signOut, startAutoLock } from './session.ts';
export type { StartAutoLockOptions } from './session.ts';
