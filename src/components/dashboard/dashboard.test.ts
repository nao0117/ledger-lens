import { describe, expect, it } from 'vitest';
import { buildHoldingRows } from '../../domain/index.ts';
import { buildAllocation, cashStockRatio } from './allocation.ts';
import { direction, formatRatio, formatSignedPercent, monthLabel, signedYen } from './format.ts';
import { topMovers } from './movers.ts';

const holdings = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((x, i) => ({
  id: `h${i}`, name: `架空銘柄${x}`, assetClass: i % 2 === 0 ? '投資信託' : '米国株', broker: `架空証券${i % 2}`, account: '特定', region: '',
}));
// 前回 → 今回の変化: +500, -800, +30, 0, +120, -60, +7, -2
const deltas = [500, -800, 30, 0, 120, -60, 7, -2];
const data = {
  holdings,
  dates: ['2026-08-31', '2026-09-30'],
  snapshots: holdings.flatMap((h, i) => [
    { date: '2026-08-31', holdingId: h.id, value: 1000 + i * 37 },
    { date: '2026-09-30', holdingId: h.id, value: 1000 + i * 37 + deltas[i]! },
  ]),
} as never;

describe('topMovers', () => {
  it('前回比の絶対値が大きい順に上位 n 件、残りはまとめる', () => {
    const m = topMovers(buildHoldingRows(data, '2026-09-30'), 5)!;
    expect(m.items.map((i) => i.amount)).toEqual([-800, 500, 120, -60, 30]);
    expect(m.items.map((i) => i.name)[0]).toBe('架空銘柄B');
    expect(m.items[0]!.scale).toBe(1);
    expect(m.items[1]!.scale).toBeCloseTo(500 / 800);
    // 変化 0 の銘柄は数えない
    expect(m.rest).toEqual({ count: 2, amount: 7 - 2 });
    expect(m.total).toBe(deltas.reduce((a, b) => a + b, 0));
  });
  it('前回の日付がなければ null', () => {
    expect(topMovers(buildHoldingRows(data, '2026-08-31'), 5)).toBeNull();
    expect(topMovers([], 5)).toBeNull();
  });
  it('件数が n より少なくても壊れない', () => {
    const m = topMovers(buildHoldingRows(data, '2026-09-30'), 20)!;
    expect(m.items).toHaveLength(7);
    expect(m.rest).toEqual({ count: 0, amount: 0 });
  });
  it('全部 0 なら空の一覧', () => {
    const rows = buildHoldingRows(data, '2026-09-30').map((r) => ({ ...r, change: { amount: 0, percent: 0 } }));
    expect(topMovers(rows, 5)).toEqual({ items: [], rest: { count: 0, amount: 0 }, total: 0 });
  });
});

describe('buildAllocation', () => {
  it('棒の幅は正の値の合計を 1 とし、負のクラスは 0', () => {
    const a = buildAllocation([
      { key: '投資信託', value: 600, ratio: 600 / 900 },
      { key: '米国株', value: 400, ratio: 400 / 900 },
      { key: '信用', value: -100, ratio: -100 / 900 },
    ]);
    expect(a.map((x) => x.width)).toEqual([0.6, 0.4, 0]);
    expect(a[2]!.ratio).toBeCloseTo(-0.111, 3);
  });
  it('空・合計 0 でも壊れない', () => {
    expect(buildAllocation([])).toEqual([]);
    expect(buildAllocation([{ key: 'A', value: 0, ratio: 0 }])[0]!.width).toBe(0);
  });
});

describe('cashStockRatio', () => {
  it('比率', () => {
    expect(cashStockRatio(250, 750)).toEqual({ cashRatio: 0.25, stockRatio: 0.75 });
  });
  it('負や合計 0 は null', () => {
    expect(cashStockRatio(0, 0)).toBeNull();
    expect(cashStockRatio(100, -10)).toBeNull();
  });
});

describe('整形', () => {
  it('比率・符号・月', () => {
    expect(formatRatio(0.1234)).toBe('12.3%');
    expect(formatSignedPercent(2.345)).toBe('+2.3%');
    expect(formatSignedPercent(-1)).toBe('-1.0%');
    expect(formatSignedPercent(null)).toBe('-');
    expect(direction(-1)).toBe('down');
    expect(signedYen(5, (v) => `¥${v}`)).toBe('+¥5');
    expect(monthLabel('2026-09-30')).toBe('9月');
    expect(monthLabel('x')).toBe('');
  });
});
