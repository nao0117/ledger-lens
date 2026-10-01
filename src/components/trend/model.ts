import { breakdownSeries, computeDailyTotals, filterByPeriod } from '../../domain/index.ts';
import type { BreakdownKey, Period } from '../../domain/index.ts';
import type { ParsedAnnual } from '../../parser/index.ts';

export type TrendBy = 'none' | BreakdownKey;

export const TOTAL_LABEL = '総資産';
export const OTHER_LABEL = 'その他';
/** 色のスロット数。これを超えるグループは「その他」にまとめる。 */
export const MAX_SERIES = 8;

export type TrendRow = { date: string; values: Record<string, number>; total: number };
export type TrendModel = { keys: string[]; rows: TrendRow[] };

/** グラフと表に使う系列を作る純粋関数。by='none' は総資産だけの1系列。 */
export function buildTrendModel(
  data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>,
  by: TrendBy,
  period: Period,
): TrendModel {
  if (by === 'none') {
    const rows = filterByPeriod(computeDailyTotals(data), period).map((t) => ({
      date: t.date,
      values: { [TOTAL_LABEL]: t.total },
      total: t.total,
    }));
    return { keys: [TOTAL_LABEL], rows };
  }
  const series = breakdownSeries(data, by);
  const rows = filterByPeriod(series.rows, period);
  if (series.keys.length <= MAX_SERIES) return { keys: series.keys, rows };
  const head = series.keys.slice(0, MAX_SERIES - 1);
  const tail = series.keys.slice(MAX_SERIES - 1);
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
