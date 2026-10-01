// ダミーデータのみ。銘柄名は架空、金額は適当な値。実データは絶対に入れない。
import type { Cell, Grid } from '../types.ts';

// 日付シリアル値（1899-12-30 起点）。2024-01-31 / 2024-02-29 / 2024-03-31
export const SERIAL_JAN = 45322;
export const SERIAL_FEB = 45351;
export const SERIAL_MAR = 45382;

/** 列: F=1月末 / G=2月末 / H=3月末 / I=3月末（同じ日付の重複列）/ J=日付が空（数式だけの列） */
type Values = (number | null)[];

type DetailRow = { broker: string; account: string; name: string; values: Values };

const dateHeader: Cell[] = ['', '', '', '', '', SERIAL_JAN, SERIAL_FEB, SERIAL_MAR, SERIAL_MAR, ''];

const cashRows: DetailRow[] = [
  { broker: '口座預金', account: '', name: '', values: [320_000, 340_000, 310_000, 315_000, null] },
  { broker: '貯金', account: '', name: '', values: [500_000, 500_000, 520_000, 520_000, null] },
];

const stockRows: DetailRow[] = [
  { broker: '証券会社A', account: 'NISAつみたて投資枠\t', name: 'サンプル投信A ', values: [100_000, 200_000, 300_000, 305_000, null] },
  { broker: '', account: 'NISA成長投資枠', name: 'サンプル投信B', values: [null, 150_000, 160_000, 158_000, null] },
  { broker: '', account: '特定口座', name: 'サンプル米国株Ｃ', values: [420_000, 430_000, 410_000, 415_000, null] },
  // 信用の行は評価額ではなく損益（負の値もある）
  { broker: '', account: '信用', name: 'サンプル信用D', values: [-12_000, 8_000, -3_000, 2_500, null] },
  // 同じ銘柄名でも証券会社と口座が違えば別の行
  { broker: '証券会社B', account: 'NISA口座', name: 'サンプル投信A', values: [null, null, 250_000, 252_000, null] },
];

const sum = (rows: DetailRow[], col: number): number =>
  rows.reduce((acc, r) => acc + (r.values[col] ?? 0), 0);

function summaryRow(label: string, rows: DetailRow[]): Cell[] {
  return ['', label, '', '', '', ...Array.from({ length: 5 }, (_, col) => sum(rows, col))];
}

function detailRow(row: DetailRow, isCash: boolean): Cell[] {
  // 現金の内訳は C 列に口座預金 / 貯金、株式は C 列に証券会社名（グループの先頭行だけ）
  const cells: Cell[] = isCash
    ? ['', '', row.broker, '', row.name]
    : ['', '', row.broker, row.account, row.name];
  // 空セルは末尾以外でも null ではなく ''（API は空文字を返す）にして、様々な形を試す
  return [...cells, ...row.values.map((v) => v ?? '')];
}

/** 年次推移シートのダミー。集計行（全資産・現金・株式）は明細の合計と一致している。 */
export function buildAnnualGrid(): Cell[][] {
  return [
    ['', 'サンプル資産推移'],
    dateHeader,
    summaryRow('全資産', [...cashRows, ...stockRows]),
    summaryRow('現金', cashRows),
    ...cashRows.map((r) => detailRow(r, true)),
    summaryRow('株式', stockRows),
    ...stockRows.map((r) => detailRow(r, false)),
  ];
}

export const MASTER_GRID: Grid = [
  ['銘柄名', '資産クラス', '地域'],
  ['サンプル投信A', '投資信託', '全世界'],
  ['サンプル投信B', '投資信託', '先進国'],
  ['サンプル米国株C', '米国株', '米国'], // シート側は半角、年次推移側は全角 → 正規化で一致する
];
