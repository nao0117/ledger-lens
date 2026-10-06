/** ホームの表示用の整形（純粋関数）。 */

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

/** `2026-09-30` → `9月`。形式が違えば空文字。 */
export function monthLabel(date: string): string {
  const m = /^\d{4}-(\d{2})-\d{2}$/.exec(date);
  return m ? `${Number(m[1])}月` : '';
}
