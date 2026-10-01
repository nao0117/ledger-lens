import { CASH_BROKER, UNCLASSIFIED, type ParsedAnnual } from '../parser/index.ts';
import { previousDate } from './dates.ts';
import { computeChange, indexValues, type Change } from './totals.ts';

export type HoldingRow = {
  id: string;
  broker: string;
  account: string;
  name: string;
  assetClass: string;
  region: string;
  /** 基準日の評価額（信用は損益） */
  value: number;
  /** 基準日の総資産に対する比率。総資産が 0 なら 0。 */
  ratio: number;
  /** 前回の評価額。前回の日付がなければ null */
  previousValue: number | null;
  /** 前回比。前回の日付がない、または前回が 0（新規購入など）の % は null */
  change: Change | null;
  /** 銘柄マスタに載っていない（現金は対象外） */
  unclassified: boolean;
};

/** 銘柄一覧用の行。基準日（省略時は最新日）の評価額が大きい順。 */
export function buildHoldingRows(
  data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>,
  baseDate?: string,
): HoldingRow[] {
  const dates = [...data.dates].sort();
  const date = baseDate ?? dates[dates.length - 1];
  if (!date) return [];
  const index = indexValues(data);
  const now = index.get(date);
  const prevDate = previousDate(dates, date);
  const prev = prevDate ? index.get(prevDate) : undefined;
  const rows = data.holdings.map((h): HoldingRow => {
    const value = now?.get(h.id) ?? 0;
    const previousValue = prevDate ? (prev?.get(h.id) ?? 0) : null;
    return {
      ...h,
      value,
      ratio: 0,
      previousValue,
      change: computeChange(value, previousValue),
      unclassified: h.broker !== CASH_BROKER && h.assetClass === UNCLASSIFIED,
    };
  });
  const total = rows.reduce((a, r) => a + r.value, 0);
  for (const r of rows) r.ratio = total === 0 ? 0 : r.value / total;
  return rows.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
}
