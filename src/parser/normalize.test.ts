import { describe, expect, it } from 'vitest';
import { isBlank, normalizeLabel } from './normalize.ts';

describe('normalizeLabel', () => {
  it('前後の空白とタブを除去する', () => {
    expect(normalizeLabel('NISA成長投資枠\t')).toBe('NISA成長投資枠');
    expect(normalizeLabel('  サンプル投信A 　')).toBe('サンプル投信A');
  });

  it('全角・半角を統一する', () => {
    expect(normalizeLabel('ＮＩＳＡ口座')).toBe('NISA口座');
    expect(normalizeLabel('サンプル米国株Ｃ')).toBe('サンプル米国株C');
  });

  it('途中の連続した空白は1つにまとめる', () => {
    expect(normalizeLabel('サンプル  投信')).toBe('サンプル 投信');
  });

  it('空のセルは空文字にする', () => {
    expect(normalizeLabel(null)).toBe('');
    expect(normalizeLabel(undefined)).toBe('');
  });
});

describe('isBlank', () => {
  it('空文字・空白・null を空とみなす。0 は空ではない', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank(' \t')).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank(0)).toBe(false);
  });
});
