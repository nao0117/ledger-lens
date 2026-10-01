/** フレームワーク非依存の無操作タイマー（F-08）。 */
export const DEFAULT_IDLE_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export type AutoLockOptions = {
  timeoutMs?: number;
  /** 無操作で時間切れになったときに一度だけ呼ばれる。 */
  onLock: () => void | Promise<void>;
  /** 操作イベントを監視する対象。省略時は document（無ければ監視しない）。 */
  target?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
};

export type AutoLock = {
  /** 操作があったとみなしてタイマーを延長する。 */
  touch(): void;
  /** 停止してイベントを外す。 */
  stop(): void;
};

export function createAutoLock(options: AutoLockOptions): AutoLock {
  const timeoutMs = options.timeoutMs ?? DEFAULT_IDLE_MS;
  const target = options.target ?? (typeof document !== 'undefined' ? document : undefined);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let lastActivity = Date.now();

  const arm = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, timeoutMs);
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
    stopped = true;
    detach();
    void Promise.resolve(options.onLock()).catch(() => {});
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
    touch() {
      if (!stopped) onActivity();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      detach();
    },
  };
}
