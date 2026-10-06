import { describe, expect, it } from 'vitest';
import type { Holding } from '../parser/index.ts';
import { breakdownSeries, composition, computeDailyTotals } from './index.ts';
import { makeData } from './fixtures/sampleData.ts';

const h = (broker: string, account: string, name: string, extra: Partial<Holding> = {}): Holding => ({
  id: `${broker}|${account}|${name}`, broker, account, name, assetClass: '投資信託', region: '投資信託', ...extra,
});

const HOLDINGS: Holding[] = [
  h('現金', '口座預金', '口座預金', { assetClass: '現金' }),
  h('現金', '貯金', '貯金', { assetClass: '現金' }),
  h('証券会社A', 'NISA口座', 'サンプル投信A'),
  h('証券会社B', '特定口座', 'サンプル投信A'),
  h('証券会社A', '特定口座', 'サンプル米国株C', { assetClass: '米国株' }),
  h('証券会社A', '信用', 'サンプル米国株C', { assetClass: '米国株' }),
  h('証券会社A', '特定口座', 'ＳＡＭＰＬＥ表記ゆれ', { securityName: '名寄せ銘柄X' }),
  h('証券会社B', '特定口座', '別名の同じ銘柄', { securityName: '名寄せ銘柄X' }),
];
const VALUES = {
  '2023-01-31': [100, 10, 200, 100, 300, -20, 50, 60],
  '2024-01-31': [120, 20, 250, 150, 400, 30, 70, 80],
};
const data = makeData(VALUES, HOLDINGS);

describe("breakdownSeries('security')", () => {
  const s = breakdownSeries(data, 'security');
  const last = s.rows[1]!;
  it('口座をまたいだ同じ銘柄は1系列', () => {
    expect(last.values['サンプル投信A']).toBe(400);
  });
  it('名寄せ名でまとまり、系列名は最初の銘柄の名寄せ名', () => {
    expect(last.values['名寄せ銘柄X']).toBe(150);
    expect(s.keys).not.toContain('別名の同じ銘柄');
  });
  it('現金は口座預金・貯金を合わせた1系列', () => {
    expect(last.values['現金']).toBe(140);
    expect(s.keys.filter((k) => k === '現金')).toHaveLength(1);
  });
  it('信用の行は同じ銘柄に符号付きで足される', () => {
    expect(s.rows[0]!.values['サンプル米国株C']).toBe(280);
    expect(last.values['サンプル米国株C']).toBe(430);
  });
  it('全系列の合計が各日の総資産と一致する', () => {
    const totals = computeDailyTotals(data);
    s.rows.forEach((r, i) => {
      expect(Object.values(r.values).reduce((a, b) => a + b, 0)).toBe(totals[i]!.total);
      expect(r.total).toBe(totals[i]!.total);
    });
  });
  it('最新日の値が大きい順', () => {
    expect(s.keys).toEqual(['サンプル米国株C', 'サンプル投信A', '名寄せ銘柄X', '現金']);
  });
  it('composition でも使える', () => {
    const c = composition(data, 'security');
    expect(c[0]).toMatchObject({ key: 'サンプル米国株C', value: 430 });
    expect(c.reduce((a, x) => a + x.ratio, 0)).toBeCloseTo(1);
  });
});

describe('既存の内訳は変わらない', () => {
  it('broker / account / assetClass', () => {
    expect(breakdownSeries(data, 'broker').rows[1]!.values['証券会社A']).toBe(250 + 400 + 30 + 70);
    expect(breakdownSeries(data, 'account').keys).toContain('信用');
    expect(breakdownSeries(data, 'assetClass').rows[1]!.values['現金']).toBe(140);
  });
});
