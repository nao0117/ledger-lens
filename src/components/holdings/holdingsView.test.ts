import { describe, expect, it } from 'vitest';
import { buildHoldingRows, groupBySecurity } from '../../domain/index.ts';
import type { Holding } from '../../parser/index.ts';
import { makeData } from '../../domain/fixtures/sampleData.ts';
import {
  accountRowCount, changeDisplay, changeKind, countLabel, DEFAULT_SORT, EMPTY_FILTERS, filterChipLabel, filterOptions,
  filterRows, formatJpDate, formatPercent, hasActiveFilters, isExpandable, isNewHolding, isSecuritySortKey, nextSort,
  profitDisplay, securityAccountLabel, securityCountLabel, securityTotals, sortForSecurities, sortLabel, sortRows,
  sortSecurities, sumValues,
} from './holdingsView.ts';

const rows = buildHoldingRows(makeData());
const byName = (r: { name: string; broker: string }[]) => r.map((x) => `${x.broker}/${x.name}`);

describe('sortRows', () => {
  it('評価額の降順（負値は末尾）', () => {
    const v = sortRows(rows, DEFAULT_SORT).map((r) => r.value);
    expect(v).toEqual([...v].sort((a, b) => b - a));
    expect(v[v.length - 1]).toBe(30);
  });
  it('昇順にでき、元の配列は変更しない', () => {
    const before = rows.map((r) => r.id);
    const v = sortRows(rows, { key: 'value', dir: 'asc' }).map((r) => r.value);
    expect(v).toEqual([...v].sort((a, b) => a - b));
    expect(rows.map((r) => r.id)).toEqual(before);
  });
  it('% が null の行は昇順でも降順でも末尾', () => {
    // 2023-12-31 基準: 米国株C は前回 330 → 0 で -100%、信用は前回 20 → -10
    const r = buildHoldingRows(makeData(), '2023-01-31');
    const withNull = r.filter((x) => x.change?.percent === null);
    expect(withNull.length).toBeGreaterThan(0);
    for (const dir of ['asc', 'desc'] as const) {
      const s = sortRows(r, { key: 'changePercent', dir });
      expect(s.slice(-withNull.length).every((x) => x.change?.percent === null)).toBe(true);
    }
  });
  it('文字列は日本語ロケールで並べ、同名は id 順で安定', () => {
    const s = sortRows(rows, { key: 'name', dir: 'asc' });
    expect(byName(s).filter((x) => x.endsWith('サンプル投信A'))).toEqual(['証券会社A/サンプル投信A', '証券会社B/サンプル投信A']);
  });
  it('空配列', () => {
    expect(sortRows([], DEFAULT_SORT)).toEqual([]);
  });
});

describe('nextSort', () => {
  it('同じキーで方向反転、別キーで初期方向', () => {
    expect(nextSort({ key: 'value', dir: 'desc' }, 'value')).toEqual({ key: 'value', dir: 'asc' });
    expect(nextSort({ key: 'value', dir: 'asc' }, 'name')).toEqual({ key: 'name', dir: 'asc' });
    expect(nextSort({ key: 'name', dir: 'asc' }, 'ratio')).toEqual({ key: 'ratio', dir: 'desc' });
  });
});

describe('filterRows', () => {
  it('条件なしは全件', () => {
    expect(filterRows(rows, EMPTY_FILTERS)).toHaveLength(rows.length);
  });
  it('証券会社・口座区分・資産クラス', () => {
    expect(filterRows(rows, { ...EMPTY_FILTERS, broker: '証券会社B' })).toHaveLength(1);
    expect(filterRows(rows, { ...EMPTY_FILTERS, account: 'NISA口座' })).toHaveLength(2);
    expect(filterRows(rows, { ...EMPTY_FILTERS, assetClass: '米国株' })).toHaveLength(1);
  });
  it('銘柄名の検索は部分一致で前後空白を無視', () => {
    expect(filterRows(rows, { ...EMPTY_FILTERS, query: '  投信a ' })).toHaveLength(2);
    expect(filterRows(rows, { ...EMPTY_FILTERS, query: 'ありません' })).toEqual([]);
  });
  it('未分類のみ、および AND 条件', () => {
    const u = filterRows(rows, { ...EMPTY_FILTERS, unclassifiedOnly: true });
    expect(u.map((r) => r.name)).toEqual(['サンプル信用D']);
    expect(filterRows(rows, { ...EMPTY_FILTERS, unclassifiedOnly: true, broker: '証券会社B' })).toEqual([]);
  });
});

describe('filterOptions', () => {
  it('重複なしの選択肢', () => {
    const o = filterOptions(rows);
    expect(o.brokers).toHaveLength(3);
    expect(o.accounts).toContain('NISA口座');
    expect(new Set(o.assetClasses).size).toBe(o.assetClasses.length);
    expect(filterOptions([])).toEqual({ brokers: [], accounts: [], assetClasses: [] });
  });
});

describe('表示判定', () => {
  it('changeKind / isNewHolding', () => {
    const r = buildHoldingRows(makeData(), '2023-01-31');
    const b = r.find((x) => x.broker === '証券会社B')!; // 0 → 40 の新規
    expect(isNewHolding(b)).toBe(true);
    expect(changeKind(b)).toBe('up');
    const first = buildHoldingRows(makeData(), '2022-01-31')[0]!;
    expect(changeKind(first)).toBe('none');
    expect(isNewHolding(first)).toBe(false);
  });
  it('formatPercent', () => {
    expect(formatPercent(0.1234)).toBe('12.3%');
    expect(formatPercent(0.1234, true)).toBe('+12.3%');
    expect(formatPercent(-0.05, true)).toBe('-5.0%');
    expect(formatPercent(0, true)).toBe('0.0%');
  });
});

describe('絞り込み・並べ替えの表示文言', () => {
  it('sortLabel', () => {
    expect(sortLabel(DEFAULT_SORT)).toBe('評価額 ↓');
    expect(sortLabel({ key: 'name', dir: 'asc' })).toBe('銘柄名 ↑');
  });
  it('filterChipLabel は未選択なら項目名、選択中は値', () => {
    expect(filterChipLabel('証券会社', '')).toBe('証券会社');
    expect(filterChipLabel('証券会社', '証券会社A')).toBe('証券会社A');
  });
  it('hasActiveFilters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: '投信' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, account: 'NISA口座' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, unclassifiedOnly: true })).toBe(true);
  });
  it('countLabel と sumValues', () => {
    expect(countLabel(5, 5, false)).toBe('5銘柄');
    expect(countLabel(2, 5, true)).toBe('2 / 5銘柄');
    expect(countLabel(5, 5, true)).toBe('5 / 5銘柄');
    // 最新日: 130 + 250 + 360 + 30 + 70
    expect(sumValues(rows)).toBe(840);
    expect(sumValues([])).toBe(0);
  });
  it('formatJpDate', () => {
    expect(formatJpDate('2026-09-30')).toBe('2026年9月30日');
    expect(formatJpDate('不明')).toBe('不明');
  });
});

describe('changeDisplay', () => {
  const yen = (v: number) => `${v < 0 ? '-' : ''}¥${Math.abs(v)}`;
  const find = (r: typeof rows, name: string) => r.find((x) => x.name === name)!;
  it('増加は符号つきの金額と %', () => {
    // 口座預金 120 → 130
    expect(changeDisplay(find(rows, '口座預金'), yen, false)).toEqual({ kind: 'up', symbol: '▲', text: '+¥10（+8.3%）' });
  });
  it('減少', () => {
    // 2023-12-31: 米国株C 330 → 0
    const r = buildHoldingRows(makeData(), '2023-12-31');
    expect(changeDisplay(find(r, 'サンプル米国株C'), yen, false)).toEqual({ kind: 'down', symbol: '▼', text: '-¥330（-100.0%）' });
  });
  it('新規・前回なし・変化なし', () => {
    expect(changeDisplay(find(rows, 'サンプル米国株C'), yen, false)).toEqual({ kind: 'new', symbol: '', text: '新規' });
    const first = buildHoldingRows(makeData(), '2022-01-31')[0]!;
    expect(changeDisplay(first, yen, false)).toEqual({ kind: 'none', symbol: '', text: '―' });
    const flat = buildHoldingRows(makeData({ '2024-01-31': [5, 5, 5, 5, 5], '2024-02-29': [5, 6, 5, 5, 5] }));
    expect(changeDisplay(find(flat, '口座預金'), yen, false)).toEqual({ kind: 'flat', symbol: '±', text: '変化なし' });
  });
  it('前回が負（信用の損益）のときは絶対値に対する %', () => {
    // 信用 -10 → 30
    expect(changeDisplay(find(rows, 'サンプル信用D'), yen, false).text).toBe('+¥40（+400.0%）');
  });
  it('マスク時は金額に符号を付けない（整形関数の伏せ字のまま）', () => {
    const masked = () => '¥***,***';
    expect(changeDisplay(find(rows, '口座預金'), masked, true).text).toBe('¥***,***（+8.3%）');
  });
});

// ---- 銘柄ごとの表示（銘柄名は架空、金額は適当な値） ----

const sh = (broker: string, account: string, name: string, assetClass: string): Holding => ({
  id: `${broker}|${account}|${name}`, broker, account, name, assetClass, region: assetClass,
});

const SEC_HOLDINGS: Holding[] = [
  sh('現金', '口座預金', '口座預金', '現金'),
  sh('証券会社A', 'NISA口座', 'テスト投信P', '投資信託'),
  sh('証券会社B', '特定口座', 'テスト投信P', '投資信託'),
  sh('証券会社A', '特定口座', 'テスト株Q', '米国株'),
  sh('証券会社A', '信用', 'テスト株Q', '米国株'),
  sh('証券会社B', '信用', 'テスト株R', '国内株'),
  sh('証券会社B', 'NISA口座', 'テスト投信S', '投資信託'),
];

const SEC_VALUES: Record<string, number[]> = {
  '2025-01-31': [500, 300, 100, 200, 40, -20, 0],
  '2025-02-28': [500, 330, 90, 260, -30, 15, 70],
};

const secRows = buildHoldingRows(makeData(SEC_VALUES, SEC_HOLDINGS));
const secs = groupBySecurity(secRows);
const sec = (name: string) => secs.find((s) => s.name === name)!;
const yenPlain = (v: number) => `${v < 0 ? '-' : ''}¥${Math.abs(v)}`;

describe('sortSecurities', () => {
  it('評価額の降順。元の配列は変更しない', () => {
    const before = secs.map((s) => s.key);
    const v = sortSecurities(secs, DEFAULT_SORT).map((s) => s.value);
    expect(v).toEqual([...v].sort((a, b) => b - a));
    expect(secs.map((s) => s.key)).toEqual(before);
  });
  it('% が null（新規）の銘柄は昇順でも降順でも末尾', () => {
    for (const dir of ['asc', 'desc'] as const) {
      const s = sortSecurities(secs, { key: 'changePercent', dir });
      expect(s[s.length - 1]!.name).toBe('テスト投信S');
    }
  });
  it('前回比（金額）は合計どうしの差で並べる', () => {
    const s = sortSecurities(secs, { key: 'changeAmount', dir: 'desc' });
    expect(s[0]!.name).toBe('テスト投信S');
    expect(s.map((x) => x.change!.amount)).toEqual([70, 60, 35, 20, 0]);
  });
  it('銘柄名・資産クラスは日本語ロケールの昇順', () => {
    expect(sortSecurities(secs, { key: 'name', dir: 'asc' }).map((s) => s.name)).toEqual(
      [...secs.map((s) => s.name)].sort((a, b) => a.localeCompare(b, 'ja')),
    );
    const c = sortSecurities(secs, { key: 'assetClass', dir: 'desc' }).map((s) => s.assetClass);
    expect(c).toEqual([...c].sort((a, b) => b.localeCompare(a, 'ja')));
  });
  it('証券会社・口座区分のキーは評価額の降順として扱う', () => {
    expect(sortSecurities(secs, { key: 'broker', dir: 'asc' })).toEqual(sortSecurities(secs, DEFAULT_SORT));
  });
});

describe('sortForSecurities / isSecuritySortKey', () => {
  it('証券会社・口座区分は使えない', () => {
    expect(isSecuritySortKey('broker')).toBe(false);
    expect(isSecuritySortKey('account')).toBe(false);
    expect(isSecuritySortKey('changePercent')).toBe(true);
    expect(sortForSecurities({ key: 'account', dir: 'asc' })).toEqual(DEFAULT_SORT);
    expect(sortForSecurities({ key: 'name', dir: 'desc' })).toEqual({ key: 'name', dir: 'desc' });
  });
});

describe('securityTotals / securityCountLabel', () => {
  it('合計は評価額だけ（信用の損益は別に返す）', () => {
    // 評価額: 現金500 + 投信P 420 + 株Q 260 + 投信S 70。信用: 株Q -30 + 株R 15
    expect(securityTotals(secs)).toEqual({ value: 1250, margin: -15 });
  });
  it('信用がなければ margin は null', () => {
    expect(securityTotals(secs.filter((s) => s.marginValue === null))).toEqual({ value: 990, margin: null });
    expect(securityTotals([])).toEqual({ value: 0, margin: null });
  });
  it('件数は銘柄数と口座の行数', () => {
    expect(accountRowCount(secs)).toBe(7);
    expect(securityCountLabel(secs, secs.length, false)).toBe('5銘柄（7口座）');
  });
  it('絞り込みは口座ごとの行に先に適用してからまとめる', () => {
    const onlyA = groupBySecurity(filterRows(secRows, { ...EMPTY_FILTERS, broker: '証券会社A' }));
    expect(onlyA.find((s) => s.name === 'テスト投信P')!.value).toBe(330);
    expect(securityCountLabel(onlyA, secs.length, true)).toBe('2 / 5銘柄（3口座）');
    expect(securityTotals(onlyA)).toEqual({ value: 590, margin: -30 });
  });
});

describe('isExpandable / securityAccountLabel', () => {
  it('口座が2つ以上、または評価額の行と信用の行があれば開ける', () => {
    expect(isExpandable(sec('テスト投信P'))).toBe(true);
    expect(isExpandable(sec('テスト株Q'))).toBe(true);
    expect(isExpandable(sec('テスト投信S'))).toBe(false);
    expect(isExpandable(sec('テスト株R'))).toBe(false);
  });
  it('口座が1つなら証券会社・口座区分、複数なら口座数', () => {
    expect(securityAccountLabel(sec('テスト投信P'))).toBe('2口座');
    expect(securityAccountLabel(sec('テスト株Q'))).toBe('証券会社A・特定口座');
    expect(securityAccountLabel(sec('テスト株R'))).toBe('証券会社B・信用');
  });
});

describe('profitDisplay', () => {
  it('符号と記号を付ける', () => {
    expect(profitDisplay(15, yenPlain, false)).toEqual({ kind: 'up', symbol: '▲', text: '+¥15' });
    expect(profitDisplay(-30, yenPlain, false)).toEqual({ kind: 'down', symbol: '▼', text: '-¥30' });
    expect(profitDisplay(0, yenPlain, false)).toEqual({ kind: 'flat', symbol: '±', text: '¥0' });
  });
  it('マスク中は yen の伏せ字だけ', () => {
    expect(profitDisplay(15, () => '¥***', true).text).toBe('¥***');
  });
});

describe('changeDisplay（銘柄ごとの行）', () => {
  it('合計どうしの前回比を出す', () => {
    expect(changeDisplay(sec('テスト投信P'), yenPlain, false)).toEqual({ kind: 'up', symbol: '▲', text: '+¥20（+5.0%）' });
    expect(changeDisplay(sec('テスト投信S'), yenPlain, false).kind).toBe('new');
  });
});
