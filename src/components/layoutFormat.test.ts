import { describe, expect, it } from 'vitest';
import { formatBaseDateLong, formatBaseDateOption, formatFetchedAt } from './layoutFormat.ts';

describe('formatBaseDateOption', () => {
  it('最新日と同じ年は月/日、最新日には（最新）を付ける', () => {
    expect(formatBaseDateOption('2026-09-30', '2026-09-30')).toBe('9/30（最新）');
    expect(formatBaseDateOption('2026-03-01', '2026-09-30')).toBe('3/1');
  });

  it('違う年は年から表示する', () => {
    expect(formatBaseDateOption('2025-12-31', '2026-09-30')).toBe('2025/12/31');
  });

  it('形式が違う文字列はそのまま返す', () => {
    expect(formatBaseDateOption('不明', null)).toBe('不明');
  });
});

describe('formatBaseDateLong', () => {
  it('年月日で返す', () => {
    expect(formatBaseDateLong('2026-09-30')).toBe('2026年9月30日');
  });
});

describe('formatFetchedAt', () => {
  it('同じ日なら時:分、別の日なら月/日を付ける', () => {
    const now = new Date(2026, 9, 6, 12, 0);
    expect(formatFetchedAt(new Date(2026, 9, 6, 9, 5), now)).toBe('9:05');
    expect(formatFetchedAt(new Date(2026, 9, 5, 21, 42), now)).toBe('10/5 21:42');
  });
});
