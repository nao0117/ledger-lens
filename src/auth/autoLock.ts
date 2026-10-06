/** フレームワーク非依存の無操作タイマー（F-08）。 */
export const DEFAULT_IDLE_MS = 15 * 60 * 1000;
/** ロックの何ミリ秒前から予告を出すか。 */
export const DEFAULT_WARN_BEFORE_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/** idle: 無操作で時間切れ / manual: lockNow() による即時ロック */
export type LockReason = 'idle' | 'manual';

export type AutoLockOptions = {
  timeoutMs?: number;
  /** ロックの予告を出し始める残り時間。タイマー自体の動作は変えない（表示側が remainingMs と比べる）。 */
  warnBeforeMs?: number;
  /** 時間切れ、または lockNow() のときに一度だけ呼ばれる。 */
  onLock: (reason: LockReason) => void | Promise<void>;
  /** 操作イベントを監視する対象。省略時は document（無ければ監視しない）。 */
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
};

export type AutoLock = {
  readonly timeoutMs: number;
  readonly warnBeforeMs: number;
  /** 操作があったとみなしてタイマーを延長する。 */
  touch(): void;
  /** ロックまでの残りミリ秒。停止後・ロック後は 0。 */
  remainingMs(): number;
  /** 待たずに今すぐロックする（onLock を reason 'manual' で呼ぶ）。 */
  lockNow(): void;
  /** 停止してイベントを外す。onLock は呼ばない。 */
  stop(): void;
};

/** 残りミリ秒を「m:ss」にする（切り上げ秒）。純粋関数。 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createAutoLock(options: AutoLockOptions): AutoLock {
  const timeoutMs = options.timeoutMs ?? DEFAULT_IDLE_MS;
  const warnBeforeMs = Math.min(options.warnBeforeMs ?? DEFAULT_WARN_BEFORE_MS, timeoutMs);
  const target = options.target ?? (typeof document !== 'undefined' ? document : undefined);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let lastActivity = Date.now();

  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, timeoutMs);
  };

  const lock = (reason: LockReason) => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    detach();
    void Promise.resolve(options.onLock(reason)).catch(() => {});
  };

  const fire = () => {
    timer = null;
    // タブがバックグラウンドでタイマーが遅延した場合も、経過時間で判定する
    if (stopped) return;
    const idle = Date.now() - lastActivity;
    if (idle < timeoutMs) {
      timer = setTimeout(fire, timeoutMs - idle);
      return;
    }
    lock('idle');
  };

  // pointermove 等は高頻度なので、時刻の記録だけにしてタイマーは fire 側で延長する
  const onActivity = () => {
    lastActivity = Date.now();
  };

  const detach = () => {
    for (const ev of ACTIVITY_EVENTS) target?.removeEventListener(ev, onActivity);
  };

  for (const ev of ACTIVITY_EVENTS) target?.addEventListener(ev, onActivity, { passive: true } as AddEventListenerOptions);
  arm();

  return {
    timeoutMs,
    warnBeforeMs,
    touch() {
      if (!stopped) onActivity();
    },
    remainingMs() {
      if (stopped) return 0;
      return Math.max(0, timeoutMs - (Date.now() - lastActivity));
    },
    lockNow() {
      if (!stopped) lock('manual');
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      detach();
    },
  };
}
