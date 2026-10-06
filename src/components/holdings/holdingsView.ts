import type { HoldingRow } from '../../domain/index.ts';

export type SortKey = 'name' | 'broker' | 'account' | 'assetClass' | 'value' | 'ratio' | 'changeAmount' | 'changePercent';
export type SortDir = 'asc' | 'desc';
export type Sort = { key: SortKey; dir: SortDir };

export type Filters = {
  broker: string;
  account: string;
  assetClass: string;
  /** 銘柄名の部分一致（大文字小文字・前後の空白は無視） */
  query: string;
  unclassifiedOnly: boolean;
};

/** 空文字は「すべて」 */
export const EMPTY_FILTERS: Filters = { broker: '', account: '', assetClass: '', query: '', unclassifiedOnly: false };

export const DEFAULT_SORT: Sort = { key: 'value', dir: 'desc' };

const TEXT_KEYS: ReadonlySet<SortKey> = new Set(['name', 'broker', 'account', 'assetClass']);

/** 並べ替えキーの初期方向。文字列は昇順、数値は降順。 */
export function defaultDir(key: SortKey): SortDir {
  return TEXT_KEYS.has(key) ? 'asc' : 'desc';
}

/** 見出しクリック時の次の状態。同じキーなら方向を反転、別キーなら初期方向。 */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: defaultDir(key) };
}

function numeric(row: HoldingRow, key: SortKey): number | null {
  switch (key) {
    case 'value': return row.value;
    case 'ratio': return row.ratio;
    case 'changeAmount': return row.change ? row.change.amount : null;
    case 'changePercent': return row.change ? row.change.percent : null;
    default: return null;
  }
}

function text(row: HoldingRow, key: SortKey): string {
  switch (key) {
    case 'name': return row.name;
    case 'broker': return row.broker;
    case 'account': return row.account;
    case 'assetClass': return row.assetClass;
    default: return '';
  }
}

/** 並べ替え（元の配列は変更しない）。値なし（null）は方向に関係なく末尾。同値は id 順。 */
export function sortRows(rows: readonly HoldingRow[], sort: Sort): HoldingRow[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let c: number;
    if (TEXT_KEYS.has(sort.key)) {
      c = sign * text(a, sort.key).localeCompare(text(b, sort.key), 'ja');
    } else {
      const x = numeric(a, sort.key);
      const y = numeric(b, sort.key);
      if (x === null && y === null) c = 0;
      else if (x === null) return 1;
      else if (y === null) return -1;
      else c = sign * (x - y);
    }
    return c || a.id.localeCompare(b.id);
  });
}

/** 絞り込み（すべて AND）。 */
export function filterRows(rows: readonly HoldingRow[], f: Filters): HoldingRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.broker === '' || r.broker === f.broker) &&
      (f.account === '' || r.account === f.account) &&
      (f.assetClass === '' || r.assetClass === f.assetClass) &&
      (!f.unclassifiedOnly || r.unclassified) &&
      (q === '' || r.name.toLowerCase().includes(q)),
  );
}

export type FilterOptions = { brokers: string[]; accounts: string[]; assetClasses: string[] };

/** 絞り込みの選択肢（重複なし、日本語の辞書順）。 */
export function filterOptions(rows: readonly HoldingRow[]): FilterOptions {
  const uniq = (pick: (r: HoldingRow) => string) =>
    [...new Set(rows.map(pick))].sort((a, b) => a.localeCompare(b, 'ja'));
  return {
    brokers: uniq((r) => r.broker),
    accounts: uniq((r) => r.account),
    assetClasses: uniq((r) => r.assetClass),
  };
}

export type ChangeKind = 'none' | 'up' | 'down' | 'flat';

/** 前回比の表示種別。none は前回の日付がない場合。 */
export function changeKind(row: HoldingRow): ChangeKind {
  if (!row.change) return 'none';
  if (row.change.amount > 0) return 'up';
  if (row.change.amount < 0) return 'down';
  return 'flat';
}

/** 前回が 0 で今回が 0 以外（新規）。% が出せない。 */
export function isNewHolding(row: HoldingRow): boolean {
  return row.change !== null && row.change.percent === null && row.previousValue === 0 && row.value !== 0;
}

/** 比率の表示（例: 0.1234 → `12.3%`）。 */
export function formatPercent(ratio: number, signed = false): string {
  const v = ratio * 100;
  const s = Math.abs(v).toFixed(1);
  if (!signed) return `${v < 0 ? '-' : ''}${s}%`;
  if (Number(s) === 0) return `${s}%`;
  return `${v < 0 ? '-' : '+'}${s}%`;
}

/** 並べ替えキーの表示名（並べ替えチップ・表の見出し共通）。 */
export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  name: '銘柄名',
  broker: '証券会社',
  account: '口座区分',
  assetClass: '資産クラス',
  value: '評価額',
  ratio: '構成比',
  changeAmount: '前回比（金額）',
  changePercent: '前回比（%）',
};

/** 並べ替えの向きの矢印。 */
export function sortArrow(dir: SortDir): string {
  return dir === 'asc' ? '↑' : '↓';
}

/** 並べ替えチップの文言（例: `評価額 ↓`）。 */
export function sortLabel(sort: Sort): string {
  return `${SORT_LABELS[sort.key]} ${sortArrow(sort.dir)}`;
}

/** 選択式の絞り込みチップの文言。未選択は項目名、選択中は選んだ値。 */
export function filterChipLabel(label: string, value: string): string {
  return value === '' ? label : value;
}

/** 絞り込み条件が1つでもあるか（検索は前後の空白を無視）。 */
export function hasActiveFilters(f: Filters): boolean {
  return f.broker !== '' || f.account !== '' || f.assetClass !== '' || f.unclassifiedOnly || f.query.trim() !== '';
}

/** 件数の文言。絞り込み中は `3 / 8銘柄`、それ以外は `8銘柄`。 */
export function countLabel(visible: number, all: number, filtered: boolean): string {
  return filtered ? `${visible} / ${all}銘柄` : `${all}銘柄`;
}

/** 表示中の行の評価額の合計（信用は損益をそのまま足す）。 */
export function sumValues(rows: readonly HoldingRow[]): number {
  return rows.reduce((a, r) => a + r.value, 0);
}

/** `2026-09-30` → `2026年9月30日`。形式が違えばそのまま返す。 */
export function formatJpDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : date;
}

export type ChangeDisplay = { kind: ChangeKind | 'new'; symbol: string; text: string };

const SYMBOL: Readonly<Record<ChangeKind, string>> = { up: '▲', down: '▼', flat: '±', none: '' };

/**
 * 一覧の2行目に出す前回比（row.change.percent は % 値。0.1234 ではなく 12.34）（例: `+¥48,000（+2.3%）`）。
 * yen はマスク込みの金額整形。前回なしは `―`、新規は `新規`、増減なしは `変化なし`。
 */
export function changeDisplay(row: HoldingRow, yen: (v: number) => string, mask: boolean): ChangeDisplay {
  const kind = changeKind(row);
  if (!row.change || kind === 'none') return { kind: 'none', symbol: '', text: '―' };
  if (isNewHolding(row)) return { kind: 'new', symbol: '', text: '新規' };
  if (kind === 'flat') return { kind, symbol: SYMBOL.flat, text: '変化なし' };
  const amount = row.change.amount;
  const money = mask ? yen(amount) : `${amount > 0 ? '+' : ''}${yen(amount)}`;
  const pct = row.change.percent === null ? '' : `（${formatPercent(row.change.percent / 100, true)}）`;
  return { kind, symbol: SYMBOL[kind], text: `${money}${pct}` };
}
