import { CASH_BROKER, type Holding, type ParsedAnnual } from '../parser/index.ts';
import { securityKeyOf } from './securities.ts';

export type BreakdownKey = 'assetClass' | 'broker' | 'account' | 'security';

/** 内訳 'security' での現金の系列名（口座預金・貯金を1つにまとめる） */
export const CASH_SERIES_LABEL = '現金';

export type BreakdownRow = {
  date: string;
  /** グループ名 → 合計。信用の損益は符号付きのまま含む（負もある）。 */
  values: Record<string, number>;
  total: number;
};

export type BreakdownSeries = {
  /** グループ名（最新日の値が大きい順。同値は名前順）。グラフの積み上げ順に使える。 */
  keys: string[];
  /** 昇順。全グループが全日付に存在する（なければ 0）。 */
  rows: BreakdownRow[];
};

export type CompositionItem = {
  key: string;
  value: number;
  /** value / 合計。合計が 0 なら 0。信用の損益で負のグループは負の比率になる（ドーナツ用には value > 0 だけ使う）。 */
  ratio: number;
};

type Src = Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>;

/**
 * 行 id → グループ名。'security' は名寄せキーでまとめ、名前は最初の銘柄の表示名（正規化前）。
 * 現金は1つの系列に、信用の行は同じ銘柄の系列に符号付きで足される。
 */
function groupMap(holdings: readonly Holding[], by: BreakdownKey): Map<string, string> {
  if (by !== 'security') return new Map(holdings.map((h) => [h.id, h[by]]));
  const names = new Map<string, string>();
  const out = new Map<string, string>();
  for (const h of holdings) {
    if (h.broker === CASH_BROKER) {
      out.set(h.id, CASH_SERIES_LABEL);
      continue;
    }
    const key = securityKeyOf(h);
    if (!names.has(key)) names.set(key, h.securityName ?? h.name);
    out.set(h.id, names.get(key)!);
  }
  return out;
}

export function breakdownSeries(data: Src, by: BreakdownKey): BreakdownSeries {
  const groupOf = groupMap(data.holdings, by);
  const keySet = new Set(groupOf.values());
  const rowMap = new Map<string, BreakdownRow>(
    [...data.dates].sort().map((date) => [date, { date, values: Object.fromEntries([...keySet].map((k) => [k, 0])), total: 0 }]),
  );
  for (const s of data.snapshots) {
    const row = rowMap.get(s.date);
    const g = groupOf.get(s.holdingId);
    if (!row || g === undefined) continue;
    row.values[g] = (row.values[g] ?? 0) + s.value;
    row.total += s.value;
  }
  const rows = [...rowMap.values()];
  const last = rows[rows.length - 1];
  const keys = [...keySet].sort((a, b) => (last?.values[b] ?? 0) - (last?.values[a] ?? 0) || a.localeCompare(b));
  return { keys, rows };
}

/** 基準日（省略時は最新日）の構成比。大きい順。日付がなければ空配列。 */
export function composition(data: Src, by: BreakdownKey, baseDate?: string): CompositionItem[] {
  const { keys, rows } = breakdownSeries(data, by);
  const row = baseDate ? rows.find((r) => r.date === baseDate) : rows[rows.length - 1];
  if (!row) return [];
  return keys
    .map((key) => ({ key, value: row.values[key] ?? 0, ratio: row.total === 0 ? 0 : (row.values[key] ?? 0) / row.total }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}
