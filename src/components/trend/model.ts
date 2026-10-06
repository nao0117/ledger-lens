import { breakdownSeries, computeChange, computeDailyTotals, filterByPeriod } from '../../domain/index.ts';
import type { BreakdownKey, Change, Period } from '../../domain/index.ts';
import type { ParsedAnnual } from '../../parser/index.ts';
import { assetClassColor, seriesColor } from '../colors.ts';

export type TrendBy = 'none' | BreakdownKey;

export const TOTAL_LABEL = '総資産';
export const OTHER_LABEL = 'その他';
/** 色のスロット数。これを超えるグループは「その他」にまとめる。 */
export const MAX_SERIES = 8;

export type TrendRow = { date: string; values: Record<string, number>; total: number };
export type TrendModel = { keys: string[]; rows: TrendRow[] };

/**
 * グラフと表に使う系列を作る純粋関数。by='none' は総資産だけの1系列。
 * endDate（基準日）を渡すと、それより後の日付を除いてから期間で絞る（基準日が終点になる）。
 */
export function buildTrendModel(
  data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>,
  by: TrendBy,
  period: Period,
  endDate?: string | null,
): TrendModel {
  const upToEnd = <T extends { date: string }>(rows: readonly T[]) =>
    filterByPeriod(endDate ? rows.filter((r) => r.date <= endDate) : rows, period);
  if (by === 'none') {
    const rows = upToEnd(computeDailyTotals(data)).map((t) => ({
      date: t.date,
      values: { [TOTAL_LABEL]: t.total },
      total: t.total,
    }));
    return { keys: [TOTAL_LABEL], rows };
  }
  const series = breakdownSeries(data, by);
  const rows = upToEnd(series.rows);
  // 系列の並びは終点（基準日）の値が大きい順にする
  const last = rows[rows.length - 1];
  const sorted = last
    ? [...series.keys].sort((a, b) => (last.values[b] ?? 0) - (last.values[a] ?? 0) || a.localeCompare(b))
    : series.keys;
  if (sorted.length <= MAX_SERIES) return { keys: sorted, rows };
  // 「その他」という名前のグループがあれば、まとめる側に入れる（名前の衝突で値が上書きされないように）
  const head = sorted.filter((k) => k !== OTHER_LABEL).slice(0, MAX_SERIES - 1);
  const headSet = new Set(head);
  const tail = sorted.filter((k) => !headSet.has(k));
  return {
    keys: [...head, OTHER_LABEL],
    rows: rows.map((r) => ({
      date: r.date,
      total: r.total,
      values: {
        ...Object.fromEntries(head.map((k) => [k, r.values[k] ?? 0])),
        [OTHER_LABEL]: tail.reduce((sum, k) => sum + (r.values[k] ?? 0), 0),
      },
    })),
  };
}

/** 系列の色。資産クラスは全画面共通の固定色、それ以外は出現順の系列色。合計だけのときはアクセント色。 */
export function trendColor(by: TrendBy, key: string, index: number): string {
  if (by === 'none') return 'var(--accent)';
  if (by === 'assetClass') return assetClassColor(key, index);
  return seriesColor(index);
}

export type LegendItem = { key: string; color: string; /** 終点の総資産に対する比率（0〜1）。総資産が 0 なら null */ ratio: number | null };

/** 凡例（色・名前・終点時点の比率）。 */
export function buildLegend(model: TrendModel, by: TrendBy): LegendItem[] {
  const last = model.rows[model.rows.length - 1];
  return model.keys.map((key, i) => ({
    key,
    color: trendColor(by, key, i),
    ratio: last && last.total !== 0 ? (last.values[key] ?? 0) / last.total : null,
  }));
}

export type PeriodChange = Change & { from: string; to: string };

/** 表示期間の始点から終点までの総資産の増減。2点未満なら null。 */
export function periodChange(rows: readonly TrendRow[]): PeriodChange | null {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last || rows.length < 2) return null;
  const change = computeChange(last.total, first.total);
  return change ? { ...change, from: first.date, to: last.date } : null;
}

const numberFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/**
 * Y 軸の目盛りの整形関数を、値域（絶対値の最大）に応じて返す。
 * 10万以上は「123万」、1万〜10万は「1.5万」、1万未満は「5,000円」。マスク時は金額を出さない。
 */
export function axisYenFormatter(maxAbs: number, mask = false): (v: number) => string {
  if (mask) return () => '***';
  if (maxAbs >= 100_000) return (v) => `${numberFormatter.format(Math.round(v / 10_000))}万`;
  if (maxAbs >= 10_000) return (v) => `${decimalFormatter.format(Math.round(v / 1_000) / 10)}万`;
  return (v) => `${numberFormatter.format(Math.round(v))}円`;
}

/** 行の値（系列・合計）の絶対値の最大。 */
export function maxAbsValue(rows: readonly TrendRow[]): number {
  let max = 0;
  for (const r of rows) {
    max = Math.max(max, Math.abs(r.total));
    // 積み上げ（符号別）の高さも軸の範囲に入る
    let pos = 0;
    let neg = 0;
    for (const v of Object.values(r.values)) {
      if (v > 0) pos += v;
      else neg -= v;
    }
    max = Math.max(max, pos, neg);
  }
  return max;
}

/** `2026-03-15` → `26/3`（軸ラベル用）。形式が違えばそのまま返す。 */
export function formatMonthLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  return m ? `${m[1]!.slice(2)}/${Number(m[2])}` : date;
}

/** `2026-03-15` → `2026年3月15日`（ツールチップ・表用）。 */
export function formatDateJa(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : date;
}

/** 日付の間引き用。n 個の中から最大 max 個になる間隔を返す（最低 0 = 全表示）。 */
export function tickInterval(n: number, max: number): number {
  return n <= max ? 0 : Math.ceil(n / max) - 1;
}
