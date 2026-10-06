/** 共通レイアウトで使う表示用の整形。純粋関数。 */

/**
 * 基準日の選択肢の表示。最新日と同じ年なら「9/30」、違う年なら「2025/9/30」。
 * 最新日には「（最新）」を付ける。日付は YYYY-MM-DD。
 */
export function formatBaseDateOption(date: string, latest: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  const md = `${Number(mo)}/${Number(d)}`;
  const sameYear = latest !== null && latest.slice(0, 4) === y;
  const label = sameYear ? md : `${y}/${md}`;
  return date === latest ? `${label}（最新）` : label;
}

/** 基準日の読み上げ用（例: 2026年9月30日）。 */
export function formatBaseDateLong(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

/** 最終取得時刻。今日なら「9:42」、別の日なら「10/5 9:42」。 */
export function formatFetchedAt(at: Date, now: Date): string {
  const hm = `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`;
  const sameDay = at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth() && at.getDate() === now.getDate();
  return sameDay ? hm : `${at.getMonth() + 1}/${at.getDate()} ${hm}`;
}
