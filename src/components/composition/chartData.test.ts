import { describe, expect, it } from 'vitest';
import { fitLabel, ratioText, toCellNodes } from './chartData.ts';

describe('ratioText', () => {
  it('小数 1 桁の % にする', () => {
    expect(ratioText(1, 4)).toBe('25.0%');
  });
  it('合計が 0 以下なら -', () => {
    expect(ratioText(1, 0)).toBe('-');
  });
  it('0.1% 未満は 2 桁', () => {
    expect(ratioText(1, 5000)).toBe('0.02%');
  });
});

describe('toCellNodes', () => {
  const nodes = [
    { name: 'A社', value: 30, children: [
      { name: '口座1', value: 20, children: [{ name: '銘柄x', value: 20 }] },
      { name: '口座2', value: 10, children: [{ name: '銘柄y', value: 10 }] },
    ] },
    { name: 'B社', value: 10, children: [{ name: '口座1', value: 10, children: [{ name: '銘柄z', value: 10 }] }] },
  ];
  const cells = toCellNodes(nodes, 40);
  it('パス・割合・色番号を付ける', () => {
    expect(cells[1]?.colorIndex).toBe(1);
    expect(cells[0]?.children?.[1]?.shade).toBe(1);
    expect(cells[0]?.children?.[0]?.children?.[0]?.path).toEqual(['A社', '口座1', '銘柄x']);
    expect(cells[0]?.ratio).toBeCloseTo(0.75);
  });
  it('空でも壊れない', () => {
    expect(toCellNodes([], 0)).toEqual([]);
  });
});

describe('fitLabel', () => {
  it('小さいセルでは null', () => {
    expect(fitLabel(20, 40, '銘柄')).toBeNull();
    expect(fitLabel(200, 10, '銘柄')).toBeNull();
  });
  it('長い名前は省略する', () => {
    const l = fitLabel(60, 20, 'とても長い銘柄の名前です');
    expect(l?.name.endsWith('…')).toBe(true);
    expect(Array.from(l?.name ?? '').length).toBeLessThanOrEqual(4);
  });
  it('十分大きければ全文と割合', () => {
    expect(fitLabel(200, 50, '銘柄')).toEqual({ name: '銘柄', showRatio: true });
  });
});
