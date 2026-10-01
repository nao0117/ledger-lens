/** YYYY-MM-DD の日付を n 年ずらす。存在しない日（うるう日）は月末に丸める。 */
export function shiftYears(date: string, years: number): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const ny = y + years;
  const lastDay = new Date(Date.UTC(ny, m, 0)).getUTCDate();
  return `${String(ny).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/** dates（昇順）のうち、date より前の最も近い日付。なければ null。 */
export function previousDate(dates: readonly string[], date: string): string | null {
  let found: string | null = null;
  for (const d of dates) {
    if (d < date) found = d;
    else break;
  }
  return found;
}

/** dates（昇順）のうち、date の1年前以前で最も近い日付。なければ null。 */
export function yearAgoDate(dates: readonly string[], date: string): string | null {
  const target = shiftYears(date, -1);
  let found: string | null = null;
  for (const d of dates) {
    if (d <= target) found = d;
    else break;
  }
  return found;
}
