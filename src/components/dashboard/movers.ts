import type { HoldingRow } from '../../domain/index.ts';

export type Mover = {
  id: string;
  name: string;
  assetClass: string;
  /** 前回比の金額（信用は損益の変化） */
  amount: number;
  /** 表示中の最大の絶対値を 1 とした大きさ（0〜1）。横棒の長さに使う。 */
  scale: number;
};

export type Movers = {
  items: Mover[];
  /** 上位に入らなかった、変化のあった銘柄 */
  rest: { count: number; amount: number };
  /** 全銘柄の前回比の合計 */
  total: number;
};

/**
 * 前回比の金額の絶対値が大きい順に上位 n 銘柄を返す（変化 0 の銘柄は除く）。
 * 前回の日付がない（どの行も change が null）ときは null。
 */
export function topMovers(rows: readonly HoldingRow[], n: number): Movers | null {
  const changed = rows.filter((r) => r.change !== null);
  if (changed.length === 0) return null;
  const moved = changed
    .map((r) => ({ id: r.id, name: r.name, assetClass: r.assetClass, amount: r.change!.amount }))
    .filter((m) => m.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.id.localeCompare(b.id));
  const head = moved.slice(0, Math.max(0, n));
  const tail = moved.slice(head.length);
  const max = Math.abs(head[0]?.amount ?? 0);
  return {
    items: head.map((m) => ({ ...m, scale: max === 0 ? 0 : Math.abs(m.amount) / max })),
    rest: { count: tail.length, amount: tail.reduce((s, m) => s + m.amount, 0) },
    total: moved.reduce((s, m) => s + m.amount, 0),
  };
}
