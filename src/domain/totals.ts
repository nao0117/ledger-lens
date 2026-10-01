import { CASH_BROKER, type ParsedAnnual } from '../parser/index.ts';
import { previousDate, yearAgoDate } from './dates.ts';

export type DailyTotal = {
  date: string;
  /** 総資産 = 現金 + 株式（信用の損益を含む） */
  total: number;
  /** broker が CASH_BROKER の行の合計 */
  cash: number;
  /** 現金以外の行の合計。信用（損益、負もある）をそのまま加算する。米国株は円換算済み。 */
  stock: number;
};

export type Change = {
  /** 現在値 - 比較値 */
  amount: number;
  /** 比較値が 0 のときは null。比較値が負のときも絶対値で割り、増えれば正になる。 */
  percent: number | null;
};

/** 日付 → 銘柄ID → 評価額 */
export type ValueIndex = Map<string, Map<string, number>>;

export function indexValues(data: Pick<ParsedAnnual, 'snapshots'>): ValueIndex {
  const index: ValueIndex = new Map();
  for (const s of data.snapshots) {
    let m = index.get(s.date);
    if (!m) index.set(s.date, (m = new Map()));
    m.set(s.holdingId, (m.get(s.holdingId) ?? 0) + s.value);
  }
  return index;
}

/** 明細行から日付ごとの合計を計算する（シートの集計行は使わない）。昇順。 */
export function computeDailyTotals(data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>): DailyTotal[] {
  const cashIds = new Set(data.holdings.filter((h) => h.broker === CASH_BROKER).map((h) => h.id));
  const known = new Set(data.holdings.map((h) => h.id));
  const sums = new Map<string, DailyTotal>(data.dates.map((date) => [date, { date, total: 0, cash: 0, stock: 0 }]));
  for (const s of data.snapshots) {
    const t = sums.get(s.date);
    if (!t || !known.has(s.holdingId)) continue;
    t[cashIds.has(s.holdingId) ? 'cash' : 'stock'] += s.value;
    t.total += s.value;
  }
  return [...sums.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function computeChange(current: number, previous: number | null): Change | null {
  if (previous === null) return null;
  return { amount: current - previous, percent: previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100 };
}

export type Summary = {
  date: string;
  totals: DailyTotal;
  /** 前回（直前の日付）比。前回がなければ null */
  vsPrevious: (Change & { date: string }) | null;
  /** 前年同時期比（1年前以前で最も近い日付）。なければ null */
  vsYearAgo: (Change & { date: string }) | null;
};

/** 基準日（省略時は最新日）の総資産と、前回比・前年同時期比（総資産ベース）。データが空なら null。 */
export function summarize(
  data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>,
  baseDate?: string,
): Summary | null {
  const daily = computeDailyTotals(data);
  const date = baseDate ?? daily[daily.length - 1]?.date;
  const totals = daily.find((d) => d.date === date);
  if (!date || !totals) return null;
  const dates = daily.map((d) => d.date);
  const compare = (other: string | null) => {
    const t = other === null ? undefined : daily.find((d) => d.date === other);
    const change = t ? computeChange(totals.total, t.total) : null;
    return change && t ? { ...change, date: t.date } : null;
  };
  return {
    date,
    totals,
    vsPrevious: compare(previousDate(dates, date)),
    vsYearAgo: compare(yearAgoDate(dates, date)),
  };
}
