// 銘柄名は架空、金額は適当な値。
import { describe, expect, it } from 'vitest';
import type { Holding, ParsedAnnual } from '../parser/index.ts';
import { coreName, looksLikeSameSecurity, suggestSameSecurities } from './aliasSuggestions.ts';
import { buildHoldingRows } from './holdingRows.ts';
import { findClassConflicts, groupBySecurity, securityKeyOf } from './securities.ts';

const h = (broker: string, account: string, name: string, assetClass: string, region: string, securityName?: string): Holding => ({
  id: `${broker}|${account}|${name}`,
  broker,
  account,
  name,
  assetClass,
  region,
  ...(securityName ? { securityName } : {}),
});

const HOLDINGS: Holding[] = [
  h('現金', '口座預金', '口座預金', '現金', '現金'),
  h('現金', '貯金', '貯金', '現金', '現金'),
  h('証券会社A', 'NISAつみたて投資枠', 'サンプル全世界', '投資信託', '全世界'),
  h('証券会社A', '特定口座', 'サンプル全世界', '投資信託', '全世界'),
  h('証券会社B', 'NISA成長投資枠', 'サンプル全世界(愛称)', '投資信託', '全世界', 'サンプル全世界'),
  h('証券会社A', '特定口座', 'サンプル米国株X', '米国株', '米国'),
  h('証券会社A', '信用', 'サンプル米国株X', '米国株', '米国'),
  h('証券会社A', '信用', 'サンプル国内株Y', '国内株', '日本'),
  h('証券会社B', '特定口座', 'サンプル投信Z', '投資信託', '米国'),
  h('証券会社B', 'NISA成長投資枠', 'サンプル投信Z', '投資信託', '米国'),
];

const VALUES: Record<string, number[]> = {
  '2026-08-31': [100, 50, 200, 100, 50, 300, 20, -10, 0, 10],
  '2026-09-30': [110, 50, 220, 90, 60, 330, -5, 15, 40, 20],
};

function data(holdings = HOLDINGS, values = VALUES): ParsedAnnual {
  const dates = Object.keys(values).sort();
  return {
    holdings,
    dates,
    snapshots: dates.flatMap((date) => holdings.map((hd, i) => ({ date, holdingId: hd.id, value: values[date]![i]! }))),
    sheetTotals: {},
    warnings: [],
  };
}

const byName = (name: string) => groupBySecurity(buildHoldingRows(data())).find((s) => s.name === name)!;

describe('securityKeyOf', () => {
  it('名寄せ名があればそれを、なければ正規化した銘柄名を使う', () => {
    expect(securityKeyOf(HOLDINGS[4]!)).toBe('サンプル全世界');
    expect(securityKeyOf({ id: 'x', broker: '証券会社A', name: ' サンプル投信Ｚ\t' })).toBe('サンプル投信Z');
  });

  it('現金は行ごとに別のキー', () => {
    expect(securityKeyOf(HOLDINGS[0]!)).not.toBe(securityKeyOf(HOLDINGS[1]!));
  });
});

describe('groupBySecurity', () => {
  it('証券会社・口座区分が違っても、同じ銘柄（名寄せ名を含む）を1行にまとめる', () => {
    const s = byName('サンプル全世界');
    expect(s.members).toHaveLength(3);
    expect(s.value).toBe(370);
    expect(s.previousValue).toBe(350);
    // % は各行の平均ではなく、合計どうしで計算する
    expect(s.change).toEqual({ amount: 20, percent: (20 / 350) * 100 });
    expect(s.ratio).toBeCloseTo(370 / 930);
  });

  it('信用は同じ銘柄にまとめるが、評価額には足さない', () => {
    const s = byName('サンプル米国株X');
    expect(s.members).toHaveLength(1);
    expect(s.marginMembers).toHaveLength(1);
    expect(s.value).toBe(330);
    expect(s.marginValue).toBe(-5);
    expect(s.change?.amount).toBe(30);
    // 総資産の増減への寄与は信用の増減も含む
    expect(s.totalChange).toBe(30 - 25);
  });

  it('信用だけの銘柄は、損益を値として持つ', () => {
    const s = byName('サンプル国内株Y');
    expect(s.marginOnly).toBe(true);
    expect(s.value).toBe(15);
    expect(s.change?.amount).toBe(25);
  });

  it('片方の口座で新規に買っても、合計の前回値があれば % を出せる', () => {
    expect(byName('サンプル投信Z').change).toEqual({ amount: 50, percent: 500 });
  });

  it('現金はまとめない', () => {
    const rows = groupBySecurity(buildHoldingRows(data()));
    expect(rows.filter((s) => s.assetClass === '現金')).toHaveLength(2);
    expect(rows).toHaveLength(6);
  });

  it('評価額の大きい順で、構成比の分母は総資産のまま（絞り込んだ行を渡しても）', () => {
    const all = buildHoldingRows(data());
    const rows = groupBySecurity(all.filter((r) => r.broker === '証券会社A'));
    expect(rows.map((s) => s.name)).toEqual(['サンプル米国株X', 'サンプル全世界', 'サンプル国内株Y']);
    expect(rows.find((s) => s.name === 'サンプル全世界')!.ratio).toBeCloseTo(310 / 930);
  });

  it('前回の日付がなければ前回比は null', () => {
    const one = { '2026-09-30': VALUES['2026-09-30']! };
    const s = groupBySecurity(buildHoldingRows(data(HOLDINGS, one))).find((x) => x.name === 'サンプル全世界')!;
    expect(s.change).toBeNull();
    expect(s.totalChange).toBeNull();
  });

  it('まとめた行どうしで分類が食い違えば classConflict', () => {
    const holdings = HOLDINGS.map((x, i) => (i === 4 ? { ...x, region: '先進国' } : x));
    const s = groupBySecurity(buildHoldingRows(data(holdings))).find((x) => x.name === 'サンプル全世界')!;
    expect(s.classConflict).toBe(true);
    expect(findClassConflicts(holdings)).toEqual(['サンプル全世界']);
    expect(findClassConflicts(HOLDINGS)).toEqual([]);
  });
});

describe('名寄せの候補', () => {
  it('括弧書き・運用会社の接頭辞・省略されやすい語・全角を取り除いて比べる', () => {
    expect(coreName('ＸＹ－サンプルＮＥＸＴ　インド株インデックス')).toBe(coreName('サンプルNEXT インド株インデックス'));
    expect(coreName('サンプル全世界株式(愛称)')).toBe('サンプル全世界株式');
  });

  it.each([
    ['愛称の括弧書き', 'サンプルSlim 全世界株式', 'サンプルSlim 全世界株式(愛称)'],
    ['「インデックスファンド」の省略', 'サンプル新興100インデックスファンド', 'サンプル新興100'],
    ['運用会社名の接頭辞と全角', 'サンプルNEXT インド株インデックス', 'ＸＹ－サンプルＮＥＸＴ　インド株インデックス'],
  ])('同じ銘柄の候補にする: %s', (_, a, b) => {
    expect(looksLikeSameSecurity(a, b)).toBe(true);
  });

  it.each([
    ['Slim の有無（別のファンド）', 'サンプルSlim 全世界株式', 'サンプル 全世界株式インデックス'],
    ['先進国と全世界', 'サンプルSlim 先進国株式', 'サンプルSlim 全世界株式'],
    ['同じ指数の別会社のファンド', 'サンプル米国株式500', 'ベツ社・米国株式500インデックス・ファンド(愛称)'],
    ['為替ヘッジの有無', 'サンプル先進国株式(為替ヘッジあり)', 'サンプル先進国株式'],
    ['決算頻度の違い', 'サンプル高配当(毎月分配型)', 'サンプル高配当'],
    ['短い社名が長い社名に含まれる', '東サンプル', '東サンプル不動産'],
  ])('候補にしない: %s', (_, a, b) => {
    expect(looksLikeSameSecurity(a, b)).toBe(false);
  });

  it('すでに同じ名寄せ名でまとまっているもの・現金は対象外で、つながる候補は1つにまとめる', () => {
    const holdings = [
      ...HOLDINGS,
      h('証券会社B', '特定口座', 'サンプル新興100', '投資信託', '米国'),
      h('証券会社A', 'NISA成長投資枠', 'サンプル新興100インデックスファンド', '投資信託', '米国'),
      h('証券会社A', '特定口座', 'サンプル新興100インデックス・ファンド(愛称)', '投資信託', '米国'),
    ];
    expect(suggestSameSecurities(holdings)).toEqual([
      ['サンプル新興100', 'サンプル新興100インデックス・ファンド(愛称)', 'サンプル新興100インデックスファンド'],
    ]);
  });
});
