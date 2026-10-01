const SHEETS_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

// 1954年〜2173年ごろ。評価額の数値を日付と取り違えないための範囲
const MIN_DATE_SERIAL = 20_000;
const MAX_DATE_SERIAL = 100_000;

export function isDateSerial(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_DATE_SERIAL && value < MAX_DATE_SERIAL;
}

/** Google スプレッドシートの日付シリアル値を YYYY-MM-DD にする（時刻部分は切り捨てる）。 */
export function serialToIsoDate(serial: number): string {
  return new Date(SHEETS_EPOCH_MS + Math.floor(serial) * MS_PER_DAY).toISOString().slice(0, 10);
}
