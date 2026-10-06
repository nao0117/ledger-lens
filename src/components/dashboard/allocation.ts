import type { CompositionItem } from '../../domain/index.ts';

export type AllocationItem = {
  key: string;
  value: number;
  /** 合計に対する比率（domain の composition と同じ。負のクラスは負の比率） */
  ratio: number;
  /** 積み上げ横棒の幅（0〜1）。正の値の合計を 1 とする。0 以下のクラスは 0（棒には描かない） */
  width: number;
};

/** 資産クラスの構成を、100% 積み上げ横棒と凡例・表に使う形にする。順序は入力のまま（大きい順）。 */
export function buildAllocation(items: readonly CompositionItem[]): AllocationItem[] {
  const positive = items.reduce((s, i) => s + (i.value > 0 ? i.value : 0), 0);
  return items.map((i) => ({ ...i, width: positive > 0 && i.value > 0 ? i.value / positive : 0 }));
}

export type CashStock = { cashRatio: number; stockRatio: number } | null;

/** 現金と株式の比率。どちらかが負、または合計が 0 以下なら比率を出せないので null。 */
export function cashStockRatio(cash: number, stock: number): CashStock {
  const total = cash + stock;
  if (cash < 0 || stock < 0 || total <= 0) return null;
  return { cashRatio: cash / total, stockRatio: stock / total };
}
