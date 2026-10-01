import { describe, expect, it } from 'vitest';
import { formatManYen, formatYen } from './format.ts';

describe('formatYen', () => {
  it('3桁区切りの円表示にする', () => {
    expect(formatYen(1234567)).toBe('¥1,234,567');
  });

  it('小数は四捨五入する', () => {
    expect(formatYen(999.6)).toBe('¥1,000');
  });

  it('負の値は先頭にマイナスを付ける', () => {
    expect(formatYen(-5000)).toBe('-¥5,000');
  });

  it('マスク時は金額を出さない', () => {
    expect(formatYen(1234567, true)).toBe('¥***,***');
    expect(formatYen(-1, true)).toBe('¥***,***');
  });
});

describe('formatManYen', () => {
  it('万円単位にする', () => {
    expect(formatManYen(12_345_678)).toBe('1,235万');
  });

  it('マスク時は金額を出さない', () => {
    expect(formatManYen(12_345_678, true)).toBe('***万');
  });
});
