import { describe, expect, it } from 'vitest';
import { isDateSerial, serialToIsoDate } from './dates.ts';

describe('serialToIsoDate', () => {
  it('シリアル値を日付に変換する', () => {
    expect(serialToIsoDate(25569)).toBe('1970-01-01');
    expect(serialToIsoDate(45292)).toBe('2024-01-01');
    expect(serialToIsoDate(45351)).toBe('2024-02-29');
  });

  it('時刻部分は切り捨てる', () => {
    expect(serialToIsoDate(45292.99)).toBe('2024-01-01');
  });
});

describe('isDateSerial', () => {
  it('日付らしい数値だけを true にする', () => {
    expect(isDateSerial(45292)).toBe(true);
    expect(isDateSerial(1_234_567)).toBe(false);
    expect(isDateSerial('45292')).toBe(false);
    expect(isDateSerial(null)).toBe(false);
  });
});
