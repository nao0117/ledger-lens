import { describe, expect, it } from 'vitest';
import {
  axisYenFormatter,
  buildLegend,
  buildTrendModel,
  formatDateJa,
  formatMonthLabel,
  maxAbsValue,
  periodChange,
  tickInterval,
  trendColor,
  MAX_SERIES,
  OTHER_LABEL,
  seriesLabel,
  TOTAL_LABEL,
} from './model.ts';

const mk = (n: number, dates = ['2024-01-01', '2026-01-01'], className = (i: number) => `クラス${i}`) => {
  const holdings = Array.from({ length: n }, (_, i) => ({
    id: `h${i}`, name: `架空${i}`, assetClass: className(i), broker: i === 0 ? '現金' : `社${i}`, account: '特定',
  }));
  const snapshots = dates.flatMap((date, d) => holdings.map((h, i) => ({ date, holdingId: h.id, value: i === 1 ? -100 : 1000 + i + d * 10 })));
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
  it('基準日より後を除いてから期間で絞る（基準日が終点）', () => {
    const data = mk(2, ['2023-06-30', '2024-06-30', '2025-06-30', '2026-06-30']);
    const m = buildTrendModel(data, 'none', '1y', '2025-06-30');
    expect(m.rows.map((r) => r.date)).toEqual(['2024-06-30', '2025-06-30']);
    const b = buildTrendModel(data, 'broker', 'all', '2024-06-30');
    expect(b.rows.map((r) => r.date)).toEqual(['2023-06-30', '2024-06-30']);
  });
  it('基準日が null・未指定なら全日付', () => {
    expect(buildTrendModel(mk(2), 'none', 'all', null).rows).toHaveLength(2);
  });
  it('9グループ以上は その他 にまとめ、合計は変わらない', () => {
    const m = buildTrendModel(mk(10), 'assetClass', 'all');
    expect(m.keys).toHaveLength(8);
    expect(m.keys.at(-1)).toBe(OTHER_LABEL);
    const r = m.rows[0]!;
    expect(Object.values(r.values).reduce((a, b) => a + b, 0)).toBe(r.total);
  });
  it('「その他」という名前のグループがあっても合計が変わらない', () => {
    const m = buildTrendModel(mk(10, undefined, (i) => (i === 9 ? OTHER_LABEL : `クラス${i}`)), 'assetClass', 'all');
    expect(m.keys.filter((k) => k === OTHER_LABEL)).toHaveLength(1);
    for (const r of m.rows) expect(Object.values(r.values).reduce((a, b) => a + b, 0)).toBe(r.total);
  });
  it('空でも壊れない', () => {
    const m = buildTrendModel({ holdings: [], snapshots: [], dates: [] }, 'broker', 'all', '2026-01-01');
    expect(m.rows).toEqual([]);
  });
});

describe('色・凡例', () => {
  it('資産クラスは固定色、それ以外は系列色、合計はアクセント色', () => {
    expect(trendColor('assetClass', '投資信託', 3)).toBe('var(--cat-fund)');
    expect(trendColor('assetClass', '架空クラス', 2)).toBe('var(--series-3)');
    expect(trendColor('broker', '投資信託', 0)).toBe('var(--series-1)');
    expect(trendColor('none', TOTAL_LABEL, 0)).toBe('var(--accent)');
  });
  it('凡例は終点時点の比率', () => {
    const model = {
      keys: ['A', 'B'],
      rows: [
        { date: '2025-01-01', values: { A: 1, B: 1 }, total: 2 },
        { date: '2026-01-01', values: { A: 30, B: 10 }, total: 40 },
      ],
    };
    expect(buildLegend(model, 'broker').map((l) => l.ratio)).toEqual([0.75, 0.25]);
    expect(buildLegend({ keys: ['A'], rows: [] }, 'broker')[0]!.ratio).toBeNull();
  });
});

describe('periodChange', () => {
  it('始点から終点までの増減', () => {
    const c = periodChange([
      { date: '2025-01-01', values: {}, total: 200 },
      { date: '2025-06-01', values: {}, total: 50 },
      { date: '2026-01-01', values: {}, total: 250 },
    ]);
    expect(c).toEqual({ amount: 50, percent: 25, from: '2025-01-01', to: '2026-01-01' });
  });
  it('1点以下は null', () => {
    expect(periodChange([])).toBeNull();
    expect(periodChange([{ date: '2026-01-01', values: {}, total: 1 }])).toBeNull();
  });
});

describe('Y 軸の目盛り', () => {
  it('値域に応じて単位を変える', () => {
    expect(axisYenFormatter(5_000_000)(1_234_567)).toBe('123万');
    expect(axisYenFormatter(50_000)(15_000)).toBe('1.5万');
    expect(axisYenFormatter(50_000)(20_000)).toBe('2万');
    expect(axisYenFormatter(5_000)(2_500)).toBe('2,500円');
    expect(axisYenFormatter(5_000)(-2_500)).toBe('-2,500円');
  });
  it('マスク時は金額を出さない', () => {
    expect(axisYenFormatter(5_000_000, true)(1_234_567)).toBe('***');
  });
  it('maxAbsValue は合計と符号別の積み上げを見る', () => {
    expect(maxAbsValue([{ date: 'x', values: { A: 300, B: -500 }, total: -200 }])).toBe(500);
    expect(maxAbsValue([])).toBe(0);
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

describe('銘柄の内訳', () => {
  const sec = (n: number) => {
    const holdings = Array.from({ length: n }, (_, i) => ({
      id: `h${i}`, name: `架空銘柄${i}`, assetClass: '投資信託', broker: '社A', account: '特定',
    }));
    const dates = ['2024-01-01', '2026-01-01'];
    const snapshots = dates.flatMap((date, d) => holdings.map((h, i) => ({ date, holdingId: h.id, value: 1000 + i * 10 + d })));
    return { holdings, snapshots, dates } as never;
  };
  it('9銘柄以上は その他 にまとめ、件数を持つ。合計は変わらない', () => {
    const m = buildTrendModel(sec(12), 'security', 'all');
    expect(m.keys).toHaveLength(MAX_SERIES);
    expect(m.keys.at(-1)).toBe(OTHER_LABEL);
    expect(m.otherCount).toBe(5);
    expect(seriesLabel(m, OTHER_LABEL)).toBe('その他（5銘柄）');
    expect(seriesLabel(m, '架空銘柄1')).toBe('架空銘柄1');
    for (const r of m.rows) expect(Object.values(r.values).reduce((a, b) => a + b, 0)).toBe(r.total);
  });
  it('まとめなければ otherCount はない。他の内訳にも付かない', () => {
    expect(buildTrendModel(sec(3), 'security', 'all').otherCount).toBeUndefined();
    expect(buildTrendModel(mk(10), 'assetClass', 'all').otherCount).toBeUndefined();
  });
  it('基準日が終点で、並びは基準日の値の大きい順', () => {
    const m = buildTrendModel(sec(3), 'security', 'all', '2024-01-01');
    expect(m.rows.map((r) => r.date)).toEqual(['2024-01-01']);
    expect(m.keys[0]).toBe('架空銘柄2');
  });
  it('色は出現順の系列色、その他は --series-other', () => {
    expect(trendColor('security', '架空銘柄0', 2)).toBe('var(--series-3)');
    expect(trendColor('security', OTHER_LABEL, 7)).toBe('var(--series-other)');
    const m = buildTrendModel(sec(12), 'security', 'all');
    const l = buildLegend(m, 'security');
    expect(l.at(-1)).toMatchObject({ label: 'その他（5銘柄）', color: 'var(--series-other)' });
  });
});

describe('期間中ずっと 0 の系列', () => {
  it('どの日も 0 の系列は除き、一度でも値のある系列は残す', () => {
    const hs = [
      { id: 'a', broker: '架空証券A', account: '特定口座', name: '架空株A', assetClass: '国内株', region: '日本' },
      { id: 'b', broker: '架空証券A', account: '特定口座', name: '架空株B', assetClass: '国内株', region: '日本' },
      { id: 'c', broker: '架空証券A', account: '特定口座', name: '架空株C', assetClass: '国内株', region: '日本' },
    ];
    const vals: Record<string, number[]> = { '2026-08-31': [100, 50, 0], '2026-09-30': [110, 0, 0] };
    const d = {
      holdings: hs,
      dates: Object.keys(vals),
      snapshots: Object.keys(vals).flatMap((date) => hs.map((h, i) => ({ date, holdingId: h.id, value: vals[date]![i]! }))),
    };
    expect(buildTrendModel(d, 'security', 'all').keys).toEqual(['架空株A', '架空株B']);
  });
});
