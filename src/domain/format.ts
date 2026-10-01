const yenFormatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });

/** 金額を `¥1,234,567` 形式にする。mask が true なら桁数を伏せた `¥***,***` を返す。 */
export function formatYen(value: number, mask = false): string {
  if (mask) return '¥***,***';
  const sign = value < 0 ? '-' : '';
  return `${sign}¥${yenFormatter.format(Math.abs(Math.round(value)))}`;
}

/** グラフの軸用に万円単位で表す（例: 1234567 → `123万`）。 */
export function formatManYen(value: number, mask = false): string {
  if (mask) return '***万';
  return `${yenFormatter.format(Math.round(value / 10_000))}万`;
}
