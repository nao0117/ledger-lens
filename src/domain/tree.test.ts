// 銘柄名は架空、金額は適当な値。
import { describe, expect, it } from 'vitest';
import type { Holding, ParsedAnnual } from '../parser/index.ts';
import { buildSecurityTree } from './tree.ts';

const h = (broker: string, account: string, name: string, assetClass: string, securityName?: string): Holding => ({
  id: `${broker}|${account}|${name}`,
  broker,
  account,
  name,
  assetClass,
  region: '-',
  ...(securityName ? { securityName } : {}),
});

const HOLDINGS: Holding[] = [
  h('現金', '口座預金', '口座預金', '現金'),
  h('現金', '貯金', '貯金', '現金'),
  h('証券会社A', 'NISA', '架空全世界', '投資信託'),
  h('証券会社B', '特定口座', '架空全世界(愛称)', '投資信託', '架空全世界'),
  h('証券会社A', '特定口座', '架空米国株X', '米国株'),
  h('証券会社A', '信用', '架空米国株X', '米国株'),
  h('証券会社A', '信用', '架空国内株Y', '国内株'),
  h('証券会社B', '特定口座', '架空投信Z', '投資信託'),
  h('証券会社B', '特定口座', '架空未保有', '米国株'),
];
const VALUES = [100, 50, 200, 100, 300, 25, -10, 40, 0];

const DATA: ParsedAnnual = {
  holdings: HOLDINGS,
  dates: ['2026-09-30'],
  snapshots: HOLDINGS.map((hd, i) => ({ date: '2026-09-30', holdingId: hd.id, value: VALUES[i]! })),
  sheetTotals: {},
  warnings: [],
};

describe('buildSecurityTree', () => {
  const tree = buildSecurityTree(DATA, '2026-09-30');
  const group = (name: string) => tree.nodes.find((n) => n.name === name)!;

  it('口座をまたいだ同じ銘柄（名寄せ名）が 1 つの葉になり、評価額を合算する', () => {
    const fund = group('投資信託');
    const leaf = fund.children.find((l) => l.name === '架空全世界')!;
    expect(leaf.value).toBe(300);
    expect(leaf.accountCount).toBe(2);
    expect(leaf.assetClass).toBe('投資信託');
    expect(fund.children.filter((l) => l.name.startsWith('架空全世界'))).toHaveLength(1);
    expect(fund.value).toBe(340);
  });

  it('信用の損益は面積に含めず、図に出ない分は excludedMargin に集める', () => {
    expect(group('米国株').children.map((l) => [l.name, l.value])).toEqual([['架空米国株X', 300]]);
    expect(tree.nodes.some((n) => n.name === '国内株')).toBe(false);
    expect(tree.excludedMargin).toBe(15);
  });

  it('保有なし（値 0）の銘柄は図に出ない', () => {
    expect(tree.nodes.flatMap((n) => n.children).some((l) => l.name === '架空未保有')).toBe(false);
  });

  it('現金は 1 つの箱にまとまる', () => {
    expect(tree.nodes.filter((n) => n.name === '現金')).toHaveLength(1);
    expect(group('現金').value).toBe(150);
  });

  it('箱と葉は評価額の大きい順で、合計が shownTotal に一致する', () => {
    const values = tree.nodes.map((n) => n.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(tree.shownTotal).toBe(790);
    expect(tree.securities.size).toBeGreaterThan(0);
  });

  it('日付が無ければ空', () => {
    expect(buildSecurityTree({ holdings: [], snapshots: [], dates: [] }, '2026-09-30').nodes).toEqual([]);
  });
});
