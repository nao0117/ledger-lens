export { SCOPE, signIn, revokeAccessToken, getAccessToken, isSignedIn, clearToken, AuthError } from './token.ts';
export { createAutoLock, DEFAULT_IDLE_MS } from './autoLock.ts';
export type { AutoLock, AutoLockOptions } from './autoLock.ts';
export { signOut, startAutoLock } from './session.ts';
