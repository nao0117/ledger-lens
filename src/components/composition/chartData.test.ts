import { describe, expect, it } from 'vitest';
import {
  cellKey, changeView, dateJa, fitLabel, isUnclassified, legendClasses, ratioText, toCellNodes, truncateToWidth,
} from './chartData.ts';

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
      { name: '口座1', value: 20, children: [{ name: '銘柄x', value: 20, id: 'ax', assetClass: '投資信託' }] },
      { name: '口座2', value: 10, children: [{ name: '銘柄y', value: 10, id: 'ay', assetClass: '未分類' }] },
    ] },
    { name: 'B社', value: 10, children: [{ name: '口座1', value: 10, children: [{ name: '銘柄z', value: 10, id: 'bz', assetClass: '米国株' }] }] },
    { name: '現金', value: 5, children: [{ name: '銀行', value: 5, children: [{ name: '預金', value: 5, id: 'c', assetClass: '未分類' }] }] },
  ];
  const cells = toCellNodes(nodes, 40);
  const leafX = cells[0]?.children?.[0]?.children?.[0];
  it('パス・割合を付け、葉の銘柄ID・資産クラスを引き継ぐ', () => {
    expect(leafX?.path).toEqual(['A社', '口座1', '銘柄x']);
    expect(leafX?.id).toBe('ax');
    expect(leafX?.assetClass).toBe('投資信託');
    expect(cells[0]?.ratio).toBeCloseTo(0.75);
    expect(cells[0]?.children?.[1]?.path).toEqual(['A社', '口座2']);
    expect('id' in (cells[0] ?? {})).toBe(false);
  });
  it('空でも壊れない', () => {
    expect(toCellNodes([], 0)).toEqual([]);
    expect(toCellNodes(nodes, 0)[0]?.ratio).toBe(0);
  });
  it('cellKey は銘柄なら ID、それ以外はパス', () => {
    expect(cellKey(leafX!)).toBe('ax');
    expect(cellKey(cells[0]!)).toBe('A社');
    expect(cellKey(cells[0]!.children![0]!)).not.toBe(cellKey(cells[1]!.children![0]!));
  });
  it('isUnclassified は現金を除く', () => {
    expect(isUnclassified(cells[0]!.children![1]!.children![0]!)).toBe(true);
    expect(isUnclassified(cells[2]!.children![0]!.children![0]!)).toBe(false);
    expect(isUnclassified(leafX!)).toBe(false);
  });
  it('legendClasses は図に出る資産クラスを評価額の大きい順に', () => {
    expect(legendClasses(cells)).toEqual(['投資信託', '未分類', '米国株']);
    expect(legendClasses([])).toEqual([]);
  });
});

describe('changeView', () => {
  it('増減の記号と符号付き %', () => {
    expect(changeView({ amount: 50, percent: 4.56 })).toEqual({ kind: 'up', symbol: '▲', percent: '+4.6%' });
    expect(changeView({ amount: -5, percent: -2 })).toEqual({ kind: 'down', symbol: '▼', percent: '-2.0%' });
    expect(changeView({ amount: 0, percent: 0 })).toEqual({ kind: 'flat', symbol: '±', percent: '0.0%' });
  });
  it('前回なし・% なし', () => {
    expect(changeView(null)).toEqual({ kind: 'none', symbol: '', percent: null });
    expect(changeView({ amount: 10, percent: null }).percent).toBeNull();
  });
});

describe('dateJa', () => {
  it('年月日にする', () => {
    expect(dateJa('2026-09-30')).toBe('2026年9月30日');
    expect(dateJa('不正')).toBe('不正');
  });
});

describe('truncateToWidth', () => {
  it('幅に収まるよう省略し、2 文字も入らなければ null', () => {
    expect(truncateToWidth('銘柄', 100)).toBe('銘柄');
    expect(truncateToWidth('とても長い名前', 36)).toBe('とて…');
    expect(truncateToWidth('銘柄', 20)).toBeNull();
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
