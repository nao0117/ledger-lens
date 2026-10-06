import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoLock, DEFAULT_WARN_BEFORE_MS, formatRemaining } from './autoLock.ts';

function fakeTarget() {
  const l = new Map<string, () => void>();
  return {
    addEventListener: (t: string, f: unknown) => void l.set(t, f as () => void),
    removeEventListener: (t: string) => void l.delete(t),
    emit: (t: string) => l.get(t)?.(),
    count: () => l.size,
  };
}

describe('createAutoLock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('無操作で時間切れになると一度だけ onLock を呼ぶ', () => {
    const onLock = vi.fn();
    const t = fakeTarget();
    createAutoLock({ timeoutMs: 1000, onLock, target: t });
    vi.advanceTimersByTime(999);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(5000);
    expect(onLock).toHaveBeenCalledTimes(1);
    expect(t.count()).toBe(0);
  });

  it('操作があると期限が延びる', () => {
    const onLock = vi.fn();
    const t = fakeTarget();
    createAutoLock({ timeoutMs: 1000, onLock, target: t });
    vi.advanceTimersByTime(800);
    t.emit('keydown');
    vi.advanceTimersByTime(800);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('touch() でも延長でき、stop() 後は呼ばれない', () => {
    const onLock = vi.fn();
    const lock = createAutoLock({ timeoutMs: 1000, onLock, target: fakeTarget() });
    vi.advanceTimersByTime(900);
    lock.touch();
    vi.advanceTimersByTime(900);
    expect(onLock).not.toHaveBeenCalled();
    lock.stop();
    vi.advanceTimersByTime(5000);
    expect(onLock).not.toHaveBeenCalled();
  });

  it('onLock が reject しても例外にならない', async () => {
    const t = fakeTarget();
    createAutoLock({ timeoutMs: 10, onLock: () => Promise.reject(new Error('x')), target: t });
    await vi.advanceTimersByTimeAsync(20);
  });

  it('remainingMs は残り時間を返し、操作で戻り、停止後は 0', () => {
    const t = fakeTarget();
    const lock = createAutoLock({ timeoutMs: 10_000, onLock: vi.fn(), target: t });
    expect(lock.remainingMs()).toBe(10_000);
    vi.advanceTimersByTime(3_000);
    expect(lock.remainingMs()).toBe(7_000);
    t.emit('pointermove');
    expect(lock.remainingMs()).toBe(10_000);
    lock.stop();
    expect(lock.remainingMs()).toBe(0);
  });

  it('時間切れでロックした後の remainingMs は 0', () => {
    const lock = createAutoLock({ timeoutMs: 1000, onLock: vi.fn(), target: fakeTarget() });
    vi.advanceTimersByTime(1000);
    expect(lock.remainingMs()).toBe(0);
  });

  it('warnBeforeMs は既定 60 秒で、指定もでき、timeoutMs を超えない', () => {
    expect(createAutoLock({ onLock: vi.fn(), target: fakeTarget() }).warnBeforeMs).toBe(DEFAULT_WARN_BEFORE_MS);
    expect(DEFAULT_WARN_BEFORE_MS).toBe(60_000);
    expect(createAutoLock({ timeoutMs: 5000, warnBeforeMs: 2000, onLock: vi.fn(), target: fakeTarget() }).warnBeforeMs).toBe(2000);
    expect(createAutoLock({ timeoutMs: 5000, onLock: vi.fn(), target: fakeTarget() }).warnBeforeMs).toBe(5000);
  });

  it('予告の範囲に入ったかを remainingMs と warnBeforeMs で判定でき、touch で範囲外に戻る', () => {
    const lock = createAutoLock({ timeoutMs: 120_000, onLock: vi.fn(), target: fakeTarget() });
    const warning = () => lock.remainingMs() <= lock.warnBeforeMs;
    vi.advanceTimersByTime(59_000);
    expect(warning()).toBe(false);
    vi.advanceTimersByTime(2_000);
    expect(warning()).toBe(true);
    lock.touch();
    expect(warning()).toBe(false);
  });

  it('lockNow() はすぐに reason "manual" で一度だけ onLock を呼び、時間切れでは "idle"', () => {
    const onLock = vi.fn();
    const t = fakeTarget();
    const lock = createAutoLock({ timeoutMs: 1000, onLock, target: t });
    lock.lockNow();
    lock.lockNow();
    vi.advanceTimersByTime(5000);
    expect(onLock).toHaveBeenCalledTimes(1);
    expect(onLock).toHaveBeenCalledWith('manual');
    expect(t.count()).toBe(0);
    expect(lock.remainingMs()).toBe(0);

    const onIdle = vi.fn();
    createAutoLock({ timeoutMs: 1000, onLock: onIdle, target: fakeTarget() });
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledWith('idle');
  });

  it('stop() 後の lockNow() は何もしない', () => {
    const onLock = vi.fn();
    const lock = createAutoLock({ timeoutMs: 1000, onLock, target: fakeTarget() });
    lock.stop();
    lock.lockNow();
    expect(onLock).not.toHaveBeenCalled();
  });
});

describe('formatRemaining', () => {
  it('m:ss 形式で秒は切り上げる', () => {
    expect(formatRemaining(750_000)).toBe('12:30');
    expect(formatRemaining(57_001)).toBe('0:58');
    expect(formatRemaining(60_000)).toBe('1:00');
    expect(formatRemaining(0)).toBe('0:00');
    expect(formatRemaining(-5)).toBe('0:00');
  });
});
