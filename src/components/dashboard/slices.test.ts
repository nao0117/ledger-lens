import { describe, expect, it } from 'vitest';
import { buildSlices, direction, formatRatio, formatSignedPercent, signedYen } from './slices.ts';

describe('slices', () => {
  it('比率と色を固定順で割り当てる', () => {
    const s = buildSlices([
      { key: 'A', value: 75 },
      { key: 'B', value: 25 },
    ]);
    expect(s.map((x) => x.ratio)).toEqual([0.75, 0.25]);
    expect(s.map((x) => x.color)).toEqual(['var(--series-1)', 'var(--series-2)']);
  });
  it('9 件目以降は「その他」にまとめる', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ key: `k${i}`, value: 10 - i }));
    const s = buildSlices(items);
    expect(s).toHaveLength(8);
    expect(s[7]?.name).toBe('その他');
    expect(s[7]?.value).toBe(3 + 2 + 1);
  });
  it('空・合計 0・負の値でも壊れない', () => {
    expect(buildSlices([])).toEqual([]);
    expect(buildSlices([{ key: 'A', value: 0 }])[0]?.ratio).toBe(0);
    expect(buildSlices([{ key: 'A', value: -5 }])[0]?.drawable).toBe(false);
  });
  it('整形', () => {
    expect(formatRatio(0.1234)).toBe('12.3%');
    expect(formatSignedPercent(2.345)).toBe('+2.3%');
    expect(formatSignedPercent(-1)).toBe('-1.0%');
    expect(formatSignedPercent(null)).toBe('-');
    expect(direction(-1)).toBe('down');
    expect(signedYen(5, (v) => `¥${v}`)).toBe('+¥5');
  });
});
