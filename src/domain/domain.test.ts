import { describe, expect, it } from 'vitest';
import { applyMaster, parseAnnualSheet, parseMasterSheet } from '../parser/index.ts';
import { buildAnnualGrid, MASTER_GRID } from '../parser/fixtures/sampleSheets.ts';
import {
  breakdownSeries, buildHoldingRows, buildTree, composition, computeChange, computeDailyTotals,
  filterByPeriod, previousDate, shiftYears, summarize, yearAgoDate,
} from './index.ts';
import { makeData } from './fixtures/sampleData.ts';

const data = makeData();
const empty = { holdings: [], snapshots: [], dates: [], sheetTotals: {}, warnings: [] };

describe('dates', () => {
  it('shiftYears はうるう日を丸める', () => {
    expect(shiftYears('2024-02-29', -1)).toBe('2023-02-28');
    expect(shiftYears('2024-03-31', -3)).toBe('2021-03-31');
  });
  it('previousDate / yearAgoDate', () => {
    expect(previousDate(data.dates, '2024-01-31')).toBe('2023-12-31');
    expect(previousDate(data.dates, '2022-01-31')).toBeNull();
    expect(yearAgoDate(data.dates, '2024-01-31')).toBe('2023-01-31');
    expect(yearAgoDate(data.dates, '2023-12-31')).toBe('2022-01-31');
    expect(yearAgoDate(data.dates, '2023-01-31')).toBe('2022-01-31');
    expect(yearAgoDate(data.dates, '2022-01-31')).toBeNull();
  });
});

describe('computeDailyTotals', () => {
  it('現金・株式・総資産を明細から計算し、信用は損益として加算する', () => {
    const t = computeDailyTotals(data);
    expect(t[0]).toEqual({ date: '2022-01-31', total: 550, cash: 100, stock: 450 });
    expect(t[3]).toEqual({ date: '2024-01-31', total: 840, cash: 130, stock: 710 });
  });
  it('空データ', () => {
    expect(computeDailyTotals(empty)).toEqual([]);
    expect(summarize(empty)).toBeNull();
  });
  it('パーサー出力のダミーと、シートの集計行が一致する', () => {
    const parsed = parseAnnualSheet(buildAnnualGrid());
    const t = computeDailyTotals(parsed);
    for (const d of t) {
      expect(d.total).toBe(parsed.sheetTotals[d.date]?.all);
      expect(d.cash).toBe(parsed.sheetTotals[d.date]?.cash);
      expect(d.stock).toBe(parsed.sheetTotals[d.date]?.stock);
    }
  });
});

describe('computeChange / summarize', () => {
  it('0 除算は percent が null', () => {
    expect(computeChange(10, 0)).toEqual({ amount: 10, percent: null });
    expect(computeChange(10, null)).toBeNull();
    expect(computeChange(150, 100)).toEqual({ amount: 50, percent: 50 });
    expect(computeChange(-50, -100)?.percent).toBe(50);
  });
  it('前回比と前年同時期比', () => {
    const s = summarize(data);
    expect(s?.date).toBe('2024-01-31');
    expect(s?.vsPrevious).toMatchObject({ date: '2023-12-31', amount: 840 - 410 });
    expect(s?.vsYearAgo).toMatchObject({ date: '2023-01-31', amount: 840 - 720 });
  });
  it('日付が 1 つだけなら比較は null', () => {
    const s = summarize(makeData({ '2024-01-31': [1, 2, 3, 4, 5] }));
    expect(s?.vsPrevious).toBeNull();
    expect(s?.vsYearAgo).toBeNull();
  });
  it('基準日を指定できる。存在しない日付は null', () => {
    expect(summarize(data, '2023-01-31')?.vsYearAgo?.date).toBe('2022-01-31');
    expect(summarize(data, '2000-01-01')).toBeNull();
  });
  it('前回の総資産が 0 でも壊れない', () => {
    const s = summarize(makeData({ '2023-01-31': [0, 0, 0, 0, 0], '2023-02-28': [5, 0, 0, 0, 0] }));
    expect(s?.vsPrevious).toMatchObject({ amount: 5, percent: null });
  });
});

describe('filterByPeriod', () => {
  const rows = computeDailyTotals(data);
  it('期間で絞る（最新日の N 年前を含む）', () => {
    expect(filterByPeriod(rows, '1y').map((r) => r.date)).toEqual(['2023-01-31', '2023-12-31', '2024-01-31']);
    expect(filterByPeriod(rows, '3y')).toHaveLength(4);
    expect(filterByPeriod(rows, 'all')).toHaveLength(4);
  });
  it('空でも壊れない', () => {
    expect(filterByPeriod([], '1y')).toEqual([]);
  });
});

describe('breakdown / composition', () => {
  it('証券会社別の時系列。各行の合計は総資産と一致する', () => {
    const s = breakdownSeries(data, 'broker');
    expect(s.keys).toEqual(['証券会社A', '現金', '証券会社B']);
    expect(s.rows[0]?.values).toEqual({ 現金: 100, 証券会社A: 450, 証券会社B: 0 });
    expect(s.rows.map((r) => r.total)).toEqual(computeDailyTotals(data).map((t) => t.total));
  });
  it('口座区分別に信用が含まれる', () => {
    expect(breakdownSeries(data, 'account').rows[0]?.values['信用']).toBe(-50);
  });
  it('構成比の合計は 1', () => {
    const c = composition(data, 'assetClass');
    expect(c.reduce((a, x) => a + x.ratio, 0)).toBeCloseTo(1);
    expect(composition(data, 'assetClass', '2022-01-31').find((x) => x.key === '未分類')?.ratio).toBeCloseTo(-50 / 550);
  });
  it('空データ・合計 0', () => {
    expect(breakdownSeries(empty, 'broker')).toEqual({ keys: [], rows: [] });
    expect(composition(empty, 'broker')).toEqual([]);
    const zero = makeData({ '2024-01-31': [0, 0, 0, 0, 0] });
    expect(composition(zero, 'broker').every((x) => x.ratio === 0)).toBe(true);
  });
});

describe('buildTree', () => {
  it('証券会社 → 口座区分 → 銘柄。0 以下は除外して excludedTotal に集計', () => {
    const t = buildTree(data, '2022-01-31');
    expect(t.excludedTotal).toBe(-50);
    expect(t.shownTotal).toBe(600);
    expect(t.shownTotal + t.excludedTotal).toBe(550);
    expect(t.nodes.map((n) => n.name)).toEqual(['証券会社A', '現金']);
    const a = t.nodes[0];
    expect(a?.value).toBe(500);
    expect(a?.children?.map((c) => c.name)).toEqual(['特定口座', 'NISA口座']);
    expect(a?.children?.[0]?.children).toEqual([{ name: 'サンプル米国株C', value: 300 }]);
  });
  it('正の信用損益は載る', () => {
    const t = buildTree(data, '2024-01-31');
    expect(t.nodes[0]?.children?.map((c) => c.name)).toContain('信用');
    expect(t.excludedTotal).toBe(0);
  });
  it('存在しない日付・空データ', () => {
    expect(buildTree(data, '2000-01-01')).toEqual({ nodes: [], shownTotal: 0, excludedTotal: 0 });
    expect(buildTree(empty, '2024-01-31').nodes).toEqual([]);
  });
});

describe('buildHoldingRows', () => {
  it('最新評価額・構成比・前回比', () => {
    const rows = buildHoldingRows(data);
    expect(rows[0]?.name).toBe('サンプル米国株C');
    expect(rows[0]).toMatchObject({ value: 360, previousValue: 0, unclassified: false });
    expect(rows[0]?.change).toEqual({ amount: 360, percent: null });
    expect(rows.reduce((a, r) => a + r.ratio, 0)).toBeCloseTo(1);
    const margin = rows.find((r) => r.account === '信用');
    expect(margin?.unclassified).toBe(true);
    expect(margin?.change?.amount).toBe(40);
  });
  it('日付が 1 つ・空データ', () => {
    const one = buildHoldingRows(makeData({ '2024-01-31': [1, 2, 3, 4, 5] }));
    expect(one.every((r) => r.change === null && r.previousValue === null)).toBe(true);
    expect(buildHoldingRows(empty)).toEqual([]);
  });
  it('パーサー + 銘柄マスタ経由でも動く（現金は未分類にならない）', () => {
    const parsed = parseAnnualSheet(buildAnnualGrid());
    const holdings = applyMaster(parsed.holdings, parseMasterSheet(MASTER_GRID));
    const rows = buildHoldingRows({ ...parsed, holdings });
    expect(rows.filter((r) => r.broker === '現金').every((r) => !r.unclassified)).toBe(true);
    expect(rows.reduce((a, r) => a + r.ratio, 0)).toBeCloseTo(1);
  });
});
