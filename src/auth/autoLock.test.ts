import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoLock } from './autoLock.ts';

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
});
