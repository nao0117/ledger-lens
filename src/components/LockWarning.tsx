import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { formatRemaining, type AutoLock } from '../auth/index.ts';
import { LockIcon } from './icons.tsx';

const TICK_MS = 1000;

/** 残りを秒単位に丸める（同じ秒なら state が変わらず再描画しない）。 */
const toSeconds = (ms: number) => Math.ceil(ms / 1000) * 1000;

/**
 * ロックまでの残りミリ秒を 1 秒ごとに読む。使う側だけが再描画される。
 * 戻り値の refresh は touch() 直後などにすぐ読み直すためのもの。
 */
export function useLockRemaining(lock: AutoLock): [number, () => void] {
  const [ms, setMs] = useState(() => toSeconds(lock.remainingMs()));
  const refresh = useCallback(() => setMs(toSeconds(lock.remainingMs())), [lock]);
  useEffect(() => {
    const id = setInterval(refresh, TICK_MS);
    return () => clearInterval(id);
  }, [refresh]);
  return [ms, refresh];
}

/** 「12:30」のような残り時間。bar を付けると細い進捗バーも出す。 */
export function LockCountdown({ lock, bar = false }: { lock: AutoLock; bar?: boolean }) {
  const [ms] = useLockRemaining(lock);
  const ratio = lock.timeoutMs > 0 ? Math.min(1, ms / lock.timeoutMs) : 0;
  return (
    <>
      <span className="num">{formatRemaining(ms)}</span>
      {bar && (
        <span className="lock-bar" aria-hidden="true">
          <i style={{ width: `${(ratio * 100).toFixed(1)}%` }} />
        </span>
      )}
    </>
  );
}

/** 自動ロックの予告（F-08）。残りが warnBeforeMs 以下になったら画面下部に出す。 */
export function LockWarning({ lock }: { lock: AutoLock }) {
  const [ms, refresh] = useLockRemaining(lock);
  const show = ms > 0 && ms <= lock.warnBeforeMs;
  const titleId = useId();
  const descId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  // 出たときは［続ける］にフォーカスし、消えたら元の場所に戻す
  useEffect(() => {
    if (!show) return;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    continueRef.current?.focus();
    return () => {
      const now = document.activeElement;
      if (prev && prev.isConnected && (now === null || now === document.body)) prev.focus();
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="lock-warning" role="alertdialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={descId}>
      <div className="lock-warning-text">
        <LockIcon className="lock-warning-icon" size={22} />
        <div>
          <p id={titleId} className="lock-warning-title">
            操作がないため <span className="num">{formatRemaining(ms)}</span> 後にロックします
          </p>
          <p id={descId} className="lock-warning-desc">
            ロックすると、読み込んだデータとログイン情報を破棄します。
          </p>
        </div>
      </div>
      <div className="lock-warning-actions">
        <button type="button" onClick={() => lock.lockNow()}>
          今すぐロック
        </button>
        <button
          type="button"
          className="primary"
          ref={continueRef}
          onClick={() => {
            lock.touch();
            refresh();
          }}
        >
          続ける
        </button>
      </div>
    </div>
  );
}
