import { describe, expect, it } from 'vitest';
import { buildTrendModel, formatDateJa, formatMonthLabel, tickInterval, OTHER_LABEL, TOTAL_LABEL } from './model.ts';

const mk = (n: number) => {
  const holdings = Array.from({ length: n }, (_, i) => ({
    id: `h${i}`, name: `架空${i}`, assetClass: `クラス${i}`, broker: i === 0 ? '現金' : `社${i}`, account: '特定',
  }));
  const dates = ['2024-01-01', '2026-01-01'];
  const snapshots = dates.flatMap((date) => holdings.map((h, i) => ({ date, holdingId: h.id, value: i === 1 ? -100 : 1000 + i })));
  return { holdings, snapshots, dates } as never;
};

describe('buildTrendModel', () => {
  it('none は総資産の1系列（負も合算）', () => {
    const m = buildTrendModel(mk(3), 'none', 'all');
    expect(m.keys).toEqual([TOTAL_LABEL]);
    expect(m.rows[0]!.values[TOTAL_LABEL]).toBe(1000 + -100 + 1002);
  });
  it('期間で絞る', () => {
    expect(buildTrendModel(mk(3), 'none', '1y').rows).toHaveLength(1);
  });
  it('9グループ以上は その他 にまとめ、合計は変わらない', () => {
    const m = buildTrendModel(mk(10), 'assetClass', 'all');
    expect(m.keys).toHaveLength(8);
    expect(m.keys.at(-1)).toBe(OTHER_LABEL);
    const r = m.rows[0]!;
    expect(Object.values(r.values).reduce((a, b) => a + b, 0)).toBe(r.total);
  });
  it('空でも壊れない', () => {
    const m = buildTrendModel({ holdings: [], snapshots: [], dates: [] }, 'broker', 'all');
    expect(m.rows).toEqual([]);
  });
});

describe('表示用', () => {
  it('日付', () => {
    expect(formatMonthLabel('2026-03-15')).toBe('26/3');
    expect(formatDateJa('2026-03-05')).toBe('2026年3月5日');
    expect(formatMonthLabel('x')).toBe('x');
  });
  it('間引き', () => {
    expect(tickInterval(5, 6)).toBe(0);
    expect(tickInterval(30, 6)).toBe(4);
  });
});
