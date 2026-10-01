export type RawItem = { key: string; value: number };
export type Slice = {
  name: string;
  value: number;
  /** 合計に対する比率（0〜1）。合計が 0 以下なら 0。 */
  ratio: number;
  /** CSS 変数名（Dashboard.css で定義）。色だけに頼らず、名称と % も必ず併記する。 */
  color: string;
  /** ドーナツに描けるか（value > 0 のものだけ） */
  drawable: boolean;
};

export const MAX_SLICES = 8;
export const OTHER_NAME = 'その他';

/** 比率（0〜1）を `12.3%` にする。有限でなければ `-`。 */
export function formatRatio(ratio: number): string {
  return Number.isFinite(ratio) ? `${(ratio * 100).toFixed(1)}%` : '-';
}

/** 変化率（%単位の値）を符号付きにする。null は `-`。 */
export function formatSignedPercent(percent: number | null): string {
  if (percent === null || !Number.isFinite(percent)) return '-';
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`;
}

export type Direction = 'up' | 'down' | 'flat';
export function direction(amount: number): Direction {
  return amount > 0 ? 'up' : amount < 0 ? 'down' : 'flat';
}
export const DIRECTION_MARK: Record<Direction, string> = { up: '▲', down: '▼', flat: '―' };

/** 金額文字列に符号を付ける（正のときだけ `+`。負は formatYen が `-` を付ける）。 */
export function signedYen(amount: number, yen: (v: number) => string): string {
  return `${amount > 0 ? '+' : ''}${yen(amount)}`;
}

/**
 * 値の大きい順に並んだ項目を、色を固定順（series-1〜8）で割り当てて返す。
 * 8 件を超える分は「その他」にまとめる。比率の分母は全項目の合計。
 */
export function buildSlices(items: readonly RawItem[], maxSlices = MAX_SLICES): Slice[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  const ratioOf = (v: number) => (total > 0 ? v / total : 0);
  const head = items.length > maxSlices ? items.slice(0, maxSlices - 1) : items;
  const rest = items.length > maxSlices ? items.slice(maxSlices - 1) : [];
  const slices: Slice[] = head.map((i, idx) => ({
    name: i.key,
    value: i.value,
    ratio: ratioOf(i.value),
    color: `var(--series-${idx + 1})`,
    drawable: i.value > 0,
  }));
  if (rest.length > 0) {
    const value = rest.reduce((s, i) => s + i.value, 0);
    slices.push({ name: OTHER_NAME, value, ratio: ratioOf(value), color: 'var(--series-other)', drawable: value > 0 });
  }
  return slices;
}
