import type { Holding, ParsedAnnual } from '../parser/index.ts';

export type BreakdownKey = 'assetClass' | 'broker' | 'account';

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

export function breakdownSeries(data: Src, by: BreakdownKey): BreakdownSeries {
  const groupOf = new Map<string, string>(data.holdings.map((h: Holding) => [h.id, h[by]]));
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
