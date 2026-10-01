import { shiftYears } from './dates.ts';

export type Period = '1y' | '3y' | 'all';

const PERIOD_YEARS: Record<Exclude<Period, 'all'>, number> = { '1y': 1, '3y': 3 };

/** 昇順の行のうち、最新日の N 年前（その日を含む）以降だけを残す。'all' は全部。空配列でも壊れない。 */
export function filterByPeriod<T extends { date: string }>(rows: readonly T[], period: Period): T[] {
  const last = rows[rows.length - 1];
  if (!last || period === 'all') return [...rows];
  const cutoff = shiftYears(last.date, -PERIOD_YEARS[period]);
  return rows.filter((r) => r.date >= cutoff);
}
