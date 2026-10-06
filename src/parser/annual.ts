import { isDateSerial, serialToIsoDate } from './dates.ts';
import { isBlank, normalizeLabel } from './normalize.ts';
import { ParseError, type Cell, type Grid, type Holding, type ParseWarning, type Snapshot } from './types.ts';

export const CASH_BROKER = '現金';
export const UNCLASSIFIED = '未分類';
/** 口座区分が「信用」の行の値は評価額ではなく損益。総資産にはそのまま加算する。 */
export const MARGIN_ACCOUNT = '信用';

// B〜E 列のラベルと、F 列以降の値（0 始まりの列番号）
const COL_CATEGORY = 1;
const COL_BROKER = 2;
const COL_ACCOUNT = 3;
const COL_NAME = 4;
const COL_FIRST_VALUE = 5;

/** 日付の行を探す範囲。タイトル行などが増えても見つかるようにする。 */
const HEADER_SEARCH_ROWS = 10;
/** シートの集計値との許容差（円）。浮動小数点の誤差を吸収する。 */
const TOTAL_TOLERANCE = 1;

type TotalKind = 'all' | 'cash' | 'stock';
const TOTAL_LABELS = new Map<string, TotalKind>([
  ['全資産', 'all'],
  ['現金', 'cash'],
  ['株式', 'stock'],
]);
const TOTAL_NAMES: Record<TotalKind, string> = { all: '全資産', cash: '現金', stock: '株式' };
const CASH_ACCOUNTS = new Set(['口座預金', '貯金']);

export type SheetTotals = Record<string, Partial<Record<TotalKind, number>>>;

export type ParsedAnnual = {
  holdings: Holding[];
  /** すべての銘柄 × すべての日付。空セルは 0。 */
  snapshots: Snapshot[];
  /** 昇順 */
  dates: string[];
  /** シートの集計行の値。アプリの計算値との照合にだけ使う。 */
  sheetTotals: SheetTotals;
  warnings: ParseWarning[];
};

export function parseAnnualSheet(grid: Grid): ParsedAnnual {
  const warnings: ParseWarning[] = [];

  const headerRow = findHeaderRow(grid);
  if (headerRow < 0) throw new ParseError('日付の行が見つかりません');
  const dateColumns = readDateColumns(grid[headerRow] ?? [], warnings);
  const dates = [...dateColumns.keys()].sort();

  const sheetTotals: SheetTotals = {};
  const holdings = new Map<string, { holding: Holding; values: Map<string, number>; blanks: Set<string> }>();

  let section: TotalKind | null = null;
  let broker = '';

  for (const row of grid.slice(headerRow + 1)) {
    const totalKind = TOTAL_LABELS.get(normalizeLabel(row[COL_CATEGORY]));
    if (totalKind) {
      section = totalKind;
      broker = '';
      for (const [date, col] of dateColumns) {
        const cell = row[col];
        if (typeof cell === 'number') (sheetTotals[date] ??= {})[totalKind] = cell;
      }
      continue;
    }

    const brokerCell = normalizeLabel(row[COL_BROKER]);
    const account = normalizeLabel(row[COL_ACCOUNT]);
    const name = normalizeLabel(row[COL_NAME]);
    const hasValues = [...dateColumns.values()].some((col) => !isBlank(row[col]));
    if (!brokerCell && !account && !name) {
      if (hasValues) warnings.push({ code: 'unlabeled-row', message: 'ラベルのない行に値が入っています' });
      continue;
    }

    let holding: Holding;
    if (section === 'cash' || (section === null && CASH_ACCOUNTS.has(brokerCell))) {
      // 現金の内訳は C 列に口座預金 / 貯金が入る
      if (!brokerCell) {
        warnings.push({ code: 'missing-label', message: '現金の行に区分（口座預金など）がありません' });
        continue;
      }
      holding = makeHolding(CASH_BROKER, brokerCell, name || brokerCell, CASH_BROKER, '日本');
    } else {
      // 証券会社名はグループの先頭行にだけ入っているので、下の行に引き継ぐ
      if (brokerCell) broker = brokerCell;
      if (!broker || !name) {
        warnings.push({ code: 'missing-label', message: '証券会社名または銘柄名がない行を読み飛ばしました' });
        continue;
      }
      holding = makeHolding(broker, account, name, UNCLASSIFIED, UNCLASSIFIED);
    }

    const values = new Map<string, number>();
    const blanks = new Set<string>();
    for (const [date, col] of dateColumns) {
      values.set(date, readValue(row[col], date, warnings));
      if (isBlank(row[col])) blanks.add(date);
    }

    const existing = holdings.get(holding.id);
    if (existing) {
      warnings.push({ code: 'duplicate-holding', message: '同じ証券会社・口座区分・銘柄名の行があるため、値を合算しました' });
      for (const [date, value] of values) {
        existing.values.set(date, (existing.values.get(date) ?? 0) + value);
      }
      // 合算した行のどちらかに値があれば、その日は保有している
      for (const date of existing.blanks) if (!blanks.has(date)) existing.blanks.delete(date);
    } else {
      holdings.set(holding.id, { holding, values, blanks });
    }
  }

  const snapshots: Snapshot[] = [];
  for (const { holding, values, blanks } of holdings.values()) {
    for (const date of dates) {
      const snapshot: Snapshot = { date, holdingId: holding.id, value: values.get(date) ?? 0 };
      if (blanks.has(date)) snapshot.blank = true;
      snapshots.push(snapshot);
    }
  }

  const holdingList = [...holdings.values()].map((h) => h.holding);
  warnings.push(...checkTotals(snapshots, holdingList, dates, sheetTotals));

  return { holdings: holdingList, snapshots, dates, sheetTotals, warnings };
}

function makeHolding(broker: string, account: string, name: string, assetClass: string, region: string): Holding {
  return { id: `${broker}|${account}|${name}`, broker, account, name, assetClass, region };
}

function findHeaderRow(grid: Grid): number {
  const limit = Math.min(grid.length, HEADER_SEARCH_ROWS);
  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? [];
    if (row.slice(COL_FIRST_VALUE).some(isDateSerial)) return r;
  }
  return -1;
}

/** 日付 → 列番号。日付が空の列は無視し、同じ日付が複数あれば右側の列を採用する。 */
function readDateColumns(headerRow: readonly Cell[], warnings: ParseWarning[]): Map<string, number> {
  const columns = new Map<string, number>();
  for (let col = COL_FIRST_VALUE; col < headerRow.length; col++) {
    const cell = headerRow[col];
    if (isBlank(cell)) continue;
    if (!isDateSerial(cell)) {
      warnings.push({ code: 'invalid-date-header', message: '日付として読めない列を無視しました' });
      continue;
    }
    const date = serialToIsoDate(cell);
    if (columns.has(date)) {
      warnings.push({ code: 'duplicate-date', message: `${date} の列が複数あります。右側の列を使います`, date });
    }
    columns.set(date, col);
  }
  return columns;
}

/** 空セルは「保有していない」として 0 にする。 */
function readValue(cell: Cell, date: string, warnings: ParseWarning[]): number {
  if (isBlank(cell)) return 0;
  if (typeof cell === 'number' && Number.isFinite(cell)) return cell;
  warnings.push({ code: 'invalid-value', message: `${date} に数値として読めないセルがあり、0 として扱いました`, date });
  return 0;
}

/** 明細行から計算した値を、シートの集計行と照合する。 */
function checkTotals(
  snapshots: readonly Snapshot[],
  holdings: readonly Holding[],
  dates: readonly string[],
  sheetTotals: SheetTotals,
): ParseWarning[] {
  const isCash = new Map(holdings.map((h) => [h.id, h.broker === CASH_BROKER]));
  const computed = new Map<string, Record<TotalKind, number>>(
    dates.map((d) => [d, { all: 0, cash: 0, stock: 0 }]),
  );
  for (const s of snapshots) {
    const sums = computed.get(s.date);
    if (!sums) continue;
    sums[isCash.get(s.holdingId) ? 'cash' : 'stock'] += s.value;
    sums.all += s.value;
  }

  const warnings: ParseWarning[] = [];
  for (const date of dates) {
    const sums = computed.get(date);
    const sheet = sheetTotals[date];
    if (!sums || !sheet) continue;
    for (const kind of ['all', 'cash', 'stock'] as const) {
      const sheetValue = sheet[kind];
      if (sheetValue !== undefined && Math.abs(sheetValue - sums[kind]) > TOTAL_TOLERANCE) {
        warnings.push({
          code: 'total-mismatch',
          message: `${date} の${TOTAL_NAMES[kind]}が、明細から計算した値とシートの集計値でずれています`,
          date,
          difference: sheetValue - sums[kind],
        });
      }
    }
  }
  return warnings;
}
